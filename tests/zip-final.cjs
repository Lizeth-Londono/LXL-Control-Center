// Final validation with an authorized local project. No source or archive is saved.
// node tests/zip-final.cjs "C:/path/to/authorized/project-or-original.zip" [expected-entry-count]
const fs=require('node:fs'), path=require('node:path'), http=require('node:http'), assert=require('node:assert/strict');
const {chromium}=require('../.qa/node_modules/playwright');
const f=require('../js/vendor/fflate.js'),z=require('../js/zip-core.js');
const root=path.resolve(__dirname,'..'), results=[];
function collect(dir,prefix='',out={}) {
  for(const item of fs.readdirSync(dir,{withFileTypes:true})) {
    if(item.isSymbolicLink() || /^(\.git|node_modules|\.env(?:\..*)?|secrets|\.private)$/i.test(item.name))continue;
    const relative=prefix+item.name, full=path.join(dir,item.name);
    if(item.isDirectory())collect(full,relative+'/',out);else if(item.isFile())out[relative]=fs.readFileSync(full);
  }
  return out;
}
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]).replace(/\/$/,'/index.html'));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(data);});
});
(async()=>{
  assert(process.argv[2],'Provide an authorized project directory');
  const source=path.resolve(process.argv[2]),isOriginal=fs.statSync(source).isFile();
  const files=isOriginal?null:collect(source);if(files)assert(Object.keys(files).length>0);
  const fixtures=isOriginal ? [{label:'Original authorized ZIP (no repacking)',bytes:fs.readFileSync(source),expected:Number(process.argv[3])||undefined}] : [0,6].map(level=>({label:'Authorized real project, '+(level?'Deflate':'Store'),bytes:f.zipSync(files,{level}),expected:Object.keys(files).length}));
  const large={};for(let i=0;i<5;i++)large['asset-'+i+'.bin']=new Uint8Array(4*1048576);
  fixtures.push({label:'Synthetic 20 MiB Store (not a real project)',bytes:f.zipSync(large,{level:0}),expected:5});
  await new Promise(r=>server.listen(4175,'127.0.0.1',r));
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  try {
    const page=await browser.newPage({acceptDownloads:true});const errors=[],external=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:4175/'))external.push(r.url());});
    await page.goto('http://127.0.0.1:4175/admin/#zip');
    assert.match(await page.locator('.footer').textContent(),/Panel DEMO v3\.(?:2\.1|3)/);
    assert.match(await page.locator('.footer').textContent(),/Sin autenticación/);
    let oldIndividualLimitVerified=false;
    if(isOriginal) {
      const largest=Math.max(...z.inspectDirectory(fixtures[0].bytes,z.limits()).entries.map(e=>e.size));
      if(largest>8*1048576) {
        await page.locator('#zip > .card > details > summary').click();await page.locator('#zip-limit-entry').fill('8');
        await page.locator('#zipfile').setInputFiles({name:'authorized-original.zip',mimeType:'application/zip',buffer:Buffer.from(fixtures[0].bytes)});
        await page.locator('#zip-analyze').click();await page.waitForFunction(()=>document.getElementById('zipstatus').textContent.startsWith('No se pudo analizar'));
        const error=await page.locator('#zipstatus').textContent();assert(error.includes('individual'));assert(error.includes(String(largest)));assert(error.includes('8388608'));assert(!error.includes('authorized-original'));
        assert(await page.locator('#zip-export').isDisabled());await page.locator('#zip-limit-entry').fill('32');oldIndividualLimitVerified=true;
      }
    }
    await page.evaluate(()=>{window.progressEvents=[];const NativeWorker=window.Worker;window.Worker=class extends NativeWorker { constructor(...args){super(...args);this.addEventListener('message',({data})=>{if(data.type==='progress')window.progressEvents.push(data.progress);});} };});
    for(const fixture of fixtures) {
      await page.evaluate(()=>window.progressEvents=[]);
      await page.locator('#zipfile').setInputFiles({name:'authorized-project.zip',mimeType:'application/zip',buffer:Buffer.from(fixture.bytes)});
      const begun=Date.now();await page.locator('#zip-analyze').click();
      await page.waitForFunction(()=>!document.getElementById('zip-export').disabled||document.getElementById('zipstatus').textContent.startsWith('No se pudo analizar'),{},{timeout:35000});
      assert.equal(await page.locator('#zip-export').isDisabled(),false,await page.locator('#zipstatus').textContent());
      const downloadEvent=page.waitForEvent('download');await page.locator('#zip-export').click();const download=await downloadEvent;
      let json='';for await(const chunk of await download.createReadStream())json+=chunk.toString();const exported=JSON.parse(json);
      assert.equal(exported.report.version,'3.2.1');
      assert.equal(exported.report.compressedBytes,fixture.bytes.length);assert.equal(exported.draft.total,null);
      if(fixture.expected)assert.equal(exported.report.structure.length,fixture.expected);
      const progress=await page.evaluate(()=>window.progressEvents);assert(progress.length>0);assert.equal(progress.at(-1).done,progress.at(-1).total);
      for(let i=1;i<progress.length;i++)assert(progress[i].done>progress[i-1].done);
      if(!fixture.label.startsWith('Synthetic')) {assert(exported.report.counts.html>0);assert(exported.report.counts.javascript>0);}
      results.push({label:fixture.label,zipBytes:fixture.bytes.length,entries:exported.report.structure.length,expandedBytes:exported.report.expandedBytes,counts:exported.report.counts,analysisMs:exported.report.durationMs,uiAndExportMs:Date.now()-begun,progressEvents:progress.length,jsonParsed:true});
      await download.delete();
    }
    const many={};for(let i=0;i<1000;i++)many['file'+i+'.js']=new Uint8Array(100);
    await page.locator('#zipfile').setInputFiles({name:'cancel-in-progress.zip',mimeType:'application/zip',buffer:Buffer.from(f.zipSync(many,{level:0}))});
    await page.evaluate(()=>{window.progressEvents=[];window.heartbeats=0;window.heartbeatTimer=setInterval(()=>window.heartbeats++,10);});
    await page.locator('#zip-analyze').click();await page.waitForFunction(()=>window.progressEvents.length>=5);
    const cancelBegun=Date.now();await page.locator('#zip-cancel').click();assert.match(await page.locator('#zipstatus').textContent(),/cancelado/);
    assert(await page.locator('#zip-export').isDisabled());await page.waitForTimeout(150);assert.equal(await page.locator('#zip-report').textContent(),'');
    const heartbeatCount=await page.evaluate(()=>{clearInterval(window.heartbeatTimer);return window.heartbeats;});assert(heartbeatCount>0);
    const cancelMs=Date.now()-cancelBegun;
    for(const bytes of [f.zipSync({'../escape.js':new Uint8Array(1)}),f.zipSync({'bomb.bin':new Uint8Array(33*1048576)},{level:9})]) {
      await page.locator('#zipfile').setInputFiles({name:'malicious-test.zip',mimeType:'application/zip',buffer:Buffer.from(bytes)});await page.locator('#zip-analyze').click();
      await page.waitForFunction(()=>document.getElementById('zipstatus').textContent.startsWith('No se pudo analizar'));assert(await page.locator('#zip-export').isDisabled());
    }
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
    const output={results,externalRequests:external.length,pageErrors:errors.length,authorizedSourceFiles:files?Object.keys(files).length:null,originalZipWithoutRepacking:isOriginal,oldIndividualLimitVerified,cancellationAfterProgress:true,cancelMsIncluding150msObservation:cancelMs,heartbeatCount,maliciousBrowserCasesRejected:2};
    fs.writeFileSync(path.join(root,'.qa','zip-final-results.json'),JSON.stringify(output,null,2));console.log(JSON.stringify(output,null,2));
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});

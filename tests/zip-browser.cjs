// Run after installing Playwright locally: npm install --no-save --prefix .qa playwright
const {chromium}=require('../.qa/node_modules/playwright');
const fs=require('fs'), http=require('http'), path=require('path'), assert=require('assert/strict');
const f=require('../js/vendor/fflate.js');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]).replace(/\/$/,'/index.html'));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'application/octet-stream');res.end(data);});
});
(async()=>{
  await new Promise(r=>server.listen(4174,'127.0.0.1',r));
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  try {
    const page=await browser.newPage({acceptDownloads:true}); const errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:4174/'))external.push(r.url());});
    const file=(name,content)=>({name,mimeType:'application/zip',buffer:Buffer.from(content)});
    await page.goto('http://127.0.0.1:4174/admin/#zip');
    const sample=f.zipSync({'<img onerror=alert(1)>.html':new TextEncoder().encode('<form></form><script>fetch("https://example.test")</script>')});
    await page.locator('#zipfile').setInputFiles(file('small.zip',sample));await page.locator('#zip-analyze').click();await page.locator('#zip-export').waitFor({state:'visible'});await page.waitForFunction(()=>!document.getElementById('zip-export').disabled);
    assert.match(await page.locator('#zip-report').textContent(),/formularios candidatos: 1/);assert.equal(await page.locator('#zip-report img').count(),0);
    await page.locator('#zip-quote').click();assert.match(await page.locator('#zip-draft').textContent(),/"total": null/);
    const download=page.waitForEvent('download');await page.locator('#zip-export').click();assert.equal((await download).suggestedFilename(),'lxl-informe-zip.json');
    await page.locator('#zipfile').setInputFiles(file('bad.zip',new Uint8Array(20)));await page.locator('#zip-analyze').click();await page.waitForFunction(()=>document.getElementById('zipstatus').textContent.includes('No se pudo analizar'));assert(await page.locator('#zip-export').isDisabled());
    const many={};for(let i=0;i<2000;i++)many[i+'.js']=new Uint8Array(10);
    await page.locator('#zipfile').setInputFiles(file('cancel.zip',f.zipSync(many)));await page.locator('#zip-analyze').click();await page.locator('#zip-cancel').click();assert.match(await page.locator('#zipstatus').textContent(),/cancelado/);
    await page.locator('#zip > .card > details > summary').click();await page.locator('#zip-limit-seconds').fill('1');await page.locator('#zip-analyze').click();await page.waitForFunction(()=>document.getElementById('zipstatus').textContent.includes('Tiempo máximo'));assert(await page.locator('#zip-export').isDisabled());
    await page.locator('#zip-clear').click();assert.equal(await page.locator('#zipfile').inputValue(),'');
    for(const width of [320,768,1440]) {await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+width);await page.screenshot({path:path.join(root,'.qa',`zip-${width}.png`),fullPage:true});}
    for(const id of ['dashboard','proyectos','cotizaciones','clientes','modulos','plantillas','documentos','reportes','alertas','configuracion']) {await page.evaluate(id=>document.querySelector(`[data-view="${id}"]`).click(),id);assert(await page.locator('#'+id).isVisible());}
    await page.goto('http://127.0.0.1:4174/');await page.locator('#section').check();assert.match(await page.locator('#total').textContent(),/75.000/);await page.locator('#filter').check();assert.match(await page.locator('#total').textContent(),/115.000/);
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);console.log('PASS: Worker, static report, XSS text, draft, export, corruption, cancellation, timeout, discard, responsive layout, admin navigation, public formulas, zero external requests.');
  } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});

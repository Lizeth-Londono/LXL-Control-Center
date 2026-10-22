// UX-01: exercise the real DOM, File API and validation Worker, with synthetic projects only.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('../.qa/node_modules/playwright'),z=require('../js/zip-core.js'),f=require('../js/vendor/fflate.js');
const root=path.resolve(__dirname,'..'),base='http://127.0.0.1:4182/';
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,base).pathname.replace(/\/$/,'/index.html'));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,b)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(b);});});
(async()=>{
 const reports={};for(const project of ['Alpha','Beta'])reports[project]=JSON.stringify(await z.analyze(f.zipSync({[project+'/index.html']:new TextEncoder().encode('<h1>'+project+'</h1>')},{level:0}),z.limits(),f));
 await new Promise(r=>server.listen(4182,'127.0.0.1',r));const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage(),errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(base))external.push(r.url());});
  // Deterministic slow/error Workers retain the real validator for all successful imports.
  await page.addInitScript(()=>{const Native=window.Worker;window.Worker=class extends Native{postMessage(data){if(data.file?.name==='error.json'){queueMicrotask(()=>this.onerror?.(new Event('error')));return;}if(data.file?.name==='slow.json'){this.delay=setTimeout(()=>super.postMessage(data),6000);return;}super.postMessage(data);}terminate(){clearTimeout(this.delay);super.terminate();}};});
  await page.goto(base+'admin/#commercial');
  const pick=(name,body)=>page.locator('#commercial-file').setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(body)});
  const drop=async(name,body)=>{const dt=await page.evaluateHandle(({name,body})=>{const d=new DataTransfer();d.items.add(new File([body],name,{type:'application/json'}));return d;},{name,body});try{await page.locator('#commercial-drop').dispatchEvent('drop',{dataTransfer:dt});}finally{await dt.dispose();}};
  const wait=text=>page.waitForFunction(text=>document.getElementById('commercial-status').textContent.includes(text),text);
  const state=()=>page.evaluate(()=>({session:LXLCommercialSession.get(),file:document.getElementById('commercial-file').files[0]?.name||null,source:document.getElementById('commercial-active-file').textContent,project:document.getElementById('commercial-active-project').textContent}));
  const same=async before=>assert.deepEqual(await state(),before,'failed/cancelled candidate must not change committed source or commercial data');
  await pick('broken.json','{');await wait('No se pudo importar');assert.equal((await state()).file,null);assert.equal((await state()).session,null);
  await pick('Alpha.json',reports.Alpha);await wait('Informe importado.');assert.equal((await state()).file,'Alpha.json');assert.match((await state()).source,/Alpha.json/);assert.match((await state()).project,/Proyecto activo: Alpha/);
  await page.locator('#quote-client').fill('Cliente ficticio Alpha');await page.locator('#quote-project').fill('Proyecto Alpha revisado');await page.locator('#tariff-name').fill('Servicio ficticio Alpha');await page.locator('#commercial-tariff-form button').click();await page.locator('#commercial-service-select').selectOption({index:1});await page.locator('#commercial-add-line').click();
  const alpha=await state();
  await pick('broken.json','{');await wait('No se pudo importar');await same(alpha);
  await drop('broken-drop.json','{');await wait('No se pudo importar');await same(alpha);
  await pick('wrong.txt','{}');await wait('Selecciona un archivo .json');await same(alpha);
  await pick('large.json',' '.repeat(8*1048576+1));await wait('supera 8 MiB');await same(alpha);
  await page.evaluate(()=>{window.savedUXWorker=window.Worker;window.Worker=undefined;});await pick('Beta.json',reports.Beta);await wait('Se necesita un navegador con Worker');await same(alpha);await page.evaluate(()=>{window.Worker=window.savedUXWorker;delete window.savedUXWorker;});
  page.once('dialog',d=>d.dismiss());await drop('Beta.json',reports.Beta);await wait('Reemplazo cancelado');await same(alpha);
  await pick('slow.json',reports.Beta);await wait('Validando candidato');await same(alpha);await page.locator('#commercial-cancel').click();await wait('Importación cancelada');await same(alpha);
  await pick('error.json',reports.Beta);await wait('No se pudo iniciar la validación');await same(alpha);
  await pick('slow.json',reports.Beta);await wait('superó 5 segundos');await same(alpha);
  // A later attempt supersedes an in-flight candidate; no delayed project may commit.
  await pick('slow.json',reports.Alpha);await wait('Validando candidato');page.once('dialog',d=>d.accept());await drop('Beta.json',reports.Beta);await wait('Informe importado.');
  const beta=await state();assert.equal(beta.file,'Beta.json');assert.equal(beta.session.source.name,'Beta.json');assert.equal(beta.session.model.project,'Beta');assert.equal(beta.session.model.client,'');assert.deepEqual(beta.session.catalog,[]);assert.deepEqual(beta.session.lines,[]);assert(beta.session.report.structure.every(e=>e.path.startsWith('Beta/')));assert.match(beta.project,/Proyecto activo: Beta/);
  await page.waitForTimeout(6200);await same(beta);
  await page.locator('#quote-client').fill('Cliente ficticio Beta');await page.locator('#quote-project').fill('Proyecto Beta revisado');await page.locator('#tariff-name').fill('Servicio ficticio Beta');await page.locator('#commercial-tariff-form button').click();await page.locator('#commercial-service-select').selectOption({index:1});await page.locator('#commercial-add-line').click();await page.locator('#quote-taxMode').selectOption('none');await page.locator('#quote-number').fill('QA-BETA');
  const beforeNew=await state();page.once('dialog',d=>d.dismiss());await page.locator('#commercial-new-quote').click();await same(beforeNew);
  page.once('dialog',d=>d.accept());await page.locator('#commercial-new-quote').click();const fresh=await state();assert.equal(fresh.session.model.project,'Proyecto Beta revisado');assert.equal(fresh.file,'Beta.json');assert.equal(fresh.session.model.client,'');assert.equal(fresh.session.model.number,'');assert.equal(fresh.session.model.status,'borrador');assert.equal(fresh.session.settingsRaw.taxMode,'pending');assert.deepEqual(fresh.session.lines,[]);assert.deepEqual(fresh.session.catalog,beforeNew.session.catalog);assert.deepEqual(fresh.session.report,beforeNew.session.report);assert.match(fresh.project,/Proyecto activo: Proyecto Beta revisado/);
  page.once('dialog',d=>d.accept());await pick('Alpha.json',reports.Alpha);await wait('Informe importado.');assert.equal((await state()).file,'Alpha.json');assert.deepEqual((await state()).session.catalog,[]);
  // A literal filename cannot inject HTML; the source and project are text only.
  page.once('dialog',d=>d.accept());await drop('<img onerror=alert(1)>.json',reports.Beta);await wait('Informe importado.');assert.equal(await page.locator('#commercial-active-file img, #commercial-active-project img').count(),0);
  page.once('dialog',d=>d.accept());await page.locator('#commercial-discard').click();assert.equal((await state()).session,null);assert.equal((await state()).file,null);assert.match((await state()).source,/No hay un informe activo/);assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);console.log(JSON.stringify({status:'PASS',suite:'UX-01',pickerAndDrop:true,invalidFirst:true,failurePreservesSession:['parse','extension','size','worker-unavailable','worker-error','timeout','cancel','replacement-declined'],supersededCandidate:true,atomicReplacement:true,newQuoteProjectContext:true,inertFilename:true,discard:true,externalRequests:0}));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;}).finally(()=>setTimeout(()=>process.exit(process.exitCode||0),50));

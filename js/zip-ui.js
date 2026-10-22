(function () {
  'use strict';
  const $ = id => document.getElementById(id), defaults = LXLZip.limits(navigator.deviceMemory || 0);
  let worker, timer, report;
  const status = text => { $('zipstatus').textContent = text; };
  const fields = [['compressed','ZIP comprimido (MiB)',1048576], ['expanded','Total descomprimido (MiB)',1048576], ['entry','Por archivo (MiB)',1048576], ['entries','Máximo de entradas',1], ['seconds','Tiempo máximo (segundos)',1]];
  for (const [key,label,unit] of fields) {
    const wrapper = document.createElement('label'); wrapper.className='field'; wrapper.textContent=label;
    const input=document.createElement('input'); input.type='number'; input.required=true; input.min='1'; input.max=defaults[key]/unit; input.value=defaults[key]/unit; input.id='zip-limit-'+key;
    wrapper.append(input); $('zip-limits').append(wrapper);
  }
  $('zip-memory').textContent = navigator.deviceMemory ? `Memoria aproximada informada por el navegador: ${navigator.deviceMemory} GiB. No representa memoria libre.` : 'El navegador no informa memoria: se usa un presupuesto conservador de 64 MiB comprimidos.';
  function stop() { worker?.terminate(); worker=null; clearTimeout(timer); $('zip-cancel').disabled=true; $('zip-analyze').disabled=false; $('zipfile').disabled=false; $('zip-progress').hidden=true; }
  function clear() { report=null; $('zip-report').replaceChildren(); $('zip-draft').textContent=''; $('zip-export').disabled=true; $('zip-quote').disabled=true; }
  function list(title, values) {
    const box=document.createElement('details'); box.className='card'; const heading=document.createElement('summary'); heading.textContent=title; box.append(heading);
    const ul=document.createElement('ul'); for(const value of values) { const li=document.createElement('li'); li.textContent=value; ul.append(li); } box.append(ul); $('zip-report').append(box);
  }
  function render() {
    const summary=document.createElement('p'); summary.className='notice'; summary.textContent=`Análisis completo: ${report.structure.length} entradas · ${(report.expandedBytes/1048576).toFixed(2)} MiB descomprimidos · ${(report.durationMs/1000).toFixed(1)} s. HTML: ${report.counts.html}, CSS: ${report.counts.css}, JS/TS: ${report.counts.javascript}, imágenes: ${report.counts.images}, otros recursos: ${report.counts.resources}, formularios candidatos: ${report.counts.forms}.`; $('zip-report').append(summary);
    list('Estructura comprobada',report.structure.map(e=>`${e.path} (${e.bytes} bytes)`));
    list('Tecnologías y evidencias',report.findings.map(f=>`${f.technology} · ${f.confidence} · ${f.path}: ${f.evidence}`));
    list('Advertencias y límites',report.warnings);
    list('Posibles módulos cotizables — estimación de alcance',report.modules);
    $('zip-export').disabled=false; $('zip-quote').disabled=false;
  }
  $('zipfile').addEventListener('change',()=>{ stop(); clear(); status($('zipfile').files[0] ? 'Archivo seleccionado. Pulsa Analizar ZIP.' : 'Ningún archivo seleccionado.'); });
  $('zip-analyze').addEventListener('click',()=>{
    clear(); const file=$('zipfile').files[0]; if(!file) { status('Selecciona un archivo ZIP.'); return; }
    const cap={...defaults};
    for(const [key,,unit] of fields) { const input=$('zip-limit-'+key); if(!input.reportValidity()) return; cap[key]=Number(input.value)*unit; }
    if(!/\.zip$/i.test(file.name)) { status('Selecciona un archivo con extensión .zip.'); return; }
    try { LXLZip.checkLimit('Tamaño comprimido del ZIP', file.size, cap.compressed); } catch(error) { status(error.message); return; }
    if(!window.Worker) { status('Este navegador no admite Workers. Usa un navegador moderno desde un servidor local.'); return; }
    try {
      worker=new Worker('../js/zip-worker.js'); $('zip-analyze').disabled=true; $('zipfile').disabled=true; $('zip-cancel').disabled=false; $('zip-progress').hidden=false; $('zip-progress').removeAttribute('value'); status('Validando estructura y analizando localmente…');
      const deadline=performance.now();
      timer=setTimeout(()=>{const elapsed=Math.round(performance.now()-deadline);stop(); clear(); status(`Tiempo máximo alcanzado: detectado ${elapsed} ms; límite aplicado ${cap.seconds*1000} ms. Se detuvo el análisis; divide el proyecto.`);},cap.seconds*1000);
      const activeWorker=worker;
      worker.onmessage=({data})=>{
        if(worker!==activeWorker)return;
        if(data.type==='progress') { $('zip-progress').value=data.progress.done; $('zip-progress').max=data.progress.total; status(`Analizando ${data.progress.done} de ${data.progress.total} entradas…`); }
        else if(data.type==='complete') { stop(); report=data.report; render(); status('Informe listo. No se enviaron ni guardaron archivos.'); }
        else { stop(); clear(); status('No se pudo analizar: '+data.message); }
      };
      worker.onerror=()=>{if(worker!==activeWorker)return;stop(); clear(); status('No se pudo iniciar o completar el Worker. Sirve el proyecto por HTTP local y verifica los archivos de la biblioteca.');};
      worker.postMessage({file,limits:cap});
    } catch { stop(); status('No se pudo iniciar el analizador local.'); }
  });
  $('zip-cancel').addEventListener('click',()=>{stop(); clear(); status('Análisis cancelado. Se liberó el Worker y no se conserva un informe parcial.');});
  $('zip-clear').addEventListener('click',()=>{stop(); clear(); $('zipfile').value=''; status('Archivo e informe descartados de esta sesión.');});
  function draft() { return { title:'Borrador de alcance LXL — pendiente de revisión', modules:report.modules, counts:report.counts, pricingStatus:'Sin tarifario aprobado en el repositorio. Importes y total pendientes de aprobación. No se aplicaron los valores ilustrativos del cotizador público.', total:null }; }
  $('zip-quote').addEventListener('click',()=>{ if(report) $('zip-draft').textContent=JSON.stringify(draft(),null,2); });
  $('zip-export').addEventListener('click',()=>{
    if(!report)return; const url=URL.createObjectURL(new Blob([JSON.stringify({report,draft:draft()},null,2)],{type:'application/json'}));
    const a=document.createElement('a'); a.href=url; a.download='lxl-informe-zip.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  addEventListener('pagehide',()=>{stop(); clear(); $('zipfile').value='';});
})();

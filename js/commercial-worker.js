'use strict';
importScripts('commercial-core.js');
self.onmessage=async({data})=>{try{const file=data.file;if(file.size>LXLCommercial.MAX_JSON)throw new Error('El JSON supera el máximo de 8 MiB.');const report=LXLCommercial.parseReport(await file.text());self.postMessage({report});}catch(e){self.postMessage({error:e.message||'No se pudo importar el informe.'});}};

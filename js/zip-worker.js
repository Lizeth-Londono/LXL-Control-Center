'use strict';
importScripts('vendor/fflate.js', 'zip-core.js');
self.onmessage = async ({ data }) => {
  try {
    const { file, limits } = data;
    LXLZip.checkLimit('Tamaño comprimido del ZIP', file.size, limits.compressed);
    const report = await LXLZip.analyze(new Uint8Array(await file.arrayBuffer()), limits, fflate,
      progress => self.postMessage({ type: 'progress', progress }));
    self.postMessage({ type: 'complete', report });
  } catch (error) { self.postMessage({ type: 'error', message: error.message || 'No se pudo leer el ZIP.' }); }
};

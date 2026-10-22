// Additional safety probes; prints only synthetic metadata.
const assert=require('node:assert/strict'), f=require('../js/vendor/fflate.js'), z=require('../js/zip-core.js');
const cap=z.limits(), enc=s=>new TextEncoder().encode(s);
function fixture(){return f.zipSync({'a.js':enc('hello'),'b.js':enc('world')},{level:0});}
function central(bytes){const v=new DataView(bytes.buffer);return v.getUint32(bytes.length-6,true);}
(async()=>{
  const results=[];
  let b=fixture(),v=new DataView(b.buffer),p=central(b);v.setUint32(p+38,0xa0000000,true);
  await assert.rejects(z.analyze(b,cap,f),/enlaces/);results.push('Symlink rejected');
  b=fixture();v=new DataView(b.buffer);p=central(b);const next=p+46+v.getUint16(p+28,true);v.setUint32(next+42,0,true);
  await assert.rejects(z.analyze(b,cap,f));results.push('Overlapping/incoherent local entry rejected');
  b=fixture();v=new DataView(b.buffer);p=central(b);b[30]=120;
  await assert.rejects(z.analyze(b,cap,f),/Ruta/);results.push('Local/central path mismatch rejected');
  const ticks=[];const r=await z.analyze(f.zipSync({'index.html':enc('<html></html>'),'last/':new Uint8Array(0)},{level:0}),cap,f,x=>ticks.push(x));
  assert.equal(r.structure.length,2);assert.equal(ticks.at(-1).done,2);assert.equal(ticks.at(-1).total,2);
  results.push('Trailing directories reach complete progress');
  await assert.rejects(z.analyze(f.zipSync({'directory/':enc('payload')},{level:0}),cap,f),/carpeta anómala/);
  results.push('Directory payload rejected');
  for(const level of [0,6]) {
    const valid=f.zipSync({'empty/':new Uint8Array(0)},{level});
    const validReport=await z.analyze(valid,cap,f);assert.equal(validReport.counts.resources,0);
    const forged=f.zipSync({'empty/':enc('hidden payload')},{level}), view=new DataView(forged.buffer), dir=central(forged);
    view.setUint32(22,0,true);view.setUint32(14,0,true);view.setUint32(dir+24,0,true);view.setUint32(dir+16,0,true);
    await assert.rejects(z.analyze(forged,cap,f),/expansión real/);
  }
  results.push('Empty Store/Deflate directories validated; forged directory payload rejected by actual expansion check');
  console.log(results.join('\n'));process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});

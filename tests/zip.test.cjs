const {test}=require('node:test');
const assert=require('node:assert/strict');
const z=require('../js/zip-core.js'), f=require('../js/vendor/fflate.js');
const encode=s=>new TextEncoder().encode(s), cap=z.limits();
const zip=(files,level=0)=>f.zipSync(Object.fromEntries(Object.entries(files).map(([k,v])=>[k,typeof v==='string'?encode(v):v])),{level});
test('small project: structure, dependency evidence, forms and no execution',async()=>{
  global.executed=false;
  const r=await z.analyze(zip({'site/index.html':'<form></form><script>global.executed=true</script><link href="bootstrap.min.css">','site/app.js':'fetch("https://example.test"); supabase.auth.signInWithPassword({})','package.json':'{"dependencies":{"bootstrap":"5.3.0"}}','style.css':'body{}','logo.png':new Uint8Array(10)}),cap,f);
  assert.equal(r.counts.forms,1);assert.equal(r.counts.html,1);assert.equal(r.counts.images,1);assert(r.findings.some(x=>x.technology==='bootstrap'&&x.confidence==='comprobado'));assert(r.findings.some(x=>x.technology==='Supabase'&&x.confidence==='indicio'));assert.equal(global.executed,false);
});
test('medium: 1000 entries with progress',async()=>{
  let ticks=0;const files={};for(let i=0;i<1000;i++)files[`p/${i}.js`]='export const x=1;';
  const r=await z.analyze(zip(files,6),cap,f,()=>ticks++);assert.equal(r.structure.length,1000);assert.equal(ticks,1000);
});
test('large: 20 MiB compressed, above old illustrative 15 MiB',async()=>{
  const files={};for(let i=0;i<5;i++)files[`asset${i}.bin`]=new Uint8Array(4*1048576);
  const b=zip(files);assert(b.length>15*1048576);const r=await z.analyze(b,cap,f);assert.equal(r.expandedBytes,20*1048576);
});
test('deflated data and empty ZIP accepted',async()=>{
  await z.analyze(zip({'index.html':'<html><form></form></html>'},6),cap,f);assert.equal((await z.analyze(zip({}),cap,f)).structure.length,0);
});
test('corrupt, traversal, duplicate, deep and bomb archives rejected',async()=>{
  const cases=[new Uint8Array(10), zip({'../evil.js':'x'}),zip({'/absolute':'x'}),zip({'a\\evil':'x'}),zip({'a:evil':'x'}),zip({'a/./b':'x'}),zip({'A.js':'x','a.js':'x'}),zip({['a/'.repeat(25)+'x']:'x'}),zip({'bomb.txt':new Uint8Array(1048576)},9)];
  for(const b of cases)await assert.rejects(z.analyze(b,cap,f));
});
test('compressed, expanded, per-file, entry count and deadline limits',async()=>{
  const b=zip({'a.js':'hello','b.css':'body{}'});
  for(const overrides of [{compressed:1},{expanded:1},{entry:1},{entries:1},{seconds:-1}]) await assert.rejects(z.analyze(b,{...cap,...overrides},f));
});
test('CRC corruption, unsupported methods, encrypted and ZIP64 archives',async()=>{
  const original=zip({'a.js':'hello'});let b=original.slice();b[35]^=1;await assert.rejects(z.analyze(b,cap,f),/CRC/);
  for(const mutate of [v=>v.setUint16(original.length-12,65535,true),v=>v.setUint16(8,99,true),v=>v.setUint16(6,1,true)]) {b=original.slice();mutate(new DataView(b.buffer));await assert.rejects(z.analyze(b,cap,f));}
});
test('real expansion cannot exceed false declared sizes',async()=>{
  const b=zip({'a.js':'hello world '.repeat(2000)},6),v=new DataView(b.buffer);const end=b.length-22,central=v.getUint32(end+16,true);v.setUint32(22,1,true);v.setUint32(central+24,1,true);
  await assert.rejects(z.analyze(b,cap,f),/expansión real/);
});

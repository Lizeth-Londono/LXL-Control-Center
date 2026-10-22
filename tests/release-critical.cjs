// Serialize browser suites: each suite owns a local server and Chrome instance.
// Usage: node tests/release-critical.cjs "PATH_TO_AUTHORIZED_ORIGINAL.zip" 289
const {spawnSync}=require('node:child_process');
const path=require('node:path');
if(!process.argv[2])throw new Error('Provide an authorized local ZIP; it is never uploaded.');
for(const [script,args] of [
 ['zip-browser.cjs',[]],
 ['zip-final.cjs',[process.argv[2],process.argv[3]||'289']],
 ['commercial-browser.cjs',[process.argv[2]]]
]){
 console.log('START',script,new Date().toISOString());
 const result=spawnSync(process.execPath,[path.join(__dirname,script),...args],{stdio:'inherit'});
 if(result.error)throw result.error;
 if(result.status!==0){console.error('STOP: critical suite failed:',script);process.exit(result.status||1);}
 console.log('PASS',script,new Date().toISOString());
}

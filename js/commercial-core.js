(function(root){
  'use strict';
  const MAX_JSON=8*1048576, MAX_MONEY=1000000000000;
  const assert=(ok,message)=>{if(!ok)throw new Error(message);};
  function text(value,label,max=1000){assert(typeof value==='string'&&value.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value),`${label}: texto inválido o demasiado largo.`);return value;}
  function integer(value,label,max=Number.MAX_SAFE_INTEGER){assert(Number.isSafeInteger(value)&&value>=0&&value<=max,`${label}: número inválido.`);return value;}
  function path(value){text(value,'Ruta',512);assert(!/[\\:\x00-\x1f\x7f]/.test(value)&&value.replace(/\/$/,'').split('/').every(p=>p&&p!=='.'&&p!=='..'),'Ruta insegura en el informe.');return value;}
  function parseReport(source){
    assert(typeof source==='string'&&new TextEncoder().encode(source).length<=MAX_JSON,'El informe supera 8 MiB.');
    let quoted=false,escaped=false,depth=0,tokens=0;
    for(const ch of source){if(quoted){if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch==='"')quoted=false;continue;}if(ch==='"')quoted=true;else if(ch==='{'||ch==='['){assert(++depth<=17,'Estructura JSON excesiva: profundidad máxima 16.');tokens++;}else if(ch==='}'||ch===']')depth--;else if(ch===','||ch===':')tokens++;assert(tokens<=120000,'Estructura JSON excesiva: demasiados elementos.');}
    let data;try{data=JSON.parse(source);}catch{throw new Error('JSON inválido. Selecciona un informe exportado por el analizador ZIP.');}
    const stack=[{v:data,d:0}];let nodes=0;
    while(stack.length){const {v,d}=stack.pop();assert(++nodes<=60000&&d<=16,'Estructura JSON excesiva: máximo 60.000 valores y profundidad 16.');
      if(typeof v==='string')text(v,'Contenido',4096);
      if(v&&typeof v==='object')for(const k in v){if(!Object.hasOwn(v,k))continue;assert(!['__proto__','prototype','constructor'].includes(k),'Clave JSON no permitida.');assert(k.length<=128,'Clave JSON demasiado larga.');assert(stack.length+nodes<60000,'Estructura JSON excesiva: máximo 60.000 valores.');stack.push({v:v[k],d:d+1});}
    }
    const r=data?.report||data;assert(r&&typeof r==='object'&&!Array.isArray(r),'Falta el objeto report.');
    assert(['3.2','3.2.1','3.3'].includes(r.version),'Versión de informe no soportada. Se admite ZIP v3.2, v3.2.1 y v3.3.');
    assert(Array.isArray(r.structure)&&r.structure.length<=5000,'Estructura de archivos inválida o superior a 5000 entradas.');
    const seen=new Set();let sum=0;
    r.structure.forEach(e=>{assert(e&&typeof e==='object','Entrada inválida.');path(e.path);const key=e.path.normalize('NFC').toLowerCase();assert(!seen.has(key),'Rutas duplicadas en el informe.');seen.add(key);integer(e.bytes,'Tamaño de archivo',32*1048576);assert(typeof e.directory==='boolean'&&e.directory===e.path.endsWith('/'),'Tipo de entrada incoherente.');assert(!e.directory||e.bytes===0,'Carpeta con datos no admitida.');sum+=e.bytes;});
    integer(r.compressedBytes,'Tamaño comprimido',256*1048576);integer(r.expandedBytes,'Tamaño descomprimido',512*1048576);assert(sum===r.expandedBytes,'El total descomprimido no coincide con la estructura.');integer(r.durationMs,'Duración');
    assert(r.counts&&typeof r.counts==='object'&&!Array.isArray(r.counts),'Conteos técnicos inválidos.');for(const k of ['html','css','javascript','images','resources','forms'])integer(r.counts[k],`Conteo ${k}`,1000000);
    const actual={html:0,css:0,javascript:0,images:0,resources:0};for(const e of r.structure){if(e.directory)continue;const ext=e.path.split('.').pop().toLowerCase(),key=/^html?$/.test(ext)?'html':ext==='css'?'css':/^(?:[cm]?jsx?|tsx?)$/.test(ext)?'javascript':/^(png|jpe?g|svg|webp|avif|gif|ico)$/.test(ext)?'images':'resources';actual[key]++;}for(const k of Object.keys(actual))assert(actual[k]===r.counts[k],`Conteo ${k} incoherente con la estructura.`);
    for(const [key,max] of [['warnings',5001],['modules',500]]){assert(Array.isArray(r[key])&&r[key].length<=max,`${key}: lista inválida.`);r[key].forEach(v=>text(v,key,4096));}
    assert(Array.isArray(r.findings)&&r.findings.length<=500,'Lista de tecnologías inválida.');r.findings.forEach(f=>{assert(f&&typeof f==='object'&&!Array.isArray(f),'Hallazgo técnico inválido.');text(f.technology,'Tecnología',256);path(f.path);assert(seen.has(f.path.normalize('NFC').toLowerCase()),'Hallazgo sin archivo de evidencia.');text(f.evidence,'Evidencia',1000);assert(['comprobado','indicio'].includes(f.confidence),'Nivel de confianza inválido.');});
    assert(r.limits&&typeof r.limits==='object','Faltan límites del análisis.');for(const k of ['compressed','expanded','entry','entries','seconds','ratio','depth','text'])integer(r.limits[k],`Límite ${k}`);
    // Preserve imported technical evidence; never use imported draft prices or executable markup.
    return r;
  }
  function commercialScope(report){
    const excluded=/(^|\/)(?:\.git|\.github|\.gitlab|node_modules|vendor|bower_components|dist|build|coverage|\.cache|\.next|\.nuxt|\.vite|\.pytest_cache|\.venv|__pycache__|\.idea|\.vscode|tests?|docs?)(\/|$)|(?:^|\/)(?:\.env(?:\.[^/]*)?|\.DS_Store|Thumbs\.db|package(?:-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|(?:README|LICENSE|CHANGELOG|CONTRIBUTING|SECURITY)(?:\.[^/]*)?|tsconfig(?:\.[^/]*)?\.json|(?:vite|webpack|eslint|prettier)\.config\.[^/]+)$|\.(?:map|log|patch|bak|tmp|zip|tgz)$/i;
    const included=[],omitted=[],counts={html:0,css:0,javascript:0,images:0,resources:0};
    for(const e of report.structure){if(e.directory)continue;if(excluded.test(e.path)){omitted.push(e);continue;}included.push(e);const ext=e.path.split('.').pop().toLowerCase();const kind=/^html?$/.test(ext)?'html':ext==='css'?'css':/^(?:[cm]?jsx?|tsx?)$/.test(ext)?'javascript':/^(png|jpe?g|svg|webp|avif|gif|ico)$/.test(ext)?'images':'resources';counts[kind]++;}
    return {included,omitted,counts};
  }
  function decimal(value,places,label,max){
    const s=String(value).trim();assert(new RegExp(`^\\d+(?:\\.\\d{1,${places}})?$`).test(s),`${label}: usa punto decimal y hasta ${places} decimales, sin separadores de miles.`);
    const [whole,fraction='']=s.split('.');const n=BigInt(whole)*10n**BigInt(places)+BigInt(fraction.padEnd(places,'0'));assert(n<=BigInt(max),`${label}: excede el máximo permitido.`);return Number(n);
  }
  const money=value=>decimal(value,2,'Precio',MAX_MONEY);
  const quantity=value=>{const n=decimal(value,2,'Cantidad',999999);assert(n>0,'La cantidad debe ser mayor que cero.');return n;};
  const percent=value=>decimal(value,2,'Porcentaje',10000);
  const round=(n,d)=>(n+d/2n)/d;
  function calculate(lines,settings){
    assert(Array.isArray(lines)&&lines.length<=100,'Máximo 100 conceptos.');let subtotal=0n;const issues=[],items=[];
    for(const line of lines){text(line.name,'Servicio',160);text(line.description,'Descripción',2000);integer(line.quantity,'Cantidad',999999);assert(line.quantity>0,'Cantidad inválida.');
      assert(['pending','illustrative','approved'].includes(line.approval),'Estado de tarifa inválido.');
      if(line.price!==null)integer(line.price,'Precio',MAX_MONEY);
      const amount=line.price===null?null:round(BigInt(line.price)*BigInt(line.quantity),100n);if(amount!==null)subtotal+=amount;
      if(line.price===null||line.approval!=='approved'||!line.reference?.trim())issues.push('Hay precios pendientes, ilustrativos o sin referencia de aprobación.');
      if(!line.description.trim())issues.push('Completa la descripción de cada servicio.');
      if(line.scopeConfirmed===false)issues.push('Confirma el alcance comercial de los servicios propuestos.');
      items.push({...line,total:amount===null?null:Number(amount)});
    }
    assert(subtotal<=BigInt(MAX_MONEY),'Subtotal fuera de presupuesto.');integer(settings.discountBps,'Descuento',10000);integer(settings.taxBps,'Impuesto',10000);
    assert(['pending','none','percent'].includes(settings.taxMode),'Configuración tributaria inválida.');
    if(settings.discountBps>0)assert(settings.discountAuthorized&&settings.discountReference?.trim(),'El descuento requiere autorización explícita y referencia.');
    const discount=round(subtotal*BigInt(settings.discountBps),10000n),base=subtotal-discount;
    if(settings.taxMode==='pending')issues.push('Configuración de impuestos pendiente de revisión.');
    if(settings.taxMode==='percent')assert(settings.taxLabel?.trim(),'Indica el nombre del impuesto configurado.');
    const tax=settings.taxMode==='percent'?round(base*BigInt(settings.taxBps),10000n):0n,total=base+tax;
    assert(total<=BigInt(MAX_MONEY),'Total fuera del máximo permitido.');if(!lines.length)issues.push('Selecciona al menos un servicio.');
    return {items,subtotal:Number(subtotal),discount:Number(discount),base:Number(base),tax:Number(tax),total:Number(total),issues:[...new Set(issues)],hasPendingPrice:lines.some(l=>l.price===null)};
  }
  function readiness(model,result){
    const issues=[...result.issues];for(const [k,label] of [['project','proyecto'],['client','cliente'],['contact','contacto'],['issuer','datos comerciales LXL'],['number','número de documento'],['date','fecha'],['validUntil','vigencia'],['description','descripción del proyecto'],['conditions','condiciones'],['scope','alcance incluido'],['exclusions','exclusiones']])if(!model[k]?.trim())issues.push(`Completa ${label}.`);
    assert(['quotation','proforma','collection','electronic'].includes(model.type),'Tipo de documento inválido.');
    if(model.date&&model.validUntil&&model.validUntil<model.date)issues.push('La vigencia no puede ser anterior a la fecha.');
    if(model.date&&!validDate(model.date))issues.push('Fecha de documento inválida.');if(model.validUntil&&!validDate(model.validUntil))issues.push('Vigencia inválida.');
    if(['proforma','collection'].includes(model.type)&&!model.typeConfirmed)issues.push('Confirma que el tipo de documento corresponde al caso.');
    if(model.type==='electronic')issues.push('Factura electrónica oficial no disponible en esta DEMO.');
    if(model.type==='collection')for(const [key,label] of [['issuerLegal','nombre legal del emisor'],['issuerId','identificación tributaria del emisor'],['issuerAddress','dirección del emisor'],['issuerContact','contacto del emisor'],['clientId','identificación del cliente'],['clientAddress','dirección del cliente']])if(!model[key]?.trim())issues.push(`Para cuenta de cobro final, completa ${label}.`);
    return [...new Set(issues)];
  }
  function validDate(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;}
  function payment(value){
    assert(value&&typeof value==='object','Abono inválido.');integer(value.amount,'Importe del abono',MAX_MONEY);assert(value.amount>0,'El abono debe ser mayor que cero.');
    assert(validDate(value.date),'Fecha de abono inválida.');text(value.method,'Medio de pago',80);assert(value.method.trim(),'Indica el medio de pago.');text(value.reference||'','Referencia',160);text(value.notes||'','Observaciones',1000);
    return {amount:value.amount,date:value.date,method:value.method.trim(),reference:(value.reference||'').trim(),notes:(value.notes||'').trim()};
  }
  const normal=s=>s.normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('es');
  function payments(total,values){
    integer(total,'Total del proyecto',MAX_MONEY);assert(Array.isArray(values)&&values.length<=100,'Máximo 100 abonos.');let received=0n;const seen=new Set(),refs=new Set();
    const items=values.map(v=>{const p=payment(v),ref=normal(p.reference),key=JSON.stringify([p.amount,p.date,normal(p.method),ref]);assert(!seen.has(key),'Abono duplicado: revisa importe, fecha, medio y referencia.');assert(!ref||!refs.has(ref),'Referencia de abono duplicada.');seen.add(key);if(ref)refs.add(ref);received+=BigInt(p.amount);return p;});
    assert(received<=BigInt(MAX_MONEY),'La suma de abonos excede el máximo permitido.');const balance=BigInt(total)-received;
    return {items,received:Number(received),balance:Number(balance),due:Number(balance>0n?balance:0n),credit:Number(balance<0n?-balance:0n)};
  }
  function automation(report,sourceName){
    const scope=commercialScope(report),technologies=[...new Set(report.findings.filter(f=>scope.included.some(e=>e.path===f.path)).map(f=>`${f.technology} (${f.confidence})`))];
    return {project:sourceName.replace(/\.json$/i,'').replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,160),description:`Informe técnico: ${scope.counts.html} archivos HTML, ${scope.counts.css} CSS, ${scope.counts.javascript} JS/TS y ${scope.counts.images} imágenes dentro del alcance candidato. No equivale a páginas o servicios contratados.`,scope:`Propuesta para revisión humana sobre ${scope.included.length} archivos propios; ${scope.omitted.length} auxiliares excluidos. Confirmar funcionalidades y entregables antes de aprobar.`,exclusions:'Sin cobro automático por archivos, dependencias, cachés o detecciones repetidas. Integraciones, publicación y servicios externos requieren alcance y aprobación específicos.',technologies,proposeBase:scope.counts.html>0};
  }
  const formatMoney=cents=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:2,maximumFractionDigits:2}).format(cents/100);
  const api={MAX_JSON,parseReport,commercialScope,money,quantity,percent,calculate,readiness,formatMoney,validDate,payment,payments,automation};root.LXLCommercial=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);

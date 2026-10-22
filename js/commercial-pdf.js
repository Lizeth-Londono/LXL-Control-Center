(function(root){
 'use strict';
 const labels={quotation:'Cotización',proforma:'Proforma',collection:'Cuenta de cobro'};
 function printable(value){const s=String(value||'').replace(/[–—‑]/g,'-').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/…/g,'...');if(/[^\x09\x0a\x0d\x20-\xff]/.test(s))throw new Error('El PDF admite texto latino y español. Revisa caracteres de otros alfabetos o símbolos antes de exportar.');return s;}
 async function build(model,lines,settings,received=[]){
  if(model.type==='electronic')throw new Error('La factura electrónica oficial requiere una integración habilitada; no se genera desde esta DEMO.');
  const result=LXLCommercial.calculate(lines,settings),issues=LXLCommercial.readiness(model,result),draft=issues.length>0||model.status!=='aprobada',balance=LXLCommercial.payments(result.total,received);
  const doc=new jspdf.jsPDF({unit:'mm',format:'a4',compress:true});let y=48;
  const ink=[27,16,45],muted=[91,81,108],teal=[0,136,128],money=LXLCommercial.formatMoney;
  doc.setProperties({title:`${labels[model.type]} ${printable(model.number)} - LXL`,author:'LXL - CODE × LIHEN',subject:'Documento comercial DEMO; no es factura electrónica'});
  const logo=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('No se pudo cargar el logotipo local.'));img.src='../img/logo-mockup.png';});
  function header(){if(doc.getNumberOfPages()>100)throw new Error('El PDF supera 100 páginas. Reduce las descripciones o divide el documento.');doc.setFillColor(...ink);doc.rect(0,0,210,37,'F');doc.addImage(logo,'PNG',15,4,30,26);doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(17);doc.text('LXL - CODE × LIHEN',54,15);doc.setFontSize(11);doc.text(printable(labels[model.type]),54,23);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text(draft?'BORRADOR - REQUIERE REVISIÓN':'DEMO - REVISADO EN SESIÓN LOCAL',54,30);y=47;}
  function space(height){if(y+height>273){doc.addPage();header();}}
  function paragraph(value,{bold=false,size=10,color=ink}={}){doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(...color);const lines=doc.splitTextToSize(printable(value),180);for(const line of lines){space(6);doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(...color);doc.text(line,15,y);y+=5.4;}y+=2;}
  function section(title,value){space(16);paragraph(title,{bold:true,size:11,color:teal});paragraph(value||'Pendiente de completar.');}
  header();
  paragraph(`Documento: ${model.number||'Sin número'} | Fecha: ${model.date||'Pendiente'} | Vigencia: ${model.validUntil||'Pendiente'}`,{size:9});
  paragraph(`Estado: ${model.status} (registro local; no acredita envío ni aprobación externa)`,{size:8,color:muted});
  section('Datos comerciales LXL',[model.issuerTrade,model.issuer,model.issuerLegal?`Nombre legal: ${model.issuerLegal}`:'',model.issuerId?`NIT / identificación: ${model.issuerId}`:'',model.issuerAddress,model.issuerContact].filter((v,i,a)=>v&&a.indexOf(v)===i).join('\n'));
  section('Cliente y contacto',`${model.client||'Pendiente'}\n${model.contact||''}${model.clientId?'\nIdentificación: '+model.clientId:''}${model.clientAddress?'\n'+model.clientAddress:''}`);section('Proyecto',`${model.project||'Pendiente'}\n${model.description||''}`);
  space(20);paragraph('Servicios y adicionales',{bold:true,size:12,color:teal});
  function tableHead(){space(15);doc.setFillColor(237,244,243);doc.rect(15,y-4,180,9,'F');doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(...ink);doc.text('Concepto',17,y+1);doc.text('Cantidad',115,y+1,{align:'right'});doc.text('Unitario COP',155,y+1,{align:'right'});doc.text('Importe COP',193,y+1,{align:'right'});y+=12;}
  tableHead();
  if(!result.items.length)paragraph('No hay servicios seleccionados.');
  for(const line of result.items){const parts=doc.splitTextToSize(printable(`${line.name}${line.additional?' (adicional)':''}\n${line.description}\nTarifa: ${line.approval==='approved'?'aprobada localmente':line.approval==='illustrative'?'ilustrativa':'pendiente'}`),84);
   if(parts.length*3.6+5<=200&&y+parts.length*3.6+5>268){doc.addPage();header();tableHead();}
   for(let start=0;start<parts.length;){let capacity=Math.floor((268-y-5)/3.6);if(capacity<1){doc.addPage();header();tableHead();capacity=Math.floor((268-y-5)/3.6);}const chunk=parts.slice(start,start+capacity),height=chunk.length*3.6+5;doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(...ink);doc.text(chunk,17,y,{lineHeightFactor:1.2756});if(start===0){doc.text((line.quantity/100).toFixed(2),115,y,{align:'right'});doc.text(line.price===null?'Pendiente':money(line.price),155,y,{align:'right'});doc.text(line.total===null?'Pendiente':money(line.total),193,y,{align:'right'});}y+=height;start+=chunk.length;}
   doc.setDrawColor(221,216,227);doc.line(15,y-2,195,y-2);y+=2.5;
  }
  const pending=result.hasPendingPrice?' (parcial; faltan precios)':result.items.some(l=>l.approval!=='approved'||l.scopeConfirmed===false)?' (estimación no aprobada)':'';
  space(65);
  section('Resumen COP',`Subtotal${pending}: ${money(result.subtotal)}\nDescuento autorizado: ${money(result.discount)}\nBase después de descuento: ${money(result.base)}\n${settings.taxMode==='pending'?'Impuestos pendientes de configuración':settings.taxMode==='none'?'Sin impuesto según configuración explícita':`${settings.taxLabel} (${(settings.taxBps/100).toFixed(2)}%)`}: ${settings.taxMode==='pending'?'Pendiente':money(result.tax)}\n${result.hasPendingPrice||settings.taxMode==='pending'?'Total pendiente; cálculo parcial':'Total'}: ${money(result.total)}`);
  if(balance.items.length||model.type==='collection'){
   space(22);paragraph('Anticipos y abonos registrados manualmente',{bold:true,size:11,color:teal});
   paragraph('No verificados por banco o pasarela. Este documento no acredita pago efectivo.',{size:8,color:muted});
   function paymentsHead(){space(15);doc.setFillColor(237,244,243);doc.rect(15,y-4,180,9,'F');doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(...ink);doc.text('Fecha, medio, referencia y observaciones',17,y+1);doc.text('Abono COP',193,y+1,{align:'right'});y+=12;}
   paymentsHead();if(!balance.items.length)paragraph('No hay abonos registrados.');
   for(const p of balance.items){doc.setFont('helvetica','normal');doc.setFontSize(8);const parts=doc.splitTextToSize(printable(`${p.date} · ${p.method}${p.reference?' · '+p.reference:''}${p.notes?'\n'+p.notes:''}`),135);if(parts.length*3.6+5<200&&y+parts.length*3.6+5>268){doc.addPage();header();paymentsHead();}for(let start=0;start<parts.length;){let capacity=Math.floor((268-y-5)/3.6);if(capacity<1){doc.addPage();header();paymentsHead();capacity=Math.floor((268-y-5)/3.6);}const chunk=parts.slice(start,start+capacity);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(...ink);doc.text(chunk,17,y,{lineHeightFactor:1.2756});if(start===0)doc.text(money(p.amount),193,y,{align:'right'});y+=chunk.length*3.6+5;start+=chunk.length;}doc.setDrawColor(221,216,227);doc.line(15,y-2,195,y-2);y+=2.5;}
  }
  if(balance.items.length||model.type==='collection'){space(28);paragraph(`Abonos registrados: ${money(balance.received)}`,{bold:true});paragraph(`${result.issues.length?'Provisional - ':''}${balance.credit?'Saldo a favor':'Saldo pendiente'}: ${money(balance.credit||balance.due)}`,{bold:true,size:12,color:teal});}
  if(model.paymentInfo)section('Información de pago indicada por el emisor',model.paymentInfo);
  section('Alcance incluido',model.scope);section('Exclusiones',model.exclusions);section('Condiciones comerciales',model.conditions);
  if(settings.discountBps>0)section('Referencia de autorización del descuento',settings.discountReference);
  if(draft)section('Pendientes antes de emitir un documento revisado',issues.length?issues.join('\n'):'Documento conservado en borrador. Revisa sus datos y declara la aprobación local antes de preparar un documento definitivo DEMO.');
  paragraph('DEMO local. No es factura electrónica ni documento fiscal validado. No acredita envío, pago o autorización tributaria.',{size:8,color:muted});
  const pages=doc.getNumberOfPages();for(let p=1;p<=pages;p++){doc.setPage(p);doc.setDrawColor(210,205,218);doc.line(15,282,195,282);doc.setTextColor(...muted);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text(`${draft?'BORRADOR':'DEMO'} | LXL | ${p} / ${pages}`,15,288);doc.text('COP - Sin validación fiscal',195,288,{align:'right'});}
  return {blob:doc.output('blob'),draft,issues,pages};
 }
 root.LXLCommercialPDF={build};
})(globalThis);

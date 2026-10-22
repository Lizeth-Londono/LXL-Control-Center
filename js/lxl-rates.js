// Single source for the existing public prototype references. These are NOT approved rates.
(function(root){'use strict';
 const services=Object.freeze([
  Object.freeze({id:'base',name:'Diseño inicial',description:'HTML, CSS, JavaScript, diseño responsive y navegación demostrativa según alcance.',price:6000000,approval:'illustrative',additional:false}),
  Object.freeze({id:'section',name:'Sección adicional',description:'Sección adicional según alcance revisado manualmente.',price:1500000,approval:'illustrative',additional:true}),
  Object.freeze({id:'filter',name:'Funcionalidad adicional',description:'Funcionalidad adicional sujeta a evaluación técnica y alcance confirmado.',price:4000000,approval:'illustrative',additional:true})
 ]);
 function estimate(ids){return services.reduce((sum,s)=>sum+(ids.includes(s.id)?s.price:0),0)/100;}
 const api=Object.freeze({version:'public-prototype-v3.3',services,estimate});root.LXLRates=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);

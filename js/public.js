'use strict';
const $=id=>document.getElementById(id);
const nav=$('navlinks'), toggle=$('mobile-toggle'), header=document.querySelector('.site-header');
const links=[...nav.querySelectorAll('a[data-spy]')];
const targets=[...document.querySelectorAll('main > section[id]')];
const indicator=nav.querySelector('.nav-indicator');
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
history.scrollRestoration='manual';
function closeMenu(){nav.classList.remove('open');toggle.setAttribute('aria-expanded','false')}
toggle.addEventListener('click',()=>{const open=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open))});
function active(id){links.forEach(a=>{const selected=a.hash==='#'+id;a.classList.toggle('active',selected);selected?a.setAttribute('aria-current','location'):a.removeAttribute('aria-current')});positionIndicator()}
function positionIndicator(){const a=links.find(x=>x.classList.contains('active'));if(!indicator)return;if(!a){indicator.style.opacity=0;return}const r=a.getBoundingClientRect(),base=nav.getBoundingClientRect();indicator.style.width=r.width+'px';indicator.style.transform=`translateX(${r.left-base.left}px)`;indicator.style.opacity=matchMedia('(max-width:760px)').matches?'0':'1'}
let navigating=false, navigationTimer, urlTimer;
function navigate(hash,push=true){const target=document.getElementById(hash.slice(1));if(!target)return;closeMenu();const offset=header.getBoundingClientRect().height+14;const top=target.getBoundingClientRect().top+scrollY-offset;navigating=true;clearTimeout(urlTimer);clearTimeout(navigationTimer);window.scrollTo({top,behavior:reduce.matches?'instant':'smooth'});if(push&&location.hash!==hash)history.pushState(null,'',hash);active(hash.slice(1));navigationTimer=setTimeout(()=>{navigating=false;spy()},reduce.matches?80:1200)}
nav.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{if(!document.getElementById(a.hash.slice(1)))return;e.preventDefault();navigate(a.hash)}));
document.querySelectorAll('a[href^="#"]').forEach(a=>{if(nav.contains(a))return;a.addEventListener('click',e=>{if(!a.hash||!document.getElementById(a.hash.slice(1)))return;e.preventDefault();navigate(a.hash)})});
let raf=0;function spy(){if(raf||navigating||nav.classList.contains('open'))return;raf=requestAnimationFrame(()=>{raf=0;if(navigating||nav.classList.contains('open'))return;const line=header.getBoundingClientRect().height+30;let chosen=targets[0];for(const t of targets){if(t.getBoundingClientRect().top<=line)chosen=t}if(innerHeight+scrollY>=document.documentElement.scrollHeight-3)chosen=targets.at(-1);if(chosen){active(chosen.id);clearTimeout(urlTimer);urlTimer=setTimeout(()=>{if(!navigating&&!nav.classList.contains('open')&&location.hash!=='#'+chosen.id)history.replaceState(null,'','#'+chosen.id)},220)}})}
addEventListener('scrollend',()=>{if(!navigating)spy()});
addEventListener('hashchange',()=>navigate(location.hash||'#inicio',false));
const observer=new IntersectionObserver(spy,{rootMargin:'-18% 0px -65% 0px',threshold:0});targets.forEach(t=>observer.observe(t));addEventListener('scroll',spy,{passive:true});addEventListener('resize',positionIndicator);addEventListener('popstate',()=>{if(location.hash&&document.getElementById(location.hash.slice(1)))navigate(location.hash,false);else navigate('#inicio',false)});addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
requestAnimationFrame(()=>{if(location.hash&&document.getElementById(location.hash.slice(1)))navigate(location.hash,false);else active('inicio')});
const money=n=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(n);
document.querySelectorAll('[data-rate-price]').forEach(el=>{const rate=LXLRates.services.find(r=>r.id===el.dataset.ratePrice);el.textContent='$'+new Intl.NumberFormat('es-CO').format(rate.price/100);});
function estimate(){const total=LXLRates.estimate(LXLRates.services.filter(s=>$(s.id).checked).map(s=>s.id));$('total').textContent=money(total);return total}
['base','section','filter'].forEach(id=>$(id).addEventListener('change',estimate));estimate();
function invalidateSummary(){lastSummary='';$('copy-request').disabled=true;$('request-result').textContent='La selección cambió. Prepara nuevamente el resumen.'}
['base','section','filter','name','contact','details'].forEach(id=>$(id).addEventListener('input',invalidateSummary));
let lastSummary='';$('request-form').addEventListener('submit',e=>{e.preventDefault();if(!e.currentTarget.reportValidity())return;lastSummary=`SOLICITUD DEMOSTRATIVA LXL\nMarca: ${$('name').value.trim()}\nContacto: ${$('contact').value.trim()}\nNecesidad: ${$('details').value.trim()}\nEstimación ilustrativa: ${money(estimate())}\nPendiente de revisión y aprobación. No enviado.`;$('request-result').textContent=lastSummary;$('copy-request').disabled=false;$('request-result').focus()});
$('copy-request').addEventListener('click',async()=>{if(!lastSummary)return;try{await navigator.clipboard.writeText(lastSummary);$('request-result').textContent='Resumen copiado al portapapeles. No se ha enviado ni guardado en servidores.'}catch{$('request-result').textContent=lastSummary+'\nSelecciona este texto y cópialo manualmente.'}});
$('reset-request').addEventListener('click',()=>{$('request-result').textContent='Puedes modificar los servicios y preparar nuevamente tu solicitud.';$('copy-request').disabled=true;lastSummary='';$('base').focus()});

'use strict';
// Agregar proyectos aquí; no se requieren cambios en la estructura del carrusel.
const projects = [
  {name:'KJ PARFUMS',category:'Perfumería y lociones',description:'Propuesta web comercial para una marca de lociones y perfumes.',image:'img/proyecto-1-mockup.jpg',url:'https://lizeth-londono.github.io/LXL-Propuesta-KJ-PARFUMS/'},
  {name:'NOA STYLE',category:'Moda deportiva',description:'Consulta la propuesta de NOA STYLE. Enlace público pendiente de verificación.',image:'img/proyecto-2-mockup.jpg'},
  {name:'CASA BELAH',category:'Cuidado personal',description:'Consulta la propuesta de CASA BELAH. Enlace público pendiente de verificación.',image:'img/proyecto-3-mockup.jpg'},
  {name:'SAY IT CORRECTLY',category:'Educación digital',description:'Say-it-correctly.org. Plataforma interactiva para aprender inglés, orientada a estudiantes chinos.',url:'https://lizeth-londono.github.io/LXL-Propuesta_Say-it-correctly_Parts-of-the-Body/'}
];
const arrow='<svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg>';
const track=document.querySelector('.project-grid');
track.id='project-track';track.tabIndex=0;track.setAttribute('aria-label','Proyectos destacados. Usa las flechas para desplazarte.');
projects.forEach((p,i)=>{
  const card=document.createElement('article');card.className='project';card.setAttribute('aria-label',`${i+1} de ${projects.length}`);
  const link=document.createElement('a');link.className='project-link';link.href=p.url||'#solicitud';
  if(p.url){link.target='_blank';link.rel='noopener noreferrer'}
  link.setAttribute('aria-label',`${p.name}: ${p.description}${p.url?' Abre en otra pestaña.':''}`);
  if(p.image){const img=document.createElement('img');img.src=p.image;img.alt=`Referencia ilustrativa de ${p.name}`;img.loading='lazy';link.append(img)}
  else {const visual=document.createElement('div');visual.className='project-placeholder';visual.textContent='Say-it-correctly.org';link.append(visual)}
  const details=document.createElement('div');details.className='details';const copy=document.createElement('div');const name=document.createElement('strong');name.textContent=p.name;const category=document.createElement('small');category.textContent=p.category;copy.append(name,category);details.append(copy);details.insertAdjacentHTML('beforeend',arrow);link.append(details);
  const description=document.createElement('p');description.className='project-description';description.textContent=p.description;link.append(description);card.append(link);track.append(card);
});
document.querySelectorAll('.bi-arrow-up-right-circle-fill,.bi-arrow-up-right').forEach(el=>el.outerHTML=arrow);
document.querySelectorAll('.button').forEach(el=>{for(const node of [...el.childNodes])if(node.nodeType===3&&node.textContent.includes('→')){node.textContent=node.textContent.replace('→','');el.insertAdjacentHTML('beforeend',arrow)}});
const controls=document.createElement('div');controls.className='carousel-controls';controls.innerHTML='<button type="button" class="button secondary" aria-label="Proyectos anteriores" aria-controls="project-track">'+arrow+'</button><p aria-live="polite" class="muted carousel-status"></p><button type="button" class="button secondary" aria-label="Proyectos siguientes" aria-controls="project-track">'+arrow+'</button>';
track.after(controls);const [prev,next]=controls.querySelectorAll('button');
function move(direction){track.scrollBy({left:direction*(track.firstElementChild.getBoundingClientRect().width+14),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}
prev.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));
track.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();if(e.key==='Home'||e.key==='End')track.scrollTo({left:e.key==='Home'?0:track.scrollWidth,behavior:'instant'});else move(e.key==='ArrowLeft'?-1:1)}});
function update(){prev.disabled=track.scrollLeft<2;next.disabled=track.scrollLeft+track.clientWidth>=track.scrollWidth-2;const first=Math.round(track.scrollLeft/(track.firstElementChild.getBoundingClientRect().width+14))+1;controls.querySelector('p').textContent=`${first}–${Math.min(projects.length,first+Math.round(track.clientWidth/track.firstElementChild.getBoundingClientRect().width)-1)} de ${projects.length}`}
track.addEventListener('scroll',update,{passive:true});addEventListener('resize',update);update();

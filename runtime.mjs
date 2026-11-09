import * as k from './vendor/iso-kit.mjs';
import * as M from './model.mjs';
import * as Geo from './geometry.mjs';

const scene=Geo.createEngine(),svg=document.querySelector('#engine'),group=document.querySelector('#scene');
const NS='http://www.w3.org/2000/svg',nodes=new Map(),read=id=>document.getElementById(id);
const els={play:read('play'),speed:read('speed'),scrub:read('scrub'),angle:read('angle-value'),
 phase:read('phase-name'),selected:read('selected-value'),travel:read('travel-value'),
 travelBar:read('travel-bar'),intake:read('intake-state'),exhaust:read('exhaust-state'),
 firing:read('firing-value'),cycle:read('cycle-readout'),caption:read('phase-caption'),
 speedValue:read('speed-value'),status:read('accessible-status')};
const still=matchMedia('(prefers-reduced-motion: reduce)');
let angle=26,selected=1,playing=!still.matches,speed=.5,frame=0,last=0,visible=false;
let dirty=true,lastDraw=0,lastOrder='',renderCount=0;
const texts=[
 '점화 플러그가 혼합기를 점화합니다. 팽창하는 가스가 피스톤을 밀어 크랭크축에 회전력을 전달합니다.',
 '피스톤이 올라가며 열린 배기 밸브를 통해 연소 가스를 밀어냅니다.',
 '피스톤이 내려가며 열린 흡기 밸브를 통해 공기와 연료의 혼합기를 받아들입니다.',
 '두 밸브가 닫힙니다. 피스톤이 올라가며 혼합기를 압축하고 다음 점화를 준비합니다.'
];
function makeNode(face){
 const g=document.createElementNS(NS,'g'),body=document.createElementNS(NS,'path'),edge=document.createElementNS(NS,'path');
 body.setAttribute('class','engine-face');edge.setAttribute('class','iso-line engine-edge');g.append(body,edge);g.dataset.mesh=face.mesh;
 if(face.cylinder)g.dataset.cylinder=face.cylinder;
 const item={g,body,edge,cache:{}};nodes.set(face.id,item);return item;
}
function attr(item,node,key,value){const ck=(node===item.body?'b':'e')+key;if(item.cache[ck]!==value){node.setAttribute(key,value);item.cache[ck]=value;}}
function paint(){
 const state=M.engineAt(angle),faces=Geo.projectScene(scene,state),active=new Set();
 for(const f of faces){
  const n=nodes.get(f.id)||makeNode(f);active.add(f.id);
  attr(n,n.body,'d',f.d);attr(n,n.edge,'d',f.edge);attr(n,n.body,'data-shade',String(f.shade));
  attr(n,n.body,'data-material',f.material);attr(n,n.body,'fill',f.color||(f.shade===4?'var(--anatomy-top)':`var(--anatomy-shade-${f.shade})`));
  attr(n,n.body,'opacity',String(f.opacity));attr(n,n.edge,'data-tone',f.cylinder===selected&&f.material==='piston'?'lit':f.tone);
  n.g.removeAttribute('display');
 }
 for(const [id,n]of nodes)if(!active.has(id))n.g.setAttribute('display','none');
 const order=faces.map(f=>f.id).join('|');
 if(order!==lastOrder){const frag=document.createDocumentFragment();for(const f of faces)frag.append(nodes.get(f.id).g);group.append(frag);lastOrder=order;}
 const c=state.cylinders[selected-1],stroke=M.STROKES[c.stroke];
 els.angle.textContent=`${Math.floor(state.angle).toString().padStart(3,'0')}°`;
 if(document.activeElement!==els.scrub)els.scrub.value=String(state.angle);
 els.phase.textContent=stroke;els.phase.style.color=`var(--cycle-${c.stroke})`;els.selected.textContent=String(selected).padStart(2,'0');
 els.travel.textContent=`${Math.round(c.travel*100)}%`;els.travelBar.style.transform=`scaleX(${c.travel})`;
 els.intake.textContent=c.intake>.002?'열림':'닫힘';els.intake.dataset.open=String(c.intake>.002);
 els.exhaust.textContent=c.exhaust>.002?'열림':'닫힘';els.exhaust.dataset.open=String(c.exhaust>.002);
 els.firing.textContent=`${state.firing}번`;els.cycle.textContent=`${state.angle<360?'첫 번째':'두 번째'} 회전 · ${Math.floor(state.angle)}° / 720°`;
 els.caption.textContent=texts[c.stroke];
 for(const b of document.querySelectorAll('[data-select]')){
  const id=Number(b.dataset.select),cyl=state.cylinders[id-1];b.setAttribute('aria-pressed',String(id===selected));
  b.style.setProperty('--charge',`var(--cycle-${cyl.stroke})`);b.dataset.firing=String(cyl.phase<48);
  b.querySelector('.cylinder-phase').textContent=M.STROKES[cyl.stroke];
 }
 for(const b of document.querySelectorAll('[data-stroke]'))b.setAttribute('aria-pressed',String(Number(b.dataset.stroke)===c.stroke));
 svg.dataset.angle=state.angle.toFixed(3);svg.dataset.selected=selected;svg.dataset.stroke=c.stroke;
 renderCount++;dirty=false;
}
function announce(){const c=M.cylinderAt(selected,angle);els.status.textContent=`${selected}번 실린더, ${M.STROKES[c.stroke]}, 크랭크각 ${Math.round(M.mod(angle))}도. ${playing?'재생 중':'일시정지'}.`;}
function syncPlay(){els.play.textContent=playing?'일시정지':'재생';els.play.setAttribute('aria-pressed',String(playing));document.body.dataset.playing=String(playing);}
function stop(){playing=false;syncPlay();dirty=true;announce();kick();}
function tick(now){
 frame=0;if(!visible||document.hidden){last=0;return;}
 const dt=last?Math.min((now-last)/1000,.15):0;last=now;
 if(playing){angle=M.mod(angle+dt*120*speed);dirty=true;}
 if(dirty&&(now-lastDraw>=30||!playing)){paint();lastDraw=now;}
 if(playing||dirty)frame=requestAnimationFrame(tick);else last=0;
}
function kick(){if(!frame&&visible&&!document.hidden){last=0;frame=requestAnimationFrame(tick);}}
function select(id){selected=id;dirty=true;announce();kick();}
function seek(a){stop();angle=M.mod(a);dirty=true;paint();announce();}
els.play.addEventListener('click',()=>{playing=!playing;syncPlay();dirty=true;announce();kick();});
els.speed.addEventListener('input',()=>{speed=Number(els.speed.value);els.speedValue.textContent=`${speed.toFixed(2).replace(/0$/,'')}×`;dirty=true;kick();});
els.scrub.addEventListener('input',()=>seek(Number(els.scrub.value)));
read('step').addEventListener('click',()=>seek((Math.floor(angle/90)+1)*90));read('reset').addEventListener('click',()=>seek(0));
for(const b of document.querySelectorAll('[data-select]'))b.addEventListener('click',()=>select(Number(b.dataset.select)));
for(const b of document.querySelectorAll('[data-stroke]'))b.addEventListener('click',()=>seek(M.CYLINDERS[selected-1].fire+Number(b.dataset.stroke)*180+60));
svg.addEventListener('click',e=>{const target=e.target.closest('[data-cylinder]');if(target)select(Number(target.dataset.cylinder));});
read('stage').addEventListener('keydown',e=>{
 if(e.target!==read('stage'))return;
 if(e.key===' '){e.preventDefault();els.play.click();}
 else if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();seek(angle+(e.key==='ArrowRight'?1:-1)*(e.shiftKey?90:15));}
 else if(e.key==='Home'){e.preventDefault();seek(0);}
 else if(/^[1-8]$/.test(e.key))select(Number(e.key));
});
read('theme').addEventListener('click',()=>{
 const light=document.body.dataset.theme!=='light';document.body.dataset.theme=light?'light':'dark';
 read('theme').textContent=light?'어두운 화면':'밝은 화면';read('theme').setAttribute('aria-pressed',String(light));
});
new IntersectionObserver(entries=>{
 visible=entries[entries.length-1].isIntersecting;if(visible)kick();else{cancelAnimationFrame(frame);frame=0;last=0;}
},{rootMargin:'100px 0px'}).observe(svg);
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;last=0;}else kick();});
still.addEventListener('change',()=>{if(still.matches)stop();});
window.v8={seek,select,pause:stop,state:()=>({angle:M.mod(angle),selected,playing,speed,renderCount,visible,
 cylinder:M.cylinderAt(selected,angle),faces:Geo.projectScene(scene,M.engineAt(angle)).length})};
syncPlay();paint();announce();

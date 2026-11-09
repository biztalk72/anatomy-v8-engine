// Generate drive.mjs actions that exercise the built standalone document.
import {writeFileSync} from 'node:fs';
const actions=[
 ['eval',`window.v8.pause(); window.v8.seek(0); if(window.v8.state().cylinder.stroke!==0)throw Error('initial power stroke'); 'PASS: initial power stroke'`],
 ['click','[data-select="8"]'],['wait',100],
 ['eval',`if(window.v8.state().selected!==8||document.getElementById('selected-value').textContent!=='08')throw Error('cylinder selection'); 'PASS: selected cylinder 8'`],
 ['click','[data-stroke="2"]'],['wait',100],
 ['eval',`let s=window.v8.state(); if(s.playing||s.cylinder.stroke!==2||document.getElementById('intake-state').textContent!=='열림')throw Error('intake selection'); 'PASS: intake stroke and valve'`],
 ['click','[data-stroke="1"]'],['wait',100],
 ['eval',`if(window.v8.state().cylinder.stroke!==1||document.getElementById('exhaust-state').textContent!=='열림')throw Error('exhaust selection'); 'PASS: exhaust stroke and valve'`],
 ['click','[data-stroke="3"]'],['wait',100],
 ['eval',`if(window.v8.state().cylinder.stroke!==3||document.getElementById('intake-state').textContent!=='닫힘'||document.getElementById('exhaust-state').textContent!=='닫힘')throw Error('compression valves'); 'PASS: compression valves closed'`],
 ['key','Home','#stage'],['key','ArrowRight','#stage'],
 ['eval',`if(Math.abs(window.v8.state().angle-15)>.01)throw Error('arrow step'); 'PASS: keyboard Home and 15-degree step'`],
 ['key','5','#stage'],['wait',100],
 ['eval',`if(window.v8.state().selected!==5)throw Error('digit selection'); 'PASS: keyboard cylinder selection'`],
 ['click','#step'],
 ['eval',`if(window.v8.state().angle!==90)throw Error('next ignition'); 'PASS: next ignition at 90 degrees'`],
 ['drag','#scrub',.1,.5,.65,.5,8],
 ['eval',`const s=window.v8.state();if(s.playing||s.angle<400||s.angle>550)throw Error('pointer scrub'); 'PASS: pointer crank-angle scrub'`],
 ['drag','#speed',.05,.5,.95,.5,8],
 ['eval',`if(window.v8.state().speed<1.5)throw Error('speed control'); 'PASS: speed slider'`],
 ['eval',`document.getElementById('speed').value='.5';document.getElementById('speed').dispatchEvent(new Event('input'));window.v8.seek(0);window.__before=window.v8.state();window.__time=performance.now();`],
 ['click','#play'],['wait',1100],
 ['eval',`const s=window.v8.state(); if(!s.playing||s.angle<50||s.angle>110||s.renderCount-window.__before.renderCount<10)throw Error('time-based playback'); 'PASS: 0.5x playback advances at 60 degrees/second; '+(s.renderCount-window.__before.renderCount)+' renders'`],
 ['click','#play'],['eval',`window.__paused=window.v8.state().angle`],['wait',300],
 ['eval',`if(window.v8.state().angle!==window.__paused)throw Error('pause'); 'PASS: pause holds crank angle'`],
 ['click','#theme'],
 ['eval',`if(document.body.dataset.theme!=='light')throw Error('theme'); 'PASS: theme switch'`],
 ['click','#theme'],['eval',`window.v8.select(1);window.v8.seek(26);document.activeElement.blur(); 'PASS: dark theme restored'`],
 ['move','#engine',.55,.45],['shot','shots/hover.png','main',1],
 ['eval',`window.v8.seek(8)`],['shot','shots/spark.png','.drawing',1],
 ['eval',`window.v8.seek(240)`],['shot','shots/exhaust.png','.drawing',1],
 ['eval',`window.v8.seek(420)`],['shot','shots/intake.png','.drawing',1],
 ['eval',`window.v8.seek(600)`],['shot','shots/compression.png','.drawing',1],
 ['eval',`window.v8.seek(26);if(document.documentElement.scrollWidth>innerWidth)throw Error('horizontal overflow'); 'PASS: no horizontal overflow'`]
];
for(const a of actions)if(a[0]==='eval')a[1]=`(()=>eval(${JSON.stringify(a[1])}))()`;
writeFileSync(new URL('./browser-checks.json',import.meta.url),JSON.stringify(actions));
console.log(`Wrote ${actions.length} browser actions with throwing assertions.`);

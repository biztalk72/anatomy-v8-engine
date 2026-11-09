import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import * as k from './vendor/iso-kit.mjs';
import * as M from './model.mjs';
import * as Geo from './geometry.mjs';

const HERE=dirname(fileURLToPath(import.meta.url)),light=process.argv.includes('--light');
const read=p=>readFileSync(join(HERE,p),'utf8');
function bundle(path,name,preamble=''){
 const code=read(path),names=[...code.matchAll(/^export (?:function|const|let|class) (\w+)/gm)].map(x=>x[1]);
 return `const ${name}=(()=>{${preamble}\n${code.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')}\nreturn {${names.join(',')}};})();\n`;
}
const script=bundle('vendor/iso-kit.mjs','k')+bundle('vendor/lathe.mjs','G','const {cameraOf,iso,pathOf}=k;')+
 bundle('model.mjs','M')+bundle('geometry.mjs','Geo')+read('runtime.mjs').replace(/^import .*;\n/gm,'');
const scene=Geo.createEngine(),faces=Geo.projectScene(scene,M.engineAt(26));
const art=faces.map(f=>`<g><path d="${f.d}" fill="${f.color||(f.shade===4?'var(--anatomy-top)':`var(--anatomy-shade-${f.shade})`)}" opacity="${f.opacity}"/><path class="iso-line" data-tone="${f.tone}" d="${f.edge}"/></g>`).join('');
const order=M.ORDER.map(id=>`<button type="button" class="cylinder-button" data-select="${id}" aria-label="${id}번 실린더 선택" aria-pressed="${id===1}"><b>${id}</b><span class="cylinder-phase">폭발</span></button>`).join('');
const phases=[[2,'흡입'],[3,'압축'],[0,'폭발'],[1,'배기']].map(([id,name])=>`<button type="button" class="stroke-button" data-stroke="${id}" aria-pressed="${id===0}" style="--color:var(--cycle-${id})"><i></i>${name}</button>`).join('');
const html=`<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"><title>V8 — 여덟 개의 실린더, 하나의 리듬</title><style>${k.ISO_CSS}\n${read('styles.css')}</style></head>
<body class="iso" data-theme="${light?'light':'dark'}"><main>
<header class="masthead"><div><div class="eyebrow"><span></span>ANATOMY / MECHANICAL STUDIES</div><h1>여덟 개의 실린더,<br>하나의 <em>리듬.</em></h1><p class="intro">90° V8 가솔린 엔진의 내부를 들여다보세요.<br>왕복 운동이 회전으로 바뀌는 순간을 따라갑니다.</p></div><div class="mast-right"><div class="edition">INTERACTIVE CUTAWAY<br>STUDY 008 / CROSSPLANE V8</div><button id="theme" type="button" class="theme-button" aria-pressed="${light}">${light?'어두운 화면':'밝은 화면'}</button></div></header>
<section class="workbench" aria-label="V8 엔진 작동 모형"><div class="figure-top"><strong>FIG. 008</strong><span>90° V8 · 4행정 가솔린 엔진</span><span class="running"><i></i>연속 사이클</span></div>
<div class="figure-layout"><div class="drawing iso-plate"><div id="stage" class="stage" tabindex="0" role="group" aria-label="엔진 애니메이션. Space 재생 또는 정지, 좌우 화살표로 15도 이동, Shift와 화살표로 90도 이동, 1부터 8로 실린더 선택.">
<svg id="engine" class="iso-svg" viewBox="0 0 ${Geo.WIDTH} ${Geo.HEIGHT}" role="img" aria-label="90도 V8 절개 엔진. 두 줄로 배치된 8개 피스톤이 4개의 크랭크핀에 연결되어 움직이며 실린더의 색이 흡입, 압축, 폭발, 배기를 나타냅니다."><ellipse class="ground-shadow" cx="500" cy="510" rx="330" ry="69"/><g id="static-fallback">${art}</g><g id="scene"></g><g class="engraving">${Geo.engravedLabel()}</g></svg>
</div><div class="drawing-hint"><span class="key">SPACE</span> 재생 / 정지 <span style="margin-left:12px">실린더를 눌러 관찰</span></div><span class="cycle-readout" id="cycle-readout">첫 번째 회전 · 26° / 720°</span></div>
<aside class="inspector" aria-label="선택한 실린더 상태"><p class="section-label">지금 관찰하는 실린더</p><div class="cylinder-heading"><strong id="selected-value">01</strong><span>CYLINDER</span></div><h2 id="phase-name" class="phase-name">폭발</h2><p id="phase-caption" class="phase-caption"></p><div class="meter"><div class="meter-title"><span>피스톤 하강 위치</span><strong id="travel-value">0%</strong></div><div class="meter-track"><i id="travel-bar"></i></div><div class="meter-labels"><span>상사점</span><span>하사점</span></div></div><div class="valves"><div><span>흡기 밸브</span><strong id="intake-state">닫힘</strong></div><div><span>배기 밸브</span><strong id="exhaust-state">닫힘</strong></div></div><div class="specs"><div><strong>90°</strong><span>실린더 뱅크 각도</span></div><div><strong>720°</strong><span>한 사이클의 회전각</span></div></div></aside></div>
<div class="transport"><div class="transport-buttons"><button id="play" type="button" aria-pressed="true">일시정지</button><button id="step" type="button">다음 점화 +90°</button><button id="reset" type="button" aria-label="크랭크각 0도로 초기화">처음으로</button></div><div><div class="range-head"><label for="scrub">크랭크각</label><output id="angle-value" for="scrub">026°</output></div><input id="scrub" type="range" min="0" max="719.9" step="0.1" value="26" aria-label="크랭크축 회전각"><div class="range-ends"><span>0°</span><span>360°</span><span>720°</span></div></div><div><div class="range-head"><label for="speed">관찰 속도</label><output id="speed-value" for="speed">0.5×</output></div><input id="speed" type="range" min="0.25" max="2" step="0.25" value="0.5" aria-label="애니메이션 관찰 속도"><div class="range-ends"><span>느리게</span><span>빠르게</span></div></div></div></section>
<div class="below"><section><div class="module-heading"><span>점화 순서 · 눌러서 실린더 선택</span><span>현재 구간 <b id="firing-value">1번</b></span></div><div class="order" role="group" aria-label="점화 순서 및 실린더 선택">${order}</div><p class="footnote">크랭크축이 90° 회전할 때마다 다음 실린더가 점화합니다.</p></section><section><div class="module-heading"><span>하나의 실린더, 네 번의 행정</span><span>누르면 해당 행정으로 이동</span></div><div class="strokes" role="group" aria-label="4행정 선택">${phases}</div><p class="footnote">색은 실린더 안의 행정을 나타냅니다. 0.5×에서 한 사이클은 12초입니다.</p></section></div>
<footer class="footer"><span>ANATOMY · SVG MECHANISM<br>피스톤·연결봉·크랭크축의 위치를 하나의 기하 모델로 계산합니다.</span><span>교육용 절개 모형 · 밸브 타이밍은 이상화했습니다.<br><a href="https://www.chevrolet.com/content/dam/chevrolet/na/us/english/index/performance/resources/installation-guides/crate-engines/01-images/zz4-engine-long-block-installation-guide-24502609.pdf" target="_blank" rel="noreferrer">점화 순서 참고: Chevrolet ZZ4 ↗</a></span></footer>
<p id="accessible-status" class="sr-only" role="status" aria-live="polite"></p><noscript><p>움직임과 조작에는 JavaScript가 필요합니다. 현재는 엔진 절개 정지 그림입니다.</p></noscript></main>
<script>${script.replaceAll('</script','<\\/script')}\ndocument.getElementById('static-fallback').remove();</script></body></html>`;
const path=join(HERE,light?'light.html':'index.html');writeFileSync(path,html);
console.log(`Built ${path}: ${scene.meshes.length} detailed components, ${faces.length} visible surface facets, ${(Buffer.byteLength(html)/1024).toFixed(0)} KiB; self-contained.`);

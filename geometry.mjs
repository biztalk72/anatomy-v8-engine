import * as k from './vendor/iso-kit.mjs';
import * as G from './vendor/lathe.mjs';
import * as M from './model.mjs';

export const WIDTH = 1000, HEIGHT = 660;
export const P = k.fitProjection(k.boxCorners({ x: -164, y: -109, w: 328, d: 218, r: 8 }, -22, 153), WIDTH, HEIGHT,
  { pad: 28, azimuth: 42, elevation: 26 });
const V = G.viewOf(P);
const add = G.add3, sub = G.sub3, mul = G.mul3, dot = G.dot3, unit = G.unit3;
// cross3 is named locally: keep the mesh extension independent of kit internals.
const cp = (a,b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const avg = ps => ps.reduce((a,p) => add(a,mul(p,1/ps.length)),[0,0,0]);
const faceNormal = ps => unit(cp(sub(ps[1],ps[0]),sub(ps[2],ps[0])));
const world = (F,s,u,v) => add(F.o,add(mul(F.a,s),add(mul(F.u,u),mul(F.v,v))));
const plane = (F,s,p) => world(F,s,...p);

// Meshes retain real 3D vertices, adjacency and a rigid pose. Opaque surface
// facets use Anatomy's facing-dependent four tones; edges belong to their face.
function mesh(id, vertices, faces, options = {}) {
  const edges = new Map();
  const normals = faces.map(f => faceNormal(f.map(i=>vertices[i])));
  faces.forEach((f,fi) => f.forEach((a,j)=>{
    const b=f[(j+1)%f.length], key=a<b?`${a}:${b}`:`${b}:${a}`;
    if(!edges.has(key)) edges.set(key,{a,b,faces:[]});
    edges.get(key).faces.push(fi);
  }));
  return { id, vertices, faces, normals, edges:[...edges.values()], ...options };
}
function prism(id,F,poly,s0,s1,options={}) {
  // ringOf/circleRing and annular faces wind counter-clockwise in their plane.
  const n=poly.length, points=[...poly.map(p=>plane(F,s0,p)),...poly.map(p=>plane(F,s1,p))];
  const faces=[Array.from({length:n},(_,i)=>n-1-i),Array.from({length:n},(_,i)=>n+i)];
  for(let i=0;i<n;i++) faces.push([i,(i+1)%n,(i+1)%n+n,i+n]);
  return mesh(id,points,faces,options);
}
function box(id,plan,z,h,opts={}) {
  // frameAlong(z) has u=[0,1,0],v=[-1,0,0]; explicit floor axes avoid surprises.
  return prism(id,G.frameOf([0,0,0],[0,0,1],[1,0,0],[0,1,0]),k.roundedPlan(plan,4),z,z+h,opts);
}
const circle = (r,n=32) => Array.from({length:n},(_,i)=>[r*Math.cos(i*2*Math.PI/n),r*Math.sin(i*2*Math.PI/n)]);
function disc(id,F,s0,s1,r,opts={}) { return prism(id,F,circle(r,opts.segments||32),s0,s1,opts); }
function annulus(id,F,s0,s1,ri,ro,from=0,span=Math.PI*2,opts={}) {
  const n=opts.segments||20, full=span>Math.PI*1.999, count=full?n:n+1;
  const verts=[];
  for(const [s,r] of [[s0,ri],[s0,ro],[s1,ri],[s1,ro]])
    for(let i=0;i<count;i++){const a=from+span*i/n;verts.push(world(F,s,r*Math.cos(a),r*Math.sin(a)));}
  const fs=[];
  for(let i=0;i<n;i++){
    const j=(i+1)%count, a=i,b=j,c=count+i,d=count+j,e=count*2+i,f=count*2+j,g=count*3+i,h=count*3+j;
    fs.push([a,e,f,b],[c,d,h,g],[a,b,d,c],[e,g,h,f]);
  }
  if(!full)fs.push([0,count,count*3,count*2],[count-1,count*3-1,count*4-1,count*2-1]);
  return mesh(id,verts,fs,opts);
}
const cylFrame = c => G.frameOf([c.x,0,M.AXIS_Z],c.axis,[1,0,0],[0,Math.cos(c.beta),-Math.sin(c.beta)]);
const xf = (x,z=M.AXIS_Z,y=0) => G.frameOf([x,y,z],[1,0,0],[0,1,0],[0,0,1]);
function rodFrame(c){
  const u=unit(sub(c.piston,c.q));
  return G.frameOf(c.q,[1,0,0],u,cp([1,0,0],u));
}

export function createEngine(){
  const meshes=[]; const push=m=>(meshes.push(m),m);
  const bed={x:-160,y:-104,w:320,d:208,r:8};
  for(const [i,[x,y]] of k.corners(bed,23).entries()) {
    push(disc(`foot-${i}`,G.frameAlong([x,y,0],[0,0,1]),-23,-17,9,{tone:'lo'}));
    push(disc(`foot-seat-${i}`,G.frameAlong([x,y,0],[0,0,1]),-17,-13,7,{tone:'mid'}));
  }
  push(box('display-bed',bed,-13,11,{tone:'lo',material:'base'}));
  push(box('bed-inlay',{x:-157,y:-101,w:314,d:202,r:6},-2,.8,{tone:'lo',material:'base'}));
  for(const [i,[x,y]] of k.corners(bed,12).entries()) {
    const F=G.frameAlong([x,y,0],[0,0,1]);
    push(annulus(`bed-screw-seat-${i}`,F,-1.2,-.7,1.2,3.2,0,Math.PI*2,{tone:'lo',segments:16}));
    push(disc(`bed-screw-${i}`,F,-.7,-.4,1,{tone:'hi',segments:12}));
  }
  for(const y of [-31,31]) push(box(`mount-rail-${y}`,{x:-132,y:y-8,w:264,d:16,r:3},-1.2,9.2,{tone:'mid'}));
  push(box('oil-pan',{x:-126,y:-32,w:252,d:64,r:11},8,13,{tone:'lo'}));
  for(const y of [-36,31]) {
    push(box(`pan-flange-${y}`,{x:-132,y,w:264,d:5,r:1.8},21,4,{tone:'mid'}));
    for(let x=-120;x<=120;x+=24)push(disc(`pan-bolt-${x}-${y}`,G.frameAlong([x,y+2.5,0],[0,0,1]),25,26.2,1.3,{tone:'mid',segments:12}));
  }
  // Five bearing bulkheads frame the four crank throws; their upper half is open.
  for(let i=0;i<5;i++){
    const x=-132+i*66,F=xf(x);
    push(box(`bearing-plinth-${i}`,{x:x-4,y:-22,w:8,d:44,r:2},25,19,{tone:'mid'}));
    push(annulus(`main-bearing-${i}`,F,-4,4,6.2,12,0,Math.PI*2,{tone:'mid',segments:28}));
    for(const y of [-17,17])push(disc(`bearing-bolt-${i}-${y}`,G.frameAlong([x,y,0],[0,0,1]),44,47,2.4,{tone:'hi',segments:16}));
  }
  // Mainshaft segments end at the cheeks. Pin axes of neighboring throws differ 90°.
  for(let i=0;i<5;i++)push(disc(`main-journal-${i}`,xf(-148+i*66),0,32,6,{tone:'hi'}));
  for(const c of M.CYLINDERS){
    const y=c.axis[1]*37;
    push(box(`barrel-pedestal-${c.id}`,{x:c.x+20,y:y-4,w:4,d:8,r:.7},25,54,{tone:'mid'}));
  }
  for(let p=0;p<4;p++){
    const x=-99+p*66;
    for(const side of [-1,1]){
      const F=G.frameOf([x+side*14,0,M.AXIS_Z],[1,0,0],[0,1,0],[0,0,1]);
      // Two circular pads joined with a convex cheek, rigidly rotating about x.
      const poly=G.stadium(9,8,M.R,20).map(([a,b])=>[b,a]);
      // Swapping radial axes reverses winding; normalize the cheek's polygon.
      poly.reverse();
      push(prism(`cheek-${p}-${side}`,F,poly,-3,3,{tone:'mid',motion:'crank',pair:p}));
    }
    push(disc(`crankpin-${p}`,xf(x),-11,11,5.2,{tone:'hi',motion:'pin',pair:p}));
  }
  // Flywheel at the rear, with machined rings and a genuinely rotating bolt pattern.
  push(disc('flywheel',xf(149),-7,0,29,{tone:'mid'}));
  push(annulus('flywheel-rim',xf(149),0,2,25,29,0,Math.PI*2,{tone:'hi',segments:64}));
  push(disc('flywheel-hub',xf(149),2,6,11,{tone:'hi'}));
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4;
    push(disc(`flywheel-bolt-${i}`,xf(156,M.AXIS_Z+17*Math.cos(a),17*Math.sin(a)),0,1.6,1.9,
      {tone:'mid',motion:'wheel',segments:12}));
  }
  push(disc('front-hub',xf(-151),0,13,12,{tone:'hi'}));
  push(annulus('hub-recess',xf(-151),-1,0,5.5,10,0,Math.PI*2,{tone:'lo'}));
  push(disc('hub-bolt',xf(-153),0,2,4,{tone:'mid',segments:6}));

  for(const c of M.CYLINDERS){
    const F=cylFrame(c),opts={cylinder:c.id};
    const toward=Math.atan2(dot(V,F.v),dot(V,F.u));
    const back=toward+Math.PI/2;
    push(annulus(`barrel-foot-${c.id}`,F,36,39,18.6,23,0,Math.PI*2,{...opts,tone:'mid'}));
    push(annulus(`liner-${c.id}`,F,38,90,18.6,20.5,back,Math.PI,{...opts,tone:'mid',segments:24}));
    for(const s of [39,45,51,57,63,69,75,81,87])
      push(annulus(`liner-rib-${c.id}-${s}`,F,s,s+1,20.5,21.5,back,Math.PI,{...opts,tone:'lo',segments:12}));
    const halfHead=[[0,0],...Array.from({length:25},(_,i)=>[22*Math.cos(back+i*Math.PI/24),22*Math.sin(back+i*Math.PI/24)])];
    push(prism(`head-${c.id}`,F,halfHead,90,96,{...opts,tone:'mid'}));
    push(annulus(`head-seam-${c.id}`,F,90,91,22,22.5,back,Math.PI,{...opts,tone:'hi'}));
    for(const a of [toward+Math.PI*.75,toward+Math.PI*1.25]){
      const B={...F,o:add(F.o,add(mul(F.u,14*Math.cos(a)),mul(F.v,14*Math.sin(a))))};
      const x=a;
      push(disc(`head-bolt-${c.id}-${x}`,B,96,98,2,{...opts,tone:'hi',segments:6}));
    }
    const plugF={...F,o:add(F.o,add(mul(F.u,10*Math.cos(toward+Math.PI)),mul(F.v,10*Math.sin(toward+Math.PI))))};
    push(disc(`plug-base-${c.id}`,plugF,96,100,3.3,{...opts,tone:'hi',segments:6}));
    push(disc(`plug-ceramic-${c.id}`,plugF,100,109,2.4,{...opts,tone:'hi',material:'ceramic'}));
    for(const s of [101,103,105,107])push(annulus(`plug-rib-${c.id}-${s}`,plugF,s,s+.7,2.4,2.8,0,Math.PI*2,{...opts,tone:'hi',segments:16}));
    push(disc(`plug-terminal-${c.id}`,plugF,109,112,1.6,{...opts,tone:'mid'}));
    push(annulus(`piston-skirt-${c.id}`,F,-8,7,15.6,17.6,0,Math.PI*2,{...opts,tone:'hi',motion:'piston',material:'piston'}));
    push(disc(`piston-${c.id}`,F,7,10,17.6,{...opts,tone:'hi',motion:'piston',material:'piston'}));
    for(const s of [4.6,6.8,8.7])push(annulus(`piston-ring-${c.id}-${s}`,F,s,s+.55,17.6,17.9,0,Math.PI*2,
      {...opts,tone:'lo',motion:'piston'}));
    // Rods are posed rigidly: the bar, both bearing eyes and wrist pin move together.
    const RF=G.frameOf([c.x,0,0],[1,0,0],[0,0,1],[0,-1,0]);
    push(prism(`rod-${c.id}`,RF,[[6,-3],[M.L-3,-2.3],[M.L-3,2.3],[6,3]],-3.1,3.1,
      {...opts,tone:'hi',motion:'rod'}));
    push(annulus(`big-end-${c.id}`,RF,-3.1,3.1,5.3,8,0,Math.PI*2,{...opts,tone:'hi',motion:'rod'}));
    const WF={...RF,o:add(RF.o,mul(RF.u,M.L))};
    push(annulus(`small-end-${c.id}`,WF,-3.1,3.1,2.5,4.7,0,Math.PI*2,{...opts,tone:'hi',motion:'rod'}));
    for(const side of [-1,1])push(annulus(`wrist-boss-${c.id}-${side}`,G.frameOf([c.x,0,0],[1,0,0],[0,1,0],[0,0,1]),side<0?-15.6:12,side<0?-12:15.6,2.5,4.5,0,Math.PI*2,{...opts,tone:'mid',motion:'wrist'}));
    push(disc(`wrist-pin-${c.id}`,G.frameOf([c.x,0,0],[1,0,0],[0,1,0],[0,0,1]),-15.6,15.6,2.4,
      {...opts,tone:'mid',motion:'wrist'}));
    for(const [j,x] of [-8,8].entries()){
      const VF={...F,o:add(F.o,mul(F.u,x))},type=j===0?'intake':'exhaust';
      push(disc(`${type}-valve-${c.id}`,VF,89.3,90,4.4,{...opts,tone:'hi',motion:'valve',valve:type}));
      push(disc(`${type}-stem-${c.id}`,VF,90,104,1,{...opts,tone:'mid',motion:'valve',valve:type,segments:12}));
      push(disc(`${type}-retainer-${c.id}`,VF,102,104,2.7,{...opts,tone:'mid',motion:'valve',valve:type,segments:16}));
    }
    // An explicitly symbolic charge section occupies only the empty chamber.
    const radial=unit(sub(V,mul(c.axis,dot(V,c.axis))));
    const tangent=unit(cp(radial,c.axis));
    const chargeVerts=[[-17,0],[17,0],[17,1],[-17,1]].map(([u,s])=>add(F.o,add(mul(tangent,u),mul(c.axis,s))));
    const charge=mesh(`charge-${c.id}`,chargeVerts,[[0,1,2,3]],{...opts,motion:'charge',material:'charge',twoSided:true});
    charge.chargeTangent=tangent;push(charge);
    const spark=disc(`spark-${c.id}`,plugF,88.7,90,2,{...opts,motion:'spark',material:'spark'});push(spark);
  }
  // A small engraved plate sits flush on the front corner of the display bed.
  push(box('nameplate',{x:66,y:76,w:69,d:17,r:1.5},-1.2,.8,{tone:'mid'}));
  return { meshes, projection:P, width:WIDTH,height:HEIGHT };
}

function posedPoint(mesh,p,state){
  if(!mesh.motion)return p;
  const c=mesh.cylinder?state.cylinders[mesh.cylinder-1]:null;
  if(mesh.motion==='piston')return add(p,mul(c.axis,c.s));
  if(mesh.motion==='valve')return add(p,mul(c.axis,-c[mesh.valve]*3.5));
  if(mesh.motion==='wrist')return add(p,[0,c.piston[1],c.piston[2]]);
  if(mesh.motion==='rod'){
    const RF=rodFrame(c),u=p[2],v=-(p[1]);
    return world(RF,p[0]-c.x,u,v);
  }
  const a=state.angle*M.DEG;
  if(mesh.motion==='wheel'){
    const y=p[1],z=p[2]-M.AXIS_Z;
    return [p[0],y*Math.cos(a)+z*Math.sin(a),M.AXIS_Z+z*Math.cos(a)-y*Math.sin(a)];
  }
  if(mesh.motion==='crank'){
    const cc=state.cylinders[mesh.pair*2],theta=(state.angle-cc.fire)*M.DEG+cc.beta;
    const y=p[1],z=p[2]-M.AXIS_Z;
    return [p[0],y*Math.cos(theta)+z*Math.sin(theta),M.AXIS_Z+z*Math.cos(theta)-y*Math.sin(theta)];
  }
  if(mesh.motion==='pin'){
    const cc=state.cylinders[mesh.pair*2];return add(p,[0,cc.q[1],cc.q[2]-M.AXIS_Z]);
  }
  return p;
}

export function projectScene(scene,state){
  const out=[];
  for(const m of scene.meshes){
    if(!m.motion&&m.projected){out.push(...m.projected);continue;}
    const projected=[];
    const c=m.cylinder?state.cylinders[m.cylinder-1]:null;
    if(m.motion==='spark'&&c.spark<.01)continue;
    let pts;
    if(m.motion==='charge'){
      const F=cylFrame(c),s0=c.s+M.CROWN+.15,s1=M.ROOF-.2;
      pts=[[-17,s0],[17,s0],[17,s1],[-17,s1]].map(([u,s])=>add(F.o,add(mul(m.chargeTangent,u),mul(c.axis,s))));
    }else pts=m.vertices.map(p=>posedPoint(m,p,state));
    const normals=m.faces.map(f=>faceNormal(f.map(i=>pts[i])));
    const shown=normals.map(n=>m.twoSided||dot(n,V)>1e-6);
    const edges=m.faces.map(()=>[]);
    for(const e of m.edges){
      const fs=e.faces.filter(i=>shown[i]);if(!fs.length)continue;
      const silhouette=fs.length<e.faces.length||e.faces.length===1;
      const sharp=e.faces.length===2&&dot(normals[e.faces[0]],normals[e.faces[1]])<.78;
      if(silhouette||sharp)edges[fs.reduce((a,b)=>dot(normals[a],V)>dot(normals[b],V)?a:b)].push([e.a,e.b]);
    }
    const screen=pts.map(p=>k.iso(p,P));
    m.faces.forEach((f,i)=>{
      if(!shown[i])return;
      const ps=f.map(j=>pts[j]),center=avg(ps),xy=f.map(j=>screen[j]);
      const charge=m.material==='charge';
      projected.push({id:`${m.id}:${i}`,mesh:m.id,cylinder:m.cylinder||0,motion:!!m.motion,
        d:k.pathOf(xy,true),edge:charge?'':edges[i].map(([a,b])=>k.pathOf([screen[a],screen[b]])).join(''),
        depth:dot(center,V), normal:normals[i],center,
        screen:xy,shade:G.toneOf(normals[i],P),tone:m.tone||'mid',material:m.material||'',
        color:charge?`var(--cycle-${c.stroke})`:m.material==='spark'?'#fff2ca':null,
        opacity:charge?(c.stroke===0?.22+c.heat*.52:c.stroke===3?.40:.25):m.material==='spark'?c.spark:1});
    });
    // Merge coplanar facets of annular end caps into their true compound face.
    // Internal radial divisions are tessellation, not separate physical parts.
    const merged=new Map();
    for(const face of projected){
      const key=face.normal.map(x=>x.toFixed(5)).join(',')+':'+dot(face.normal,face.center).toFixed(4);
      const prior=merged.get(key);
      if(prior){prior.d+=face.d;prior.edge+=face.edge;prior.depth=(prior.depth*prior.count+face.depth)/(prior.count+1);prior.count++;}
      else merged.set(key,{...face,count:1});
    }
    const result=[...merged.values()];if(!m.motion)m.projected=result;out.push(...result);
  }
  // The bed is wholly below the engine and wholly above its feet. These known
  // separating planes take precedence over a centroid key on a long base face.
  const layer=f=>f.mesh.startsWith('foot-')?0:['display-bed','bed-inlay'].includes(f.mesh)?1:2;
  return out.sort((a,b)=>layer(a)-layer(b)||a.depth-b.depth);
}

export function engravedLabel(){
  return k.faceTextSvg(k.topMatrix([100,85],-.3,P,'x'),'V8 / 90°',{size:5,tone:'hi',anchor:'middle'});
}

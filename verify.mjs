import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import { createEngine, projectScene } from './geometry.mjs';
import { engineAt } from './model.mjs';
import './test-model.mjs';

const root=dirname(fileURLToPath(import.meta.url));
for(const [name,args] of [['index.html',[]],['light.html',['--light']]]){
 const path=join(root,name),before=readFileSync(path);
 const html=before.toString('utf8');
 const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
 assert.equal(scripts.length,1,`${name}: exactly one embedded script`);
 new vm.Script(scripts[0][1],{filename:name});
 assert.ok(!/<script[^>]+src=/.test(html),`${name}: no remote script`);
 assert.ok(!/<link[^>]+(?:stylesheet|preload)/.test(html),`${name}: no external stylesheet`);
 assert.ok(!html.includes('/Users/')&&!html.includes('/private/tmp/'),`${name}: no private workspace path`);
 execFileSync(process.execPath,[join(root,'build.mjs'),...args],{cwd:root,stdio:'pipe'});
 assert.deepEqual(readFileSync(path),before,`${name}: deterministic committed output`);
}
const scene=createEngine();
for(let angle=0;angle<720;angle+=15){
 for(const face of projectScene(scene,engineAt(angle))){
  assert.ok(Number.isFinite(face.depth));
  assert.ok(face.shade>=0&&face.shade<=4);
  assert.ok(!/NaN|Infinity/.test(face.d+face.edge));
 }
}
console.log('PASS: both self-contained scripts parse, 48 engine poses are finite, and both HTML builds reproduce byte-for-byte.');

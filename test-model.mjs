import assert from 'node:assert/strict';
import { engineAt, cylinderAt, CYLINDERS, ORDER, R, L, ROOF, CROWN, mod } from './model.mjs';

let samples = 0;
for (let a = 0; a <= 720; a += 0.5) {
  const state = engineAt(a);
  assert.equal(state.cylinders.length, 8);
  for (const c of state.cylinders) {
    assert.ok(Math.abs(Math.hypot(...c.piston.map((v, i) => v - c.q[i])) - L) < 1e-9,
      `connecting rod length at ${a}°, cylinder ${c.id}`);
    assert.ok(Math.abs(Math.hypot(c.q[1], c.q[2] - 56) - R) < 1e-9);
    assert.ok(c.s >= L - R - 1e-9 && c.s <= L + R + 1e-9);
    assert.ok(c.volume >= 4 - 1e-9 && c.volume <= 40 + 1e-9);
    assert.ok(c.intake >= 0 && c.intake <= 1 && c.exhaust >= 0 && c.exhaust <= 1);
    assert.equal(c.intake > 0 && c.exhaust > 0, false);
    assert.ok(c.stroke >= 0 && c.stroke < 4);
    samples++;
  }
  for (let p = 0; p < 4; p++) {
    const [a, b] = state.cylinders.slice(p * 2, p * 2 + 2);
    assert.ok(Math.hypot(a.q[1] - b.q[1], a.q[2] - b.q[2]) < 1e-9,
      `paired cylinders share a crankpin: ${a.id}/${b.id}`);
  }
  assert.deepEqual(engineAt(a).cylinders.map(c => c.stroke), engineAt(a + 720).cylinders.map(c => c.stroke));
}
for (let i = 0; i < ORDER.length; i++) {
  const a = i * 90;
  assert.equal(engineAt(a).firing, ORDER[i]);
  const c = cylinderAt(ORDER[i], a);
  assert.ok(Math.abs(c.s - (L + R)) < 1e-9);
  assert.equal(c.phase, 0);
}
assert.equal(new Set(CYLINDERS.filter(c => c.id % 2).map(c => mod(c.beta * 180 / Math.PI - c.fire, 360).toFixed(3))).size, 4);
assert.equal((ROOF - (L - R + CROWN)) / (ROOF - (L + R + CROWN)), 10);
assert.equal(mod(-1), 719);
console.log(`PASS: ${samples} cylinder poses; rod length, journal pairing, stroke limits, valves, firing order, periodicity and 10:1 geometric ratio.`);

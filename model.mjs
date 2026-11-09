// Idealized 90° crossplane V8. One crank angle drives every visible readout.
export const DEG = Math.PI / 180;
export const ORDER = [1, 8, 4, 3, 6, 5, 7, 2];
export const R = 18;
export const L = 58;
export const AXIS_Z = 56;
export const ROOF = 90;
export const CROWN = 10;
export const STROKES = ['폭발', '배기', '흡입', '압축'];
export const COLORS = ['#f3a45a', '#9a9fa8', '#6ba6b5', '#bdab80'];
export const mod = (x, n = 720) => ((x % n) + n) % n;
export const CYLINDERS = Array.from({ length: 8 }, (_, i) => {
  const id = i + 1, pair = Math.floor(i / 2), beta = (id % 2 ? 45 : -45) * DEG;
  return { id, pair, beta, x: -99 + pair * 66 + (id % 2 ? -5 : 5),
    fire: ORDER.indexOf(id) * 90, axis: [0, Math.sin(beta), Math.cos(beta)] };
});
export const along = (c, s, x = 0, side = 0) => [c.x + x,
  c.axis[1] * s + Math.cos(c.beta) * side,
  AXIS_Z + c.axis[2] * s - Math.sin(c.beta) * side];
export function cylinderAt(id, angle) {
  const c = CYLINDERS[id - 1];
  const phase = mod(angle - c.fire), delta = phase * DEG;
  // q lies on the shared journal; piston lies on the cylinder's own axis.
  const crank = (angle - c.fire) * DEG + c.beta;
  const q = [c.x, R * Math.sin(crank), AXIS_Z + R * Math.cos(crank)];
  const s = R * Math.cos(delta) + Math.sqrt(L * L - R * R * Math.sin(delta) ** 2);
  const piston = along(c, s), stroke = Math.floor(phase / 180);
  const intake = stroke === 2 ? Math.sin((phase - 360) * DEG) ** 2 : 0;
  const exhaust = stroke === 1 ? Math.sin((phase - 180) * DEG) ** 2 : 0;
  const volume = ROOF - (s + CROWN);
  // A symbolic charge / heat envelope, not thermodynamics or flow simulation.
  const spark = phase < 18 ? Math.sin(Math.PI * phase / 18) ** 2 : 0;
  const heat = stroke === 0 ? Math.exp(-phase / 75) : 0;
  return { ...c, phase, q, s, piston, stroke, intake, exhaust, volume, spark, heat,
    travel: (L + R - s) / (2 * R), color: COLORS[stroke] };
}
export function engineAt(angle) {
  const a = mod(angle);
  return { angle: a, firing: ORDER[Math.floor(a / 90)],
    cylinders: CYLINDERS.map(c => cylinderAt(c.id, a)) };
}

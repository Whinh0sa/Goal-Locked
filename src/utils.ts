export function randomArenaPos(radius: number, safetyBuffer: number, minMaxR: number): [number, number] {
  const maxR = Math.max(minMaxR, radius - safetyBuffer);
  const r = maxR * Math.sqrt(Math.random());
  const a = Math.random() * Math.PI * 2;
  return [Math.cos(a) * r, Math.sin(a) * r];
}

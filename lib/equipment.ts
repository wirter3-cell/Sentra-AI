import * as THREE from 'three';

// Canvas-drawn surface artwork for site equipment: doors, handles, safety
// signs, louvres and fan grilles. Matched to the art-directed model sheet in
// assets-src/user/models-sheet-edit.png.

const FONT = '"Inter Tight Variable", system-ui, sans-serif';

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!] as const;
}

function toTexture(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Yellow high-voltage warning triangle. */
export function warningSign(g: CanvasRenderingContext2D, x: number, y: number, s: number) {
  g.save();
  g.translate(x, y);
  g.beginPath();
  g.moveTo(0, -s * 0.55);
  g.lineTo(s * 0.55, s * 0.42);
  g.lineTo(-s * 0.55, s * 0.42);
  g.closePath();
  g.fillStyle = '#f5c400';
  g.fill();
  g.lineWidth = s * 0.07;
  g.lineJoin = 'round';
  g.strokeStyle = '#151515';
  g.stroke();
  // lightning bolt
  g.beginPath();
  g.moveTo(s * 0.05, -s * 0.28);
  g.lineTo(-s * 0.12, s * 0.06);
  g.lineTo(s * 0.02, s * 0.06);
  g.lineTo(-s * 0.06, s * 0.3);
  g.lineTo(s * 0.14, -s * 0.04);
  g.lineTo(0, -s * 0.04);
  g.closePath();
  g.fillStyle = '#151515';
  g.fill();
  g.restore();
}

function grime(g: CanvasRenderingContext2D, w: number, h: number, strength = 0.28) {
  const dust = g.createLinearGradient(0, h * 0.6, 0, h);
  dust.addColorStop(0, 'rgba(190,150,105,0)');
  dust.addColorStop(1, `rgba(190,150,105,${strength})`);
  g.fillStyle = dust;
  g.fillRect(0, 0, w, h);
}

function doorSeams(g: CanvasRenderingContext2D, x0: number, x1: number, y0: number, y1: number, doors: number, dark: string, light: string) {
  const dw = (x1 - x0) / doors;
  for (let i = 0; i <= doors; i++) {
    const x = Math.round(x0 + i * dw);
    g.fillStyle = dark;
    g.fillRect(x - 2, y0, 3, y1 - y0);
    g.fillStyle = light;
    g.fillRect(x + 1, y0, 2, y1 - y0);
  }
  g.fillStyle = dark;
  g.fillRect(x0, y0, x1 - x0, 3);
  g.fillRect(x0, y1 - 3, x1 - x0, 3);
  return dw;
}

/** Long side of the battery container: livery band, 7 cabinet doors, handles, signs. */
export function containerSideTexture() {
  const W = 2048, H = 512;
  const [c, g] = canvas(W, H);
  g.fillStyle = '#eff1f1';
  g.fillRect(0, 0, W, H);
  // livery: thin navy pinstripe + brand band near the top
  g.fillStyle = '#123a5a';
  g.fillRect(0, 34, W, 6);
  g.fillStyle = '#1f5f86';
  g.fillRect(0, 46, W, 30);
  // cabinet doors
  const top = 96, bottom = 470;
  const doors = 7;
  const dw = doorSeams(g, 24, W - 24, top, bottom, doors, 'rgba(70,78,84,0.75)', 'rgba(255,255,255,0.9)');
  for (let i = 0; i < doors; i++) {
    const dx = 24 + i * dw;
    // vertical lock bar + handle
    g.fillStyle = '#9ea5aa';
    g.fillRect(dx + dw - 34, top + 60, 8, bottom - top - 120);
    g.fillStyle = '#5c6469';
    g.fillRect(dx + dw - 42, (top + bottom) / 2 - 26, 24, 52);
    // vent louvres at the bottom of every other door
    if (i % 2 === 0) {
      g.fillStyle = 'rgba(60,66,70,0.55)';
      for (let k = 0; k < 6; k++) g.fillRect(dx + 30, bottom - 70 + k * 9, dw - 90, 4);
    }
    // safety signs on doors clear of the product name
    if (i === 3 || i === 5) warningSign(g, dx + 52, top + 64, 52);
  }
  // brand + product name
  g.fillStyle = '#0f2d3f';
  g.font = `700 50px ${FONT}`;
  g.fillText('nurun', 40, 158);
  g.fillStyle = '#1f5f86';
  g.font = `600 26px ${FONT}`;
  g.fillText('POWER  ·  BATTERY ENERGY STORAGE SYSTEM', 200, 154);
  // rating plate
  g.fillStyle = '#d9dddf';
  g.fillRect(40, 186, 120, 64);
  g.fillStyle = '#9aa1a5';
  for (let k = 0; k < 5; k++) g.fillRect(50, 198 + k * 10, 100 - k * 9, 4);
  // base rail
  g.fillStyle = '#c9cdcf';
  g.fillRect(0, 478, W, 34);
  grime(g, W, H, 0.3);
  return toTexture(c);
}

/** Front face of the container's packaged HVAC unit: round fan grille. */
export function hvacFaceTexture() {
  const S = 512;
  const [c, g] = canvas(S, S);
  g.fillStyle = '#e6e8e8';
  g.fillRect(0, 0, S, S);
  // panel edge
  g.strokeStyle = 'rgba(110,118,122,0.6)';
  g.lineWidth = 6;
  g.strokeRect(10, 10, S - 20, S - 20);
  const cx = S / 2, cy = S / 2 + 10, r = 180;
  // fan opening
  const grd = g.createRadialGradient(cx, cy, 10, cx, cy, r);
  grd.addColorStop(0, '#2b3034');
  grd.addColorStop(1, '#14181a');
  g.fillStyle = grd;
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fill();
  // fan blades
  g.fillStyle = '#3f464b';
  for (let i = 0; i < 4; i++) {
    g.save();
    g.translate(cx, cy);
    g.rotate((i * Math.PI) / 2 + 0.35);
    g.beginPath();
    g.ellipse(0, -r * 0.48, r * 0.2, r * 0.42, 0.45, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  g.fillStyle = '#5a6267';
  g.beginPath();
  g.arc(cx, cy, 30, 0, Math.PI * 2);
  g.fill();
  // grille rings + spokes
  g.strokeStyle = 'rgba(205,210,212,0.85)';
  g.lineWidth = 3;
  for (let k = 1; k <= 8; k++) {
    g.beginPath();
    g.arc(cx, cy, (r * k) / 8, 0, Math.PI * 2);
    g.stroke();
  }
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    g.moveTo(cx + Math.cos((i * Math.PI) / 4) * r, cy + Math.sin((i * Math.PI) / 4) * r);
    g.lineTo(cx - Math.cos((i * Math.PI) / 4) * r, cy - Math.sin((i * Math.PI) / 4) * r);
    g.stroke();
  }
  // rim
  g.strokeStyle = '#c3c8ca';
  g.lineWidth = 10;
  g.beginPath();
  g.arc(cx, cy, r + 6, 0, Math.PI * 2);
  g.stroke();
  grime(g, S, S, 0.18);
  return toTexture(c);
}

/** Painted steel electrical cabinet face with doors, handles and signage. */
export function cabinetTexture({
  color = '#2f3539',
  doors = 2,
  sign = true,
  louvres = false,
  plate = true,
  w = 512,
  h = 512,
}: { color?: string; doors?: number; sign?: boolean; louvres?: boolean; plate?: boolean; w?: number; h?: number } = {}) {
  const [c, g] = canvas(w, h);
  g.fillStyle = color;
  g.fillRect(0, 0, w, h);
  const light = new THREE.Color(color).getHSL({ h: 0, s: 0, l: 0 }).l > 0.5;
  const dark = light ? 'rgba(80,88,92,0.7)' : 'rgba(0,0,0,0.6)';
  const hi = light ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.12)';
  const dw = doorSeams(g, 14, w - 14, 18, h - 26, doors, dark, hi);
  for (let i = 0; i < doors; i++) {
    const dx = 14 + i * dw;
    // handle
    g.fillStyle = light ? '#6b7378' : '#a9b0b4';
    g.fillRect(dx + dw - 30, h * 0.45, 10, h * 0.14);
    if (louvres) {
      g.fillStyle = light ? 'rgba(70,78,82,0.55)' : 'rgba(0,0,0,0.45)';
      for (let k = 0; k < 8; k++) g.fillRect(dx + 24, h * 0.66 + k * 11, dw - 70, 5);
      for (let k = 0; k < 4; k++) g.fillRect(dx + 24, h * 0.12 + k * 11, dw - 70, 5);
    }
  }
  if (sign) warningSign(g, 14 + dw / 2 - 10, h * 0.3, Math.min(70, dw * 0.45));
  if (plate) {
    g.fillStyle = light ? '#c9cdd0' : '#d6d9db';
    g.fillRect(30, 34, 70, 34);
  }
  // plinth
  g.fillStyle = light ? '#b9bdbf' : '#1f2427';
  g.fillRect(0, h - 26, w, 26);
  grime(g, w, h, 0.22);
  return toTexture(c);
}

/** Box face materials [+x, -x, +y, -y, +z, -z] for a cabinet with doors on the front and sides. */
export function cabinetMaterials(color: string, front: THREE.Texture, side: THREE.Texture, opts: { metalness?: number; roughness?: number } = {}) {
  const base = { roughness: opts.roughness ?? 0.55, metalness: opts.metalness ?? 0.3 };
  const plain = new THREE.MeshStandardMaterial({ ...base, color });
  const f = new THREE.MeshStandardMaterial({ ...base, map: front });
  const s = new THREE.MeshStandardMaterial({ ...base, map: side });
  return [s, s, plain, plain, f, plain] as THREE.Material[];
}

/** EV charger screen: state of charge with a ring gauge. */
export function chargerScreenTexture(percent = 72) {
  const W = 256, H = 384;
  const [c, g] = canvas(W, H);
  const grd = g.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, '#071512');
  grd.addColorStop(1, '#020806');
  g.fillStyle = grd;
  g.fillRect(0, 0, W, H);
  // status bar
  g.fillStyle = '#a0ff75';
  g.font = `700 22px ${FONT}`;
  g.fillText('nurun', 18, 34);
  g.fillStyle = 'rgba(160,255,117,0.18)';
  g.beginPath();
  g.roundRect(W - 96, 16, 78, 24, 12);
  g.fill();
  g.fillStyle = '#a0ff75';
  g.font = `600 12px ${FONT}`;
  g.fillText('CHARGING', W - 88, 33);
  // percentage
  g.fillStyle = '#ffffff';
  g.font = `600 72px ${FONT}`;
  g.fillText(`${percent}%`, 18, 128);
  g.fillStyle = 'rgba(255,255,255,0.12)';
  g.fillRect(20, 148, W - 40, 8);
  g.fillStyle = '#a0ff75';
  g.fillRect(20, 148, (W - 40) * (percent / 100), 8);
  // ring gauge with bolt
  const cx = W / 2, cy = 262, r = 54;
  g.lineWidth = 9;
  g.strokeStyle = 'rgba(255,255,255,0.12)';
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = '#a0ff75';
  g.lineCap = 'round';
  g.beginPath();
  g.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (percent / 100));
  g.stroke();
  g.fillStyle = '#a0ff75';
  g.beginPath();
  g.moveTo(cx + 6, cy - 26);
  g.lineTo(cx - 14, cy + 4);
  g.lineTo(cx - 1, cy + 4);
  g.lineTo(cx - 6, cy + 26);
  g.lineTo(cx + 14, cy - 4);
  g.lineTo(cx + 1, cy - 4);
  g.closePath();
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.55)';
  g.font = `500 14px ${FONT}`;
  g.fillText('DC fast charge', 18, 356);
  const t = toTexture(c);
  return t;
}

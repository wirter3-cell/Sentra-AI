import * as THREE from 'three';

// Procedural, tileable textures generated on the client at startup.
// Keeps the download small while giving surfaces real-world detail.

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Periodic 2D value noise (tiles every `period` lattice cells). */
function makeNoise(period: number, seed = 1) {
  const r = rng(seed);
  const lat = new Float32Array(period * period).map(() => r());
  const at = (x: number, y: number) =>
    lat[(((y % period) + period) % period) * period + (((x % period) + period) % period)];
  const fade = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = fade(x - xi), yf = fade(y - yi);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
}

function fbm(n: ReturnType<typeof makeNoise>, x: number, y: number, oct: number, basePeriod: number) {
  // octaves double frequency; lattice period must scale accordingly, so callers
  // create noise with a period that is a multiple of every octave's frequency
  let v = 0, amp = 0.5, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) {
    v += amp * n(x * f * basePeriod, y * f * basePeriod);
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return v / norm;
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Height field -> tangent-space normal map. */
function heightToNormal(h: Float32Array, size: number, strength: number) {
  const c = canvas(size, size);
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const H = (x: number, y: number) => h[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * strength;
      const dy = (H(x, y + 1) - H(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      img.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function tex(c: HTMLCanvasElement, srgb: boolean, repeat = 1) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

/** Wind-rippled desert sand: colour + normal. */
export function sandTextures(size = 512) {
  const n = makeNoise(256, 7);
  const n2 = makeNoise(64, 11);
  const h = new Float32Array(size * size);
  const c = canvas(size, size);
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const warp = fbm(n2, u, v, 3, 4) * 6.0;
      // wind ripples: tileable because 18 full periods fit the texture
      const ripple = Math.sin((v * 18 + warp * 0.35) * Math.PI * 2) * 0.5 + 0.5;
      const grain = n(x, y);
      const big = fbm(n, u, v, 4, 8);
      h[y * size + x] = Math.pow(ripple, 1.6) * 0.8 + grain * 0.25 + big * 0.4;
      const tone = 0.86 + big * 0.18 + grain * 0.07 - (1 - ripple) * 0.06;
      const i = (y * size + x) * 4;
      img.data[i] = Math.min(255, 226 * tone);
      img.data[i + 1] = Math.min(255, 164 * tone);
      img.data[i + 2] = Math.min(255, 104 * tone);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return { map: tex(c, true), normal: tex(heightToNormal(h, size, 2.2), false) };
}

/** Corrugated steel panel normal map (for storage containers). */
export function corrugatedNormal() {
  const size = 256;
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const p = (x / size) * 8; // 8 corrugations per tile
      const f = p - Math.floor(p);
      // trapezoidal profile like ISO container walls
      h[y * size + x] = f < 0.15 ? f / 0.15 : f < 0.5 ? 1 : f < 0.65 ? 1 - (f - 0.5) / 0.15 : 0;
    }
  return tex(heightToNormal(h, size, 3.5), false);
}

/** Fine noise for concrete / painted surfaces. */
export function grainTextures(seed = 5, base = [178, 176, 170]) {
  const size = 256;
  const n = makeNoise(256, seed);
  const c = canvas(size, size);
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const v = fbm(n, x / size, y / size, 4, 16) * 0.6 + n(x, y) * 0.4;
      h[y * size + x] = v;
      const i = (y * size + x) * 4;
      const t = 0.85 + v * 0.25;
      img.data[i] = base[0] * t; img.data[i + 1] = base[1] * t; img.data[i + 2] = base[2] * t; img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  return { map: tex(c, true), normal: tex(heightToNormal(h, size, 0.8), false) };
}

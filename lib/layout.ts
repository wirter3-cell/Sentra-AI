import * as THREE from 'three';

// World units are metres. The site is laid out west → east along +x, and the
// camera travels across it as the visitor scrolls.

export const SUN_DIR = new THREE.Vector3(-0.62, 0.24, -0.75).normalize();

export const STATIONS = {
  field: new THREE.Vector3(-10, 0, -30),
  storage: new THREE.Vector3(74, 0, -18),
  hub: new THREE.Vector3(131, 0, 2),
  blueprint: new THREE.Vector3(192, 0, -10),
};

type Shot = { pos: [number, number, number]; target: [number, number, number]; fov: number };

/** One camera shot per page section, in scroll order. */
export const SHOTS: Shot[] = [
  { pos: [-84, 13, 24], target: [4, -4, -46], fov: 38 }, // hero – low aerial, sun glow on the horizon
  { pos: [-10, 3.4, -1.5], target: [-1, 2.0, -52], fov: 44 }, // chain – down an aisle between tracker rows
  { pos: [50, 6.5, 8], target: [74, 1.8, -17], fov: 40 }, // power – battery yard
  { pos: [139.5, 2.0, 12.5], target: [131.2, 1.0, 2.2], fov: 36 }, // mobility – charger + car
  { pos: [172, 6.5, 22], target: [197, 1.2, -12], fov: 40 }, // engineering – blueprint
  { pos: [-48, 42, 92], target: [58, 0, -34], fov: 40 }, // contact – wide aerial
];

/** Flat build area; dunes rise outside it. */
export const SITE_BOUNDS = { minX: -95, maxX: 245, minZ: -105, maxZ: 60 };

export const FIELD = { rows: 20, rowSpacing: 6.2, modulesPerRow: 40, moduleW: 1.15, moduleL: 2.3 };

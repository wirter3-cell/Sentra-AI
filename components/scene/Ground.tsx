'use client';
import { useMemo } from 'react';
import * as THREE from 'three';
import { sandTextures } from '@/lib/textures';
import { SITE_BOUNDS } from '@/lib/layout';

// Large desert floor: flat build site in the middle, rolling dunes around it.
export default function Ground({ segments = 220 }: { segments?: number }) {
  const { geometry, material } = useMemo(() => {
    const size = 1600;
    const g = new THREE.PlaneGeometry(size, size, segments, segments);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position as THREE.BufferAttribute;
    const { minX, maxX, minZ, maxZ } = SITE_BOUNDS;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const dx = Math.max(minX - x, 0, x - maxX);
      const dz = Math.max(minZ - z, 0, z - maxZ);
      const d = Math.hypot(dx, dz);
      const mask = THREE.MathUtils.smoothstep(d, 10, 120);
      const dunes =
        Math.sin(x * 0.012 + Math.sin(z * 0.008) * 2.0) * 9 +
        Math.sin(z * 0.019 + x * 0.004) * 6 +
        Math.sin((x + z) * 0.035) * 2.5 +
        12;
      p.setY(i, dunes * mask + Math.sin(x * 0.05) * Math.cos(z * 0.04) * 0.25);
    }
    g.computeVertexNormals();
    const { map, normal } = sandTextures(512);
    map.repeat.set(120, 120);
    normal.repeat.set(120, 120);
    const m = new THREE.MeshStandardMaterial({
      map,
      normalMap: normal,
      normalScale: new THREE.Vector2(0.55, 0.55),
      roughness: 0.94,
      metalness: 0,
      color: new THREE.Color('#ead2b4'),
      envMapIntensity: 0.6,
    });
    return { geometry: g, material: m };
  }, [segments]);

  return <mesh geometry={geometry} material={material} receiveShadow />;
}

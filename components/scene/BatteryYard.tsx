'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { corrugatedNormal, grainTextures } from '@/lib/textures';
import { STATIONS } from '@/lib/layout';

const L = 12.2, W = 2.5, H = 2.9;

function sideLabel() {
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#eef0f0';
  g.fillRect(0, 0, c.width, c.height);
  // subtle dust towards the bottom
  const dust = g.createLinearGradient(0, 300, 0, 512);
  dust.addColorStop(0, 'rgba(196,160,118,0)');
  dust.addColorStop(1, 'rgba(196,160,118,0.35)');
  g.fillStyle = dust;
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#28718a';
  g.fillRect(0, 70, c.width, 46);
  g.fillStyle = '#0d2a33';
  g.font = '600 64px "Inter Tight Variable", system-ui, sans-serif';
  g.fillText('nurun', 110, 230);
  g.fillStyle = '#28718a';
  g.font = '500 40px "Inter Tight Variable", system-ui, sans-serif';
  g.fillText('POWER · ENERGY STORAGE SYSTEM', 310, 228);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function useContainerMaterials() {
  return useMemo(() => {
    const ribs = corrugatedNormal();
    const sideNormal = ribs.clone();
    sideNormal.repeat.set(10, 1);
    sideNormal.needsUpdate = true;
    const endNormal = ribs.clone();
    endNormal.repeat.set(2, 1);
    endNormal.needsUpdate = true;
    const base = { roughness: 0.42, metalness: 0.25, envMapIntensity: 0.9 };
    const side = new THREE.MeshStandardMaterial({ ...base, map: sideLabel(), normalMap: sideNormal, normalScale: new THREE.Vector2(0.9, 0.9) });
    const end = new THREE.MeshStandardMaterial({ ...base, color: '#eceeee', normalMap: endNormal });
    const top = new THREE.MeshStandardMaterial({ ...base, color: '#e3e5e5' });
    const concrete = grainTextures(9, [176, 172, 165]);
    concrete.map.repeat.set(6, 6);
    concrete.normal.repeat.set(6, 6);
    return {
      // box faces: +x, -x, +y, -y, +z, -z
      body: [side, side, top, top, end, end] as THREE.Material[],
      hvac: new THREE.MeshStandardMaterial({ color: '#c8cccd', roughness: 0.5, metalness: 0.5 }),
      grille: new THREE.MeshStandardMaterial({ color: '#2a2f33', roughness: 0.8 }),
      seam: new THREE.MeshStandardMaterial({ color: '#9aa0a3', roughness: 0.5, metalness: 0.6 }),
      led: new THREE.MeshStandardMaterial({ color: '#a0ff75', emissive: '#a0ff75', emissiveIntensity: 3, toneMapped: false }),
      pad: new THREE.MeshStandardMaterial({ map: concrete.map, normalMap: concrete.normal, roughness: 0.92 }),
    };
  }, []);
}

function Container({ position, m, index }: { position: [number, number, number]; m: ReturnType<typeof useContainerMaterials>; index: number }) {
  const led = useRef<THREE.Mesh>(null);
  const ledMat = useMemo(() => m.led.clone(), [m]);
  useFrame(({ clock }) => {
    if (led.current) {
      // gentle "charging" breathing, staggered per container
      const s = 0.6 + 0.4 * Math.sin(clock.elapsedTime * 1.6 - index * 0.7);
      led.current.scale.x = 0.25 + 0.75 * ((Math.sin(clock.elapsedTime * 0.4 + index) + 1) / 2);
      (led.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 2 + s * 2;
    }
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.45, 0]} receiveShadow material={m.pad}>
        <boxGeometry args={[W + 1.2, 0.3, L + 1.6]} />
      </mesh>
      <mesh position={[0, 0.6 + H / 2, 0]} castShadow receiveShadow material={m.body}>
        <boxGeometry args={[W, H, L]} />
      </mesh>
      {/* door seams on the side */}
      {[-4, -1.2, 1.6, 4.4].map((z) => (
        <mesh key={z} position={[W / 2 + 0.006, 0.6 + H / 2, z]} material={m.seam}>
          <boxGeometry args={[0.01, H - 0.3, 0.03]} />
        </mesh>
      ))}
      {/* HVAC units on the end wall */}
      <mesh position={[0, 0.6 + H * 0.62, L / 2 + 0.22]} castShadow material={m.hvac}>
        <boxGeometry args={[1.5, 1.1, 0.44]} />
      </mesh>
      <mesh position={[0, 0.6 + H * 0.62, L / 2 + 0.445]} material={m.grille}>
        <circleGeometry args={[0.38, 24]} />
      </mesh>
      {/* status light strip (state of charge) */}
      <mesh ref={led} position={[W / 2 + 0.02, 0.6 + H - 0.38, 0]} material={ledMat}>
        <boxGeometry args={[0.02, 0.06, L * 0.86]} />
      </mesh>
    </group>
  );
}

export default function BatteryYard() {
  const m = useContainerMaterials();
  const { x, z } = STATIONS.storage;
  const containers: [number, number, number][] = [];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) containers.push([x + (c - 1.5) * 5.2, 0, z + (r - 0.5) * 17]);

  return (
    <group>
      {containers.map((p, i) => (
        <Container key={i} position={p} m={m} index={i} />
      ))}
      {/* power conversion skid + transformer between the rows */}
      <group position={[x + 13, 0, z]}>
        <mesh position={[0, 0.2, 0]} receiveShadow material={m.pad}>
          <boxGeometry args={[5, 0.4, 9]} />
        </mesh>
        <mesh position={[0, 1.6, -1.8]} castShadow receiveShadow>
          <boxGeometry args={[2.6, 2.4, 3.6]} />
          <meshStandardMaterial color="#5b6c73" metalness={0.4} roughness={0.5} />
        </mesh>
        <mesh position={[0, 1.4, 2.4]} castShadow receiveShadow>
          <boxGeometry args={[2.2, 2.0, 2.4]} />
          <meshStandardMaterial color="#a8afb3" metalness={0.5} roughness={0.45} />
        </mesh>
        {[-0.6, 0, 0.6].map((dx) => (
          <mesh key={dx} position={[dx, 2.75, 2.4]} castShadow>
            <cylinderGeometry args={[0.09, 0.12, 0.7, 12]} />
            <meshStandardMaterial color="#7b5a3b" roughness={0.6} />
          </mesh>
        ))}
      </group>
      {/* perimeter fence */}
      <Fence x0={x - 13} x1={x + 17} z0={z - 17} z1={z + 17} />
    </group>
  );
}

function Fence({ x0, x1, z0, z1 }: { x0: number; x1: number; z0: number; z1: number }) {
  const geo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const corners = [
      [x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0],
    ];
    for (let i = 0; i < 4; i++) {
      const [ax, az] = corners[i], [bx, bz] = corners[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      const n = Math.ceil(len / 3);
      for (let k = 0; k < n; k++) {
        const t = k / n;
        const px = ax + (bx - ax) * t, pz = az + (bz - az) * t;
        pts.push(new THREE.Vector3(px, 0, pz), new THREE.Vector3(px, 2.1, pz));
      }
      for (const h of [0.1, 1.05, 2.05]) pts.push(new THREE.Vector3(ax, h, az), new THREE.Vector3(bx, h, bz));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [x0, x1, z0, z1]);
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#6f7478" transparent opacity={0.7} />
    </lineSegments>
  );
}

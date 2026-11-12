'use client';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { corrugatedNormal } from '@/lib/textures';
import { cabinetMaterials, cabinetTexture, containerSideTexture, hvacFaceTexture } from '@/lib/equipment';
import { STATIONS } from '@/lib/layout';
import { useConcrete } from './SolarField';

const L = 12.2, W = 2.5, H = 2.9;

export function useContainerMaterials() {
  return useMemo(() => {
    const ribs = corrugatedNormal();
    const sideNormal = ribs.clone();
    sideNormal.repeat.set(10, 1);
    sideNormal.needsUpdate = true;
    const endNormal = ribs.clone();
    endNormal.repeat.set(2, 1);
    endNormal.needsUpdate = true;
    const base = { roughness: 0.42, metalness: 0.25, envMapIntensity: 0.9 };
    const side = new THREE.MeshStandardMaterial({ ...base, map: containerSideTexture(), normalMap: sideNormal, normalScale: new THREE.Vector2(0.7, 0.7) });
    const end = new THREE.MeshStandardMaterial({ ...base, color: '#eceeee', normalMap: endNormal });
    const top = new THREE.MeshStandardMaterial({ ...base, color: '#e3e5e5' });
    const hvacBody = new THREE.MeshStandardMaterial({ color: '#e4e6e6', roughness: 0.45, metalness: 0.2 });
    const hvacFace = new THREE.MeshStandardMaterial({ map: hvacFaceTexture(), roughness: 0.5, metalness: 0.2 });
    return {
      // box faces: +x, -x, +y, -y, +z, -z
      body: [side, side, top, top, end, end] as THREE.Material[],
      hvac: [hvacBody, hvacBody, hvacBody, hvacBody, hvacFace, hvacBody] as THREE.Material[],
      corner: new THREE.MeshStandardMaterial({ color: '#d4d8da', roughness: 0.4, metalness: 0.5 }),
      led: new THREE.MeshStandardMaterial({ color: '#a0ff75', emissive: '#a0ff75', emissiveIntensity: 3, toneMapped: false }),
    };
  }, []);
}

export function Container({ position, m, index }: { position: [number, number, number]; m: ReturnType<typeof useContainerMaterials>; index: number }) {
  const pad = useConcrete(3, 9);
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
      <mesh position={[0, 0.3, 0]} receiveShadow castShadow material={pad}>
        <boxGeometry args={[W + 1.0, 0.6, L + 1.4]} />
      </mesh>
      <mesh position={[0, 0.6 + H / 2, 0]} castShadow receiveShadow material={m.body}>
        <boxGeometry args={[W, H, L]} />
      </mesh>
      {/* corner posts, like an ISO container frame */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * (W / 2 - 0.04), 0.6 + H / 2, sz * (L / 2 - 0.04)]} material={m.corner} castShadow>
            <boxGeometry args={[0.12, H + 0.02, 0.12]} />
          </mesh>
        )),
      )}
      {/* packaged HVAC unit on the end wall */}
      <mesh position={[0, 0.6 + H * 0.55, L / 2 + 0.3]} castShadow receiveShadow material={m.hvac}>
        <boxGeometry args={[1.4, 1.4, 0.6]} />
      </mesh>
      <mesh position={[0, 0.6 + H * 0.55 + 0.74, L / 2 + 0.3]} castShadow material={m.corner}>
        <boxGeometry args={[1.5, 0.06, 0.7]} />
      </mesh>
      {/* status light strip (state of charge) */}
      <mesh ref={led} position={[W / 2 + 0.02, 0.6 + H - 0.06, 0]} material={ledMat}>
        <boxGeometry args={[0.02, 0.05, L * 0.86]} />
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
      <PcsSkid position={[x + 13, 0, z]} />
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

/** Porcelain HV bushing: brown glazed sheds on a metal flange. */
function Bushing({ position, height = 0.75, radius = 0.075 }: { position: [number, number, number]; height?: number; radius?: number }) {
  const sheds = Math.round(height / 0.11);
  return (
    <group position={position}>
      <mesh position={[0, 0.04, 0]} castShadow>
        <cylinderGeometry args={[radius * 1.9, radius * 1.9, 0.08, 16]} />
        <meshStandardMaterial color="#8c9396" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[0, height / 2, 0]} castShadow>
        <cylinderGeometry args={[radius * 0.7, radius, height, 14]} />
        <meshPhysicalMaterial color="#9c4a1f" roughness={0.22} clearcoat={0.8} />
      </mesh>
      {Array.from({ length: sheds }, (_, i) => (
        <mesh key={i} position={[0, 0.12 + i * ((height - 0.16) / sheds), 0]} castShadow>
          <cylinderGeometry args={[radius * 1.75 - i * 0.004, radius * 1.75 - i * 0.004, 0.035, 18]} />
          <meshPhysicalMaterial color="#a8541f" roughness={0.22} clearcoat={0.8} />
        </mesh>
      ))}
      <mesh position={[0, height + 0.04, 0]} castShadow>
        <cylinderGeometry args={[radius * 0.6, radius * 0.6, 0.1, 12]} />
        <meshStandardMaterial color="#b7b0a0" metalness={0.8} roughness={0.35} />
      </mesh>
    </group>
  );
}

/** Oil-filled step-up transformer with radiator fins and HV bushings. */
function Transformer({ position }: { position: [number, number, number] }) {
  const fins = useRef<THREE.InstancedMesh>(null);
  const tankMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#99a1a5', metalness: 0.45, roughness: 0.48 }), []);
  const n = 11;
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    let k = 0;
    for (const side of [-1, 1])
      for (let i = 0; i < n; i++) {
        m.makeTranslation(side * 1.32, 1.0, -0.9 + (i / (n - 1)) * 1.8);
        fins.current!.setMatrixAt(k++, m);
      }
    fins.current!.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <group position={position}>
      <mesh position={[0, 1.0, 0]} castShadow receiveShadow material={tankMat}>
        <boxGeometry args={[2.0, 1.8, 2.1]} />
      </mesh>
      <instancedMesh ref={fins} args={[undefined, tankMat, n * 2]} castShadow>
        <boxGeometry args={[0.62, 1.5, 0.05]} />
      </instancedMesh>
      <mesh position={[0, 1.95, 0]} castShadow material={tankMat}>
        <boxGeometry args={[2.1, 0.1, 2.2]} />
      </mesh>
      {/* conservator tank */}
      <mesh position={[0.55, 2.35, -0.65]} rotation={[0, 0, Math.PI / 2]} castShadow material={tankMat}>
        <cylinderGeometry args={[0.2, 0.2, 0.9, 16]} />
      </mesh>
      {[-0.55, 0, 0.55].map((dz) => (
        <Bushing key={dz} position={[-0.4, 2.0, dz]} />
      ))}
      {[-0.4, 0, 0.4].map((dz) => (
        <Bushing key={'lv' + dz} position={[0.55, 2.0, dz + 0.4]} height={0.32} radius={0.05} />
      ))}
    </group>
  );
}

/** Power conversion system cabinet + step-up transformer on a concrete pad. */
export function PcsSkid({ position = [0, 0, 0] }: { position?: [number, number, number] }) {
  const pad = useConcrete(2, 17);
  const pcs = useMemo(() => {
    const c = '#2f3539';
    return cabinetMaterials(c, cabinetTexture({ color: c, doors: 3, sign: true }), cabinetTexture({ color: c, doors: 3, sign: true, louvres: true, plate: false }));
  }, []);
  return (
    <group position={position}>
      <mesh position={[0, 0.2, 0]} receiveShadow castShadow material={pad}>
        <boxGeometry args={[5, 0.4, 9]} />
      </mesh>
      <mesh position={[0, 1.65, -2.0]} castShadow receiveShadow material={pcs}>
        <boxGeometry args={[2.6, 2.5, 3.6]} />
      </mesh>
      <mesh position={[0, 2.94, -2.0]} castShadow>
        <boxGeometry args={[2.72, 0.07, 3.72]} />
        <meshStandardMaterial color="#262c30" metalness={0.4} roughness={0.5} />
      </mesh>
      <Transformer position={[0, 0.4, 2.2]} />
    </group>
  );
}

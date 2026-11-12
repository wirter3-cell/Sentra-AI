'use client';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { chargerScreen, grainTextures } from '@/lib/textures';
import { STATIONS } from '@/lib/layout';
import { usePvMaterials } from './SolarField';

const CAR_URL = '/models/car.glb';

/** CC-BY 4.0 "Car Concept" by Eric Chadwick / DGG (Khronos glTF sample assets), logos removed. */
export function Car({ position, rotation = 0, paint }: { position: [number, number, number]; rotation?: number; paint: string }) {
  const { scene } = useGLTF(CAR_URL);
  const car = useMemo(() => {
    const root = scene.clone(true);
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const mat = mesh.material as THREE.MeshPhysicalMaterial;
      if (!mat?.name) return;
      if (mat.name.startsWith('Paint 1')) {
        const m = mat.clone();
        m.color.set(paint);
        m.metalness = 0.6;
        m.roughness = 0.28;
        m.clearcoat = 1;
        m.clearcoatRoughness = 0.04;
        if ('iridescence' in m) m.iridescence = 0;
        mesh.material = m;
      } else if (mat.name.startsWith('Paint 2')) {
        const m = mat.clone();
        m.color.set('#0c0f10');
        m.metalness = 0.3;
        m.roughness = 0.2;
        m.clearcoat = 1;
        mesh.material = m;
      } else if (mat.name.startsWith('Interior 3')) {
        const m = mat.clone();
        m.color.set('#2a2d2f');
        mesh.material = m;
      }
    });
    return root;
  }, [scene, paint]);
  return <primitive object={car} position={position} rotation={[0, rotation, 0]} scale={1.06} />;
}
useGLTF.preload(CAR_URL);

export function Charger({ position, percent, ring }: { position: [number, number, number]; percent: number; ring: boolean }) {
  const screen = useMemo(() => chargerScreen(percent), [percent]);
  const ringRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (ringRef.current && ring) ringRef.current.emissiveIntensity = 2.2 + Math.sin(clock.elapsedTime * 2.2) * 1.2;
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.08, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.9, 0.16, 0.65]} />
        <meshStandardMaterial color="#8e8c86" roughness={0.9} />
      </mesh>
      <RoundedBox args={[0.6, 1.75, 0.34]} radius={0.07} smoothness={4} position={[0, 1.04, 0]} castShadow receiveShadow>
        <meshPhysicalMaterial color="#f2f3f2" roughness={0.3} metalness={0.05} clearcoat={0.6} />
      </RoundedBox>
      {/* glass front + screen */}
      <mesh position={[0, 1.22, 0.172]}>
        <planeGeometry args={[0.46, 1.05]} />
        <meshPhysicalMaterial color="#05090a" roughness={0.08} metalness={0.2} clearcoat={1} />
      </mesh>
      <mesh position={[0, 1.36, 0.174]}>
        <planeGeometry args={[0.34, 0.51]} />
        <meshBasicMaterial map={screen} toneMapped={false} />
      </mesh>
      {/* status light */}
      <mesh position={[0.305, 1.04, 0]}>
        <boxGeometry args={[0.012, 1.4, 0.05]} />
        <meshStandardMaterial ref={ringRef} color="#a0ff75" emissive="#a0ff75" emissiveIntensity={ring ? 3 : 0.6} toneMapped={false} />
      </mesh>
      {/* holster */}
      <mesh position={[0.24, 0.92, 0.2]} castShadow>
        <boxGeometry args={[0.12, 0.2, 0.1]} />
        <meshStandardMaterial color="#1b1f21" roughness={0.6} />
      </mesh>
    </group>
  );
}

function Cable({ points }: { points: [number, number, number][] }) {
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    return new THREE.TubeGeometry(curve, 64, 0.022, 8, false);
  }, [points]);
  return (
    <mesh geometry={geo} castShadow>
      <meshStandardMaterial color="#111416" roughness={0.55} />
    </mesh>
  );
}

export function Canopy({ cx, cz }: { cx: number; cz: number }) {
  const pv = usePvMaterials();
  const ref = useRef<THREE.InstancedMesh>(null);
  const cols = 13, rows = 4;
  const geo = useMemo(() => new THREE.BoxGeometry(2.3, 0.04, 1.15), []);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    let k = 0;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        // modules laid portrait-across, roof slopes gently toward +z
        m.makeTranslation((c - (cols - 1) / 2) * 1.17, 0, (r - (rows - 1) / 2) * 2.32);
        m.multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2));
        ref.current!.setMatrixAt(k++, m);
      }
    ref.current!.instanceMatrix.needsUpdate = true;
  }, []);
  const steel = pv.steel;
  return (
    <group position={[cx, 0, cz]}>
      <group position={[0, 4.35, 0]} rotation={[0.1, 0, 0]}>
        <instancedMesh ref={ref} args={[geo, pv.module, cols * rows]} castShadow receiveShadow />
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0, -0.12, s * 3.2]} material={steel} castShadow>
            <boxGeometry args={[cols * 1.17 + 0.4, 0.22, 0.14]} />
          </mesh>
        ))}
      </group>
      {[-6.5, 0, 6.5].map((x) => (
        <mesh key={x} position={[x, 2.2, -2.6]} material={steel} castShadow receiveShadow>
          <boxGeometry args={[0.28, 4.4, 0.28]} />
        </mesh>
      ))}
      {[-6.5, 0, 6.5].map((x) => (
        <mesh key={'b' + x} position={[x, 4.2, -0.6]} rotation={[-0.08, 0, 0]} material={steel} castShadow>
          <boxGeometry args={[0.22, 0.26, 6.8]} />
        </mesh>
      ))}
    </group>
  );
}

export default function ChargingHub() {
  const { x, z } = STATIONS.hub;
  const pad = useMemo(() => {
    const t = grainTextures(21, [168, 165, 158]);
    t.map.repeat.set(8, 6);
    t.normal.repeat.set(8, 6);
    return t;
  }, []);
  const bays = [-4.3, 0, 4.3];

  return (
    <group>
      {/* concrete pad */}
      <mesh position={[x, 0.06, z + 1]} receiveShadow>
        <boxGeometry args={[22, 0.12, 16]} />
        <meshStandardMaterial map={pad.map} normalMap={pad.normal} roughness={0.9} />
      </mesh>
      {/* painted EV bays */}
      {bays.map((bx) => (
        <group key={bx}>
          <mesh position={[x + bx, 0.125, z + 1.6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[3.6, 6.2]} />
            <meshStandardMaterial color="#1d6a58" roughness={0.75} />
          </mesh>
          {[-1.85, 1.85].map((lx) => (
            <mesh key={lx} position={[x + bx + lx, 0.128, z + 1.6]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.1, 6.2]} />
              <meshStandardMaterial color="#f1efe8" roughness={0.6} />
            </mesh>
          ))}
        </group>
      ))}
      <Canopy cx={x} cz={z + 1.2} />
      {bays.map((bx, i) => (
        <Charger key={bx} position={[x + bx + 2.15, 0.12, z - 1.5]} percent={[72, 41, 88][i]} ring={i !== 2} />
      ))}
      <Car position={[x, 0.12, z + 1.4]} paint="#e9ecec" />
      <Car position={[x - 4.3, 0.12, z + 1.2]} paint="#0f3b38" />
      {/* cables from the charger holsters to the rear-left charge ports */}
      <Cable points={[[x + 2.39, 1.0, z - 1.3], [x + 2.25, 0.5, z - 0.95], [x + 1.8, 0.33, z - 0.3], [x + 1.4, 0.55, z + 0.2], [x + 1.22, 0.82, z + 0.38]]} />
      <Cable points={[[x - 1.91, 1.0, z - 1.3], [x - 2.1, 0.5, z - 0.95], [x - 2.55, 0.33, z - 0.4], [x - 2.9, 0.55, z], [x - 3.08, 0.82, z + 0.18]]} />
    </group>
  );
}

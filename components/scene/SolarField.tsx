'use client';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { solarModuleTexture } from '@/lib/textures';
import { FIELD, STATIONS } from '@/lib/layout';

const TUBE_Y = 1.95;

export function usePvMaterials() {
  return useMemo(() => {
    const map = solarModuleTexture();
    map.center.set(0.5, 0.5);
    map.rotation = Math.PI / 2; // module is laid landscape along x
    const glass = new THREE.MeshPhysicalMaterial({
      map,
      roughness: 0.32,
      metalness: 0.15,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      envMapIntensity: 0.85,
      specularIntensity: 1,
    });
    const frame = new THREE.MeshStandardMaterial({ color: '#b9bec4', metalness: 0.85, roughness: 0.32 });
    const back = new THREE.MeshStandardMaterial({ color: '#d9dcdf', roughness: 0.7 });
    const steel = new THREE.MeshStandardMaterial({ color: '#8d9297', metalness: 0.8, roughness: 0.42 });
    // box face order: +x, -x, +y, -y, +z, -z
    return { module: [frame, frame, glass, back, frame, frame] as THREE.Material[], steel, glass, frame, back };
  }, []);
}

/** A single-axis tracker row: modules on a torque tube that rotates. */
export function TrackerRow({
  x,
  zCenter,
  count,
  materials,
  phase,
}: {
  x: number;
  zCenter: number;
  count: number;
  materials: ReturnType<typeof usePvMaterials>;
  phase: number;
}) {
  const group = useRef<THREE.Group>(null);
  const modules = useRef<THREE.InstancedMesh>(null);
  const length = count * (FIELD.moduleW + 0.02);
  const moduleGeo = useMemo(() => new THREE.BoxGeometry(FIELD.moduleL, 0.04, FIELD.moduleW), []);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      // drive gap in the middle of the row, like a real tracker
      const gap = i >= count / 2 ? 0.6 : 0;
      m.makeTranslation(0, 0.12, -length / 2 + (i + 0.5) * (FIELD.moduleW + 0.02) + gap - 0.3);
      modules.current!.setMatrixAt(i, m);
    }
    modules.current!.instanceMatrix.needsUpdate = true;
  }, [count, length]);

  useFrame(({ clock }) => {
    if (!group.current) return;
    // track the low western sun with a slow, gentle drift
    group.current.rotation.z = 0.5 + Math.sin(clock.elapsedTime * 0.08 + phase) * 0.02;
  });

  return (
    <group ref={group} position={[x, TUBE_Y, zCenter]}>
      <instancedMesh ref={modules} args={[moduleGeo, materials.module, count]} castShadow receiveShadow />
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow material={materials.steel}>
        <cylinderGeometry args={[0.065, 0.065, length + 0.6, 10]} />
      </mesh>
      {/* module rails */}
      {[-0.75, 0.75].map((rx) => (
        <mesh key={rx} position={[rx, 0.08, 0]} material={materials.frame}>
          <boxGeometry args={[0.05, 0.05, length]} />
        </mesh>
      ))}
    </group>
  );
}

export default function SolarField({ rows = FIELD.rows }: { rows?: number }) {
  const materials = usePvMaterials();
  const posts = useRef<THREE.InstancedMesh>(null);
  const boxes = useRef<THREE.InstancedMesh>(null);
  const { x: cx, z: cz } = STATIONS.field;
  const count = FIELD.modulesPerRow;
  const length = count * (FIELD.moduleW + 0.02);
  const postsPerRow = 7;

  const rowXs = useMemo(
    () => Array.from({ length: rows }, (_, i) => cx + (i - (rows - 1) / 2) * FIELD.rowSpacing),
    [rows, cx],
  );

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    let k = 0;
    rowXs.forEach((x) => {
      for (let p = 0; p < postsPerRow; p++) {
        const z = cz - length / 2 + (p / (postsPerRow - 1)) * length;
        m.makeTranslation(x, TUBE_Y / 2, z);
        posts.current!.setMatrixAt(k++, m);
      }
    });
    posts.current!.instanceMatrix.needsUpdate = true;
    rowXs.forEach((x, i) => {
      m.makeTranslation(x + 0.45, 1.0, cz + length / 2 + 1.2);
      boxes.current!.setMatrixAt(i, m);
    });
    boxes.current!.instanceMatrix.needsUpdate = true;
  }, [rowXs, cz, length]);

  return (
    <group>
      {rowXs.map((x, i) => (
        <TrackerRow key={i} x={x} zCenter={cz} count={count} materials={materials} phase={i * 0.35} />
      ))}
      <instancedMesh ref={posts} args={[undefined, materials.steel, rows * postsPerRow]} castShadow receiveShadow>
        <boxGeometry args={[0.16, TUBE_Y, 0.12]} />
      </instancedMesh>
      {/* string combiner boxes at the end of each row */}
      <instancedMesh ref={boxes} args={[undefined, materials.back, rows]} castShadow>
        <boxGeometry args={[0.5, 0.7, 0.25]} />
      </instancedMesh>
      {/* central inverter skid */}
      <InverterSkid position={[cx + (rows / 2) * FIELD.rowSpacing + 3, 0, cz + 12]} />
    </group>
  );
}

/** Central inverter skid for the solar field. */
export function InverterSkid({ position = [0, 0, 0] }: { position?: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.15, 0]} receiveShadow>
        <boxGeometry args={[4.2, 0.3, 7.5]} />
        <meshStandardMaterial color="#9c9a94" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.55, -1.4]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 2.5, 3.6]} />
        <meshStandardMaterial color="#e9ebec" roughness={0.45} metalness={0.2} />
      </mesh>
      <mesh position={[0, 1.3, 2.2]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 2.0, 2.2]} />
        <meshStandardMaterial color="#5b6c73" roughness={0.5} metalness={0.4} />
      </mesh>
    </group>
  );
}

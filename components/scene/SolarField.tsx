'use client';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { grainTextures } from '@/lib/textures';
import { cabinetMaterials, cabinetTexture } from '@/lib/equipment';
import { FIELD, STATIONS } from '@/lib/layout';

export const PV_TEXTURE_URL = '/textures/pv-module.jpg';
useTexture.preload(PV_TEXTURE_URL);

const TUBE_Y = 1.95;

/** Shared light concrete (pads, footings, plinths). */
export function useConcrete(repeat = 4, seed = 9) {
  return useMemo(() => {
    const t = grainTextures(seed, [196, 194, 188]);
    t.map.repeat.set(repeat, repeat);
    t.normal.repeat.set(repeat, repeat);
    return new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normal, roughness: 0.9 });
  }, [repeat, seed]);
}

export function usePvMaterials() {
  const tex = useTexture(PV_TEXTURE_URL);
  return useMemo(() => {
    // the module art is portrait; the module is laid landscape along x
    const map = tex;
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    map.center.set(0.5, 0.5);
    map.rotation = Math.PI / 2;
    map.needsUpdate = true;
    const glass = new THREE.MeshPhysicalMaterial({
      map,
      roughness: 0.32,
      metalness: 0.15,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      envMapIntensity: 0.85,
      specularIntensity: 1,
    });
    const frame = new THREE.MeshStandardMaterial({ color: '#c9ced2', metalness: 0.9, roughness: 0.28 });
    const back = new THREE.MeshStandardMaterial({ color: '#e2e4e6', roughness: 0.7 });
    // hot-dip galvanised steel for tubes and posts
    const steel = new THREE.MeshStandardMaterial({ color: '#b3b8bb', metalness: 0.88, roughness: 0.36 });
    // box face order: +x, -x, +y, -y, +z, -z
    return { module: [frame, frame, glass, back, frame, frame] as THREE.Material[], steel, glass, frame, back };
  }, [tex]);
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
        <cylinderGeometry args={[0.075, 0.075, length + 0.6, 14]} />
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
  const footings = useRef<THREE.InstancedMesh>(null);
  const concrete = useConcrete(1, 13);
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
        posts.current!.setMatrixAt(k, m);
        m.makeTranslation(x, 0.1, z);
        footings.current!.setMatrixAt(k++, m);
      }
    });
    posts.current!.instanceMatrix.needsUpdate = true;
    footings.current!.instanceMatrix.needsUpdate = true;
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
      <instancedMesh ref={footings} args={[undefined, concrete, rows * postsPerRow]} receiveShadow>
        <cylinderGeometry args={[0.24, 0.27, 0.2, 12]} />
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

/** Central inverter skid: charcoal inverter cabinet + white MV switchgear on a concrete pad. */
export function InverterSkid({ position = [0, 0, 0] }: { position?: [number, number, number] }) {
  const pad = useConcrete(2, 31);
  const mats = useMemo(() => {
    const dark = '#30373b';
    const light = '#e8eaeb';
    return {
      inverter: cabinetMaterials(dark, cabinetTexture({ color: dark, doors: 2, sign: true }), cabinetTexture({ color: dark, doors: 2, sign: false, louvres: true, plate: false })),
      switchgear: cabinetMaterials(
        light,
        cabinetTexture({ color: light, doors: 3, sign: true, louvres: true }),
        cabinetTexture({ color: light, doors: 2, sign: false, louvres: true, plate: false }),
        { metalness: 0.2, roughness: 0.45 },
      ),
    };
  }, []);
  return (
    <group position={position}>
      <mesh position={[0, 0.15, 0]} receiveShadow castShadow material={pad}>
        <boxGeometry args={[4.4, 0.3, 7.8]} />
      </mesh>
      <mesh position={[0, 1.6, -1.5]} castShadow receiveShadow material={mats.switchgear}>
        <boxGeometry args={[2.4, 2.6, 3.6]} />
      </mesh>
      <mesh position={[0, 1.3, 2.1]} castShadow receiveShadow material={mats.inverter}>
        <boxGeometry args={[2.2, 2.0, 2.4]} />
      </mesh>
      {/* roof caps */}
      <mesh position={[0, 2.93, -1.5]} castShadow>
        <boxGeometry args={[2.55, 0.06, 3.75]} />
        <meshStandardMaterial color="#d3d6d8" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, 2.33, 2.1]} castShadow>
        <boxGeometry args={[2.32, 0.06, 2.52]} />
        <meshStandardMaterial color="#262c30" metalness={0.4} roughness={0.5} />
      </mesh>
    </group>
  );
}

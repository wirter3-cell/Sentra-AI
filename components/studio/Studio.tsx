'use client';
// Studio page (/studio?m=<model>&v=<view>): renders one site model on a
// neutral backdrop for review, and exposes window.__exportGLB() so the
// model can be downloaded as a .glb for editing in Blender etc.
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { Container, PcsSkid, useContainerMaterials } from '@/components/scene/BatteryYard';
import { Canopy, Charger } from '@/components/scene/ChargingHub';
import { InverterSkid, TrackerRow, usePvMaterials } from '@/components/scene/SolarField';
import { FIELD } from '@/lib/layout';
import { chargerScreen, solarModuleTexture } from '@/lib/textures';
import { sideLabel } from '@/components/scene/BatteryYard';

export const MODELS = ['pv-module', 'solar-tracker', 'battery-container', 'pcs-transformer', 'ev-charger', 'solar-carport', 'inverter-skid'] as const;
type ModelId = (typeof MODELS)[number];

const VIEWS: Record<string, [number, number, number]> = {
  threequarter: [1, 0.55, 1.25],
  front: [0, 0.12, 1],
  side: [1, 0.12, 0],
  rear: [-1.05, 0.5, -1.1],
  top: [0.001, 1, 0.001],
};

function PvModule() {
  const pv = usePvMaterials();
  const geo = useMemo(() => new THREE.BoxGeometry(FIELD.moduleL, 0.04, FIELD.moduleW), []);
  return <mesh geometry={geo} material={pv.module} position={[0, 0.6, 0]} rotation={[0, 0, 0.35]} castShadow />;
}

function Tracker() {
  const pv = usePvMaterials();
  const count = 8;
  const length = count * (FIELD.moduleW + 0.02);
  return (
    <group>
      <TrackerRow x={0} zCenter={0} count={count} materials={pv} phase={0} />
      {[-0.5, 0, 0.5].map((f) => (
        <mesh key={f} position={[0, 0.975, f * length]} material={pv.steel} castShadow>
          <boxGeometry args={[0.16, 1.95, 0.12]} />
        </mesh>
      ))}
    </group>
  );
}

function ContainerModel() {
  const m = useContainerMaterials();
  return <Container position={[0, -0.3, 0]} m={m} index={0} />;
}

function Pcs() {
  const m = useContainerMaterials();
  return <PcsSkid pad={m.pad} />;
}

function Model({ id }: { id: ModelId }) {
  switch (id) {
    case 'pv-module': return <PvModule />;
    case 'solar-tracker': return <Tracker />;
    case 'battery-container': return <ContainerModel />;
    case 'pcs-transformer': return <Pcs />;
    case 'ev-charger': return <Charger position={[0, 0, 0]} percent={72} ring />;
    case 'solar-carport': return <Canopy cx={0} cz={0} />;
    case 'inverter-skid': return <InverterSkid />;
  }
}

function Framer({ target, view }: { target: React.RefObject<THREE.Group | null>; view: string }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    const frame = () => {
      if (!target.current) return;
      const box = new THREE.Box3().setFromObject(target.current);
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      const dir = new THREE.Vector3(...(VIEWS[view] ?? VIEWS.threequarter)).normalize();
      const dist = (sphere.radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.02;
      camera.position.copy(sphere.center).addScaledVector(dir, dist);
      camera.near = dist / 100;
      camera.far = dist * 10;
      camera.lookAt(sphere.center);
      camera.updateProjectionMatrix();
      invalidate();
    };
    frame();
    const t = setTimeout(frame, 300);
    return () => clearTimeout(t);
  }, [camera, target, view, invalidate]);
  return null;
}

function Scene({ id, view }: { id: ModelId; view: string }) {
  const group = useRef<THREE.Group>(null);
  useEffect(() => {
    (window as unknown as { __exportGLB: () => Promise<string> }).__exportGLB = async () => {
      const exporter = new GLTFExporter();
      const buf = (await exporter.parseAsync(group.current!, { binary: true, onlyVisible: true })) as ArrayBuffer;
      let bin = '';
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return btoa(bin);
    };
    // flat artwork used on the models, for editing as images
    (window as unknown as { __textures: () => Record<string, string> }).__textures = () => {
      const url = (t: THREE.Texture) => (t.image as HTMLCanvasElement).toDataURL('image/png');
      return {
        'pv-module-cells': url(solarModuleTexture()),
        'battery-container-side-label': url(sideLabel()),
        'ev-charger-screen': url(chargerScreen(72)),
      };
    };
  }, []);
  return (
    <>
      <Environment files="/hdri/venice_sunset_1k.hdr" environmentIntensity={0.7} />
      <hemisphereLight args={['#ffffff', '#b9b2a6', 0.6]} />
      <directionalLight
        position={[8, 14, 10]}
        intensity={2.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-bias={-0.0003}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <shadowMaterial opacity={0.18} />
      </mesh>
      <group ref={group}>
        <Model id={id} />
      </group>
      <Framer target={group} view={view} />
    </>
  );
}

export default function Studio() {
  const params = typeof window !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
  const id = (MODELS as readonly string[]).includes(params.get('m') ?? '') ? (params.get('m') as ModelId) : 'battery-container';
  const view = params.get('v') ?? 'threequarter';
  return (
    <Canvas
      shadows
      gl={{ preserveDrawingBuffer: true, antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      camera={{ fov: 30 }}
      onCreated={({ gl }) => gl.setClearColor('#e7e8ea')}
    >
      <Suspense fallback={null}>
        <Scene id={id} view={view} />
      </Suspense>
    </Canvas>
  );
}

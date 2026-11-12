'use client';
import { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, Preload } from '@react-three/drei';
import { Bloom, EffectComposer, N8AO, Noise, ToneMapping, Vignette } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import Atmosphere from './Atmosphere';
import Ground from './Ground';
import SolarField from './SolarField';
import BatteryYard from './BatteryYard';
import ChargingHub from './ChargingHub';
import Blueprint from './Blueprint';
import EnergyFlow from './EnergyFlow';
import CameraRig from './CameraRig';

function detectTier(): 'high' | 'low' {
  if (typeof window === 'undefined') return 'high';
  const small = window.matchMedia('(max-width: 820px)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency ?? 8;
  return small || coarse || cores <= 4 ? 'low' : 'high';
}

export default function Experience() {
  const [tier, setTier] = useState<'high' | 'low' | null>(null);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    setTier(detectTier());
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);
  if (!tier) return null;
  const high = tier === 'high';

  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={high ? [1, 1.75] : [1, 1.25]}
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
      camera={{ position: [-50, 24, 26], fov: 38, near: 0.3, far: 6000 }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NoToneMapping; // tone mapping happens in post
      }}
    >
      <Suspense fallback={null}>
        <Atmosphere shadowSize={high ? 4096 : 2048} />
        <Ground segments={high ? 240 : 140} />
        <SolarField rows={high ? 20 : 12} />
        <BatteryYard />
        <ChargingHub />
        <Blueprint />
        <EnergyFlow />
        <CameraRig parallax={!reduced} />
        <EffectComposer multisampling={high ? 4 : 0} enableNormalPass={false}>
          {high ? <N8AO aoRadius={1.6} intensity={2.2} distanceFalloff={0.6} halfRes /> : <></>}
          <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.3} intensity={0.8} radius={0.75} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          <Vignette eskil={false} offset={0.22} darkness={0.55} />
          <Noise opacity={0.035} blendFunction={BlendFunction.OVERLAY} />
        </EffectComposer>
        <Preload all />
      </Suspense>
      <AdaptiveDpr pixelated={false} />
    </Canvas>
  );
}

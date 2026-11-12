'use client';
import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import SkyDome, { HORIZON } from './SkyDome';
import * as THREE from 'three';
import { SUN_DIR } from '@/lib/layout';

/** Golden-hour sun, sky, image-based lighting and haze. */
export default function Atmosphere({ shadowSize = 2048 }: { shadowSize?: number }) {
  const sun = useRef<THREE.DirectionalLight>(null);
  const camera = useThree((s) => s.camera);
  const tmp = useMemo(() => ({ focus: new THREE.Vector3(), fwd: new THREE.Vector3() }), []);
  const target = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    const l = sun.current;
    if (!l) return;
    // keep the shadow frustum centred just in front of the camera
    camera.getWorldDirection(tmp.fwd);
    const ground = camera.position.y > 0.1 && tmp.fwd.y < -0.05 ? camera.position.y / -tmp.fwd.y : 30;
    tmp.focus.copy(camera.position).addScaledVector(tmp.fwd, Math.min(ground, 60));
    tmp.focus.y = 0;
    target.position.copy(tmp.focus);
    target.updateMatrixWorld();
    l.position.copy(tmp.focus).addScaledVector(SUN_DIR, 150);
    // shadow area grows when the camera is high (aerial shots)
    const span = THREE.MathUtils.clamp(camera.position.y * 1.6, 28, 160);
    const cam = l.shadow.camera as THREE.OrthographicCamera;
    if (Math.abs(cam.right - span) > 1) {
      cam.left = -span; cam.right = span; cam.top = span; cam.bottom = -span;
      cam.updateProjectionMatrix();
    }
  });

  return (
    <>
      <SkyDome />
      <Environment files="/hdri/venice_sunset_1k.hdr" environmentIntensity={0.42} environmentRotation={[0, 2.2, 0]} />
      <fog attach="fog" args={[HORIZON, 260, 1500]} />
      <hemisphereLight args={['#a9c6dc', '#9a6a3c', 0.32]} />
      <primitive object={target} />
      <directionalLight
        ref={sun}
        target={target}
        color="#ffbd7f"
        intensity={6}
        castShadow
        shadow-mapSize={[shadowSize, shadowSize]}
        shadow-bias={-0.0004}
        shadow-radius={4}
        shadow-normalBias={0.04}
        shadow-camera-near={1}
        shadow-camera-far={400}
      />
    </>
  );
}

'use client';
import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { SHOTS } from '@/lib/layout';
import { pointer, scrollState } from '@/lib/store';

const ease = (x: number) => x * x * x * (x * (x * 6 - 15) + 10); // smootherstep

/** Flies the camera between per-section shots as the page scrolls. */
export default function CameraRig({ parallax = true }: { parallax?: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const shots = useMemo(
    () => SHOTS.map((s) => ({ pos: new THREE.Vector3(...s.pos), target: new THREE.Vector3(...s.target), fov: s.fov })),
    [],
  );
  const state = useRef({ t: scrollState.t, px: 0, py: 0, init: false });
  const tmp = useMemo(() => ({ pos: new THREE.Vector3(), target: new THREE.Vector3(), right: new THREE.Vector3(), up: new THREE.Vector3() }), []);

  useFrame((_, dt) => {
    const s = state.current;
    const d = Math.min(dt, 1 / 20);
    s.t = s.init && !scrollState.snap ? THREE.MathUtils.damp(s.t, scrollState.t, 4.2, d) : scrollState.t;
    s.init = true;
    s.px = THREE.MathUtils.damp(s.px, parallax ? pointer.x : 0, 2.5, d);
    s.py = THREE.MathUtils.damp(s.py, parallax ? pointer.y : 0, 2.5, d);

    const max = shots.length - 1;
    const t = THREE.MathUtils.clamp(s.t, 0, max);
    const i = Math.min(Math.floor(t), max - 1);
    const f = ease(t - i);
    const a = shots[i], b = shots[i + 1];

    tmp.pos.lerpVectors(a.pos, b.pos, f);
    tmp.target.lerpVectors(a.target, b.target, f);
    // arc upwards between shots so long moves read as a drone flight
    const lift = a.pos.distanceTo(b.pos) * 0.12 * Math.sin(f * Math.PI);
    tmp.pos.y += lift;
    camera.fov = THREE.MathUtils.lerp(a.fov, b.fov, f);

    // subtle hand-held parallax that scales with distance to target
    const dist = tmp.pos.distanceTo(tmp.target);
    camera.position.copy(tmp.pos);
    camera.lookAt(tmp.target);
    tmp.right.setFromMatrixColumn(camera.matrix, 0);
    tmp.up.setFromMatrixColumn(camera.matrix, 1);
    const amp = Math.min(dist * 0.03, 2.2);
    camera.position.addScaledVector(tmp.right, s.px * amp).addScaledVector(tmp.up, -s.py * amp * 0.5);
    camera.lookAt(tmp.target);
    camera.updateProjectionMatrix();
  });

  return null;
}

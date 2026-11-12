'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SUN_DIR } from '@/lib/layout';

export const HORIZON = new THREE.Color('#e9ad78');

/** Art-directed golden-hour sky with a sun glow that blooms in post. */
export default function SkyDome() {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        toneMapped: false,
        uniforms: {
          uZenith: { value: new THREE.Color('#2f5f86') },
          uMid: { value: new THREE.Color('#8fb1c4') },
          uHorizon: { value: HORIZON },
          uSunColor: { value: new THREE.Color('#ffb066') },
          uSunDir: { value: SUN_DIR },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uZenith, uMid, uHorizon, uSunColor, uSunDir;
          varying vec3 vDir;
          void main(){
            vec3 d = normalize(vDir);
            float h = d.y;
            vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.22, h));
            col = mix(col, uZenith, smoothstep(0.18, 0.75, h));
            col = mix(col, uHorizon * 0.95, smoothstep(0.0, -0.08, h)); // below horizon = haze
            float s = max(dot(d, normalize(uSunDir)), 0.0);
            col += uSunColor * (pow(s, 6.0) * 0.45 + pow(s, 48.0) * 0.8);
            col += vec3(1.0, 0.86, 0.66) * smoothstep(0.9993, 0.9997, s) * 18.0; // sun disc → bloom
            // warm haze band along the horizon
            col = mix(col, uHorizon * 1.08, exp(-abs(h) * 14.0) * 0.55);
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    [],
  );
  useFrame(({ camera }) => ref.current?.position.copy(camera.position));
  return (
    <mesh ref={ref} material={mat} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[3000, 48, 24]} />
    </mesh>
  );
}

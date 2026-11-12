'use client';
import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollState } from '@/lib/store';

// Animated energy "pulses" travelling along the site's cable routes:
// solar field → battery storage → charging hub.

const vert = /* glsl */ `
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const frag = /* glsl */ `
  uniform float uTime; uniform vec3 uColor; uniform float uLen; uniform float uIntensity;
  varying vec2 vUv;
  void main(){
    float s = vUv.x * uLen;                 // metres along the route
    float pulse = fract(s / 9.0 - uTime * 0.9);
    float head = smoothstep(0.82, 1.0, pulse) ;
    float tail = smoothstep(0.0, 0.82, pulse) * 0.18;
    float core = 0.25;
    float a = (core + tail + head * 2.5) * uIntensity;
    gl_FragColor = vec4(uColor * (1.0 + head * 3.0), clamp(a, 0.0, 1.0));
  }`;

function Route({ points, delay = 0 }: { points: [number, number, number][]; delay?: number }) {
  const { geo, mat } = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'centripetal');
    const geo = new THREE.TubeGeometry(curve, 200, 0.09, 6, false);
    const mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#a0ff75') },
        uLen: { value: curve.getLength() },
        uIntensity: { value: 1 },
      },
    });
    return { geo, mat };
  }, [points]);
  useFrame(({ clock }) => {
    mat.uniforms.uTime.value = clock.elapsedTime + delay;
    // routes light up once the story reaches "Store"
    mat.uniforms.uIntensity.value = 0.35 + 0.65 * THREE.MathUtils.smoothstep(scrollState.t, 0.6, 1.6);
  });
  return <mesh geometry={geo} material={mat} />;
}

export default function EnergyFlow() {
  return (
    <group>
      <Route points={[[55, 0.12, -14], [58, 0.12, -8], [62, 0.12, -5], [66, 0.12, -5], [70, 0.12, -9.5]]} />
      <Route points={[[55, 0.12, -22], [56, 0.12, -30], [58, 0.12, -37], [63, 0.12, -38], [66, 0.12, -31]]} delay={1.3} />
      <Route
        points={[[90, 0.12, -18], [100, 0.12, -14], [110, 0.12, -6], [120, 0.12, -4], [128, 0.12, -3.6], [133.5, 0.12, -2.6]]}
        delay={0.6}
      />
    </group>
  );
}

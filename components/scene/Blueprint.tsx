'use client';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { STATIONS, FIELD } from '@/lib/layout';
import { scrollState } from '@/lib/store';
import { usePvMaterials } from './SolarField';

const GREEN = new THREE.Color('#a0ff75');

/** Glowing survey grid projected on the sand. */
function Grid({ radius = 42 }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        uniforms: { uColor: { value: GREEN }, uReveal: { value: 0 }, uTime: { value: 0 }, uRadius: { value: radius } },
        vertexShader: /* glsl */ `
          varying vec2 vP;
          void main(){ vec4 w = modelMatrix * vec4(position,1.0); vP = (modelMatrix * vec4(position,1.0)).xz - (modelMatrix * vec4(0.,0.,0.,1.)).xz; gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor; uniform float uReveal; uniform float uTime; uniform float uRadius;
          varying vec2 vP;
          float line(vec2 p, float s, float w){ vec2 g = abs(fract(p/s - 0.5) - 0.5) * s; vec2 fw = fwidth(p); vec2 l = 1.0 - smoothstep(vec2(0.0), fw * w, g); return max(l.x, l.y); }
          void main(){
            float d = length(vP);
            float minor = line(vP, 1.0, 1.0) * 0.18;
            float major = line(vP, 6.2, 1.6) * 0.75;
            float fade = 1.0 - smoothstep(uRadius * 0.55, uRadius, d);
            float front = uReveal * uRadius * 1.1;
            float revealed = 1.0 - smoothstep(front - 3.0, front, d);
            float ring = exp(-pow((d - front) * 0.6, 2.0)) * step(0.01, uReveal) * (1.0 - uReveal);
            float a = (max(minor, major) * revealed + ring * 0.9) * fade;
            gl_FragColor = vec4(uColor * (1.4 + ring * 3.0), a);
          }`,
      }),
    [radius],
  );
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    mat.uniforms.uTime.value = clock.elapsedTime;
    // grid sweeps open as the visitor approaches the engineering section
    const r = THREE.MathUtils.clamp((scrollState.t - 3.2) / 0.8, 0, 1);
    mat.uniforms.uReveal.value = r;
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.09, 0]} material={mat}>
      <planeGeometry args={[radius * 2, radius * 2]} />
    </mesh>
  );
}

/** Wireframe "design" of future tracker rows. */
function GhostRows({ rows = 6, length }: { rows?: number; length: number }) {
  const geo = useMemo(() => {
    const base = new THREE.EdgesGeometry(new THREE.BoxGeometry(2.3, 0.06, length));
    const out: THREE.BufferGeometry[] = [];
    for (let i = -2; i < rows - 2; i++) {
      if (i === 0) continue;
      const g = base.clone();
      g.rotateZ(0.5);
      g.translate(i * FIELD.rowSpacing, 1.95, 0);
      out.push(g);
    }
    // merge positions manually (all are line segment soups)
    const arr: number[] = [];
    out.forEach((g) => arr.push(...(g.attributes.position.array as Float32Array)));
    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    return merged;
  }, [rows, length]);
  const mat = useRef<THREE.LineBasicMaterial>(null);
  useFrame(() => {
    if (mat.current) mat.current.opacity = 1.0 * THREE.MathUtils.clamp((scrollState.t - 3.4) / 0.6, 0, 1);
  });
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial ref={mat} color={new THREE.Color('#c8ff9e')} transparent opacity={0} toneMapped={false} />
    </lineSegments>
  );
}

/** A real tracker row that assembles module by module with scroll. */
function BuildRow({ length }: { length: number }) {
  const pv = usePvMaterials();
  const count = FIELD.modulesPerRow;
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.BoxGeometry(FIELD.moduleL, 0.04, FIELD.moduleW), []);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3(1, 1, 1) }), []);

  useLayoutEffect(() => {
    ref.current!.count = count;
  }, [count]);

  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const build = THREE.MathUtils.clamp((scrollState.t - 3.35) / 0.65, 0, 1) * count;
    for (let i = 0; i < count; i++) {
      // each module drops in from above with a short ease
      const k = THREE.MathUtils.clamp(build - i, 0, 1);
      const e = 1 - Math.pow(1 - k, 3);
      tmp.p.set(0, 0.12 + (1 - e) * 6, -length / 2 + (i + 0.5) * (FIELD.moduleW + 0.02));
      tmp.s.setScalar(k <= 0 ? 0.0001 : 1);
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      mesh.setMatrixAt(i, tmp.m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group position={[0, 1.95, 0]} rotation={[0, 0, 0.5]}>
      <instancedMesh ref={ref} args={[geo, pv.module, count]} castShadow receiveShadow frustumCulled={false} />
      <mesh rotation={[Math.PI / 2, 0, 0]} material={pv.steel} castShadow>
        <cylinderGeometry args={[0.065, 0.065, length + 0.6, 10]} />
      </mesh>
    </group>
  );
}

export default function Blueprint() {
  const { x, z } = STATIONS.blueprint;
  const length = FIELD.modulesPerRow * (FIELD.moduleW + 0.02);
  const pv = usePvMaterials();
  const stakes = useMemo(() => {
    const p: [number, number][] = [];
    for (let i = -3; i < 6; i++) for (const zz of [-length / 2, 0, length / 2]) p.push([i * FIELD.rowSpacing, zz]);
    return p;
  }, [length]);

  return (
    <group position={[x, 0, z]}>
      <group position={[6, 0, 0]}>
        <Grid />
      </group>
      <BuildRow length={length} />
      {/* posts already driven for the first row */}
      {[-0.5, -0.25, 0, 0.25, 0.5].map((f) => (
        <mesh key={f} position={[0, 0.975, f * length]} material={pv.steel} castShadow>
          <boxGeometry args={[0.16, 1.95, 0.12]} />
        </mesh>
      ))}
      <GhostRows rows={8} length={length} />
      {/* survey stakes */}
      {stakes.map(([sx, sz], i) => (
        <mesh key={i} position={[sx + FIELD.rowSpacing / 2, 0.35, sz]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.7, 6]} />
          <meshStandardMaterial color="#ff7a2f" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

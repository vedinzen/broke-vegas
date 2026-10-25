"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, PerformanceMonitor, Text3D } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMarketStore } from "@/features/market/store";
import type { QualityTier } from "./quality";

gsap.registerPlugin(ScrollTrigger);

function Atmosphere() {
  const material = useRef<THREE.ShaderMaterial>(null);
  const crash = useMarketStore((state) => {
    const event = state.snapshot?.state.events.at(-1);
    if (!event) return 0;
    const age = (state.snapshot?.state.tick ?? 0) - event.startTick;
    return age >= 0 && age < 16 ? event.severity : 0;
  });
  const uniforms = useMemo(() => ({
    uTime: { value: 0 }, uCrash: { value: 0 },
    uCrimson: { value: new THREE.Color("#8b1d3b") },
    uViolet: { value: new THREE.Color("#4b1f66") },
    uObsidian: { value: new THREE.Color("#07060b") },
  }), []);
  useFrame((state) => {
    if (!material.current) return;
    material.current.uniforms.uTime.value = state.clock.elapsedTime;
    material.current.uniforms.uCrash.value = THREE.MathUtils.lerp(material.current.uniforms.uCrash.value, crash, 0.035);
  });
  return (
    <mesh position={[0, 3, -30]} scale={[90, 42, 1]}>
      <planeGeometry />
      <shaderMaterial ref={material} uniforms={uniforms} depthWrite={false} vertexShader={`
        varying vec2 vUv;
        void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
      `} fragmentShader={`
        uniform float uTime; uniform float uCrash; uniform vec3 uCrimson; uniform vec3 uViolet; uniform vec3 uObsidian;
        varying vec2 vUv;
        float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
        float noise(vec2 p){ vec2 i=floor(p),f=fract(p); vec2 u=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y); }
        float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.03; a*=0.5; } return v; }
        void main(){
          vec2 uv=vUv; vec2 q=vec2(fbm(uv*2.1+uTime*0.018),fbm(uv*2.4+vec2(4.2,1.3)));
          float n=fbm(uv*2.8+2.4*q+uTime*0.025);
          vec3 base=mix(uObsidian,uViolet,smoothstep(0.1,0.8,uv.y+n*0.25));
          base=mix(base,uCrimson,smoothstep(0.45,0.95,n)*0.72);
          base=mix(base,vec3(0.42,0.04,0.1),uCrash*smoothstep(0.25,0.9,uv.y));
          float glow=pow(max(0.0,1.0-length(uv-vec2(0.66,0.55))*1.8),2.0);
          base+=uCrimson*glow*(0.18+uCrash*0.38);
          base+=(hash(uv*1024.0)-0.5)*0.012;
          gl_FragColor=vec4(base,1.0);
          #include <colorspace_fragment>
        }
      `} />
    </mesh>
  );
}

function Skyline({ tier }: { tier: QualityTier }) {
  const buildings = useRef<THREE.InstancedMesh>(null);
  const windows = useRef<THREE.InstancedMesh>(null);
  const count = tier === "high" ? 54 : tier === "medium" ? 38 : 24;
  const data = useMemo(() => Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    const radius = 11 + (index % 5) * 2.4;
    const height = 2.3 + ((index * 7) % 9) * 0.72;
    return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius - 6, width: 0.8 + (index % 4) * 0.35, height, candle: index % 6 === 0 };
  }), [count]);
  useFrame((state) => {
    if (!buildings.current) return;
    const collapse = Math.max(0, Math.min(1, (window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight) - 0.48) * 4));
    const matrix = new THREE.Matrix4();
    data.forEach((building, index) => {
      const crashScale = building.candle ? 1 - collapse * 0.6 : 1;
      matrix.compose(new THREE.Vector3(building.x, building.height * crashScale / 2 - 1.8, building.z), new THREE.Quaternion(), new THREE.Vector3(building.width, building.height * crashScale, building.width));
      buildings.current!.setMatrixAt(index, matrix);
    });
    buildings.current.instanceMatrix.needsUpdate = true;
    state.invalidate();
  });
  return (
    <group>
      <instancedMesh ref={buildings} args={[undefined, undefined, count]} frustumCulled={false}>
        <boxGeometry />
        <meshStandardMaterial color="#17101f" metalness={0.55} roughness={0.48} />
      </instancedMesh>
      <instancedMesh ref={windows} args={[undefined, undefined, count * 3]} frustumCulled={false}>
        <boxGeometry args={[0.12,0.16,0.03]} />
        <meshBasicMaterial color="#f2c96d" toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

function Marquee({ tier }: { tier: QualityTier }) {
  const bulbs = useRef<THREE.InstancedMesh>(null);
  useFrame(({ clock }) => {
    if (!bulbs.current) return;
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < 44; i += 1) {
      const t = i / 44;
      const x = -6 + t * 12;
      const y = 3.6 + Math.sin(t * Math.PI) * 0.9;
      matrix.compose(new THREE.Vector3(x, y, 0.2), new THREE.Quaternion(), new THREE.Vector3(1,1,1));
      bulbs.current.setMatrixAt(i, matrix);
    }
    bulbs.current.instanceMatrix.needsUpdate = true;
    void clock;
  });
  return (
    <group position={[0, 3.5, -4]} rotation={[0, -0.08, 0]}>
      <Text3D font="/fonts/helvetiker_regular.typeface.json" size={1.1} height={0.25} curveSegments={tier === "high" ? 8 : 4} bevelEnabled bevelSize={0.035} bevelThickness={0.03} bevelSegments={2} position={[-5.7,0,0]}>
        BROKE VEGAS
        <meshStandardMaterial color="#e73555" emissive="#e73555" emissiveIntensity={2.6} metalness={0.3} roughness={0.2} toneMapped={false} />
      </Text3D>
      <instancedMesh ref={bulbs} args={[undefined, undefined, 44]}>
        <sphereGeometry args={[0.055,8,8]} />
        <meshBasicMaterial color="#f2c96d" toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

function Chips({ tier }: { tier: QualityTier }) {
  const group = useRef<THREE.Group>(null);
  const count = tier === "high" ? 18 : 10;
  useFrame((_, delta) => { if (group.current) group.current.rotation.y += delta * 0.035; });
  return <group ref={group}>{Array.from({ length: count }, (_, index) => <mesh key={index} position={[Math.sin(index * 2.4) * 5, 1.1 + (index % 4) * 0.22, Math.cos(index * 2.4) * 4 - 2]} rotation={[Math.PI / 2.4, index, 0]}><cylinderGeometry args={[0.34,0.34,0.09,24]} /><meshStandardMaterial color={index % 3 === 0 ? "#f2c96d" : index % 3 === 1 ? "#e73555" : "#27e59a"} metalness={0.5} roughness={0.35} /></mesh>)}</group>;
}

function CameraRig() {
  const { camera } = useThree();
  const quick = useRef<{ x: ReturnType<typeof gsap.quickTo>; y: ReturnType<typeof gsap.quickTo>; z: ReturnType<typeof gsap.quickTo> } | null>(null);
  useEffect(() => {
    quick.current = { x: gsap.quickTo(camera.position, "x", { duration: 1.1, ease: "power2.out" }), y: gsap.quickTo(camera.position, "y", { duration: 1.1, ease: "power2.out" }), z: gsap.quickTo(camera.position, "z", { duration: 1.1, ease: "power2.out" }) };
    return () => { quick.current = null; };
  }, [camera]);
  useFrame(() => {
    const progress = window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight);
    const beats = [
      { p: 0, x: 0, y: 2.5, z: 12 }, { p: 0.18, x: 2.5, y: 2.2, z: 8 }, { p: 0.35, x: -2, y: 3, z: 9 },
      { p: 0.55, x: 0.5, y: 1.2, z: 10 }, { p: 0.75, x: -3.5, y: 2.4, z: 7 }, { p: 1, x: 0, y: 2.6, z: 13 },
    ];
    const nextIndex = Math.min(beats.length - 1, Math.max(1, beats.findIndex((beat) => beat.p >= progress)));
    const a = beats[nextIndex - 1];
    const b = beats[nextIndex];
    const mix = (b.p - a.p) === 0 ? 0 : (progress - a.p) / (b.p - a.p);
    quick.current?.x(a.x + (b.x - a.x) * mix);
    quick.current?.y(a.y + (b.y - a.y) * mix);
    quick.current?.z(a.z + (b.z - a.z) * mix);
    camera.lookAt(0, 2.7, -4);
  });
  return null;
}

export default function CinematicScene({ tier }: { tier: QualityTier }) {
  const [dpr, setDpr] = useState<[number, number]>([1, tier === "high" ? 1.75 : 1.35]);
  return (
    <Canvas dpr={dpr} camera={{ position: [0,2.5,12], fov: 42, near: 0.1, far: 80 }} gl={{ antialias: tier !== "low", powerPreference: "high-performance" }} aria-hidden="true">
      <PerformanceMonitor onDecline={() => setDpr([1, 1.1])} />
      <color attach="background" args={["#07060b"]} />
      <fog attach="fog" args={["#0d0814", 9, 31]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[5,8,4]} intensity={1.4} color="#ffd9c0" />
      <pointLight position={[0,5,2]} intensity={22} color="#e73555" distance={15} />
      <Atmosphere />
      <Skyline tier={tier} />
      <Marquee tier={tier} />
      <Chips tier={tier} />
      <CameraRig />
      <Environment resolution={128}><Lightformer intensity={1.5} position={[0,4,5]} color="#f2c96d" /><Lightformer intensity={1} position={[-5,2,3]} color="#e73555" /></Environment>
      {tier === "high" && <EffectComposer><Bloom mipmapBlur intensity={0.75} luminanceThreshold={0.72} luminanceSmoothing={0.2} /><Vignette eskil={false} offset={0.18} darkness={0.72} /></EffectComposer>}
    </Canvas>
  );
}

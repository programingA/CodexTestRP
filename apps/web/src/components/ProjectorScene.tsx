"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, Text } from "@react-three/drei";
import { useMemo, useRef, useState } from "react";
import type { Mesh } from "three";
import type { MemoryScene } from "@/lib/types";

type Props = {
  scenes: MemoryScene[];
};

function ProjectorModel({ activeIndex }: { activeIndex: number }) {
  const reel = useRef<Mesh>(null);

  useFrame((_, delta) => {
    if (reel.current) {
      reel.current.rotation.z += delta * 1.8;
    }
  });

  return (
    <group position={[-2.4, -0.55, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.55, 0.8]} />
        <meshStandardMaterial color="#292524" metalness={0.35} roughness={0.42} />
      </mesh>
      <mesh position={[0.82, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.18, 0.28, 0.7, 32]} />
        <meshStandardMaterial color="#57534e" metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh ref={reel} position={[-0.28, 0.62, 0.34]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.38, 0.055, 16, 56]} />
        <meshStandardMaterial color="#d6d3d1" metalness={0.4} roughness={0.24} />
      </mesh>
      <mesh position={[1.58, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.42 + activeIndex * 0.025, 2.3, 48, 1, true]} />
        <meshBasicMaterial color="#f6d365" transparent opacity={0.13} />
      </mesh>
    </group>
  );
}

function ScreenPanel({ scene }: { scene: MemoryScene }) {
  return (
    <Float speed={1.1} rotationIntensity={0.05} floatIntensity={0.12}>
      <group position={[1.1, 0.12, -0.18]}>
        <mesh receiveShadow>
          <boxGeometry args={[3.2, 1.8, 0.05]} />
          <meshStandardMaterial color="#f5f5f4" emissive="#f6d365" emissiveIntensity={0.08} roughness={0.55} />
        </mesh>
        <Text
          position={[0, 0.12, 0.04]}
          fontSize={0.18}
          maxWidth={2.6}
          textAlign="center"
          color="#1c1917"
          anchorX="center"
          anchorY="middle"
        >
          {scene.title}
        </Text>
      </group>
    </Float>
  );
}

export function ProjectorScene({ scenes }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeScene = scenes[activeIndex] ?? scenes[0];
  const progress = useMemo(() => `${activeIndex + 1} / ${scenes.length}`, [activeIndex, scenes.length]);

  if (!activeScene) {
    return null;
  }

  return (
    <section className="relative min-h-[640px] overflow-hidden rounded-lg border border-white/10 bg-black shadow-screen">
      <Canvas
        shadows
        camera={{ position: [0, 0.45, 5.5], fov: 45 }}
        className="absolute inset-0"
      >
        <ambientLight intensity={0.35} />
        <spotLight position={[-3, 3, 4]} intensity={2.1} angle={0.38} penumbra={0.8} castShadow />
        <ProjectorModel activeIndex={activeIndex} />
        <ScreenPanel scene={activeScene} />
        <Environment preset="city" />
      </Canvas>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_35%_45%,transparent_0,rgba(0,0,0,0.05)_24%,rgba(0,0,0,0.76)_100%)]" />

      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black via-black/75 to-transparent p-5 sm:p-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-3 text-sm font-medium text-projector">{progress}</div>
          <h1 className="text-3xl font-semibold text-white sm:text-5xl">{activeScene.title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-stone-200 sm:text-lg">{activeScene.body}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {scenes.map((scene, index) => (
              <button
                key={scene.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`pointer-events-auto h-2.5 w-12 rounded-full transition ${
                  index === activeIndex ? "bg-projector" : "bg-white/30 hover:bg-white/60"
                }`}
                aria-label={`${scene.title} 장면으로 이동`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

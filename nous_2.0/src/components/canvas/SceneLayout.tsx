"use client";

import { Canvas } from "@react-three/fiber";
import { Preload, useDetectGPU } from "@react-three/drei";
import { Lights } from "./Lights";
import { Effects } from "./Effects";
import { CameraRig } from "./CameraRig";
import { BackgroundMesh } from "@/components/Background2D/Background2D";
import { useEffect, useState, useMemo } from "react";

type Props = {
  children: React.ReactNode;
};

export default function SceneLayout({ children }: Props) {
  const isDev = process.env.NODE_ENV === "development";
  const [fov, setFov] = useState(45);

  // 13.2.4 Deep Perfection: Real GPU Detection
  const GPUTier = useDetectGPU();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setFov(55); // More breathing room for narrow screens
      } else {
        setFov(45);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 13.2.5 Dynamic Tiering based on GPU
  const dpr = useMemo(() => {
    if (GPUTier.tier < 2) return 1; // Low end: fix at 1x
    return [1, 2]; // High end: responsive up to 2x
  }, [GPUTier]);

  return (
    <div className="fixed inset-0 pointer-events-none z-10">
      <Canvas
        shadows
        camera={{ position: [0, -1, 12], fov: 40 }}
        dpr={dpr as any}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: "high-performance",
          // precision: GPUTier.tier < 2 ? "lowp" : "highp" // Sometimes causes issues, let's stick to auto
        }}
      >
        <CameraRig />
        <Lights />

        {/* INTEGRATED BACKGROUND SHADER FOR REFRACTION */}
        {/* Placed here so the Orb can see it and refract it */}
        <BackgroundMesh />

        {children}

        {/* 13.2.3 Only enable effects if GPU is Tier 2 or higher */}
        {GPUTier.tier >= 2 && <Effects />}

        <Preload all />
      </Canvas>
    </div >
  );
}

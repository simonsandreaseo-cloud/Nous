"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const PARTICLE_COUNT = 200;

// Shared objects (10.2 Management)
const particleGeom = new THREE.BufferGeometry();
const particleMat = new THREE.PointsMaterial({
    size: 0.05,
    color: "#FFFFFF",
    transparent: true,
    opacity: 0.3,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
});

export function DataParticles() {
    const pointsRef = useRef<THREE.Points>(null!);

    const positions = useMemo(() => {
        const pos = new Float32Array(PARTICLE_COUNT * 3);
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            // Contained inside the Orb (Radius ~1.2)
            const distance = Math.pow(Math.random(), 1 / 3) * 1.0;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            pos[i * 3] = distance * Math.sin(phi) * Math.cos(theta);
            pos[i * 3 + 1] = distance * Math.sin(phi) * Math.sin(theta);
            pos[i * 3 + 2] = distance * Math.cos(phi);
        }
        return pos;
    }, []);

    useEffect(() => {
        pointsRef.current.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    }, [positions]);

    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        pointsRef.current.rotation.y = time * 0.1;
        // Optimization: avoid per-particle math in JS if possible, but keep simple for 200 pts
    });

    return (
        <group position={[0, 1.8, 0]}> {/* Match Orb Position */}
            <points ref={pointsRef} geometry={particleGeom} material={particleMat} frustumCulled={true} />
        </group>
    );
}

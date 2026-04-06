"use client";

import { Float } from "@react-three/drei";
import { Mesh, Color } from "three";

export function CurvedGrid() {
    // Reference-accurate scenery: Sparse, floating geometric elements
    // avoiding the "dense cluster" look.

    return (
        <group position={[0, -1, 0]}>
            {/* 1. The Laser Lines - Thin, sharp cyan lines cutting through space */}
            <mesh position={[0, 0.5, 0]} rotation={[0, 0, 0.1]}>
                <boxGeometry args={[12, 0.02, 0.02]} />
                <meshBasicMaterial color="#00ffff" toneMapped={false} />
            </mesh>

            <mesh position={[-2, 1, 1]} rotation={[0, 0, Math.PI / 2 + 0.2]}>
                <boxGeometry args={[8, 0.02, 0.02]} />
                <meshBasicMaterial color="#00ffff" toneMapped={false} /> // Cyan
            </mesh>

            {/* 2. Background Floating White Cubes - Subtle depth */}
            {/* Right side group */}
            <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                <mesh position={[5, 1, -2]} rotation={[0.5, 0.5, 0]}>
                    <boxGeometry args={[1, 1, 1]} />
                    <meshStandardMaterial
                        color="#ffffff"
                        transparent
                        opacity={0.6}
                    />
                </mesh>
            </Float>

            {/* Left side fading away */}
            <Float speed={1.5} rotationIntensity={0.4} floatIntensity={0.6} floatingRange={[-0.2, 0.2]}>
                <mesh position={[-5, 0, -3]} rotation={[0.2, 0.2, 0.2]}>
                    <boxGeometry args={[0.8, 0.8, 0.8]} />
                    <meshStandardMaterial
                        color="#f5f7fa"
                    />
                </mesh>
            </Float>

            {/* Bottom foreground detail */}
            <Float speed={1} rotationIntensity={0.2} floatIntensity={0.3}>
                <mesh position={[2, -2.5, 2]} rotation={[0, Math.PI / 4, 0]}>
                    <boxGeometry args={[0.5, 0.5, 0.5]} />
                    <meshStandardMaterial
                        color="#ffffff"
                        transparent
                        opacity={0.8}
                    />
                </mesh>
            </Float>

            {/* 3. Accent Floating Shapes (Magenta/Cyan) matching reference vibes */}
            <Float speed={3} rotationIntensity={1} floatIntensity={1}>
                <mesh position={[3.5, 0, 0]}>
                    <octahedronGeometry args={[0.2, 0]} />
                    <meshStandardMaterial color="#ff00ff" emissive="#ff00ff" toneMapped={false} />
                </mesh>
            </Float>

            <Float speed={2.5} rotationIntensity={1} floatIntensity={0.5}>
                <mesh position={[-3, 2, -1]}>
                    <boxGeometry args={[0.25, 0.25, 0.25]} />
                    <meshStandardMaterial color="#00ffff" emissive="#00ffff" toneMapped={false} />
                </mesh>
            </Float>

        </group>
    );
}

"use client";

import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { Mesh, Group } from "three";
import { useAppStore } from "@/store/useAppStore";
import { useSpring, animated } from "@react-spring/three";

function InnerStructure() {
    const groupRef = useRef<Group>(null!);

    useFrame((state, delta) => {
        if (groupRef.current) {
            groupRef.current.rotation.y -= delta * 0.1;
            groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
        }
    });

    return (
        <group ref={groupRef}>
            {/* Small structural details/dots - Keeping these as they were not explicitly asked to be removed, 
                and add some detail to the "transparent" orb so it's not empty */}
            {[...Array(6)].map((_, i) => (
                <mesh key={i} position={[
                    Math.sin(i) * 0.5,
                    Math.cos(i * 1.5) * 0.6,
                    Math.sin(i * 2) * 0.5
                ]}>
                    <sphereGeometry args={[0.02, 8, 8]} />
                    <meshBasicMaterial color="#ffffff" toneMapped={false} />
                </mesh>
            ))}
        </group>
    );
}

/**
 * NousOrb Component
 * Central focal point with interactive glass refraction.
 */
/*
const OrbitalSatellites = () => {
    const groupRef = useRef<Group>(null!);

    useFrame((state, delta) => {
        if (groupRef.current) {
            groupRef.current.rotation.y += delta * 0.15;
            groupRef.current.rotation.z = Math.cos(state.clock.elapsedTime * 0.1) * 0.1;
        }
    });

    return (
        <group ref={groupRef}>    
            {[
                { pos: [2.5, 0.5, 0], speed: 1 },
                { pos: [-2, 1.2, 1.5], speed: 0.8 },
                { pos: [0.5, -2.2, -1], speed: 1.2 },
            ].map((sat, i) => (
                <group key={i} position={sat.pos as [number, number, number]}>
                    <mesh>
                        <sphereGeometry args={[0.03, 16, 16]} />
                        <meshBasicMaterial color="#ffffff" toneMapped={false} />
                    </mesh>
                    <pointLight color="#ffffff" intensity={2} distance={3} decay={2} />
                </group>
            ))}
        </group>
    );
};
*/

export function NousOrb() {
    const orbRef = useRef<Mesh>(null!);
    const hoveredItem = useAppStore((state) => state.hoveredItem);
    const highContrast = useAppStore((state) => state.highContrast);
    const status = useAppStore((state) => state.neuralLinkStatus);
    const trend = useAppStore((state) => state.neuralTrend);
    const [isBursting, setIsBursting] = useState(false);

    const handleDoubleClick = () => {
        setIsBursting(true);
        if (typeof window !== "undefined" && window.navigator.vibrate) {
            window.navigator.vibrate([100, 30, 100]);
        }
        setTimeout(() => setIsBursting(false), 2000);
    };

    const { springScale } = useSpring({
        springScale: isBursting ? 1.4 : hoveredItem ? 1.05 : 1,
        config: isBursting
            ? { mass: 1, tension: 500, friction: 10 }
            : { mass: 1, tension: 170, friction: 26 }
    });

    useEffect(() => {
        return () => { document.body.style.cursor = "auto"; };
    }, []);

    const orbColor = trend === 'up' ? "#ecfdf5" : trend === 'down' ? "#fff1f2" : "#ffffff";
    const accentColor = trend === 'up' ? "#10b981" : trend === 'down' ? "#f43f5e" : "#ffffff";

    return (
        <Float
            speed={isBursting ? 10 : 2}
            rotationIntensity={0.2}
            floatIntensity={0.5}
            floatingRange={[-0.1, 0.1]}
        >
            <group position={[0, 1.2, 0]}>
                {/* <OrbitalSatellites /> */}

                {/* Main Glass Orb */}
                <animated.mesh
                    ref={orbRef}
                    scale={springScale as any}
                    onDoubleClick={handleDoubleClick}
                    onPointerOver={() => (document.body.style.cursor = "pointer")}
                    onPointerOut={() => (document.body.style.cursor = "auto")}
                >
                    <sphereGeometry args={[1.5, 64, 64]} />
                    <animated.meshPhysicalMaterial
                        roughness={0}
                        metalness={0.1}
                        transmission={0}
                        transparent={true}
                        opacity={0.3} // More transparent to see background clearly
                        side={2} // DoubleSide to see back of sphere
                        clearcoat={1}
                        clearcoatRoughness={0}
                        color={orbColor}
                        emissive={accentColor}
                        emissiveIntensity={0.1}
                        toneMapped={false}
                    />
                </animated.mesh>

                <InnerStructure />

                {/* Central Light Source */}
                <pointLight intensity={15} distance={10} color="#ffffff" decay={2} />
            </group>
        </Float>
    );
}

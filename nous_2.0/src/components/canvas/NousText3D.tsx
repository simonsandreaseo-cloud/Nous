"use client";

import { Text, Center, Text3D } from "@react-three/drei";
import { useAppStore } from "@/store/useAppStore";
import { useSpring, animated } from "@react-spring/three";
import { useEffect, useState } from "react";

// Using a standard font path that usually works in R3F environments or from a reliable CDN
const FONT_URL = "/fonts/helvetiker_bold.typeface.json";

const AnimatedText3D = animated(Text3D) as any;
const AnimatedText = animated(Text) as any;

export function NousText3D() {
    const isLoaded = useAppStore((state) => state.isLoaded);

    // Animation for entrance
    const { opacity, z } = useSpring({
        opacity: isLoaded ? 1 : 0,
        z: isLoaded ? 0 : -2,
        config: { mass: 1, tension: 120, friction: 30 },
        delay: 500
    });

    return (
        <group position={[0, 0, -8]}>
            <Center>
                <animated.group
                    position-z={z as any}
                >
                    {/* Main "NOUS" Title - Extruded (Phase 5.1) */}
                    <AnimatedText3D
                        font={FONT_URL}
                        size={4}
                        height={0.5}
                        curveSegments={12}
                        bevelEnabled
                        bevelThickness={0.02}
                        bevelSize={0.02}
                        bevelOffset={0}
                        bevelSegments={5}
                    >
                        NOUS
                        <animated.meshStandardMaterial
                            color="#1a1a1a"
                            roughness={0.1}
                            metalness={0.1}
                            transparent
                            opacity={opacity as any}
                        />
                    </AnimatedText3D>

                    <AnimatedText
                        position={[0, -3.5, 0.5] as any}
                        fontSize={0.8}
                        font="/fonts/Inter-Regular.woff2"
                        color="#4A5568"
                        anchorX="center"
                        anchorY="middle"
                        transparent
                        opacity={0.4}
                    >
                        Tu ecosistema SEO inteligente
                    </AnimatedText>
                </animated.group>
            </Center>
        </group>
    );
}

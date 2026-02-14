import { useRef, useEffect, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial } from "@react-three/drei";
import { Mesh, Group, Vector3 } from "three";
import { useAppStore } from "@/store/useAppStore";
import { useNodeStore } from "@/store/useNodeStore";
import { useSpring, animated, config } from "@react-spring/three";

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

// Wrap MeshDistortMaterial for animation
const AnimatedDistortMaterial = animated(MeshDistortMaterial);

export function NousOrb() {
    const orbRef = useRef<Mesh>(null!);
    const hoveredItem = useAppStore((state) => state.hoveredItem);
    const trend = useAppStore((state) => state.neuralTrend);

    // Node State
    const nodeStatus = useNodeStore((state) => state.status);
    const isConnected = useNodeStore((state) => state.isConnected);

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

    // --- State Mapping ---
    // 'IDLE' | 'CRAWLING' | 'PROCESSING' | 'ERROR'

    const visualState = useMemo(() => {
        if (!isConnected) return { color: "#334155", distort: 0, speed: 0.5, emissive: "#000000" }; // Slate/Off

        switch (nodeStatus) {
            case 'IDLE':
                return {
                    color: trend === 'down' ? "#fff1f2" : "#ecfdf5",
                    emissive: trend === 'down' ? "#f43f5e" : "#10b981",
                    distort: 0.4,
                    speed: 2
                };
            case 'CRAWLING':
                return { color: "#d8b4fe", emissive: "#9333ea", distort: 0.8, speed: 8 }; // Purple/Fast
            case 'PROCESSING':
                return { color: "#fed7aa", emissive: "#f97316", distort: 0.6, speed: 4 }; // Orange/Medium
            case 'ERROR':
                return { color: "#fecaca", emissive: "#ef4444", distort: 1.2, speed: 0.5 }; // Red/Glitchy
            default:
                return { color: "#ecfdf5", emissive: "#10b981", distort: 0.4, speed: 2 };
        }
    }, [nodeStatus, isConnected, trend]);

    const springProps = useSpring({
        color: visualState.color,
        emissive: visualState.emissive,
        distort: visualState.distort,
        speed: visualState.speed,
        config: config.molasses // Slow transitions for colors
    });

    return (
        <Float
            speed={nodeStatus === 'CRAWLING' ? 5 : 2}
            rotationIntensity={nodeStatus === 'CRAWLING' ? 1.5 : 0.2}
            floatIntensity={0.5}
            floatingRange={[-0.1, 0.1]}
        >
            <group position={[0, 1.2, 0]}>

                {/* Main Orb */}
                <animated.mesh
                    ref={orbRef}
                    scale={springScale as any}
                    onDoubleClick={handleDoubleClick}
                    onPointerOver={() => (document.body.style.cursor = "pointer")}
                    onPointerOut={() => (document.body.style.cursor = "auto")}
                >
                    <sphereGeometry args={[1.5, 64, 64]} />
                    <AnimatedDistortMaterial
                        color={springProps.color}
                        emissive={springProps.emissive}
                        emissiveIntensity={0.5}
                        roughness={0.2}
                        metalness={0.1}
                        distort={springProps.distort}
                        speed={springProps.speed}
                        transparent={true}
                        opacity={0.6}
                    />
                </animated.mesh>

                {/* Inner structure remains visible inside */}
                <InnerStructure />

                {/* Dynamic Light */}
                <animated.pointLight
                    intensity={nodeStatus === 'CRAWLING' ? 25 : 15}
                    distance={10}
                    color={springProps.emissive}
                    decay={2}
                />
            </group>
        </Float>
    );
}

"use client";

import { Environment, ContactShadows, Lightformer } from "@react-three/drei";

export function Lights() {
    const ambientIntensity = 0.5;
    const spotIntensity = 5;
    const pointIntensity = 4;
    const envIntensity = 1.2;

    return (
        <>
            {/* Fixed Zenithal Light */}
            <directionalLight
                position={[0, 20, 0]}
                intensity={3}
                color="#ffffff"
            />

            <ambientLight intensity={1} />

            {/* Smart Studio Environment - Lightformer + Bright Background for Reflections */}
            <Environment resolution={512} background={false}>
                {/* 1. Esfera de reflexión (Invisible para la cámara, visible para reflejos) 
                   Esto es CRÍTICO para que el vidrio no se vea negro. Necesita algo blanco que reflejar. */}
                <mesh scale={10}>
                    <sphereGeometry args={[1, 64, 64]} />
                    <meshBasicMaterial color="#ffffff" side={2} />
                </mesh>

                {/* 2. Luz cenital para definición */}
                <Lightformer
                    position={[0, 10, 0]}
                    rotation-x={-Math.PI / 2}
                    scale={10}
                    intensity={4}
                    color="#ffffff"
                />

                {/* 3. Luces laterales para bordes */}
                <Lightformer position={[10, 0, 0]} rotation-y={Math.PI / 2} scale={5} intensity={2} />
                <Lightformer position={[-10, 0, 0]} rotation-y={-Math.PI / 2} scale={5} intensity={2} />
            </Environment>

            <ContactShadows
                position={[0, -2, 0]}
                opacity={0.4}
                scale={40}
                blur={2.5}
                far={4}
                resolution={256}
                color="#000000"
                frames={1}
            />
        </>
    );
}

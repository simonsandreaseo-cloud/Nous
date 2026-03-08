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
                <mesh scale={20}>
                    <sphereGeometry args={[1, 64, 64]} />
                    <meshBasicMaterial color="#ffffff" side={2} />
                </mesh>

                {/* 2. Luces de estudio frontales y superiores para brillos definidos */}
                <Lightformer
                    form="rect"
                    position={[0, 5, 5]}
                    scale={[10, 5, 1]}
                    intensity={10}
                    color="#ffffff"
                />

                <Lightformer
                    form="rect"
                    position={[-5, 2, 5]}
                    scale={[2, 10, 1]}
                    intensity={5}
                    color="#ffffff"
                />

                <Lightformer
                    form="rect"
                    position={[5, 2, 5]}
                    scale={[2, 10, 1]}
                    intensity={5}
                    color="#ffffff"
                />
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

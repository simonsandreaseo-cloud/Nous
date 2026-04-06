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
                {/* 1. Fondo del estudio (oscuro) 
                   Esto es CRÍTICO: El vidrio necesita un entorno oscuro con "luces" brillantes para no verse como un círculo plano. */}
                <mesh scale={20}>
                    <sphereGeometry args={[1, 64, 64]} />
                    <meshBasicMaterial color="#020202" side={2} />
                </mesh>

                {/* 2. Luces de estudio perimetrales para Rim Highlights (Evita el centro) */}
                <Lightformer
                    form="rect"
                    position={[-10, 5, 5]}
                    scale={[2, 20, 1]}
                    intensity={8}
                    color="#ffffff"
                    rotation-y={Math.PI / 4}
                />

                <Lightformer
                    form="rect"
                    position={[10, 5, 5]}
                    scale={[2, 20, 1]}
                    intensity={8}
                    color="#ffffff"
                    rotation-y={-Math.PI / 4}
                />

                <Lightformer
                    form="circle"
                    position={[0, 10, -5]}
                    scale={10}
                    intensity={4}
                    color="#ffffff"
                />

                <Lightformer
                    form="rect"
                    position={[0, -5, 10]}
                    scale={[20, 1, 1]}
                    intensity={2}
                    color="#ffffff"
                />
            </Environment>

            <ContactShadows
                position={[0, -3.5, 0]}
                opacity={0.3}
                scale={40}
                blur={2.5}
                far={5}
                resolution={256}
                color="#000000"
                frames={1}
            />
        </>
    );
}

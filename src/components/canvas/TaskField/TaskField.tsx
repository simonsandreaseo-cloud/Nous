import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useProjectStore } from '@/store/useProjectStore';

const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();

export function TaskField() {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const { tasks } = useProjectStore();
    const [hovered, setHover] = useState<number | null>(null);

    // Status Colors mapped to current Nous editorial pipeline
    const statusColors = useMemo(() => ({
        idea: new THREE.Color('#06b6d4'),                 // Cyan
        en_investigacion: new THREE.Color('#6366f1'),     // Indigo
        por_redactar: new THREE.Color('#f59e0b'),         // Amber
        en_redaccion: new THREE.Color('#4f46e5'),         // Indigo (Darker for writing)
        por_corregir: new THREE.Color('#8b5cf6'),         // Violet
        por_maquetar: new THREE.Color('#14b8a6'),         // Teal
        publicado: new THREE.Color('#10b981'),            // Emerald
    }), []);

    // Update Mesh when tasks change
    useEffect(() => {
        if (!meshRef.current || tasks.length === 0) return;

        const ideaOffset = -8;
        const investigationOffset = -4;
        const writingOffset = 0;
        const correctionOffset = 4;
        const doneOffset = 8;

        tasks.forEach((task, i) => {
            let x = 0;
            switch (task.status) {
                case 'idea': x = ideaOffset + (Math.random() * 3 - 1.5); break;
                case 'en_investigacion': x = investigationOffset + (Math.random() * 3 - 1.5); break;
                case 'por_redactar':
                case 'en_redaccion': x = writingOffset + (Math.random() * 3 - 1.5); break;
                case 'por_corregir': x = correctionOffset + (Math.random() * 3 - 1.5); break;
                case 'por_maquetar':
                case 'publicado': x = doneOffset + (Math.random() * 3 - 1.5); break;
                default: x = ideaOffset;
            }

            const z = (Math.random() * 10 - 5);

            tempObject.position.set(x, 0.5 + Math.random() * 0.5, z); // Varied height
            tempObject.scale.set(0.2, 1 + Math.random(), 0.2); // Varied structure
            tempObject.updateMatrix();

            if (meshRef.current) {
                meshRef.current.setMatrixAt(i, tempObject.matrix);
            }

            // Initial Color
            const baseColor = statusColors[task.status as keyof typeof statusColors] || statusColors.idea;
            if (meshRef.current) {
                meshRef.current.setColorAt(i, baseColor);
            }
        });

        meshRef.current.instanceMatrix.needsUpdate = true;
        meshRef.current.instanceColor!.needsUpdate = true;
    }, [tasks, statusColors]);

    // Handle Hover Effect
    useFrame(() => {
        if (!meshRef.current) return;

        // Pulse effect or hover highlight could go here
        // For now simple color swap on hover needs to be done carefully to not overwrite all colors
        // We already set colors in useEffect. To optimize, we just change the hovered one in the loop if needed
    });

    return (
        <instancedMesh
            ref={meshRef}
            args={[undefined, undefined, tasks.length > 0 ? tasks.length : 0]}
            onPointerOver={(e) => {
                e.stopPropagation();
                if (e.instanceId !== undefined) setHover(e.instanceId);
                document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => { setHover(null); document.body.style.cursor = 'auto'; }}
            onClick={(e) => {
                e.stopPropagation();
                if (e.instanceId !== undefined) {
                    console.log("Clicked task", tasks[e.instanceId]);
                    // TODO: Open Overlay
                }
            }}
        >
            <boxGeometry args={[1, 1, 1]} />
            {/* Glassy/Holographic Material */}
            <meshPhysicalMaterial
                color="#ffffff"
                roughness={0.1}
                metalness={0.8}
                transmission={0.6} // Glass
                thickness={1}
                emissive="#000000"
                emissiveIntensity={0.2}
            />
        </instancedMesh>
    );
}

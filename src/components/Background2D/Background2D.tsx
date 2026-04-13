"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { vertexShader, fragmentShader } from "./BackgroundShader";

export const BackgroundMesh = () => {
    const mesh = useRef<THREE.Mesh>(null);
    const { gl, camera, size } = useThree();

    // Calculate scale to fill screen relative to camera
    // We place it at z = -20 to be well behind the orb (at 0)
    const distance = 30; // Distance from camera to background plane

    // Responsive scale
    const scale = useMemo(() => {
        if (camera instanceof THREE.PerspectiveCamera) {
            const fov = camera.fov * (Math.PI / 180);
            const height = 2 * Math.tan(fov / 2) * distance;
            const width = height * (size.width / size.height);
            return [width, height, 1] as [number, number, number];
        } else {
            return [size.width, size.height, 1] as [number, number, number];
        }
    }, [camera, size, distance]);

    // Update scale on resize
    useFrame(() => {
        if (mesh.current && camera instanceof THREE.PerspectiveCamera) {
            const dist = Math.abs(camera.position.z - mesh.current.position.z);
            const fov = camera.fov * (Math.PI / 180);
            const height = 2 * Math.tan(fov / 2) * dist;
            const width = height * (size.width / size.height);
            mesh.current.scale.set(width, height, 1);
        }
    });

    const uniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            uResolution: { value: new THREE.Vector2(1, 1) },
            uMouse: { value: new THREE.Vector2(0.5, 0.5) },
            uClick: { value: new THREE.Vector3(0.5, 0.5, -999) }, // x, y, time
        }),
        []
    );

    useEffect(() => {
        const handleClick = (event: MouseEvent) => {
            if (mesh.current) {
                const material = mesh.current.material as THREE.ShaderMaterial;
                const x = event.clientX / window.innerWidth;
                const y = 1.0 - event.clientY / window.innerHeight;
                material.uniforms.uClick.value.x = x;
                material.uniforms.uClick.value.y = y;
                material.uniforms.uClick.value.z = material.uniforms.uTime.value;
            }
        };

        gl.domElement.addEventListener('click', handleClick);
        return () => gl.domElement.removeEventListener('click', handleClick);
    }, [gl]);

    useFrame((state) => {
        if (mesh.current) {
            const material = mesh.current.material as THREE.ShaderMaterial;
            material.uniforms.uTime.value = state.clock.getElapsedTime();

            // Update resolution
            material.uniforms.uResolution.value.x = state.size.width;
            material.uniforms.uResolution.value.y = state.size.height;

            // Update mouse uniform
            // state.pointer is normalized [-1, 1], map to [0, 1] for easier shader math
            material.uniforms.uMouse.value.x = (state.pointer.x + 1) * 0.5;
            material.uniforms.uMouse.value.y = (state.pointer.y + 1) * 0.5;
        }
    });

    return (
        <mesh ref={mesh} position={[0, 0, -10]} scale={scale} renderOrder={-1}>
            <planeGeometry args={[1, 1]} />
            <shaderMaterial
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
                transparent={false}
                depthWrite={true}
            />
        </mesh>
    );
};

export const Background2D = () => {
    return (
        <div className="fixed inset-0 z-0 w-full h-full">
            <Canvas
                orthographic
                camera={{ position: [0, 0, 1], zoom: 1, near: 0.1, far: 1000 }}
                dpr={[1, 2]}
                gl={{ antialias: false, alpha: true }}
                style={{ width: '100%', height: '100%' }}
            >
                <BackgroundMesh />
            </Canvas>
        </div>
    );
};

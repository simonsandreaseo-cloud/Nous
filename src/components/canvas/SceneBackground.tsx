"use client";

import { useTexture } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

export function SceneBackground() {
    const { viewport, camera, size } = useThree();
    const texture = useTexture("/bg-ref.png");

    // Ensure texture encoding
    texture.colorSpace = THREE.SRGBColorSpace;

    // Calculate dimensions to cover the view at specific depth
    // Camera default z is 12 (set in SceneLayout)
    // We want background at z = -20
    // Total distance = 32

    const distance = 32;
    // Calculate visible height at this distance using simplified FOV math for perspective camera
    // Standard R3F camera is Perspective
    const vFov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
    const planeHeight = 2 * Math.tan(vFov / 2) * distance;
    const planeWidth = planeHeight * (size.width / size.height); // Use current screen aspect ratio

    // Overscan multiplier to prevent edges from showing during parallax/mouse movement
    const overscan = 1.2;

    return (
        <mesh position={[0, 0, -20]} scale={[planeWidth * overscan, planeHeight * overscan, 1]}>
            <planeGeometry />
            <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
    );
}

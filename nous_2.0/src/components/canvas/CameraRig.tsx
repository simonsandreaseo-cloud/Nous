"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useAppStore } from "@/store/useAppStore";
import { Vector3 } from "three";

export function CameraRig() {
    const { camera, mouse } = useThree();
    const activeSection = useAppStore((state) => state.activeSection);

    // 14.1 Perfection: Calibration of section-based camera positions
    const parallaxStrength = 0.4;
    const smoothing = 2.5;

    const homePos: [number, number, number] = [0, 1.8, 12];
    const monitorPos: [number, number, number] = [-6, 3, 10];
    const researchPos: [number, number, number] = [6, 2, 10];
    const contentPos: [number, number, number] = [0, 6, 8];
    const strategyPos: [number, number, number] = [0, 1, 15];

    const targetPosition = useRef(new Vector3(0, 1.8, 12));
    const lookAtTarget = useRef(new Vector3(0, 1.5, 0));
    const currentLookAt = useRef(new Vector3(0, 1.5, 0));

    useFrame((state, delta) => {
        // Sync targets with Leva or ActiveSection
        switch (activeSection) {
            case "monitor":
                targetPosition.current.set(...(monitorPos as [number, number, number]));
                lookAtTarget.current.set(2, 1, 0);
                break;
            case "research":
                targetPosition.current.set(...(researchPos as [number, number, number]));
                lookAtTarget.current.set(-2, 1, 0);
                break;
            case "content":
                targetPosition.current.set(...(contentPos as [number, number, number]));
                lookAtTarget.current.set(0, 0, -5);
                break;
            case "strategy":
                targetPosition.current.set(...(strategyPos as [number, number, number]));
                lookAtTarget.current.set(0, 2, 0);
                break;
            default:
                targetPosition.current.set(...(homePos as [number, number, number]));
                lookAtTarget.current.set(0, 1.5, 0);
        }

        camera.position.lerp(targetPosition.current, delta * smoothing);
        currentLookAt.current.lerp(lookAtTarget.current, delta * smoothing);
        camera.lookAt(currentLookAt.current);

        // Parallax logic
        const paralaxX = mouse.x * parallaxStrength;
        const paralaxY = mouse.y * (parallaxStrength * 0.4);
        camera.position.x += (paralaxX - (camera.position.x - targetPosition.current.x) * 0.05) * 0.1;
        camera.position.y += (paralaxY - (camera.position.y - targetPosition.current.y) * 0.05) * 0.1;
    });

    return null;
}

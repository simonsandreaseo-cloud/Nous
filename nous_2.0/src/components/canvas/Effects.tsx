"use client";

import {
    EffectComposer,
    Bloom,
    Vignette,
    Noise,
    SMAA,
    ToneMapping,
    ChromaticAberration,
    Glitch,
    Scanline
} from "@react-three/postprocessing";
import { ToneMappingMode, BlendFunction } from "postprocessing";
import { Vector2 } from "three";
import { useEffect, useState, useMemo } from "react";
import { useNodeStore } from "@/store/useNodeStore";

export function Effects() {
    const [isMobile, setIsMobile] = useState(false);

    // Node State for Reactive Effects
    const nodeStatus = useNodeStore((state) => state.status);
    const isConnected = useNodeStore((state) => state.isConnected);

    useEffect(() => {
        setIsMobile(window.innerWidth < 768);
    }, []);

    // Effect Constants (previously from Leva)
    const bloomIntensity = 0.6;
    const bloomThreshold = 1.2;
    const vignetteDarkness = 0.45;
    const noiseOpacity = 0.015;
    const chromaticOffset = 0.0005;

    const overlayConfig = useMemo(() => {
        // Base config
        let config = {
            glitch: false,
            noiseMult: 1,
            scanlineOp: 0
        };

        if (!isConnected) return config;

        switch (nodeStatus) {
            case 'IDLE':
                config.scanlineOp = 0.02;
                break;
            case 'CRAWLING':
                config.scanlineOp = 0.15;
                config.noiseMult = 2;
                break;
            case 'PROCESSING':
                config.scanlineOp = 0.3;
                break;
            case 'ERROR':
                config.glitch = true;
                config.scanlineOp = 0.5;
                config.noiseMult = 5;
                break;
        }
        return config;
    }, [nodeStatus, isConnected]);

    return (
        <EffectComposer multisampling={0}>
            <SMAA />
            <Bloom
                intensity={isMobile ? bloomIntensity * 0.6 : bloomIntensity}
                luminanceThreshold={bloomThreshold}
                luminanceSmoothing={0.1}
                mipmapBlur
            />

            <ChromaticAberration
                blendFunction={BlendFunction.NORMAL}
                offset={new Vector2(isMobile ? 0 : chromaticOffset, isMobile ? 0 : chromaticOffset)}
            />

            <Scanline
                density={1.5}
                opacity={overlayConfig.scanlineOp}
                blendFunction={BlendFunction.OVERLAY}
            />

            <Glitch
                active={overlayConfig.glitch}
                ratio={0.85}
                delay={new Vector2(0.5, 1)}
                strength={new Vector2(0.3, 1.0)}
                duration={new Vector2(0.1, 0.3)}
            />

            {/* <Vignette
                offset={0.3}
                darkness={vignetteDarkness}
                eskil={false}
            /> */}

            <Noise
                opacity={noiseOpacity * overlayConfig.noiseMult}
                premultiply
                blendFunction={BlendFunction.OVERLAY}
            />

            <ToneMapping
                mode={ToneMappingMode.AGX}
            />
        </EffectComposer>
    );
}

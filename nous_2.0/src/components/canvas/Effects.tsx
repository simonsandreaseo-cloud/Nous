"use client";

import {
    EffectComposer,
    Bloom,
    Vignette,
    Noise,
    SMAA,
    ToneMapping,
    ChromaticAberration
} from "@react-three/postprocessing";
import { ToneMappingMode, BlendFunction } from "postprocessing";
import { Vector2 } from "three";
import { useEffect, useState } from "react";
export function Effects() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        setIsMobile(window.innerWidth < 768);
    }, []);

    // Effect Constants (previously from Leva)
    const bloomIntensity = 0.6;
    const bloomThreshold = 1.2;
    const vignetteDarkness = 0.45;
    const noiseOpacity = 0.015;
    const chromaticOffset = 0.0005;

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

            {/* <Vignette
                offset={0.3}
                darkness={vignetteDarkness}
                eskil={false}
            /> */}

            <Noise
                opacity={noiseOpacity}
                premultiply
                blendFunction={BlendFunction.OVERLAY}
            />

            <ToneMapping
                mode={ToneMappingMode.AGX}
            />
        </EffectComposer>
    );
}

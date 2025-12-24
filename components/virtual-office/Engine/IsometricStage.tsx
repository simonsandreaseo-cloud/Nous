import React, { useRef, useEffect, useState } from 'react';
import { Stage, Container, Sprite, Graphics } from '@pixi/react';
import * as PIXI from 'pixi.js';

interface IsometricStageProps {
    children: React.ReactNode;
    width?: number;
    height?: number;
}

const IsometricStage: React.FC<IsometricStageProps> = ({ children, width, height }) => {
    // Basic responsive sizing could go here
    const w = width || window.innerWidth;
    const h = height || window.innerHeight;

    return (
        <Stage
            width={w}
            height={h}
            options={{
                backgroundColor: 0x101010, // Dark Tech background
                antialias: true,
                autoDensity: true,
                resolution: window.devicePixelRatio || 1,
            }}
            className="block"
        >
            <Container x={w / 2} y={h / 4}>
                {children}
            </Container>
        </Stage>
    );
};

export default IsometricStage;

import React from 'react';
import { Container, Graphics } from '@pixi/react';
import * as PIXI from 'pixi.js';

interface AvatarProps {
    x: number; // Grid Coordinates
    y: number;
    color?: number;
    tileSize: number;
    isLocal?: boolean;
}

const Avatar: React.FC<AvatarProps> = ({ x, y, color = 0xff0000, tileSize, isLocal }) => {
    // Convert Grid to Iso
    const isoX = (x - y) * tileSize;
    const isoY = (x + y) * (tileSize / 2);

    const draw = (g: PIXI.Graphics) => {
        g.clear();

        // Shadow
        g.beginFill(0x000000, 0.3);
        g.drawEllipse(0, 0, tileSize / 2, tileSize / 4);
        g.endFill();

        // Body (Capsule)
        g.beginFill(color);
        g.drawRoundedRect(-15, -60, 30, 60, 15); // x, y, w, h, radius
        g.endFill();

        // Head/Face indicator
        g.beginFill(0xffffff, 0.8);
        g.drawCircle(0, -45, 8);
        g.endFill();

        if (isLocal) {
            // Indicator for local user
            g.lineStyle(2, 0xffff00);
            g.moveTo(0, -80);
            g.lineTo(-10, -90);
            g.moveTo(0, -80);
            g.lineTo(10, -90);
        }
    };

    return (
        <Graphics
            x={isoX}
            y={isoY}
            draw={draw}
            zIndex={x + y + 10} // Always on top of the tile it stands on
        />
    );
};

export default Avatar;

import React, { useCallback } from 'react';
import { Container, Graphics } from '@pixi/react';
import * as PIXI from 'pixi.js';

// Isometric Math: 
// IsoX = (CartX - CartY)
// IsoY = (CartX + CartY) / 2

interface IsometricGridProps {
    cols: number;
    rows: number;
    tileSize: number;
    onTileClick?: (x: number, y: number) => void;
}

const IsometricGrid: React.FC<IsometricGridProps> = ({ cols, rows, tileSize, onTileClick }) => {

    const drawTile = useCallback((g: PIXI.Graphics, isActive: boolean) => {
        g.clear();

        // Top Face
        g.beginFill(isActive ? 0x00ff99 : 0x2a2a2a); // Bright green if active (hover), else dark grey
        g.lineStyle(1, 0x333333, 1);
        g.moveTo(0, -tileSize / 2); // Top
        g.lineTo(tileSize, 0);      // Right
        g.lineTo(0, tileSize / 2);  // Bottom
        g.lineTo(-tileSize, 0);     // Left
        g.lineTo(0, -tileSize / 2); // Close
        g.endFill();

        // Right Face (Fake 3D)
        g.beginFill(0x1a1a1a);
        g.moveTo(tileSize, 0);
        g.lineTo(tileSize, 10); // Thickness
        g.lineTo(0, tileSize / 2 + 10);
        g.lineTo(0, tileSize / 2);
        g.endFill();

        // Left Face (Fake 3D)
        g.beginFill(0x222222);
        g.moveTo(0, tileSize / 2);
        g.lineTo(0, tileSize / 2 + 10);
        g.lineTo(-tileSize, 10);
        g.lineTo(-tileSize, 0);
        g.endFill();
    }, [tileSize]);

    return (
        <Container sortableChildren={true}>
            {Array.from({ length: rows }).map((_, y) =>
                Array.from({ length: cols }).map((_, x) => {
                    const isoX = (x - y) * tileSize;
                    const isoY = (x + y) * (tileSize / 2);

                    return (
                        <Tile
                            key={`${x}-${y}`}
                            x={isoX}
                            y={isoY}
                            gridX={x}
                            gridY={y}
                            draw={drawTile}
                            onClick={onTileClick}
                        />
                    );
                })
            )}
        </Container>
    );
};

interface TileProps {
    x: number;
    y: number;
    gridX: number;
    gridY: number;
    draw: (g: PIXI.Graphics, isActive: boolean) => void;
    onClick?: (x: number, y: number) => void;
}

const Tile: React.FC<TileProps> = ({ x, y, gridX, gridY, draw, onClick }) => {
    return (
        <Graphics
            x={x}
            y={y}
            interactive={true}
            cursor="pointer"
            draw={(g) => draw(g, false)} // Initial draw
            mouseover={(g) => draw(g.target as PIXI.Graphics, true)}
            mouseout={(g) => draw(g.target as PIXI.Graphics, false)}
            pointertap={() => onClick && onClick(gridX, gridY)}
            zIndex={gridX + gridY} // Depth sorting
        />
    );
};

export default IsometricGrid;

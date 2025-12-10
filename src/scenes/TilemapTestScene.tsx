import React, { useEffect, useRef, useState } from 'react';
import { AssetLoader } from '../utils/AssetLoader';
import { Texture } from 'pixi.js';

export const TilemapTestScene: React.FC = () => {
    const [tiles, setTiles] = useState<{ texture: Texture; x: number; y: number }[]>([]);
    const [workerTextures, setWorkerTextures] = useState<Texture[] | null>(null);
    const workerRef = useRef<any>(null); // Use any for the Pixi AnimatedSprite reference

    useEffect(() => {
        const loader = AssetLoader.getInstance();
        const tile1 = loader.getTexture('wood_tile_1');
        const tile2 = loader.getTexture('wood_tile_2');
        const workerAnim = loader.getAnimation('FarmerCyan_walk_down');

        if (tile1 && tile2) {
            const newTiles = [];
            const tileSize = 16;
            const cols = Math.ceil(360 / tileSize);
            const rows = Math.ceil(640 / tileSize);

            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    // Checkerboard pattern
                    const isEven = (x + y) % 2 === 0;
                    newTiles.push({
                        texture: isEven ? tile1 : tile2,
                        x: x * tileSize,
                        y: y * tileSize
                    });
                }
            }
            setTiles(newTiles);
        }

        if (workerAnim) {
            setWorkerTextures(workerAnim);
        }
    }, []);

    // Effect to start animation when textures are ready
    useEffect(() => {
        if (workerRef.current && workerTextures) {
            workerRef.current.play();
        }
    }, [workerTextures]);

    return (
        <pixiContainer>
            {/* Render Tiles */}
            {tiles.map((tile, i) => (
                <pixiSprite
                    key={`tile-${i}`}
                    texture={tile.texture}
                    x={tile.x}
                    y={tile.y}
                />
            ))}

            {/* Render Worker */}
            {workerTextures && (
                <pixiAnimatedSprite
                    ref={workerRef}
                    textures={workerTextures}
                    x={360 / 2 - 8} // Center horizontally (16px width)
                    y={640 / 2 - 8} // Center vertically (16px height)
                    animationSpeed={0.1}
                />
            )}
        </pixiContainer>
    );
};

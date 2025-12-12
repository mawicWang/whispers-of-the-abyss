import React, { useRef, useState, useEffect } from 'react';
import { Application, useTick } from '@pixi/react';
import { AssetLoader } from '../utils/AssetLoader';
import { ecs } from '../entities';
import type { Entity } from '../entities';
import type { Graphics as PixiGraphics } from 'pixi.js';

// Constants matching BaseSceneTest
const TILE_SIZE = 16;
// Viewport size for the observer
const VIEW_WIDTH = 96;
const VIEW_HEIGHT = 96;
// How far from the center to check for entities (optimization)
const RENDER_RADIUS = 64;

interface WorkerObserverProps {
    targetId: string;
}

// Helper for Animated Sprite
const AutoPlayAnimatedSprite = ({ textures, animationSpeed, anchor, ...props }: any) => {
    const ref = useRef<any>(null);
    useEffect(() => {
        if (ref.current) {
            ref.current.play();
        }
    }, [textures]);
    return <pixiAnimatedSprite ref={ref} textures={textures} animationSpeed={animationSpeed} anchor={anchor} {...props} />;
};

// Internal Pixi Scene Component
const ObserverScene: React.FC<{ targetId: string }> = ({ targetId }) => {
    const [target, setTarget] = useState<Entity | null>(null);
    const [nearbyEntities, setNearbyEntities] = useState<Entity[]>([]);

    // Texture caches (populated on mount/update)
    const [workerTextures, setWorkerTextures] = useState<Record<string, any>>({});
    const [staticTextures, setStaticTextures] = useState<Record<string, any>>({});

    // Camera position (interpolated or direct)
    const containerRef = useRef<any>(null);

    // Load necessary textures from AssetLoader (synchronous usually)
    useEffect(() => {
        const loader = AssetLoader.getInstance();

        // We need to ensure we have access to the same textures as the main scene.
        // Since AssetLoader is a singleton and assets are preloaded in App.tsx, we can just grab them.

        const sTextures: Record<string, any> = {};
        // Load known static textures
        for(let i=1; i<=9; i++) {
             const t = loader.getTexture(`House_${i}`);
             if (t) sTextures[`House_${i}`] = t;
        }
        for(let i=1; i<=4; i++) {
             const t = loader.getTexture(`wheat_stage_${i}`);
             if (t) sTextures[`wheat_stage_${i}`] = t;
        }
        setStaticTextures(sTextures);

    }, []);

    // Loop logic
    useTick((ticker) => {
        // 1. Find target entity
        const foundTarget = ecs.entities.find(e => e.id === targetId);
        if (!foundTarget || !foundTarget.position) {
            setTarget(null);
            return;
        }
        setTarget({ ...foundTarget });

        const tx = foundTarget.position.x;
        const ty = foundTarget.position.y;

        // 2. Camera Follow
        if (containerRef.current) {
            // Center the container on the target
            // Screen Center is (48, 48)
            // World Target is (tx, ty)
            // Container Pos = Screen Center - World Target
            containerRef.current.x = VIEW_WIDTH / 2 - (tx + TILE_SIZE/2);
            containerRef.current.y = VIEW_HEIGHT / 2 - (ty + TILE_SIZE/2);
        }

        // 3. Find nearby entities for background
        const nearby: Entity[] = [];
        for (const e of ecs.entities) {
            if (!e.position || !e.appearance) continue;
            // Simple distance check (Manhattan or Euclidean)
            if (Math.abs(e.position.x - tx) < RENDER_RADIUS &&
                Math.abs(e.position.y - ty) < RENDER_RADIUS) {
                nearby.push(e);
            }
        }

        setNearbyEntities(nearby);

        // 4. Update Texture for target if needed (animation change)
        if (foundTarget.appearance) {
             const { sprite, animation } = foundTarget.appearance;
             const key = `${sprite}_${animation || 'idle'}`;
             if (!workerTextures[key]) {
                 // Try to fetch
                 const loader = AssetLoader.getInstance();
                 // Try directions
                 const anims = loader.getAnimation(`${key}_down`) || loader.getAnimation(`${key}_run`);
                 if (anims) {
                     setWorkerTextures(prev => ({ ...prev, [key]: anims }));
                 }
             }
        }
    });

    if (!target || !target.position) return null;

    // We render a container that moves opposite to the player
    return (
        <pixiContainer ref={containerRef}>
            {/* Background Grid/Color */}
             <pixiGraphics
                draw={(g: PixiGraphics) => {
                    g.clear();
                    // Draw a large enough background relative to camera
                    const startX = Math.floor((target.position!.x - RENDER_RADIUS) / TILE_SIZE) * TILE_SIZE;
                    const startY = Math.floor((target.position!.y - RENDER_RADIUS) / TILE_SIZE) * TILE_SIZE;
                    const endX = startX + RENDER_RADIUS * 2;
                    const endY = startY + RENDER_RADIUS * 2;

                    g.beginFill(0x333333);
                    g.drawRect(startX, startY, endX - startX, endY - startY);
                    g.endFill();

                    for (let x = startX; x <= endX; x += TILE_SIZE) {
                        g.moveTo(x, startY);
                        g.lineTo(x, endY);
                    }
                    for (let y = startY; y <= endY; y += TILE_SIZE) {
                        g.moveTo(startX, y);
                        g.lineTo(endX, y);
                    }
                    // Fix: Explicitly cast or assume v8 API if types confuse it
                    (g as any).stroke({ width: 1, color: 0x888888, alpha: 0.5 });
                }}
            />

            {/* Static Entities (Background Layer) */}
            {nearbyEntities.map(e => {
                if (e.id === targetId) return null; // Don't render target here
                if (e.isObject && e.appearance?.sprite && staticTextures[e.appearance.sprite]) {
                     return (
                        <pixiSprite
                            key={e.id}
                            texture={staticTextures[e.appearance.sprite]}
                            x={e.position!.x}
                            y={e.position!.y}
                            anchor={0}
                        />
                     );
                }
                return null;
            })}

            {/* Target Entity */}
            {(() => {
                const action = target.appearance?.animation || 'idle';
                const spriteName = target.appearance?.sprite;
                const animKey = `${spriteName}_${action}`;
                const textures = workerTextures[animKey];

                // Speed calc
                let intervalMs = 300;
                if (action === 'walk') intervalMs = 200;
                if (action === 'run') intervalMs = 150;
                if (action.startsWith('attack')) intervalMs = 100;
                const speed = 1 / (intervalMs / 16.666);

                if (textures) {
                    return (
                        <AutoPlayAnimatedSprite
                            key={target.id}
                            textures={textures}
                            animationSpeed={speed}
                            x={target.position.x + TILE_SIZE / 2}
                            y={target.position.y + TILE_SIZE / 2}
                            anchor={0.5}
                        />
                    );
                }
                // Fallback
                return (
                     <pixiGraphics
                        x={target.position.x + TILE_SIZE / 2}
                        y={target.position.y + TILE_SIZE / 2}
                        draw={(g: PixiGraphics) => {
                            g.beginFill(0x00ff00);
                            g.drawCircle(0,0,8);
                            g.endFill();
                        }}
                    />
                );
            })()}

            {/* Other Dynamic Entities (Foreground/Neighbors) */}
            {nearbyEntities.map(e => {
                if (e.id === targetId) return null;
                if (e.isObject) return null; // Handled above

                // Draw other workers as simple colored circles if we don't load their textures
                return (
                    <pixiGraphics
                        key={e.id}
                        x={e.position!.x + TILE_SIZE / 2}
                        y={e.position!.y + TILE_SIZE / 2}
                        draw={(g: PixiGraphics) => {
                            g.beginFill(0xff0000, 0.5);
                            g.drawCircle(0,0,6);
                            g.endFill();
                        }}
                    />
                );
            })}

        </pixiContainer>
    );
};

export const WorkerObserver: React.FC<WorkerObserverProps> = ({ targetId }) => {
    return (
        <Application
            width={VIEW_WIDTH}
            height={VIEW_HEIGHT}
            backgroundColor={0x000000}
            backgroundAlpha={1}
            antialias={false}
            resolution={1}
        >
            <ObserverScene targetId={targetId} />
        </Application>
    );
};

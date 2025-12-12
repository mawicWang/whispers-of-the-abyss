import React, { useRef, useState, useEffect } from 'react';
import { Application, useTick } from '@pixi/react';
import { AssetLoader } from '../utils/AssetLoader';
import { ecs } from '../entities';
import type { Entity } from '../entities';
import type { Graphics as PixiGraphics } from 'pixi.js';

// Constants matching BaseSceneTest
const TILE_SIZE = 16;
// Viewport size for the observer - updated per user request to 2 * TILE_SIZE
const VIEW_WIDTH = 128;
const VIEW_HEIGHT = 128;
const ZOOM_LEVEL = 2.5;
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

    // Helper to load textures for an entity
    const loadEntityTexture = (entity: Entity) => {
        if (!entity.appearance) return;
        const { sprite, animation } = entity.appearance;
        const key = `${sprite}_${animation || 'idle'}`;

        // Prevent redundant checks if we already have it
        if (workerTextures[key]) return;

        const loader = AssetLoader.getInstance();
        // Try directions
        const anims = loader.getAnimation(`${key}_down`) || loader.getAnimation(`${key}_run`);

        if (anims) {
             setWorkerTextures(prev => {
                 if (prev[key]) return prev;
                 return { ...prev, [key]: anims };
             });
        }
    };

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
            containerRef.current.scale.set(ZOOM_LEVEL);

            const screenCenterX = VIEW_WIDTH / 2;
            const screenCenterY = VIEW_HEIGHT / 2;
            const targetCenterX = tx + TILE_SIZE / 2;
            const targetCenterY = ty + TILE_SIZE / 2;

            containerRef.current.x = Math.round(screenCenterX - (targetCenterX * ZOOM_LEVEL));
            containerRef.current.y = Math.round(screenCenterY - (targetCenterY * ZOOM_LEVEL));
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

        // 4. Update Textures for target and nearby
        if (foundTarget) loadEntityTexture(foundTarget);
        nearby.forEach(e => {
            if (!e.isObject) { // Optimization: Objects are handled by staticTextures
                loadEntityTexture(e);
            }
        });
    });

    if (!target || !target.position) return null;

    // Helper to render an entity (Target or Neighbor)
    const renderEntity = (e: Entity) => {
        const action = e.appearance?.animation || 'idle';
        const spriteName = e.appearance?.sprite;
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
                    key={e.id}
                    textures={textures}
                    animationSpeed={speed}
                    x={Math.round(e.position!.x + TILE_SIZE / 2)}
                    y={Math.round(e.position!.y + TILE_SIZE / 2)}
                    anchor={0.5}
                />
            );
        }
        // Fallback to simpler red dot if texture load failed (but not yet loaded might be transient)
        // Or if it's truly missing.
        return (
                <pixiGraphics
                key={e.id}
                x={Math.round(e.position!.x + TILE_SIZE / 2)}
                y={Math.round(e.position!.y + TILE_SIZE / 2)}
                draw={(g: PixiGraphics) => {
                    g.beginFill(0xff0000, 0.5);
                    g.drawCircle(0,0,6);
                    g.endFill();
                }}
            />
        );
    };

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
            {renderEntity(target)}

            {/* Other Dynamic Entities (Foreground/Neighbors) */}
            {nearbyEntities.map(e => {
                if (e.id === targetId) return null;
                if (e.isObject) return null; // Handled above

                return renderEntity(e);
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

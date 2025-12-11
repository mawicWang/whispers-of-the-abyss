import React, { useEffect, useRef, useState, useMemo } from 'react';
import { AssetLoader } from '../utils/AssetLoader';
import { Texture, BlurFilter, TextStyle, Rectangle } from 'pixi.js';
import { OutlineFilter } from 'pixi-filters';
import { FollowerFilter } from '../utils/FollowerFilter';
import { ecs } from '../entities';
import type { Entity } from '../entities';
import { findPath } from '../utils/Pathfinding';

const TILE_SIZE = 16;
const GRID_W = Math.floor(360 / TILE_SIZE);
const GRID_H = Math.floor(640 / TILE_SIZE);

const ENTITY_HIT_AREA = new Rectangle(-24, -24, 48, 48); // Large hit area for easy clicking
import { useTick } from '@pixi/react';
import { useBaseSceneStore } from '../state/BaseSceneStore';
import { useGameStore } from '../state/store';
import { useManaRegen } from '../hooks/useManaRegen';
import { MoveSystem } from '../systems/MoveSystem';
import { CharacterStatusDrawer } from '../ui/CharacterStatusDrawer';
import { createWheatField } from '../entities/WheatField';

// Character Factory
const createWorker = (x: number, y: number, id: string) => {
    ecs.add({
        id,
        position: { x, y },
        speed: 1.0,
        appearance: {
            sprite: 'FarmerCyan',
            animation: 'idle',
            direction: 'down'
        },
        attributes: {
            sanity: {
                current: Math.floor(Math.random() * 101), // Random 0-100
                max: 100
            }
        },
        aiState: 'IDLE',
        lastMoveTime: Date.now(),
        stateEnterTime: Date.now(),
        path: [],
        isNPC: true
    });
};

const createHouse = (x: number, y: number, variant: number, id: string) => {
    ecs.add({
        id,
        position: { x, y },
        appearance: {
            sprite: `House_${variant}`, // Uses the named tiles we defined in spritesheet_config
        },
        isObstacle: true,
        isObject: true
    });
}

// Whisper Zone Factory
const createWhisperZone = (x: number, y: number, level: number) => {
    const isLevel1 = level >= 1;
    ecs.add({
        position: { x, y },
        zone: {
            type: 'WHISPER',
            radius: 30,
            duration: isLevel1 ? 20 : 10,
            damageMin: isLevel1 ? 2 : 1,
            damageMax: isLevel1 ? 12 : 6,
            tickTimer: 0
        }
    });
};

// Spell Effect Component
const SpellEffect = ({ x, y, onComplete }: { x: number; y: number; onComplete: () => void }) => {
    const [alpha, setAlpha] = useState(1);
    const [scale, setScale] = useState(0.5);

    useTick((ticker: any) => {
        const delta = ticker.deltaTime ?? ticker;
        if (alpha <= 0) {
            onComplete();
            return;
        }
        setAlpha(a => a - 0.02 * delta);
        setScale(s => s + 0.01 * delta);
    });

    if (alpha <= 0) return null;

    return (
        <pixiGraphics
            draw={(g) => {
                g.clear();
                g.beginFill(0x9d4edd, alpha); // Purple
                g.drawCircle(0, 0, 20); // Radius 20
                g.endFill();
            }}
            x={x}
            y={y}
            scale={{ x: scale, y: scale }}
            filters={[new BlurFilter(4)]}
        />
    );
};

// Floating Text Component
const FloatingText = ({ x, y, text, onComplete }: { x: number; y: number; text: string; onComplete: () => void }) => {
    const [offsetY, setOffsetY] = useState(0);
    const [alpha, setAlpha] = useState(1);

    useTick((ticker: any) => {
        const delta = ticker.deltaTime ?? ticker;
        setOffsetY(y => y - 0.5 * delta);
        setAlpha(a => a - 0.02 * delta);
        if (alpha <= 0) onComplete();
    });

    if (alpha <= 0) return null;

    return (
        <pixiText
            text={text}
            x={x}
            y={y + offsetY}
            alpha={alpha}
            style={new TextStyle({
                fontFamily: 'monospace',
                fontSize: 12,
                fill: '#ff0000',
                stroke: { color: '#000000', width: 2 }
            })}
            anchor={0.5}
        />
    );
};

const DebugGrid = () => (
    <pixiGraphics
        draw={(g) => {
            g.clear();
            g.lineStyle(1, 0x555555, 0.3);
            for (let x = 0; x <= 360; x += TILE_SIZE) {
                g.moveTo(x, 0);
                g.lineTo(x, 640);
            }
            for (let y = 0; y <= 640; y += TILE_SIZE) {
                g.moveTo(0, y);
                g.lineTo(360, y);
            }
        }}
    />
);

// The Pixi Scene Component
export const BaseSceneTest: React.FC = () => {
    // Game State
    const [entities, setEntities] = useState<Entity[]>([]);
    const [effects, setEffects] = useState<{ id: number; x: number; y: number }[]>([]);
    const [floatingTexts, setFloatingTexts] = useState<{ id: number; x: number; y: number; text: string }[]>([]);
    const [workerTextures, setWorkerTextures] = useState<Record<string, Texture[]>>({});
    const [staticTextures, setStaticTextures] = useState<Record<string, Texture>>({});

    // Shared State
    const { selectedSkill, setSelectedSkill } = useBaseSceneStore();
    const { mana, addMana, whisperLevel, selectedEntityId, setSelectedEntity } = useGameStore();

    // Create stable Filter instances
    const outlineFilter = useMemo(() => new OutlineFilter({ thickness: 2, color: 0xffffff }), []);
    const followerFilter = useMemo(() => new FollowerFilter(), []);

    // Hook for Mana Regen
    useManaRegen();

    // Systems Refs
    const effectIdCounter = useRef(0);
    const textIdCounter = useRef(0);

    // Initialize
    useEffect(() => {
        // Clear world
        ecs.clear();

        // Initialize Map & Obstacles
        const obstacles = new Set<string>(); // Stores "gridX,gridY" for pathfinding
        const reservedMap = new Set<string>(); // Stores "gridX,gridY" for generation (houses/wheat)
        const houses = [];

        // Grid config
        const TILE_SIZE = 16;
        const GRID_W = Math.floor(360 / TILE_SIZE);
        const GRID_H = Math.floor(640 / TILE_SIZE);

        // Spawn Wheat Field (4x3)
        // Bottom 1/3 is approx y > 426. Center X is 180 (approx gridX 11).
        const wheatCols = 4;
        const wheatRows = 3;
        const startGridX = Math.floor((GRID_W - wheatCols) / 2);
        const startGridY = Math.floor(GRID_H * 0.75); // Place in lower area

        for (let r = 0; r < wheatRows; r++) {
            for (let c = 0; c < wheatCols; c++) {
                const gx = startGridX + c;
                const gy = startGridY + r;

                createWheatField(
                    gx * TILE_SIZE,
                    gy * TILE_SIZE,
                    gx,
                    gy,
                    c + 1 // Use different stages for visual variety (columns 1-4)
                );

                // Mark as reserved so houses don't spawn here
                reservedMap.add(`${gx},${gy}`);
            }
        }

        // Spawn Houses
        for (let i = 0; i < 5; i++) {
             // Random position (aligned to 16px grid)
             // Padding: keep away from edges
             const gridX = 2 + Math.floor(Math.random() * (GRID_W - 4));
             const gridY = 2 + Math.floor(Math.random() * (GRID_H - 4));

             const key = `${gridX},${gridY}`;
             if (reservedMap.has(key) || obstacles.has(key)) continue;

             const x = gridX * TILE_SIZE;
             const y = gridY * TILE_SIZE;

             // Add House
             const variant = Math.floor(Math.random() * 9) + 1; // 1-9
             createHouse(x, y, variant, `house-${i}`);

             // Mark obstacle (grid coords)
             obstacles.add(key);
             reservedMap.add(key);

             houses.push({x, y, gridX, gridY});
        }

        // Spawn Workers
        houses.forEach((house, idx) => {
             // Spawn below the house
             const workerGridX = house.gridX;
             const workerGridY = house.gridY + 1;
             const workerKey = `${workerGridX},${workerGridY}`;

             // Check valid spawn
             if (!obstacles.has(workerKey)) {
                createWorker(workerGridX * TILE_SIZE, workerGridY * TILE_SIZE, `worker-${idx}`);
             } else {
                 // Try neighbor (right)
                 createWorker((workerGridX + 1) * TILE_SIZE, workerGridY * TILE_SIZE, `worker-${idx}`);
             }
        });

        // Load Textures
        const loader = AssetLoader.getInstance();
        const loadAnims = () => {
            const idle = loader.getAnimation('FarmerCyan_idle_down');
            const walk = loader.getAnimation('FarmerCyan_walk_down');
            if (idle && walk) {
                setWorkerTextures({
                    idle,
                    walk
                });
            }

            // Load House textures
            const houses: Record<string, Texture> = {};
            for(let i=1; i<=9; i++) {
                const t = loader.getTexture(`House_${i}`);
                if (t) houses[`House_${i}`] = t;
            }
            // Load Wheat textures
            for(let i=1; i<=4; i++) {
                const t = loader.getTexture(`wheat_stage_${i}`);
                if (t) houses[`wheat_stage_${i}`] = t;
            }
            setStaticTextures(houses);
        };
        loadAnims();

        const updateEntities = () => {
            setEntities([...ecs.entities]);
        };
        updateEntities();

    }, []);

    // Game Loop (Logic & Render Update)
    useTick((ticker: any) => {
        const delta = ticker.deltaTime ?? ticker;
        const now = Date.now();

        // 1. AI / Movement System
        for (const entity of ecs.entities) {
            // Movement Logic
            if (entity.appearance && entity.position && entity.lastMoveTime && entity.isNPC) {
                 // If currently moving or has path, skip AI decision
                if (entity.move || (entity.path && entity.path.length > 0)) continue;

                // Random wander logic
                if (now - entity.lastMoveTime > 1000 + Math.random() * 2000) {
                    // Pick random target grid
                    const targetGridX = 2 + Math.floor(Math.random() * (GRID_W - 4));
                    const targetGridY = 2 + Math.floor(Math.random() * (GRID_H - 4));

                    const startGridX = Math.round(entity.position.x / TILE_SIZE);
                    const startGridY = Math.round(entity.position.y / TILE_SIZE);

                    // Build Obstacle Set (Grid Coordinates)
                    const obstacles = new Set<string>();
                    for(const e of ecs.entities) {
                        if (e.isObstacle && e.position) {
                            const gx = Math.round(e.position.x / TILE_SIZE);
                            const gy = Math.round(e.position.y / TILE_SIZE);
                            obstacles.add(`${gx},${gy}`);
                        }
                    }

                    // Find Path (Grid Space)
                    const gridPath = findPath(
                        { x: startGridX, y: startGridY },
                        { x: targetGridX, y: targetGridY },
                        obstacles,
                        { minX: 0, maxX: GRID_W, minY: 0, maxY: GRID_H }
                    );

                    if (gridPath.length > 0) {
                        // Convert Grid Path back to World Coordinates
                        entity.path = gridPath.map(p => ({
                            x: p.x * TILE_SIZE,
                            y: p.y * TILE_SIZE
                        }));
                        entity.lastMoveTime = now;
                    }
                } else if (now - entity.lastMoveTime > 500) {
                   if (!entity.move && entity.appearance.animation !== 'idle') {
                        entity.appearance.animation = 'idle';
                   }
                }
            }

            // Zone Logic
            if (entity.zone) {
                entity.zone.duration -= (delta / 60); // Approx seconds
                entity.zone.tickTimer += (delta / 60);

                if (entity.zone.duration <= 0) {
                    ecs.remove(entity);
                    continue;
                }

                // Process Tick (Every 1 second)
                if (entity.zone.tickTimer >= 1.0) {
                    entity.zone.tickTimer = 0;

                    // Find targets in range
                    for (const target of ecs.entities) {
                        if (target !== entity && target.position && target.attributes?.sanity) {
                             const dx = target.position.x - entity.position!.x;
                             const dy = target.position.y - entity.position!.y;
                             const dist = Math.sqrt(dx * dx + dy * dy);

                             if (dist <= entity.zone.radius) {
                                 // Apply Damage
                                 const dmg = Math.floor(Math.random() * (entity.zone.damageMax - entity.zone.damageMin + 1)) + entity.zone.damageMin;
                                 target.attributes.sanity.current = Math.max(0, target.attributes.sanity.current - dmg);

                                 // Floating Text
                                 const textId = textIdCounter.current++;
                                 setFloatingTexts(prev => [...prev, {
                                    id: textId,
                                    x: target.position!.x + TILE_SIZE / 2,
                                    y: target.position!.y - 20,
                                    text: `San -${dmg}`
                                 }]);
                             }
                        }
                    }
                }
            }
        }
        setEntities([...ecs.entities]);
    });

    const handleStageClick = (e: any) => {
        if (selectedSkill === 'whisper') {
            const clickPos = e.data.getLocalPosition(e.currentTarget);
            castWhisper(clickPos.x, clickPos.y);
        } else {
            // Not in casting mode, dismiss character sheet if clicking blank area
            setSelectedEntity(null);
        }
    };

    const castWhisper = (x: number, y: number) => {
        // Mana Check
        if (mana < 1) {
             const textId = textIdCounter.current++;
             setFloatingTexts(prev => [...prev, {
                id: textId,
                x: x,
                y: y,
                text: `No Mana!`
             }]);
             return;
        }

        // Deduct Mana
        addMana(-1);

        // Visual Effect
        const effectId = effectIdCounter.current++;
        setEffects(prev => [...prev, { id: effectId, x, y }]);

        // Create Zone Entity
        createWhisperZone(x, y, whisperLevel);

        // Cancel selection
        setSelectedSkill(null);
    };

    return (
        <pixiContainer eventMode="static" onPointerDown={handleStageClick}>
            <MoveSystem />
            {/* Background (Interactive area) */}
            <pixiGraphics
                draw={(g) => {
                    g.clear();
                    g.beginFill(0x333333);
                    g.drawRect(0, 0, 360, 640);
                    g.endFill();
                }}
            />

            <DebugGrid />

            {/* Entities */}
            {entities.map((entity) => {
                // Render Zone Debug
                if (entity.zone && entity.position) {
                    return (
                        <pixiGraphics
                            key={`zone-${entity.id || Math.random()}`}
                            x={entity.position.x}
                            y={entity.position.y}
                            draw={(g) => {
                                g.clear();
                                g.beginFill(0x9d4edd, 0.2);
                                g.drawCircle(0, 0, entity.zone!.radius);
                                g.endFill();
                            }}
                        />
                    );
                }

                if (!entity.position || !entity.appearance) return null;

                // Determine what to render: Animation or Static Sprite
                const isStatic = entity.isObject && entity.appearance.sprite && (entity.appearance.sprite.startsWith('House_') || entity.appearance.sprite.startsWith('wheat_stage_'));

                const isSelected = selectedEntityId === entity.id;
                const isFollower = entity.attributes?.sanity && entity.attributes.sanity.current <= 0;

                const filters = [];
                if (isSelected) filters.push(outlineFilter);
                if (isFollower) filters.push(followerFilter);

                if (isStatic) {
                     const texture = staticTextures[entity.appearance.sprite];
                     if (!texture) return null; // Wait for load

                     return (
                        <pixiSprite
                            key={entity.id}
                            texture={texture}
                            x={entity.position.x}
                            y={entity.position.y}
                            eventMode="static"
                            anchor={0}
                        />
                     )
                }

                const textures = workerTextures[entity.appearance.animation || 'idle'];

                // Fallback visual
                if (!textures) {
                        return (
                        <pixiGraphics
                            key={entity.id}
                            x={entity.position.x}
                            y={entity.position.y}
                            draw={(g) => {
                                g.beginFill(0x00ff00);
                                g.drawCircle(0,0,8);
                                g.endFill();
                            }}
                        />
                        );
                }

                return (
                    <pixiContainer
                        key={entity.id}
                        x={entity.position.x + TILE_SIZE / 2}
                        y={entity.position.y + TILE_SIZE / 2}
                        eventMode="static"
                        hitArea={ENTITY_HIT_AREA}
                        cursor="pointer"
                        onPointerDown={(e: any) => {
                            e.stopPropagation();
                            setSelectedEntity(entity.id || null);
                        }}
                    >
                        <AutoPlayAnimatedSprite
                            textures={textures}
                            animationSpeed={0.1}
                            anchor={0.5}
                            filters={filters.length > 0 ? filters : null}
                        />
                            {/* Simple Sanity Bar */}
                            {entity.attributes?.sanity && (
                            <pixiGraphics
                                y={-20}
                                draw={(g) => {
                                    g.clear();
                                    g.beginFill(0x000000);
                                    g.drawRect(-10, 0, 20, 4);
                                    g.beginFill(0x0000ff); // Blue for Sanity
                                    const pct = entity.attributes!.sanity.current / entity.attributes!.sanity.max;
                                    g.drawRect(-10, 0, 20 * pct, 4);
                                }}
                            />
                            )}
                    </pixiContainer>
                );
            })}

            {/* Effects */}
            {effects.map(ef => (
                <SpellEffect
                    key={ef.id}
                    x={ef.x}
                    y={ef.y}
                    onComplete={() => setEffects(prev => prev.filter(e => e.id !== ef.id))}
                />
            ))}

            {/* Floating Texts */}
            {floatingTexts.map(ft => (
                <FloatingText
                    key={ft.id}
                    x={ft.x}
                    y={ft.y}
                    text={ft.text}
                    onComplete={() => setFloatingTexts(prev => prev.filter(t => t.id !== ft.id))}
                />
            ))}

        </pixiContainer>
    );
};

// Helper for animated sprite
const AutoPlayAnimatedSprite = ({ textures, animationSpeed, anchor, ...props }: any) => {
    const ref = useRef<any>(null);
    useEffect(() => {
        if (ref.current) {
            ref.current.play();
        }
    }, [textures]);
    return <pixiAnimatedSprite ref={ref} textures={textures} animationSpeed={animationSpeed} anchor={anchor} {...props} />;
};

// The UI Component
export const BaseSceneUI: React.FC = () => {
    const { selectedSkill, setSelectedSkill } = useBaseSceneStore();
    const { mana, maxMana } = useGameStore();

    const toggleSkill = () => {
        setSelectedSkill(selectedSkill === 'whisper' ? null : 'whisper');
    };

    // Style for the button container
    const containerStyle: React.CSSProperties = {
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        width: '40px',
        height: '40px',
        border: selectedSkill === 'whisper' ? '2px solid #a855f7' : '2px solid #555', // Purple when active
        borderRadius: '8px',
        backgroundColor: '#222',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        pointerEvents: 'auto',
        imageRendering: 'pixelated',
        zIndex: 100
    };

    const spriteStyle: React.CSSProperties = {
        width: '16px',
        height: '16px',
        backgroundImage: `url(${new URL('assets/Objects/FireballProjectile.png', document.baseURI).href})`,
        backgroundPosition: '-48px 0',
        transform: 'scale(2)',
        transformOrigin: 'center'
    };

    const manaContainerStyle: React.CSSProperties = {
        position: 'absolute',
        bottom: '0',
        left: '0',
        width: '100%',
        height: '6px',
        backgroundColor: '#1a1a1a',
        borderTop: '1px solid #333',
        zIndex: 90
    };

    const manaFillStyle: React.CSSProperties = {
        height: '100%',
        width: `${Math.max(0, Math.min(100, (mana / maxMana) * 100))}%`,
        backgroundColor: '#4fc3f7',
        transition: 'width 0.2s ease-out'
    };

    const manaTextStyle: React.CSSProperties = {
        position: 'absolute',
        bottom: '8px',
        right: '4px',
        color: '#4fc3f7',
        fontFamily: 'monospace',
        fontSize: '10px',
        pointerEvents: 'none',
        textShadow: '1px 1px 0 #000'
    };

    return (
        <>
            <CharacterStatusDrawer />
            <div style={manaTextStyle}>
                {Math.floor(mana)}/{maxMana}
            </div>
            <div style={manaContainerStyle}>
                <div style={manaFillStyle} />
            </div>
            <div style={containerStyle} onClick={toggleSkill}>
                <div style={spriteStyle} />
            </div>
        </>
    );
};

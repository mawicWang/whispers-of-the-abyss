import React, { useEffect, useRef, useState, useMemo } from 'react';
import { AssetLoader } from '../utils/AssetLoader';
import { Texture, BlurFilter, TextStyle, Rectangle } from 'pixi.js';
import { OutlineFilter } from 'pixi-filters';
import { ecs } from '../entities';
import type { Entity } from '../entities';

const ENTITY_HIT_AREA = new Rectangle(-24, -24, 48, 48); // Large hit area for easy clicking
import { useTick } from '@pixi/react';
import { useBaseSceneStore } from '../state/BaseSceneStore';
import { useGameStore } from '../state/store';
import { useManaRegen } from '../hooks/useManaRegen';
import { MoveSystem } from '../systems/MoveSystem';
import { CharacterStatusDrawer } from '../ui/CharacterStatusDrawer';

// Character Factory
const createWorker = (x: number, y: number, id: string) => {
    ecs.add({
        id,
        position: { x, y },
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
        stateEnterTime: Date.now()
    });
};

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

// The Pixi Scene Component
export const BaseSceneTest: React.FC = () => {
    // Game State
    const [entities, setEntities] = useState<Entity[]>([]);
    const [effects, setEffects] = useState<{ id: number; x: number; y: number }[]>([]);
    const [floatingTexts, setFloatingTexts] = useState<{ id: number; x: number; y: number; text: string }[]>([]);
    const [workerTextures, setWorkerTextures] = useState<Record<string, Texture[]>>({});

    // Shared State
    const { selectedSkill, setSelectedSkill } = useBaseSceneStore();
    const { mana, addMana, whisperLevel, selectedEntityId, setSelectedEntity } = useGameStore();

    // Create a stable OutlineFilter instance
    const outlineFilter = useMemo(() => new OutlineFilter({ thickness: 2, color: 0xffffff }), []);

    // Hook for Mana Regen
    useManaRegen();

    // Systems Refs
    const effectIdCounter = useRef(0);
    const textIdCounter = useRef(0);

    // Initialize
    useEffect(() => {
        // Clear world
        ecs.clear();

        // Spawn Workers
        createWorker(100, 100, 'worker-1');
        createWorker(200, 300, 'worker-2');
        createWorker(150, 400, 'worker-3');

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
            if (entity.appearance && entity.position && entity.lastMoveTime) {
                // If currently moving, skip AI decision
                if (entity.move) continue;

                // Random wander logic
                if (now - entity.lastMoveTime > 1000 + Math.random() * 2000) {
                    // Pick random direction
                    const dx = (Math.random() - 0.5) * 64; // Move up to 32px
                    const dy = (Math.random() - 0.5) * 64;

                    // Boundary Check (0-360, 0-640)
                    const newX = Math.max(16, Math.min(360 - 16, entity.position!.x + dx));
                    const newY = Math.max(16, Math.min(640 - 16, entity.position!.y + dy));

                    // Use Move Component
                    ecs.addComponent(entity, 'move', {
                        targetX: newX,
                        targetY: newY,
                        speed: 1 // Speed in pixels per frame factor (approx 60px/sec if delta=1)
                    });

                    entity.lastMoveTime = now;
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
                                    x: target.position!.x,
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
                const textures = workerTextures[entity.appearance.animation || 'idle'];
                const isSelected = selectedEntityId === entity.id;

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
                        x={entity.position.x}
                        y={entity.position.y}
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
                            filters={isSelected ? [outlineFilter] : null}
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

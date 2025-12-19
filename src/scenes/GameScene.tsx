import React, { useEffect, useRef, useState, useMemo } from 'react';
import { AssetLoader } from '../utils/AssetLoader';
import { Texture, BlurFilter, TextStyle, Rectangle, Assets, Container, Sprite, Graphics, RenderTexture } from 'pixi.js';
import { OutlineFilter } from 'pixi-filters';
import { FollowerFilter } from '../utils/FollowerFilter';
import { ecs } from '../ecs/world';
import type { Entity, Debuff } from '../ecs/types';
import { findPath } from '../utils/Pathfinding';
import { SuspicionGauge } from '../ui/widgets/SuspicionGauge';
import { useTick, useApplication } from '@pixi/react';
import { useBaseSceneStore } from '../state/BaseSceneStore';
import { useGameStore } from '../state/store';
import { useManaRegen } from '../hooks/useManaRegen';
import { MoveSystem } from '../ecs/systems/MoveSystem';
import { GoapSystem } from '../ecs/systems/GoapSystem';
import { CharacterStatusDrawer } from '../ui/overlays/CharacterStatusDrawer';
import { createWheatField } from '../ecs/entities/WheatField';
import { EntityFactory } from '../ecs/factories/EntityFactory';
import { PixiViewport } from '../components/PixiViewport';
import { WORKER_VARIANTS } from '../config/gameData';
import { TILE_SIZE, GRID_W, GRID_H } from '../config/constants';

const ENTITY_HIT_AREA = new Rectangle(-24, -24, 48, 48);

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
                g.beginFill(0x9d4edd, alpha);
                g.drawCircle(0, 0, 20);
                g.endFill();
            }}
            x={x}
            y={y}
            scale={{ x: scale, y: scale }}
            filters={[new BlurFilter(4)]}
        />
    );
};

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

export const GameScene: React.FC = () => {
    const [entities, setEntities] = useState<Entity[]>([]);
    const [effects, setEffects] = useState<{ id: number; x: number; y: number }[]>([]);
    const [floatingTexts, setFloatingTexts] = useState<{ id: number; x: number; y: number; text: string }[]>([]);
    const [workerTextures, setWorkerTextures] = useState<Record<string, Texture[]>>({});
    const [staticTextures, setStaticTextures] = useState<Record<string, Texture>>({});
    const [influenceIcon, setInfluenceIcon] = useState<Texture | null>(null);
    const [backgroundTexture, setBackgroundTexture] = useState<Texture | null>(null);

    const { selectedSkill, setSelectedSkill } = useBaseSceneStore();
    const { mana, addMana, whisperLevel, selectedEntityId, setSelectedEntity, suspicion, increaseSuspicion, setAvatarImage } = useGameStore();

    const outlineFilter = useMemo(() => new OutlineFilter({ thickness: 2, color: 0xffffff }), []);
    const followerFilter = useMemo(() => new FollowerFilter(), []);

    useManaRegen();

    const effectIdCounter = useRef(0);
    const textIdCounter = useRef(0);
    const entityRefs = useRef<Record<string, Container | Sprite | Graphics>>({});

    // Rendering to Texture Setup
    const { app } = useApplication();

    // Portrait Extraction (Buffer Layer)
    const portraitTextureRef = useRef<RenderTexture | null>(null);
    const portraitContainerRef = useRef<Container | null>(null);

    useEffect(() => {
        // Initialize off-screen buffer
        portraitTextureRef.current = RenderTexture.create({ width: 64, height: 64 });
        portraitContainerRef.current = new Container();

        return () => {
            if (portraitTextureRef.current) {
                portraitTextureRef.current.destroy(true);
                portraitTextureRef.current = null;
            }
            if (portraitContainerRef.current) {
                portraitContainerRef.current.destroy({ children: true });
                portraitContainerRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!selectedEntityId) {
            setAvatarImage(null);
            return;
        }

        const extract = async () => {
             const target = entityRefs.current[selectedEntityId];
             const buffer = portraitContainerRef.current;
             const rt = portraitTextureRef.current;

             if (target && app.renderer && buffer && rt) {
                 try {
                     // Clear buffer
                     buffer.removeChildren();

                     // Clone visual
                     let clone: Container | Sprite | Graphics | null = null;

                     // Determine visual type
                     if (target instanceof Sprite) { // Covers AnimatedSprite
                         const s = new Sprite(target.texture);
                         s.anchor.set(0.5);
                         clone = s;
                     } else if (target instanceof Graphics) {
                         try {
                            const tex = await app.renderer.extract.texture(target);
                            const sprite = new Sprite(tex);
                            sprite.anchor.set(0.5);
                            clone = sprite;
                         } catch (e) {
                             const g = new Graphics();
                             g.rect(-8, -8, 16, 16);
                             g.fill(0xFFFFFF);
                             clone = g;
                         }
                     }

                     if (clone) {
                         // Setup clone in center of 64x64 buffer
                         clone.x = 32;
                         clone.y = 32;

                         // Scale up (target is usually 16x16, we want it large in 64x64)
                         clone.scale.set(3);

                         buffer.addChild(clone);

                         // Render to texture
                         app.renderer.render({ container: buffer, target: rt });

                         // Extract
                         const image = await app.renderer.extract.base64(rt);
                         setAvatarImage(image);
                     }
                 } catch (e) {
                     console.error("Extraction error", e);
                 }
             }
        };
        extract(); // Initial

        const interval = setInterval(extract, 200);
        return () => clearInterval(interval);
    }, [selectedEntityId, app]);

    // Manual Hit Testing Logic
    const dragStartRef = useRef<{x: number, y: number} | null>(null);
    const lastSelectionClickRef = useRef<{ time: number; x: number; y: number } | null>(null);

    const handlePointerDown = (e: any) => {
        dragStartRef.current = { x: e.global.x, y: e.global.y };
    };

    const handlePointerUp = (e: any) => {
        if (!dragStartRef.current) return;
        const start = dragStartRef.current;
        const end = { x: e.global.x, y: e.global.y };
        const dist = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        dragStartRef.current = null;

        if (dist > 5) {
             return; // It was a drag
        }

        // It was a click
        // e.currentTarget is the PixiViewport
        // getLocalPosition(viewport) returns the position in the viewport's local space (World Space)
        // because the viewport's children are in World Space.
        const localPos = e.data.getLocalPosition(e.currentTarget);
        const wx = localPos.x;
        const wy = localPos.y;

        if (selectedSkill === 'whisper') {
            castWhisper(wx, wy);
        } else {
            // Find Entity
            const HIT_RADIUS_SQ = 24 * 24;
            const candidates: Entity[] = [];

            for(const ent of ecs.entities) {
                // Select NPCs and Objects (Houses, Wheat, etc.)
                if (ent.position && (ent.isNPC || ent.isObject || ent.isHouse || ent.isWheat)) {
                    const cx = ent.position.x + 8;
                    const cy = ent.position.y + 8;
                    const dx = wx - cx;
                    const dy = wy - cy;
                    if (dx*dx + dy*dy < HIT_RADIUS_SQ) {
                        candidates.push(ent);
                    }
                }
            }

            if (candidates.length === 0) {
                setSelectedEntity(null);
                lastSelectionClickRef.current = null;
                return;
            }

            // Sort candidates to ensure consistent cycling order (e.g. by Render Order/Y then ID)
            candidates.sort((a, b) => {
                const ay = a.position?.y ?? 0;
                const by = b.position?.y ?? 0;
                if (Math.abs(ay - by) > 1) return ay - by;
                return (a.id || '').localeCompare(b.id || '');
            });

            const now = Date.now();
            let nextId = candidates[0].id || null;

            if (lastSelectionClickRef.current) {
                const last = lastSelectionClickRef.current;
                const timeDiff = now - last.time;
                const distToLast = Math.sqrt(Math.pow(wx - last.x, 2) + Math.pow(wy - last.y, 2));

                if (timeDiff < 1000 && distToLast < 16) {
                    // Cycle through candidates
                    const currentIdx = candidates.findIndex(c => c.id === selectedEntityId);
                    if (currentIdx !== -1) {
                        const nextIdx = (currentIdx + 1) % candidates.length;
                        nextId = candidates[nextIdx].id || null;
                    }
                }
            }

            setSelectedEntity(nextId);
            lastSelectionClickRef.current = { time: now, x: wx, y: wy };
        }
    };

    useEffect(() => {
        const timer = setInterval(() => {
            if (useGameStore.getState().suspicion > 0) {
                increaseSuspicion(-1);
            }
        }, 60000);
        return () => clearInterval(timer);
    }, [increaseSuspicion]);

    useEffect(() => {
        if (suspicion >= 100) {
            setTimeout(() => {
                if (useGameStore.getState().suspicion >= 100) {
                    alert("Game Over! Suspicion reached 100%. Click OK to restart.");
                    window.location.reload();
                }
            }, 100);
        }
    }, [suspicion]);

    // Initial Setup (Spawning)
    useEffect(() => {
        ecs.clear();
        const obstacles = new Set<string>();
        const reservedMap = new Set<string>();
        const houses = [];
        const wheatCols = 4;
        const wheatRows = 3;
        const startGridX = Math.floor((GRID_W - wheatCols) / 2);
        const startGridY = Math.floor(GRID_H * 0.75);

        for (let r = 0; r < wheatRows; r++) {
            for (let c = 0; c < wheatCols; c++) {
                const gx = startGridX + c;
                const gy = startGridY + r;
                createWheatField(gx * TILE_SIZE, gy * TILE_SIZE, gx, gy, c + 1, `wheat-${gx}-${gy}`);

                // Add name to wheat fields - hacky access or update createWheatField?
                // For now, let's just find them and update
                const w = ecs.entities.find(e => e.id === `wheat-${gx}-${gy}`);
                if (w) w.name = '麦田';

                reservedMap.add(`${gx},${gy}`);
            }
        }

        for (let i = 0; i < 5; i++) {
             const gridX = 2 + Math.floor(Math.random() * (GRID_W - 4));
             const gridY = 2 + Math.floor(Math.random() * (GRID_H - 4));
             const key = `${gridX},${gridY}`;
             if (reservedMap.has(key) || obstacles.has(key)) continue;
             const x = gridX * TILE_SIZE;
             const y = gridY * TILE_SIZE;
             const variant = Math.floor(Math.random() * 9) + 1;
             EntityFactory.createHouse(x, y, variant, `house-${i}`);
             obstacles.add(key);
             reservedMap.add(key);
             houses.push({x, y, gridX, gridY});
        }

        // Spawn Campfire
        {
            let found = false;
            while(!found) {
                 const gridX = 5 + Math.floor(Math.random() * (GRID_W - 10));
                 const gridY = 5 + Math.floor(Math.random() * (GRID_H - 10));
                 const key = `${gridX},${gridY}`;
                 if (!reservedMap.has(key)) {
                     EntityFactory.createCampfire(gridX * TILE_SIZE, gridY * TILE_SIZE, 'campfire-1');
                     obstacles.add(key);
                     reservedMap.add(key);
                     found = true;
                 }
            }
        }

        // Spawn Statue
        {
            let found = false;
            while(!found) {
                 const gridX = 5 + Math.floor(Math.random() * (GRID_W - 10));
                 const gridY = 5 + Math.floor(Math.random() * (GRID_H - 10));
                 const key = `${gridX},${gridY}`;
                 if (!reservedMap.has(key)) {
                     EntityFactory.createStatue(gridX * TILE_SIZE, gridY * TILE_SIZE, 'statue-1');
                     obstacles.add(key);
                     reservedMap.add(key);
                     found = true;
                 }
            }
        }

        houses.forEach((house, idx) => {
             const workerGridX = house.gridX;
             const workerGridY = house.gridY + 1;
             const workerKey = `${workerGridX},${workerGridY}`;
             if (!obstacles.has(workerKey)) {
                EntityFactory.createWorker(workerGridX * TILE_SIZE, workerGridY * TILE_SIZE, `worker-${idx}`, `house-${idx}`);
             } else {
                 EntityFactory.createWorker((workerGridX + 1) * TILE_SIZE, workerGridY * TILE_SIZE, `worker-${idx}`, `house-${idx}`);
             }
        });

        // Spawn Guards
        for (let i = 0; i < 2; i++) {
             let found = false;
             while(!found) {
                 const gridX = 2 + Math.floor(Math.random() * (GRID_W - 4));
                 const gridY = 2 + Math.floor(Math.random() * (GRID_H - 4));
                 const key = `${gridX},${gridY}`;
                 if (!reservedMap.has(key) && !obstacles.has(key)) {
                     EntityFactory.createGuard(gridX * TILE_SIZE, gridY * TILE_SIZE, `guard-${i}`);
                     reservedMap.add(key);
                     found = true;
                 }
             }
        }

        const loader = AssetLoader.getInstance();
        const loadAnims = async () => {
            try {
                const baseUrl = import.meta.env.BASE_URL;
                const bgUrl = `${baseUrl}assets/Templates/16x16Large.png`;
                const bgTex = await Assets.load(bgUrl);
                if (bgTex) {
                    bgTex.source.scaleMode = 'nearest';
                    setBackgroundTexture(bgTex);
                }
            } catch (e) {
                console.error("Failed to load background", e);
            }
            const anims: Record<string, Texture[]> = {};
            const actions = ['idle', 'walk', 'attack', 'run'];
            const directions = ['down', 'up', 'left', 'right'];
            const allVariants = [...WORKER_VARIANTS, 'AxemanCyan', 'AxemanRed'];

            allVariants.forEach(variant => {
                actions.forEach(action => {
                    directions.forEach(direction => {
                        const key = `${variant}_${action}_${direction}`;
                        const anim = loader.getAnimation(key);
                        if (anim) anims[key] = anim;
                    });
                });
            });
            if (Object.keys(anims).length > 0) setWorkerTextures(anims);
            const houses: Record<string, Texture> = {};
            for(let i=1; i<=9; i++) {
                const t = loader.getTexture(`House_${i}`);
                if (t) houses[`House_${i}`] = t;
            }
            for(let i=1; i<=4; i++) {
                const t = loader.getTexture(`wheat_stage_${i}`);
                if (t) houses[`wheat_stage_${i}`] = t;
            }

            // PLACEHOLDERS FOR CAMPFIRE AND STATUE if not in assets
            // Assuming they might be missing, we can use fallback or try to load
            // For now, if texture missing, we will render simple rects in render loop

            setStaticTextures(houses);
            const infIcon = loader.getTexture('influence_icon');
            if (infIcon) setInfluenceIcon(infIcon);
        };
        loadAnims();
        setEntities([...ecs.entities]);
    }, []);

    useTick((ticker: any) => {
        const delta = ticker.deltaTime ?? ticker;
        const now = Date.now();

        // Game Logic Loop
        for (const entity of ecs.entities) {
            if (entity.debuffs && entity.debuffs.length > 0) {
                for (let i = entity.debuffs.length - 1; i >= 0; i--) {
                    const debuff = entity.debuffs[i];
                    debuff.duration -= (delta / 60);
                    debuff.tickTimer += (delta / 60);
                    if (debuff.duration <= 0) {
                        entity.debuffs.splice(i, 1);
                        continue;
                    }
                    if (debuff.type === 'INFLUENCE' && debuff.tickTimer >= 2.0) {
                        debuff.tickTimer = 0;
                        if (entity.attributes?.sanity) {
                            entity.attributes.sanity.current = Math.max(0, entity.attributes.sanity.current - 1);
                            if (entity.attributes.sanity.current <= 0) {
                                if (entity.attributes.corruption) {
                                    entity.attributes.corruption.current = Math.min(100, entity.attributes.corruption.current + 1);
                                }
                            }
                            const textId = textIdCounter.current++;
                            setFloatingTexts(prev => [...prev, {
                                id: textId,
                                x: (entity.position?.x ?? 0) + TILE_SIZE / 2,
                                y: (entity.position?.y ?? 0) - 20,
                                text: `San -1`
                            }]);
                        }
                    }
                }
            }

            if (entity.appearance && entity.position && entity.lastMoveTime && entity.isNPC && !entity.goap) {
                if (entity.move || (entity.path && entity.path.length > 0)) continue;
                if (now - entity.lastMoveTime > 1000 + Math.random() * 2000) {
                    const targetGridX = 2 + Math.floor(Math.random() * (GRID_W - 4));
                    const targetGridY = 2 + Math.floor(Math.random() * (GRID_H - 4));
                    const startGridX = Math.round(entity.position.x / TILE_SIZE);
                    const startGridY = Math.round(entity.position.y / TILE_SIZE);
                    const obstacles = new Set<string>();
                    for(const e of ecs.entities) {
                        if (e.isObstacle && e.position) {
                            const gx = Math.round(e.position.x / TILE_SIZE);
                            const gy = Math.round(e.position.y / TILE_SIZE);
                            obstacles.add(`${gx},${gy}`);
                        }
                    }
                    const gridPath = findPath(
                        { x: startGridX, y: startGridY },
                        { x: targetGridX, y: targetGridY },
                        obstacles,
                        { minX: 0, maxX: GRID_W, minY: 0, maxY: GRID_H }
                    );
                    if (gridPath.length > 0) {
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

            if (entity.zone) {
                const zone = entity.zone;
                zone.duration -= (delta / 60);
                zone.tickTimer += (delta / 60);
                if (zone.duration <= 0) {
                    ecs.remove(entity);
                    continue;
                }
                if (zone.tickTimer >= 1.0) {
                    zone.tickTimer = 0;
                    const targetsHit: Entity[] = [];
                    for (const target of ecs.entities) {
                        if (target !== entity && target.position && target.attributes?.sanity) {
                             const dx = target.position.x - entity.position!.x;
                             const dy = target.position.y - entity.position!.y;
                             const dist = Math.sqrt(dx * dx + dy * dy);
                             if (dist <= zone.radius) targetsHit.push(target);
                        }
                    }
                    targetsHit.forEach(target => {
                         const dmg = Math.floor(Math.random() * (zone.damageMax - zone.damageMin + 1)) + zone.damageMin;
                         target.attributes!.sanity.current = Math.max(0, target.attributes!.sanity.current - dmg);
                         if (target.attributes!.sanity.current <= 0) {
                             if (target.attributes!.corruption) {
                                 target.attributes!.corruption.current = Math.min(100, target.attributes!.corruption.current + 2);
                             }
                         }
                         const textId = textIdCounter.current++;
                         setFloatingTexts(prev => [...prev, {
                            id: textId,
                            x: target.position!.x + TILE_SIZE / 2,
                            y: target.position!.y - 20,
                            text: `San -${dmg}`
                         }]);
                    });
                    const n = targetsHit.length;
                    if (n > 0) {
                        increaseSuspicion(n * (5 * Math.pow(2, n - 1)));
                    }
                }
            }
        }
        setEntities([...ecs.entities]);
    });

    const castWhisper = (x: number, y: number) => {
        if (mana < 5) {
             const textId = textIdCounter.current++;
             setFloatingTexts(prev => [...prev, { id: textId, x, y, text: `Need 5 Mana!` }]);
             return;
        }
        addMana(-5);
        increaseSuspicion(1);
        const effectId = effectIdCounter.current++;
        setEffects(prev => [...prev, { id: effectId, x, y }]);
        EntityFactory.createWhisperZone(x, y, whisperLevel);
        setSelectedSkill(null);
    };

    return (
        <PixiViewport
            screenWidth={360}
            screenHeight={640}
            worldWidth={GRID_W * TILE_SIZE}
            worldHeight={GRID_H * TILE_SIZE}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            eventMode="static"
        >
            {/* Systems */}
            <MoveSystem />
            <GoapSystem />

            {/* Background */}
            <pixiGraphics
                draw={(g) => {
                    g.clear();
                    g.beginFill(0x333333);
                    g.drawRect(0, 0, 360, 640);
                    g.endFill();
                }}
            />
            {backgroundTexture && (
                <pixiTilingSprite
                    texture={backgroundTexture}
                    width={360}
                    height={640}
                    tilePosition={{ x: 0, y: 0 }}
                    alpha={0.5}
                />
            )}

            {/* Entities */}
            {entities.map((entity) => {
                // Zone Debug
                if (entity.zone && entity.position) {
                    return (
                        <pixiGraphics
                            key={`zone-${entity.id}`}
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

                const isStatic = entity.isObject && entity.appearance.sprite && (
                    entity.appearance.sprite.startsWith('House_') ||
                    entity.appearance.sprite.startsWith('wheat_stage_') ||
                    entity.appearance.sprite === 'Bonfire' ||
                    entity.appearance.sprite === 'Statue'
                );
                const isSelected = selectedEntityId === entity.id;
                const isFollower = entity.attributes?.sanity && entity.attributes.sanity.current <= 0;

                const filters = [];
                if (isSelected) filters.push(outlineFilter);
                if (isFollower) filters.push(followerFilter);

                if (isStatic) {
                        const texture = staticTextures[entity.appearance.sprite];
                        // If no texture, render placeholder graphics
                        if (!texture) {
                            const color = entity.appearance.sprite === 'Bonfire' ? 0xff6600 : (entity.appearance.sprite === 'Statue' ? 0x888888 : 0xcccccc);
                            return (
                            <pixiGraphics
                                key={entity.id}
                                ref={(el: Graphics | null) => { if (el && entity.id) entityRefs.current[entity.id] = el; }}
                                x={entity.position.x}
                                y={entity.position.y}
                                draw={(g) => {
                                    g.beginFill(color);
                                    g.drawRect(0, 0, TILE_SIZE, TILE_SIZE);
                                    g.endFill();
                                }}
                            />
                            );
                        }
                        return (
                        <pixiSprite
                            key={entity.id}
                            ref={(el: Sprite | null) => { if (el && entity.id) entityRefs.current[entity.id] = el; }}
                            texture={texture}
                            x={entity.position.x}
                            y={entity.position.y}
                            anchor={0}
                        />
                        )
                }

                const action = entity.appearance.animation || 'idle';
                const direction = entity.appearance.direction || 'down';
                const animKey = `${entity.appearance.sprite}_${action}_${direction}`;
                const textures = workerTextures[animKey] || workerTextures[`${entity.appearance.sprite}_${action}_down`] || workerTextures[`${entity.appearance.sprite}_idle_down`];

                let intervalMs = 300;
                if (action === 'walk') intervalMs = 200;
                if (action === 'run') intervalMs = 150;
                if (action.startsWith('attack')) intervalMs = 100;
                const animationSpeed = 1 / (intervalMs / 16.666);

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
                    >
                        <AutoPlayAnimatedSprite
                            ref={(el: any) => { if (el && entity.id) entityRefs.current[entity.id] = el; }}
                            textures={textures}
                            animationSpeed={animationSpeed}
                            anchor={0.5}
                            filters={filters.length > 0 ? filters : null}
                        />
                        {/* Sanity Bar */}
                        {entity.attributes?.sanity && (
                        <pixiGraphics
                            y={-15}
                            draw={(g) => {
                                g.clear();
                                g.beginFill(0x000000);
                                g.drawRect(-10, 0, 20, 4);
                                g.beginFill(0x0000ff);
                                const pct = entity.attributes!.sanity.current / entity.attributes!.sanity.max;
                                g.drawRect(-10, 0, 20 * pct, 4);
                            }}
                        />
                        )}
                        {/* Debuffs */}
                        {entity.debuffs && entity.debuffs.length > 0 && influenceIcon && (
                            <pixiContainer y={-22}>
                                {entity.debuffs.map((d, i) => {
                                    const row = Math.floor(i / 3);
                                    const col = i % 3;
                                    const rowCount = Math.min(entity.debuffs!.length - row*3, 3);
                                    const startX = -((rowCount * 10) / 2) + 5;
                                    return (
                                        <pixiSprite
                                            key={`debuff-${i}`}
                                            texture={influenceIcon}
                                            x={startX + col * 10}
                                            y={-row * 10}
                                            width={8}
                                            height={8}
                                            anchor={0.5}
                                        />
                                    );
                                })}
                            </pixiContainer>
                        )}
                    </pixiContainer>
                );
            })}

            {effects.map(ef => (
                <SpellEffect
                    key={ef.id}
                    x={ef.x}
                    y={ef.y}
                    onComplete={() => setEffects(prev => prev.filter(e => e.id !== ef.id))}
                />
            ))}

            {floatingTexts.map(ft => (
                <FloatingText
                    key={ft.id}
                    x={ft.x}
                    y={ft.y}
                    text={ft.text}
                    onComplete={() => setFloatingTexts(prev => prev.filter(t => t.id !== ft.id))}
                />
            ))}
        </PixiViewport>
    );
};

// Helper
const AutoPlayAnimatedSprite = React.forwardRef(({ textures, animationSpeed, anchor, ...props }: any, ref: any) => {
    const internalRef = useRef<any>(null);

    React.useImperativeHandle(ref, () => internalRef.current);

    useEffect(() => {
        if (internalRef.current) {
            internalRef.current.play();
        }
    }, [textures]);
    return <pixiAnimatedSprite ref={internalRef} textures={textures} animationSpeed={animationSpeed} anchor={anchor} {...props} />;
});

export const BaseSceneUI: React.FC = () => {
    const { selectedSkill, setSelectedSkill } = useBaseSceneStore();
    const { mana, maxMana, suspicion, selectedEntityId, addMana } = useGameStore();

    const toggleSkill = () => {
        setSelectedSkill(selectedSkill === 'whisper' ? null : 'whisper');
    };

    const castInfluence = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!selectedEntityId) return;
        if (mana < 1) return;
        const entity = ecs.entities.find(e => e.id === selectedEntityId);
        if (entity) {
            if (mana >= 1) {
                addMana(-1);
                if (!entity.debuffs) entity.debuffs = [];
                const existingDebuff = entity.debuffs.find(d => d.type === 'INFLUENCE');
                if (existingDebuff) {
                    existingDebuff.duration = 20;
                    existingDebuff.tickTimer = 0;
                } else {
                    entity.debuffs.push({
                        type: 'INFLUENCE',
                        duration: 20,
                        tickTimer: 0,
                        icon: 'influence_icon'
                    });
                }
            }
        }
    };

    const containerStyle: React.CSSProperties = {
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        width: '40px',
        height: '40px',
        border: selectedSkill === 'whisper' ? '2px solid #a855f7' : '2px solid #555',
        borderRadius: '8px',
        backgroundColor: '#222',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: mana >= 5 ? 'pointer' : 'not-allowed',
        pointerEvents: 'auto',
        imageRendering: 'pixelated',
        zIndex: 100,
        opacity: mana >= 5 ? 1 : 0.5
    };

    const influenceBtnStyle: React.CSSProperties = {
        position: 'absolute',
        bottom: '20px',
        left: '70px',
        width: '40px',
        height: '40px',
        border: '2px solid #555',
        borderRadius: '8px',
        backgroundColor: '#222',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: (selectedEntityId && mana >= 1) ? 'pointer' : 'not-allowed',
        pointerEvents: 'auto',
        imageRendering: 'pixelated',
        zIndex: 100,
        opacity: (selectedEntityId && mana >= 1) ? 1 : 0.3,
        borderColor: (selectedEntityId && mana >= 1) ? '#ffffff' : '#555'
    };

    const spriteStyle: React.CSSProperties = {
        width: '16px',
        height: '16px',
        backgroundImage: `url(${new URL('assets/Objects/FireballProjectile.png', document.baseURI).href})`,
        backgroundPosition: '-48px 0',
        transform: 'scale(2)',
        transformOrigin: 'center'
    };

    const influenceIconStyle: React.CSSProperties = {
        width: '16px',
        height: '16px',
        backgroundImage: `url(${new URL('assets/UserInterface/InfluenceIcon.png', document.baseURI).href})`,
        backgroundSize: '100%',
        transform: 'scale(1.5)',
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

    const suspicionStyle: React.CSSProperties = {
        position: 'absolute',
        top: '60px',
        right: '20px',
        zIndex: 100
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
            <div style={containerStyle} onClick={toggleSkill} title="Whisper (Cost: 5 Mana)">
                <div style={spriteStyle} />
            </div>
            <div style={influenceBtnStyle} onClick={castInfluence} title="Influence (Cost: 1 Mana)">
                 <div style={influenceIconStyle} />
            </div>
            <div style={suspicionStyle}>
                <SuspicionGauge value={suspicion} />
            </div>
        </>
    );
};

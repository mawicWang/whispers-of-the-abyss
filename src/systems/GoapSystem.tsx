
import { useTick } from '@pixi/react';
import { ecs, type Entity } from '../entities';
import type { GoapAction, GoapState } from '../entities/GoapComponent';
import { findPath } from '../utils/Pathfinding';

const TILE_SIZE = 16;
const GRID_W = Math.floor(360 / TILE_SIZE);
const GRID_H = Math.floor(640 / TILE_SIZE);

const HOME_POSITION = { x: 10 * TILE_SIZE, y: 10 * TILE_SIZE };
const REST_RECOVERY_RATE = 1;
const REST_DURATION = 10000;
const PRAY_DURATION = 10000;
const MEDITATE_DURATION = 30000;
const WANDER_DURATION = 5000;
const CHAT_DURATION = 5000;
const FARM_ANIMATION_DURATION = 800;
const EAT_DURATION = 2000;
const STORE_DURATION = 1000;

// Helper to collect obstacles
const getObstacles = () => {
    const obstacles = new Set<string>();
    for(const e of ecs.entities) {
        if (e.isObstacle && e.position) {
            const gx = Math.round(e.position.x / TILE_SIZE);
            const gy = Math.round(e.position.y / TILE_SIZE);
            obstacles.add(`${gx},${gy}`);
        }
    }
    return obstacles;
};

// Helper for pathfinding move
const navigateTo = (entity: Entity, targetX: number, targetY: number) => {
    if (!entity.position) return false;

    const dx = targetX - entity.position.x;
    const dy = targetY - entity.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 4) {
        entity.path = [];
        if (entity.move) delete entity.move;
        return true;
    }

    if (entity.path && entity.path.length > 0) return false;

    const startGridX = Math.round(entity.position.x / TILE_SIZE);
    const startGridY = Math.round(entity.position.y / TILE_SIZE);
    const targetGridX = Math.round(targetX / TILE_SIZE);
    const targetGridY = Math.round(targetY / TILE_SIZE);

    const obstacles = getObstacles();

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
        return false;
    } else {
        if (startGridX === targetGridX && startGridY === targetGridY) {
            if (entity.move && Math.abs(entity.move.targetX - targetX) < 1 && Math.abs(entity.move.targetY - targetY) < 1) {
                return false;
            }
            ecs.addComponent(entity, 'move', {
                targetX: targetX,
                targetY: targetY,
                speed: entity.speed ?? 1.0
            });
            return false;
        }
        return false;
    }
};

// --- Smart Object Actions ---
export const createFindSmartObjectAction = (interactionType: string): GoapAction => ({
    name: `FindSmartObject_${interactionType}`,
    cost: 10 + Math.random() * 10,
    preconditions: (state) => !state.hasSmartObjectTarget,
    effects: (state) => ({ hasSmartObjectTarget: true }),
    execute: (entity, deltaTime) => {
        if (entity.goap) entity.goap.currentActionName = `Searching ${interactionType}`;

        const candidates = ecs.entities.filter(e =>
            e.smartObject &&
            e.smartObject.interactionType === interactionType
        );

        let bestScore = -Infinity;
        let bestTarget: Entity | null = null;
        let bestSlotIndex = -1;

        for (const candidate of candidates) {
            if (!candidate.position || !candidate.smartObject) continue;
            const slots = candidate.smartObject.slots;
            let availableSlotIndex = -1;
            for (let i = 0; i < slots.length; i++) {
                if (slots[i].claimedBy === null) {
                    availableSlotIndex = i;
                    break;
                }
            }
            if (availableSlotIndex === -1) continue;

            let effectValue = 0;
            if (candidate.smartObject.advertisedEffects.boredom) effectValue += Math.abs(candidate.smartObject.advertisedEffects.boredom);
            if (candidate.smartObject.advertisedEffects.sanity) effectValue += Math.abs(candidate.smartObject.advertisedEffects.sanity);

            const dist = entity.position ? Math.hypot(candidate.position.x - entity.position.x, candidate.position.y - entity.position.y) : 1000;
            const score = (effectValue * 1.0) - (dist * 0.1);

            if (score > bestScore) {
                bestScore = score;
                bestTarget = candidate;
                bestSlotIndex = availableSlotIndex;
            }
        }

        if (bestTarget && bestTarget.smartObject) {
             if (entity.goap) {
                 bestTarget.smartObject.slots[bestSlotIndex].claimedBy = entity.id || null;
                 entity.goap.blackboard.targetSmartObjectId = bestTarget.id;
                 entity.goap.blackboard.targetSlotIndex = bestSlotIndex;
             }
             return true;
        }
        return false;
    }
});

export const GoToSmartObjectAction: GoapAction = {
    name: 'GoToSmartObject',
    cost: 2,
    preconditions: (state) => state.hasSmartObjectTarget,
    effects: (state) => ({ atSmartObject: true }),
    execute: (entity, deltaTime) => {
        const targetId = entity.goap?.blackboard.targetSmartObjectId;
        const slotIndex = entity.goap?.blackboard.targetSlotIndex;
        const target = ecs.entities.find(e => e.id === targetId);

        if (entity.goap) {
             const targetName = target?.name || target?.smartObject?.interactionType || targetId || "目标";
             entity.goap.currentActionName = `前往 ${targetName}`;
        }

        if (!targetId || slotIndex === undefined || slotIndex === -1 || !target || !target.position || !target.smartObject) {
             if (entity.goap) {
                 entity.goap.blackboard.targetSmartObjectId = undefined;
                 entity.goap.blackboard.targetSlotIndex = -1;
             }
             return false;
        }

        if (target.smartObject.slots[slotIndex].claimedBy !== entity.id) {
             if (entity.goap) {
                 entity.goap.blackboard.targetSmartObjectId = undefined;
                 entity.goap.blackboard.targetSlotIndex = -1;
             }
             return false;
        }

        const slot = target.smartObject.slots[slotIndex];
        const targetX = target.position.x + slot.x;
        const targetY = target.position.y + slot.y;

        return navigateTo(entity, targetX, targetY);
    }
};

export const UseSmartObjectAction: GoapAction = {
    name: 'UseSmartObject',
    cost: 1,
    preconditions: (state) => state.atSmartObject,
    effects: (state) => ({ boredom: 0, sanity: 100 }),
    execute: (entity, deltaTime) => {
        if (!entity.goap) return false;
        const targetId = entity.goap.blackboard.targetSmartObjectId;
        const slotIndex = entity.goap.blackboard.targetSlotIndex;
        if (!targetId || slotIndex === undefined || slotIndex === -1) return true;
        const target = ecs.entities.find(e => e.id === targetId);
        if (!target || !target.smartObject || target.smartObject.slots[slotIndex].claimedBy !== entity.id) return true;

        const so = target.smartObject;
        if (!entity.goap.blackboard.usingSmartObject) {
            entity.goap.blackboard.usingSmartObject = true;
            entity.goap.blackboard.smartObjectTimer = 0;
            const targetName = target?.name || target?.smartObject?.interactionType || targetId || "目标";
            entity.goap.currentActionName = `正在使用 ${targetName}`;
            if (entity.appearance) {
                entity.appearance.animation = so.animation;
                if (so.faceTarget && entity.position && target.position) {
                     const dx = target.position.x - entity.position.x;
                     const dy = target.position.y - entity.position.y;
                     if (Math.abs(dx) > Math.abs(dy)) entity.appearance.direction = dx > 0 ? 'right' : 'left';
                     else entity.appearance.direction = dy > 0 ? 'down' : 'up';
                }
            }
        }

        entity.goap.blackboard.smartObjectTimer = (entity.goap.blackboard.smartObjectTimer || 0) + deltaTime;
        const seconds = deltaTime / 1000;

        if (so.advertisedEffects.boredom && entity.attributes?.boredom) {
             entity.attributes.boredom.current = Math.max(0, entity.attributes.boredom.current + (so.advertisedEffects.boredom * seconds / (so.duration / 1000)));
        }
        if (so.advertisedEffects.sanity && entity.attributes?.sanity && entity.attributes.sanity.current > 0) {
             entity.attributes.sanity.current = Math.min(entity.attributes.sanity.max, Math.max(0, entity.attributes.sanity.current + (so.advertisedEffects.sanity * seconds / (so.duration / 1000))));
        }
        if (so.advertisedEffects.corruption && entity.attributes?.corruption) {
             entity.attributes.corruption.current = Math.min(entity.attributes.corruption.max, entity.attributes.corruption.current + (so.advertisedEffects.corruption * seconds / (so.duration / 1000)));
        }
         if (so.advertisedEffects.stamina && entity.attributes?.stamina) {
             entity.attributes.stamina.current = Math.min(entity.attributes.stamina.max, entity.attributes.stamina.current + (so.advertisedEffects.stamina * seconds / (so.duration / 1000)));
        }

        if (entity.goap.blackboard.smartObjectTimer >= so.duration) {
            target.smartObject.slots[slotIndex].claimedBy = null;
            entity.goap.blackboard.targetSmartObjectId = undefined;
            entity.goap.blackboard.targetSlotIndex = -1;
            entity.goap.blackboard.usingSmartObject = false;
            entity.goap.blackboard.smartObjectTimer = undefined;
            if (entity.appearance) entity.appearance.animation = 'idle';
            return true;
        }
        return false;
    }
};

// --- Basic Actions ---
export const GoHomeAction: GoapAction = {
    name: 'GoHome',
    cost: 1,
    preconditions: (state) => true,
    effects: (state) => ({ atHome: true }),
    execute: (entity, deltaTime) => {
        if (entity.goap) entity.goap.currentActionName = "回家中";
        const home = entity.goap?.blackboard.homePosition || HOME_POSITION;
        return navigateTo(entity, home.x, home.y);
    }
};

export const RestAction: GoapAction = {
    name: 'Rest',
    cost: 1,
    preconditions: (state) => state.atHome,
    effects: (state) => ({ stamina: 10 }),
    execute: (entity, deltaTime) => {
        if (entity.goap) entity.goap.currentActionName = "休息中";
        if (!entity.goap || !entity.attributes?.stamina) return false;

        if (entity.goap.blackboard.restTimer === undefined) {
             entity.goap.blackboard.restTimer = 0;
             if (entity.appearance) entity.appearance.animation = 'idle';
        }
        entity.goap.blackboard.restTimer += deltaTime;
        const recovery = (deltaTime / 1000) * REST_RECOVERY_RATE;
        entity.attributes.stamina.current = Math.min(
            entity.attributes.stamina.max,
            entity.attributes.stamina.current + recovery
        );
        if (entity.attributes.stamina.current >= entity.attributes.stamina.max) {
             entity.goap.blackboard.restTimer = undefined;
             return true;
        }
        return false;
    }
};

// --- Farming Actions ---
export const FindFarmAction: GoapAction = {
    name: 'FindFarm',
    cost: 1,
    preconditions: (state) => !state.hasFarmTarget,
    effects: (state) => ({ hasFarmTarget: true }),
    execute: (entity, deltaTime) => {
        if (entity.goap) entity.goap.currentActionName = "寻找农田";
        let closestField: Entity | null = null;
        let minDist = Infinity;
        const fields = ecs.entities.filter(e => e.isWheat && e.position);

        for (const field of fields) {
             if (field.claimedBy && field.claimedBy !== entity.id) continue;
             if (entity.position && field.position) {
                 const dist = Math.hypot(field.position.x - entity.position.x, field.position.y - entity.position.y);
                 if (dist < minDist) {
                     minDist = dist;
                     closestField = field;
                 }
             }
        }

        if (closestField) {
            if (entity.goap) {
                closestField.claimedBy = entity.id;
                entity.goap.blackboard.targetFarmId = closestField.id;
            }
            return true;
        }
        return false;
    }
};

export const GoToFarmAction: GoapAction = {
    name: 'GoToFarm',
    cost: 2,
    preconditions: (state) => state.hasFarmTarget,
    effects: (state) => ({ atFarm: true }),
    execute: (entity, deltaTime) => {
        if (entity.goap) entity.goap.currentActionName = "前往农田";
        if (!entity.goap?.blackboard.targetFarmId) return false;
        const target = ecs.entities.find(e => e.id === entity.goap!.blackboard.targetFarmId);
        if (!target || !target.position || target.claimedBy !== entity.id) {
            if (target && target.claimedBy === entity.id) target.claimedBy = undefined;
            entity.goap!.blackboard.targetFarmId = undefined;
            return false;
        }
        return navigateTo(entity, target.position.x, target.position.y);
    }
};

export const HarvestAction: GoapAction = {
    name: 'Harvest',
    cost: 5,
    preconditions: (state) => state.atFarm && state.stamina > 0,
    effects: (state) => ({ stamina: state.stamina - 1, hasFood: true }), // Simulated effect
    execute: (entity, deltaTime) => {
        if (!entity.goap || !entity.attributes?.stamina) return false;

        const targetId = entity.goap.blackboard.targetFarmId;
        const target = ecs.entities.find(e => e.id === targetId);
        const now = Date.now();

        if (!target || target.claimedBy !== entity.id) {
             entity.goap.blackboard.farmStartTime = undefined;
             return true;
        }

        const isMaxStage = target.growth && target.growth.stage >= target.growth.maxStage;
        const actionName = isMaxStage ? "收割中" : "耕作中";
        entity.goap.currentActionName = actionName;

        if (entity.goap.blackboard.farmStartTime === undefined) {
             entity.goap.blackboard.farmStartTime = now;
             if (entity.appearance && target.position && entity.position) {
                 entity.appearance.animation = 'attack';
                 const dx = target.position.x - entity.position.x;
                 const dy = target.position.y - entity.position.y;
                 if (Math.abs(dx) > Math.abs(dy)) entity.appearance.direction = dx > 0 ? 'right' : 'left';
                 else entity.appearance.direction = dy > 0 ? 'down' : 'up';
             }
             return false;
        }

        const elapsed = now - entity.goap.blackboard.farmStartTime;
        if (elapsed < FARM_ANIMATION_DURATION) {
             if (entity.appearance && entity.appearance.animation !== 'attack') entity.appearance.animation = 'attack';
             return false;
        }

        // Action Complete
        entity.goap.blackboard.farmStartTime = undefined;
        entity.attributes.stamina.current = Math.max(0, entity.attributes.stamina.current - 1);

        if (target.growth) {
            if (isMaxStage) {
                // HARVEST
                const foodAmount = Math.floor(Math.random() * 3) + 3; // 3-5
                if (!entity.inventory) entity.inventory = [];
                const existing = entity.inventory.find(i => i.item === 'food');
                if (existing) existing.count += foodAmount;
                else entity.inventory.push({ item: 'food', count: foodAmount });

                target.growth.stage = 1;
            } else {
                // TEND (Grow)
                target.growth.stage++;
            }
            target.appearance!.sprite = `wheat_stage_${target.growth.stage}`;
        }

        if (entity.appearance) entity.appearance.animation = 'idle';
        return true;
    }
};


// --- Food & Housing Actions ---

export const FindHouseAction: GoapAction = {
    name: 'FindHouse',
    cost: 1,
    preconditions: (state) => !state.hasHouseTarget,
    effects: (state) => ({ hasHouseTarget: true }),
    execute: (entity, deltaTime) => {
        if (entity.goap) entity.goap.currentActionName = "寻找仓库";

        // Prioritize own house if assigned
        if (entity.goap?.blackboard.homeHouseId) {
            const homeId = entity.goap.blackboard.homeHouseId;
            const home = ecs.entities.find(e => e.id === homeId);
            if (home) {
                entity.goap.blackboard.targetHouseId = home.id;
                return true;
            }
        }

        // Fallback: Find nearest house
        let closest: Entity | null = null;
        let minDist = Infinity;
        const houses = ecs.entities.filter(e => e.isHouse && e.position);

        for (const h of houses) {
            if (entity.position && h.position) {
                 const dist = Math.hypot(h.position.x - entity.position.x, h.position.y - entity.position.y);
                 if (dist < minDist) {
                     minDist = dist;
                     closest = h;
                 }
            }
        }

        if (closest) {
            if (entity.goap) {
                entity.goap.blackboard.targetHouseId = closest.id;
            }
            return true;
        }
        return false;
    }
};

export const GoToHouseAction: GoapAction = {
    name: 'GoToHouse',
    cost: 2,
    preconditions: (state) => state.hasHouseTarget,
    effects: (state) => ({ atHouse: true }),
    execute: (entity, deltaTime) => {
        if (entity.goap) entity.goap.currentActionName = "前往仓库";
        const targetId = entity.goap?.blackboard.targetHouseId;
        const target = ecs.entities.find(e => e.id === targetId);

        if (!target || !target.position) {
            if (entity.goap) entity.goap.blackboard.targetHouseId = undefined;
            return false;
        }

        // Move to door (offset by size/2 or just close)
        // Houses are usually obstacles, so we target a point next to it.
        // Assuming houses are solid, we need a "door" or interaction point.
        // For now, move to center and let collision/distance check stop us?
        // Or specific offset. Let's try 16px below center.
        return navigateTo(entity, target.position.x, target.position.y + 16);
    }
};

export const StoreFoodAction: GoapAction = {
    name: 'StoreFood',
    cost: 1,
    preconditions: (state) => state.atHouse,
    effects: (state) => ({ hasFood: false }),
    execute: (entity, deltaTime) => {
        if (entity.goap) entity.goap.currentActionName = "存粮中";

        if (entity.goap && entity.goap.blackboard.storeTimer === undefined) {
            entity.goap.blackboard.storeTimer = 0;
            if (entity.appearance) entity.appearance.animation = 'attack'; // Simulate work
        }

        if (entity.goap) entity.goap.blackboard.storeTimer! += deltaTime;

        if (entity.goap && entity.goap.blackboard.storeTimer! >= STORE_DURATION) {
             const targetId = entity.goap.blackboard.targetHouseId;
             const target = ecs.entities.find(e => e.id === targetId);

             if (target) {
                 if (!target.storage) target.storage = {};

                 // Transfer all food
                 const foodItem = entity.inventory?.find(i => i.item === 'food');
                 if (foodItem) {
                     target.storage['food'] = (target.storage['food'] || 0) + foodItem.count;
                     foodItem.count = 0;
                 }
             }

             entity.goap.blackboard.storeTimer = undefined;
             entity.goap.blackboard.targetHouseId = undefined;
             if (entity.appearance) entity.appearance.animation = 'idle';
             return true;
        }
        return false;
    }
};

export const EatAction: GoapAction = {
    name: 'Eat',
    cost: 1,
    preconditions: (state) => state.atHouse,
    effects: (state) => ({ satiety: 100 }),
    execute: (entity, deltaTime) => {
        if (entity.goap) entity.goap.currentActionName = "进食中";

        const targetId = entity.goap?.blackboard.targetHouseId;
        const target = ecs.entities.find(e => e.id === targetId);

        // Check if house has food
        const houseFood = target?.storage?.['food'] || 0;
        if (houseFood <= 0) {
             // Failed to eat (no food)
             // Abort
             if (entity.goap) entity.goap.blackboard.targetHouseId = undefined;
             return true;
        }

        if (entity.goap && entity.goap.blackboard.eatTimer === undefined) {
             entity.goap.blackboard.eatTimer = 0;
             if (entity.appearance) entity.appearance.animation = 'idle';
        }

        if (entity.goap) entity.goap.blackboard.eatTimer! += deltaTime;

        if (entity.goap && entity.goap.blackboard.eatTimer! >= EAT_DURATION) {
            // Consume
            if (target && target.storage) {
                target.storage['food'] = Math.max(0, (target.storage['food'] || 0) - 1);
            }
            // Replenish
            if (entity.attributes?.satiety) {
                entity.attributes.satiety.current = Math.min(entity.attributes.satiety.max, entity.attributes.satiety.current + 60);
            }

            entity.goap.blackboard.eatTimer = undefined;
            entity.goap.blackboard.targetHouseId = undefined;
            return true;
        }
        return false;
    }
};

// --- Corrupted / Other Actions ---
// (Keeping existing definitions for brevity where unchanged, but including full file write)

export const GoToRandomSpotAction: GoapAction = {
    name: 'GoToRandomSpot',
    cost: 1,
    preconditions: (state) => true,
    effects: (state) => ({ atQuietSpot: true }),
    execute: (entity, deltaTime) => {
        if (entity.goap) entity.goap.currentActionName = "前往角落";
        if (!entity.goap) return false;
        if (!entity.goap.blackboard.targetSpot) {
            const rx = Math.floor(Math.random() * (GRID_W - 2) + 1) * TILE_SIZE;
            const ry = Math.floor(Math.random() * (GRID_H - 2) + 1) * TILE_SIZE;
            entity.goap.blackboard.targetSpot = { x: rx, y: ry };
        }
        const target = entity.goap.blackboard.targetSpot;
        return navigateTo(entity, target.x, target.y);
    }
};

export const PrayAction: GoapAction = {
    name: 'Pray',
    cost: 0,
    preconditions: (state) => state.atQuietSpot,
    effects: (state) => ({ }),
    execute: (entity, deltaTime) => {
        if (entity.goap) entity.goap.currentActionName = "祈祷中";
        if (!entity.goap) return false;
        if (entity.goap.blackboard.prayTimer === undefined) {
            entity.goap.blackboard.prayTimer = 0;
            if (entity.appearance) entity.appearance.animation = 'idle';
        }
        entity.goap.blackboard.prayTimer += deltaTime;
        if (entity.goap.blackboard.prayTimer >= PRAY_DURATION) {
            entity.goap.blackboard.prayTimer = undefined;
            entity.goap.blackboard.targetSpot = undefined;
            if (Math.random() < 0.3 && entity.attributes?.corruption) {
                entity.attributes.corruption.current = Math.min(entity.attributes.corruption.max, entity.attributes.corruption.current + 1);
            }
            return true;
        }
        return false;
    }
};

export const WanderAction: GoapAction = {
    name: 'Wander',
    cost: 1,
    preconditions: (state) => state.atQuietSpot,
    effects: (state) => ({ boredom: 0 }),
    execute: (entity, deltaTime) => {
        if (entity.goap) entity.goap.currentActionName = "闲逛中";
        if (!entity.goap) return false;
        if (entity.goap.blackboard.wanderTimer === undefined) {
            entity.goap.blackboard.wanderTimer = 0;
            if (entity.appearance) entity.appearance.animation = 'idle';
        }
        entity.goap.blackboard.wanderTimer += deltaTime;
        if (entity.goap.blackboard.wanderTimer >= WANDER_DURATION) {
            entity.goap.blackboard.wanderTimer = undefined;
            entity.goap.blackboard.targetSpot = undefined;
            if (entity.attributes?.boredom) {
                entity.attributes.boredom.current = Math.max(0, entity.attributes.boredom.current - 50);
            }
            return true;
        }
        return false;
    }
};

export const ChatWithOtherAction: GoapAction = {
    name: 'ChatWithOther',
    cost: 0,
    preconditions: (state) => state.hasNeighbor,
    effects: (state) => ({ boredom: 0 }),
    execute: (entity, deltaTime) => {
        if (entity.goap) entity.goap.currentActionName = "交流中";
        if (!entity.goap) return false;
        const targetId = entity.goap.blackboard.socialTargetId;
        if (!targetId) return true;

        if (entity.goap.blackboard.socialTimer === undefined) {
             entity.goap.blackboard.socialTimer = 0;
             const target = ecs.entities.find(e => e.id === targetId);
             if (entity.appearance && target && target.position && entity.position) {
                 entity.appearance.animation = 'attack';
                 const dx = target.position.x - entity.position.x;
                 const dy = target.position.y - entity.position.y;
                 if (Math.abs(dx) > Math.abs(dy)) entity.appearance.direction = dx > 0 ? 'right' : 'left';
                 else entity.appearance.direction = dy > 0 ? 'down' : 'up';
             }
        }
        entity.goap.blackboard.socialTimer += deltaTime;
        if (entity.goap.blackboard.socialTimer >= CHAT_DURATION) {
            entity.goap.blackboard.socialTimer = undefined;
            entity.goap.blackboard.socialTargetId = undefined;
            entity.goap.blackboard.socialRequestFrom = undefined;
            entity.goap.blackboard.socialAccepted = undefined;
             if (entity.attributes?.boredom) entity.attributes.boredom.current = 0;
            return true;
        }
        return false;
    }
};

export const MeditateAction: GoapAction = {
    name: 'Meditate',
    cost: 0,
    preconditions: (state) => state.atHome,
    effects: (state) => ({ }),
    execute: (entity, deltaTime) => {
        if (entity.goap) entity.goap.currentActionName = "冥想中";
        if (!entity.goap) return false;
        if (entity.goap.blackboard.meditateTimer === undefined) {
            entity.goap.blackboard.meditateTimer = 0;
            if (entity.appearance) entity.appearance.animation = 'idle';
        }
        entity.goap.blackboard.meditateTimer += deltaTime;
        if (entity.goap.blackboard.meditateTimer >= MEDITATE_DURATION) {
            entity.goap.blackboard.meditateTimer = undefined;
            if (Math.random() < 0.8 && entity.attributes?.corruption) {
                entity.attributes.corruption.current = Math.min(entity.attributes.corruption.max, entity.attributes.corruption.current + 1);
            }
            return true;
        }
        return false;
    }
};

const UpdateSensors = (entity: Entity) => {
    if (!entity.position || !entity.goap) return;
    const goap = entity.goap;
    if (goap.currentGoal === 'KillBoredom' && !goap.blackboard.socialTargetId) {
        const neighbor = ecs.entities.find(e => {
            if (e.id === entity.id || !e.goap || !e.position || !entity.position) return false;
            const dist = Math.hypot(e.position.x - entity.position.x, e.position.y - entity.position.y);
            return dist < 48;
        });
        if (neighbor) {
            if (neighbor.goap && !neighbor.goap.blackboard.socialRequestFrom && !neighbor.goap.blackboard.socialTargetId) {
                neighbor.goap.blackboard.socialRequestFrom = entity.id;
                goap.blackboard.socialTargetId = neighbor.id;
            }
        }
    }
};

export const GoapSystem = () => {
  useTick((ticker) => {
    const deltaMS = ticker.elapsedMS;

    for (const entity of ecs.entities) {
        if (!entity.goap) continue;
        const goap = entity.goap;

        // 1. Update Attributes
        if (entity.attributes?.boredom) {
             const boredomIncrease = (deltaMS / 1000) * 1;
             entity.attributes.boredom.current = Math.min(entity.attributes.boredom.max, entity.attributes.boredom.current + boredomIncrease);
        }
        // Satiety Decay
        if (entity.attributes?.satiety) {
             // Satiety decreases slowly. E.g. 1 per 2 seconds?
             const satietyDecrease = (deltaMS / 1000) * 0.5;
             entity.attributes.satiety.current = Math.max(0, entity.attributes.satiety.current - satietyDecrease);
        }

        const stamina = entity.attributes?.stamina?.current || 0;
        const maxStamina = entity.attributes?.stamina?.max || 10;
        const sanity = entity.attributes?.sanity?.current ?? 100;
        const boredom = entity.attributes?.boredom?.current || 0;
        const satiety = entity.attributes?.satiety?.current || 0;
        const hasFoodInInventory = entity.inventory?.some(i => i.item === 'food' && i.count > 0);

        // Social Handling (Passive)
        if (goap.blackboard.socialRequestFrom && !goap.currentGoal && entity.attributes?.boredom && entity.attributes.boredom.current > 30) {
            const requester = ecs.entities.find(e => e.id === goap.blackboard.socialRequestFrom);
            if (requester && requester.goap) {
                requester.goap.blackboard.socialAccepted = true;
                goap.blackboard.socialTargetId = requester.id;
                goap.currentGoal = 'KillBoredom';
            }
        }

        // Goal Selection
        // Priority:
        // 1. Recover Stamina (Survival)
        // 2. Eat (Survival) -> if satiety < 30
        // 3. Store Food (Duty) -> if has food
        // 4. Corrupted Behavior
        // 5. Kill Boredom
        // 6. Farm (Work)

        if (stamina <= 0 && goap.currentGoal !== 'RecoverStamina') {
             // Reset relevant blackboards for interrupted tasks
             if (goap.blackboard.targetFarmId) {
                 const t = ecs.entities.find(e => e.id === goap.blackboard.targetFarmId);
                 if (t && t.claimedBy === entity.id) t.claimedBy = undefined;
                 goap.blackboard.targetFarmId = undefined;
             }
             goap.currentGoal = 'RecoverStamina';
        }
        else if (stamina >= maxStamina && goap.currentGoal === 'RecoverStamina') {
            goap.currentGoal = undefined;
        }
        else if (!goap.currentGoal) {
            if (satiety < 30) {
                goap.currentGoal = 'Eat';
            } else if (hasFoodInInventory) {
                goap.currentGoal = 'StoreFood';
            } else if (sanity <= 0) {
                const rand = Math.random();
                if (rand < 0.3) goap.currentGoal = 'Pray';
                else if (rand < 0.5) goap.currentGoal = 'Meditate';
                else goap.currentGoal = 'Farm';
            } else if (boredom > 80) {
                 goap.currentGoal = 'KillBoredom';
            } else {
                goap.currentGoal = 'Farm';
            }
        }

        // 2. Planning
        if (goap.plan.length === 0 || goap.currentActionIndex >= goap.plan.length) {
            const currentState: GoapState = {
                stamina: stamina,
                sanity: sanity,
                boredom: boredom,
                satiety: satiety,
                atHome: false,
                atFarm: false,
                atQuietSpot: false,
                hasFarmTarget: !!goap.blackboard.targetFarmId,
                hasNeighbor: !!goap.blackboard.socialTargetId,
                isResting: false,
                farmCooldown: 0,
                atSmartObject: false,
                hasSmartObjectTarget: !!goap.blackboard.targetSmartObjectId,
                // New states
                hasHouseTarget: !!goap.blackboard.targetHouseId,
                atHouse: false,
                hasFood: !!hasFoodInInventory,
                houseHasFood: false // To be checked
            };

            // Sensor Updates
            if (entity.position) {
                 const home = goap.blackboard.homePosition || HOME_POSITION;
                 const dHome = Math.hypot(entity.position.x - home.x, entity.position.y - home.y);
                 currentState.atHome = dHome < 5;

                 if (goap.blackboard.targetHouseId) {
                     const h = ecs.entities.find(e => e.id === goap.blackboard.targetHouseId);
                     if (h && h.position) {
                         // Check close enough to door (y+16 logic matches navigateTo)
                         const dH = Math.hypot(entity.position.x - h.position.x, entity.position.y - (h.position.y + 16));
                         currentState.atHouse = dH < 5;

                         // Check food
                         if (h.storage && (h.storage['food'] || 0) > 0) {
                             currentState.houseHasFood = true;
                         }
                     } else {
                         goap.blackboard.targetHouseId = undefined;
                         currentState.hasHouseTarget = false;
                     }
                 }

                 if (goap.blackboard.targetSpot) {
                     const ts = goap.blackboard.targetSpot;
                     const dSpot = Math.hypot(entity.position.x - ts.x, entity.position.y - ts.y);
                     currentState.atQuietSpot = dSpot < 5;
                 }
                 if (goap.blackboard.targetFarmId) {
                     const target = ecs.entities.find(e => e.id === goap.blackboard.targetFarmId);
                     if (target && target.position && target.claimedBy === entity.id) {
                         const dFarm = Math.hypot(entity.position.x - target.position.x, entity.position.y - target.position.y);
                         currentState.atFarm = dFarm < 5;
                     } else {
                         goap.blackboard.targetFarmId = undefined;
                         currentState.hasFarmTarget = false;
                     }
                 }
                 if (goap.blackboard.targetSmartObjectId) {
                      // ... (Smart Object Distance Logic)
                      const target = ecs.entities.find(e => e.id === goap.blackboard.targetSmartObjectId);
                      const slotIndex = goap.blackboard.targetSlotIndex;
                      if (target && target.position && target.smartObject && slotIndex !== undefined && slotIndex > -1) {
                         const slot = target.smartObject.slots[slotIndex];
                         const targetX = target.position.x + slot.x;
                         const targetY = target.position.y + slot.y;
                         const dObj = Math.hypot(entity.position.x - targetX, entity.position.y - targetY);
                         currentState.atSmartObject = dObj < 4;
                      } else {
                         goap.blackboard.targetSmartObjectId = undefined;
                         currentState.hasSmartObjectTarget = false;
                      }
                 }
                 UpdateSensors(entity);
            }

            // Plan Construction
            goap.plan = [];

            if (goap.currentGoal === 'RecoverStamina') {
                if (!currentState.atHome) goap.plan.push(GoHomeAction);
                goap.plan.push(RestAction);
            } else if (goap.currentGoal === 'Eat') {
                if (!currentState.hasHouseTarget) goap.plan.push(FindHouseAction);
                goap.plan.push(GoToHouseAction);
                goap.plan.push(EatAction);
            } else if (goap.currentGoal === 'StoreFood') {
                if (!currentState.hasHouseTarget) goap.plan.push(FindHouseAction);
                goap.plan.push(GoToHouseAction);
                goap.plan.push(StoreFoodAction);
            } else if (goap.currentGoal === 'Farm') {
                if (!currentState.hasFarmTarget) goap.plan.push(FindFarmAction);
                goap.plan.push(GoToFarmAction);
                goap.plan.push(HarvestAction); // Replaced FarmAction with HarvestAction
            } else if (goap.currentGoal === 'KillBoredom') {
                 // ... (Keep existing logic)
                 const rand = Math.random();
                 if (rand < 0.5) {
                     if (!currentState.hasSmartObjectTarget) goap.plan.push(createFindSmartObjectAction("ENTERTAINMENT"));
                     goap.plan.push(GoToSmartObjectAction);
                     goap.plan.push(UseSmartObjectAction);
                 } else if (currentState.hasNeighbor) {
                     goap.plan.push(ChatWithOtherAction);
                 } else {
                     if (!currentState.atQuietSpot) goap.plan.push(GoToRandomSpotAction);
                     goap.plan.push(WanderAction);
                 }
            } else if (goap.currentGoal === 'Pray') {
                 const useSmartObject = Math.random() < 0.7;
                 if (useSmartObject) {
                     if (!currentState.hasSmartObjectTarget) goap.plan.push(createFindSmartObjectAction("WORSHIP"));
                     goap.plan.push(GoToSmartObjectAction);
                     goap.plan.push(UseSmartObjectAction);
                 } else {
                     if (!currentState.atQuietSpot) goap.plan.push(GoToRandomSpotAction);
                     goap.plan.push(PrayAction);
                 }
            } else if (goap.currentGoal === 'Meditate') {
                 if (!currentState.atHome) goap.plan.push(GoHomeAction);
                 goap.plan.push(MeditateAction);
            }

            goap.currentActionIndex = 0;
        }

        // 3. Execution
        const currentAction = goap.plan[goap.currentActionIndex];
        if (currentAction) {
             // Validation checks (Target lost etc)
             if ((currentAction.name === 'GoToFarm' || currentAction.name === 'Harvest') && goap.blackboard.targetFarmId) {
                  const t = ecs.entities.find(e => e.id === goap.blackboard.targetFarmId);
                  if (!t || t.claimedBy !== entity.id) {
                      goap.plan = [];
                      goap.blackboard.targetFarmId = undefined;
                      continue;
                  }
             }

             // Execute
             const completed = currentAction.execute(entity, deltaMS);
             if (completed) {
                 goap.currentActionIndex++;
                 if (goap.currentActionIndex >= goap.plan.length) {
                     goap.currentGoal = undefined;
                 }
             }
        }
    }
  });
  return null;
};

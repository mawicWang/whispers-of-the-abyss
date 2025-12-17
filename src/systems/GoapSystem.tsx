
import { useTick } from '@pixi/react';
import { ecs, type Entity } from '../entities';
import type { GoapAction, GoapState } from '../entities/GoapComponent';
import { findPath } from '../utils/Pathfinding';

const TILE_SIZE = 16;
const GRID_W = Math.floor(360 / TILE_SIZE);
const GRID_H = Math.floor(640 / TILE_SIZE);

const HOME_POSITION = { x: 10 * TILE_SIZE, y: 10 * TILE_SIZE }; // Example home
const REST_RECOVERY_RATE = 1; // 1 stamina per second
const REST_DURATION = 10000; // 10 seconds mandatory rest at door (as per prompt)
const PRAY_DURATION = 10000; // 10 seconds
const MEDITATE_DURATION = 30000; // 30 seconds (representing 30m)
const WANDER_DURATION = 5000; // 5 seconds
const CHAT_DURATION = 5000; // 5 seconds
const FARM_ANIMATION_DURATION = 800; // 8 frames * 100ms
const FARM_INTERVAL = 1000; // Total interval including animation and pause

// Helper to collect obstacles (could be optimized to run once per frame if performance is an issue)
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

    // Check if we are close enough to be considered "there"
    const dx = targetX - entity.position.x;
    const dy = targetY - entity.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 4) {
        // Arrived
        entity.path = []; // Clear path
        if (entity.move) delete entity.move;
        return true;
    }

    // If we are already moving along a path, let MoveSystem handle it
    if (entity.path && entity.path.length > 0) return false;
    // If we have a move target but no path, it might be the last step or a direct move.
    // However, if we are far away, we should pathfind.

    // If we don't have a path, find one
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
        // Path will be picked up by MoveSystem
        return false;
    } else {
        // No path found?
        // Fallback: if very close (adjacent), maybe direct move?
        // Or wait/fail.
        // For now, let's just fail silently (wait) to avoid teleporting through walls.
        return false;
    }
};

// --- Smart Object Actions ---

// Factory for FindSmartObjectAction
export const createFindSmartObjectAction = (interactionType: string): GoapAction => ({
    name: `FindSmartObject_${interactionType}`,
    cost: 10 + Math.random() * 10, // Dynamic float cost
    preconditions: (state) => !state.hasSmartObjectTarget,
    effects: (state) => ({ hasSmartObjectTarget: true }),
    execute: (entity, deltaTime) => {
        if (entity.goap) entity.goap.currentActionName = `Searching ${interactionType}`;

        // Find all valid candidates
        const candidates = ecs.entities.filter(e =>
            e.smartObject &&
            e.smartObject.interactionType === interactionType
        );

        let bestScore = -Infinity;
        let bestTarget: Entity | null = null;
        let bestSlotIndex = -1;

        for (const candidate of candidates) {
            if (!candidate.position || !candidate.smartObject) continue;

            // Check slots
            const slots = candidate.smartObject.slots;
            let availableSlotIndex = -1;

            // Find first available slot (or maybe random available?)
            // Just picking first one for now
            for (let i = 0; i < slots.length; i++) {
                if (slots[i].claimedBy === null) {
                    availableSlotIndex = i;
                    break;
                }
            }

            if (availableSlotIndex === -1) continue; // No slots

            // Scoring
            // Score = (EffectValue * Weight) - (Distance * CostFactor)
            // Assuming effect value is loosely correlated with boredom reduction or sanity effect
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
             // Claim it
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

        if (!targetId || slotIndex === undefined || slotIndex === -1) return false;


        // Validation
        if (!target || !target.position || !target.smartObject) {
             // Target lost
             if (entity.goap) {
                 entity.goap.blackboard.targetSmartObjectId = undefined;
                 entity.goap.blackboard.targetSlotIndex = -1;
             }
             return false;
        }

        // Validate claim
        if (target.smartObject.slots[slotIndex].claimedBy !== entity.id) {
             // Lost claim
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
    effects: (state) => ({ boredom: 0, sanity: 100 }), // Broad effects, actual applied in execute
    execute: (entity, deltaTime) => {
        if (!entity.goap) return false;

        const targetId = entity.goap.blackboard.targetSmartObjectId;
        const slotIndex = entity.goap.blackboard.targetSlotIndex;

        // Safety checks
        if (!targetId || slotIndex === undefined || slotIndex === -1) return true; // Abort
        const target = ecs.entities.find(e => e.id === targetId);
        if (!target || !target.smartObject || target.smartObject.slots[slotIndex].claimedBy !== entity.id) return true; // Abort

        const so = target.smartObject;

        // Init
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

        // Update
        entity.goap.blackboard.smartObjectTimer = (entity.goap.blackboard.smartObjectTimer || 0) + deltaTime;

        // Apply effects periodically (every second)
        // For simplicity, we apply proportional effect per tick or just at end?
        // Prompt says "Apply every second".
        const seconds = deltaTime / 1000;
        if (so.advertisedEffects.boredom && entity.attributes?.boredom) {
             entity.attributes.boredom.current = Math.max(0, entity.attributes.boredom.current + (so.advertisedEffects.boredom * seconds / (so.duration / 1000)));
        }
        if (so.advertisedEffects.sanity && entity.attributes?.sanity) {
             entity.attributes.sanity.current = Math.min(entity.attributes.sanity.max, Math.max(0, entity.attributes.sanity.current + (so.advertisedEffects.sanity * seconds / (so.duration / 1000))));
        }
        if (so.advertisedEffects.corruption && entity.attributes?.corruption) {
             entity.attributes.corruption.current = Math.min(entity.attributes.corruption.max, entity.attributes.corruption.current + (so.advertisedEffects.corruption * seconds / (so.duration / 1000)));
        }
         if (so.advertisedEffects.stamina && entity.attributes?.stamina) {
             entity.attributes.stamina.current = Math.min(entity.attributes.stamina.max, entity.attributes.stamina.current + (so.advertisedEffects.stamina * seconds / (so.duration / 1000)));
        }


        // Check finish
        if (entity.goap.blackboard.smartObjectTimer >= so.duration) {
            // Cleanup
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


// Actions
export const GoHomeAction: GoapAction = {
    name: 'GoHome',
    cost: 1,
    preconditions: (state) => true, // Can always try to go home
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
    effects: (state) => ({ stamina: 10 }), // Full stamina
    execute: (entity, deltaTime) => {
        if (entity.goap) entity.goap.currentActionName = "休息中";
        if (!entity.goap || !entity.attributes?.stamina) return false;

        // Init rest timer
        if (entity.goap.blackboard.restTimer === undefined) {
             entity.goap.blackboard.restTimer = 0;
             if (entity.appearance) entity.appearance.animation = 'idle';
        }

        entity.goap.blackboard.restTimer += deltaTime;

        // Recover stamina: 1 per second
        const recovery = (deltaTime / 1000) * REST_RECOVERY_RATE;
        entity.attributes.stamina.current = Math.min(
            entity.attributes.stamina.max,
            entity.attributes.stamina.current + recovery
        );

        // Condition: Full stamina
        if (entity.attributes.stamina.current >= entity.attributes.stamina.max) {
             entity.goap.blackboard.restTimer = undefined; // Reset
             return true;
        }

        return false;
    }
};

export const FindFarmAction: GoapAction = {
    name: 'FindFarm',
    cost: 1,
    preconditions: (state) => !state.hasFarmTarget,
    effects: (state) => ({ hasFarmTarget: true }),
    execute: (entity, deltaTime) => {
        if (entity.goap) entity.goap.currentActionName = "寻找农田";
        // Find closest unoccupied wheat field
        let closestField: Entity | null = null;
        let minDist = Infinity;

        // Get all wheat fields
        const fields = ecs.entities.filter(e => e.isWheat && e.position);

        for (const field of fields) {
             // Check reservation: Must be null OR claimed by me
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
                // CLAIM THE FIELD
                closestField.claimedBy = entity.id;
                entity.goap.blackboard.targetFarmId = closestField.id;
            }
            return true;
        }

        // No field found
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
        if (!entity.goap?.blackboard.targetFarmId) return false; // Fail/Abort (Do not return true, or it skips to Farm)

        const target = ecs.entities.find(e => e.id === entity.goap!.blackboard.targetFarmId);

        // Validation: Target exists AND is claimed by me
        if (!target || !target.position || target.claimedBy !== entity.id) {
            // Target lost or stolen (shouldn't happen with claimedBy, but safety first)
            if (target && target.claimedBy === entity.id) {
                target.claimedBy = undefined; // Release if we are aborting?
            }
            entity.goap!.blackboard.targetFarmId = undefined;
            return false;
        }

        return navigateTo(entity, target.position.x, target.position.y);
    }
};

export const FarmAction: GoapAction = {
    name: 'Farm',
    cost: 5,
    preconditions: (state) => state.atFarm && state.stamina > 0 && state.farmCooldown <= 0,
    effects: (state) => ({ stamina: state.stamina - 1 }),
    execute: (entity, deltaTime) => {
        if (entity.goap) entity.goap.currentActionName = "耕作中";
        if (!entity.goap || !entity.attributes?.stamina) return false;

        const targetId = entity.goap.blackboard.targetFarmId;
        const target = ecs.entities.find(e => e.id === targetId);
        const now = Date.now();

        // Validation
        if (!target || target.claimedBy !== entity.id) {
             // Lost target
             entity.goap.blackboard.farmStartTime = undefined;
             return true; // Abort action sequence
        }

        // State: Not started
        if (entity.goap.blackboard.farmStartTime === undefined) {
             entity.goap.blackboard.farmStartTime = now;
             if (entity.appearance && target.position && entity.position) {
                 entity.appearance.animation = 'attack';

                 // Face the target
                 const dx = target.position.x - entity.position.x;
                 const dy = target.position.y - entity.position.y;
                 if (Math.abs(dx) > Math.abs(dy)) {
                     entity.appearance.direction = dx > 0 ? 'right' : 'left';
                 } else {
                     entity.appearance.direction = dy > 0 ? 'down' : 'up';
                 }
             }
             return false; // Wait for animation
        }

        // State: In Progress
        const elapsed = now - entity.goap.blackboard.farmStartTime;
        if (elapsed < FARM_ANIMATION_DURATION) {
             // Ensure animation
             if (entity.appearance && entity.appearance.animation !== 'attack') {
                 entity.appearance.animation = 'attack';
             }
             return false;
        }

        // State: Complete (Animation done)
        entity.goap.blackboard.farmStartTime = undefined;
        entity.goap.blackboard.lastFarmTime = now;
        entity.attributes.stamina.current = Math.max(0, entity.attributes.stamina.current - 1);

        // Update target field stage
        if (target.growth) {
            target.growth.stage++;
            if (target.growth.stage > 4) target.growth.stage = 1;
             target.appearance!.sprite = `wheat_stage_${target.growth.stage}`;
        }

        // Set back to idle momentarily (though next action might override)
        if (entity.appearance) {
            entity.appearance.animation = 'idle';
        }

        return true;
    }
};

// --- New Actions for Corrupted State ---

export const GoToRandomSpotAction: GoapAction = {
    name: 'GoToRandomSpot',
    cost: 1,
    preconditions: (state) => true,
    effects: (state) => ({ atQuietSpot: true }),
    execute: (entity, deltaTime) => {
        if (entity.goap) entity.goap.currentActionName = "前往角落";
        if (!entity.goap) return false;

        // If no target spot, pick one
        if (!entity.goap.blackboard.targetSpot) {
            // Pick a random spot in the world
            // Avoid 0,0 top left
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
    effects: (state) => ({ }), // May increase corruption
    execute: (entity, deltaTime) => {
        if (entity.goap) entity.goap.currentActionName = "祈祷中";
        if (!entity.goap) return false;

        if (entity.goap.blackboard.prayTimer === undefined) {
            entity.goap.blackboard.prayTimer = 0;
            if (entity.appearance) entity.appearance.animation = 'idle'; // Or specific pray animation if available
        }

        entity.goap.blackboard.prayTimer += deltaTime;

        if (entity.goap.blackboard.prayTimer >= PRAY_DURATION) {
            // Finish
            entity.goap.blackboard.prayTimer = undefined;
            entity.goap.blackboard.targetSpot = undefined; // Clear spot for next time

            // Chance to increase corruption
            // Small chance (e.g. 30%)
            if (Math.random() < 0.3 && entity.attributes?.corruption) {
                entity.attributes.corruption.current = Math.min(
                    entity.attributes.corruption.max,
                    entity.attributes.corruption.current + 1
                );
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
                entity.attributes.boredom.current = Math.max(0, entity.attributes.boredom.current - 50); // Significant reduction
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
        if (!targetId) return true; // Abort if no target

        const target = ecs.entities.find(e => e.id === targetId);
        // Handshake check
        // We assume handshake logic happens in the System loop or before this action logic kicks in fully
        // But we need to verify here if we are "connected"

        // Wait for handshake if initiator
        // If we are initiator, we set 'socialRequestFrom' on target.
        // We wait for 'socialAccepted' on us.

        // If we are receiver, we set 'socialAccepted' on target (the initiator), and we run this action too.

        // Let's simplify:
        // If we are in this action, we assume the handshake succeeded or is in progress.
        // We just play animation and wait.

        if (entity.goap.blackboard.socialTimer === undefined) {
             entity.goap.blackboard.socialTimer = 0;
             if (entity.appearance && target && target.position && entity.position) {
                 entity.appearance.animation = 'attack'; // Use attack as 'talking' gesture as requested/implied
                 // Face target
                 const dx = target.position.x - entity.position.x;
                 const dy = target.position.y - entity.position.y;
                 if (Math.abs(dx) > Math.abs(dy)) entity.appearance.direction = dx > 0 ? 'right' : 'left';
                 else entity.appearance.direction = dy > 0 ? 'down' : 'up';
             }
        }

        entity.goap.blackboard.socialTimer += deltaTime;

        if (entity.goap.blackboard.socialTimer >= CHAT_DURATION) {
            entity.goap.blackboard.socialTimer = undefined;
            // Clean up
            entity.goap.blackboard.socialTargetId = undefined;
            entity.goap.blackboard.socialRequestFrom = undefined;
            entity.goap.blackboard.socialAccepted = undefined;

             if (entity.attributes?.boredom) {
                entity.attributes.boredom.current = 0; // Fully satisfy boredom
            }
            return true;
        }

        return false;
    }
};

export const MeditateAction: GoapAction = {
    name: 'Meditate',
    cost: 0,
    preconditions: (state) => state.atHome,
    effects: (state) => ({ }), // May increase corruption
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

            // Chance to increase corruption
            // High chance (e.g. 80%)
            if (Math.random() < 0.8 && entity.attributes?.corruption) {
                entity.attributes.corruption.current = Math.min(
                    entity.attributes.corruption.max,
                    entity.attributes.corruption.current + 1
                );
            }
            return true;
        }

        return false;
    }
};


// Sensor Helper
const UpdateSensors = (entity: Entity) => {
    if (!entity.position || !entity.goap) return;
    const goap = entity.goap;

    // Check for Neighbors if we are looking for social interaction
    if (goap.currentGoal === 'KillBoredom' && !goap.blackboard.socialTargetId) {
        const neighbor = ecs.entities.find(e => {
            if (e.id === entity.id || !e.goap || !e.position || !entity.position) return false;
            const dist = Math.hypot(e.position.x - entity.position.x, e.position.y - entity.position.y);
            return dist < 48;
        });

        if (neighbor) {
            if (neighbor.goap && !neighbor.goap.blackboard.socialRequestFrom && !neighbor.goap.blackboard.socialTargetId) {
                // Send request
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

        // 1. Update State & Boredom
        if (entity.attributes?.boredom) {
             // Increase boredom over time
             const boredomIncrease = (deltaMS / 1000) * 1; // 1 per second
             entity.attributes.boredom.current = Math.min(
                 entity.attributes.boredom.max,
                 entity.attributes.boredom.current + boredomIncrease
             );
        }

        const stamina = entity.attributes?.stamina?.current || 0;
        const maxStamina = entity.attributes?.stamina?.max || 10;
        const sanity = entity.attributes?.sanity?.current ?? 100;
        const boredom = entity.attributes?.boredom?.current || 0;

        // Check for social requests (Passive)
        if (goap.blackboard.socialRequestFrom && !goap.currentGoal && entity.attributes?.boredom && entity.attributes.boredom.current > 30) {
            // Accept invitation if we are bored enough and idle
            const requester = ecs.entities.find(e => e.id === goap.blackboard.socialRequestFrom);
            if (requester && requester.goap) {
                // Accept!
                requester.goap.blackboard.socialAccepted = true;
                goap.blackboard.socialTargetId = requester.id;
                goap.currentGoal = 'KillBoredom'; // Force social goal
                // We will plan for ChatWithOther next
            }
        }

        // Transition Logic
        if (stamina <= 0 && goap.currentGoal !== 'RecoverStamina') {
             // If we were farming, release claim
             if (goap.currentGoal === 'Farm' && goap.blackboard.targetFarmId) {
                 const t = ecs.entities.find(e => e.id === goap.blackboard.targetFarmId);
                 if (t && t.claimedBy === entity.id) {
                     t.claimedBy = undefined;
                 }
                 goap.blackboard.targetFarmId = undefined;
             }
             // Interruption handling for Smart Objects
             if (goap.blackboard.targetSmartObjectId) {
                const t = ecs.entities.find(e => e.id === goap.blackboard.targetSmartObjectId);
                if (t && t.smartObject && goap.blackboard.targetSlotIndex !== undefined && goap.blackboard.targetSlotIndex > -1) {
                    t.smartObject.slots[goap.blackboard.targetSlotIndex].claimedBy = null;
                }
                goap.blackboard.targetSmartObjectId = undefined;
                goap.blackboard.targetSlotIndex = -1;
                goap.blackboard.usingSmartObject = false;
             }

            goap.currentGoal = 'RecoverStamina';
        }
        else if (stamina >= maxStamina && goap.currentGoal === 'RecoverStamina') {
            goap.currentGoal = undefined; // Needs new goal
        }
        else if (!goap.currentGoal) {
            // Goal Selection priority
            if (sanity <= 0) {
                // Corrupted Behavior
                const rand = Math.random();
                if (rand < 0.3) {
                    goap.currentGoal = 'Pray';
                } else if (rand < 0.5) { // 30-50%
                    goap.currentGoal = 'Meditate';
                } else {
                    goap.currentGoal = 'Farm';
                }
            } else if (boredom > 80) { // High boredom
                 goap.currentGoal = 'KillBoredom';
            } else {
                goap.currentGoal = 'Farm';
            }
        }

        // 2. Planning
        if (goap.plan.length === 0 || goap.currentActionIndex >= goap.plan.length) {
            // Re-plan
            const currentState: GoapState = {
                stamina: stamina,
                sanity: sanity,
                boredom: boredom,
                atHome: false,
                atFarm: false,
                atQuietSpot: false,
                hasFarmTarget: !!goap.blackboard.targetFarmId,
                hasNeighbor: !!goap.blackboard.socialTargetId, // We assume if we have a target ID we have found/accepted them
                isResting: false,
                farmCooldown: 0,
                // Smart Object States
                atSmartObject: false,
                hasSmartObjectTarget: !!goap.blackboard.targetSmartObjectId
            };

            // State Sensing
            if (entity.position) {
                 const home = goap.blackboard.homePosition || HOME_POSITION;
                 const dHome = Math.hypot(entity.position.x - home.x, entity.position.y - home.y);
                 currentState.atHome = dHome < 5;

                 if (goap.blackboard.targetSpot) {
                     const ts = goap.blackboard.targetSpot;
                     const dSpot = Math.hypot(entity.position.x - ts.x, entity.position.y - ts.y);
                     currentState.atQuietSpot = dSpot < 5;
                 }

                 if (goap.blackboard.targetFarmId) {
                     const target = ecs.entities.find(e => e.id === goap.blackboard.targetFarmId);
                     // Check if valid AND claimed by us
                     if (target && target.position && target.claimedBy === entity.id) {
                         const dFarm = Math.hypot(entity.position.x - target.position.x, entity.position.y - target.position.y);
                         currentState.atFarm = dFarm < 5;
                     } else {
                         // Lost claim or target
                         goap.blackboard.targetFarmId = undefined;
                         currentState.hasFarmTarget = false;
                     }
                 }

                 if (goap.blackboard.targetSmartObjectId) {
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


                 // Update Sensors
                 if (entity.position) {
                     UpdateSensors(entity);
                 }

                 // Check if accepted
                 if (goap.blackboard.socialTargetId) {
                     const target = ecs.entities.find(e => e.id === goap.blackboard.socialTargetId);

                     // Condition 1: We are Initiator, and Target accepted us (set our flag)
                     const initiatorAccepted = !!goap.blackboard.socialAccepted;

                     // Condition 2: We are Acceptor, and Target (Initiator) is targeting us
                     const acceptorConnected = target && target.goap && target.goap.blackboard.socialTargetId === entity.id;

                     if (initiatorAccepted || acceptorConnected) {
                         currentState.hasNeighbor = true;
                     } else if (target && target.goap && target.goap.blackboard.socialRequestFrom === entity.id) {
                         // Still waiting (Initiator side)...
                         currentState.hasNeighbor = false;
                     } else {
                         // Rejected, lost, or timed out
                         goap.blackboard.socialTargetId = undefined;
                         currentState.hasNeighbor = false;
                     }
                 }
            }

            // Plan Generation
            if (goap.currentGoal === 'RecoverStamina') {
                goap.plan = [];
                if (!currentState.atHome) {
                    goap.plan.push(GoHomeAction);
                }
                goap.plan.push(RestAction);
            } else if (goap.currentGoal === 'Farm') {
                goap.plan = [];
                if (!currentState.hasFarmTarget) {
                    goap.plan.push(FindFarmAction);
                }
                goap.plan.push(GoToFarmAction);
                goap.plan.push(FarmAction);
            } else if (goap.currentGoal === 'Pray') {
                // Try Smart Object "WORSHIP"
                goap.plan = [];
                // Simple probabilistic choice or check availability?
                // For now, let's try to find worship object first.
                // But FindAction has cost.

                // Let's assume we try smart object if we are not already doing the legacy one?
                // Actually the system will just re-plan if the list is empty.
                // We can add the FindSmartObjectAction to the list. If it fails (returns false), we might need fallback.
                // But GOAP usually plans ahead. Here we execute imperatively.
                // The current implementation is simpler: we just push a sequence.
                // If the first action fails, we are stuck or we need a way to branch.
                // Current system re-plans every time plan is empty or index exceeds.
                // If FindSmartObject fails, it returns false (incomplete).

                // ISSUE: If FindSmartObject returns false (no object found), the agent will keep trying it every frame.
                // We need a fallback mechanism.
                // Since this is a simple impl, let's say:
                // We pick between Plan A (Smart Object) and Plan B (Legacy) randomly at the start of planning?

                const useSmartObject = Math.random() < 0.7; // Prefer smart object
                if (useSmartObject) {
                     if (!currentState.hasSmartObjectTarget) {
                         goap.plan.push(createFindSmartObjectAction("WORSHIP"));
                     }
                     goap.plan.push(GoToSmartObjectAction);
                     goap.plan.push(UseSmartObjectAction);
                } else {
                     if (!currentState.atQuietSpot) {
                        goap.plan.push(GoToRandomSpotAction);
                    }
                    goap.plan.push(PrayAction);
                }

            } else if (goap.currentGoal === 'Meditate') {
                 goap.plan = [];
                 if (!currentState.atHome) {
                     goap.plan.push(GoHomeAction);
                 }
                 goap.plan.push(MeditateAction);
            } else if (goap.currentGoal === 'KillBoredom') {
                goap.plan = [];

                // Plan A: Smart Object "ENTERTAINMENT"
                // Plan B: Social
                // Plan C: Wander

                const rand = Math.random();
                if (rand < 0.5) { // 50% chance to try entertainment
                     if (!currentState.hasSmartObjectTarget) {
                         goap.plan.push(createFindSmartObjectAction("ENTERTAINMENT"));
                     }
                     goap.plan.push(GoToSmartObjectAction);
                     goap.plan.push(UseSmartObjectAction);
                } else if (currentState.hasNeighbor) {
                    goap.plan.push(ChatWithOtherAction);
                } else {
                     if (!currentState.atQuietSpot) {
                        goap.plan.push(GoToRandomSpotAction);
                     }
                     goap.plan.push(WanderAction);
                }
            }

            goap.currentActionIndex = 0;
        }

        // 3. Execution
        const currentAction = goap.plan[goap.currentActionIndex];
        if (currentAction) {
            // Safety: Ensure we still own the target if we are acting on it
            if ((currentAction.name === 'GoToFarm' || currentAction.name === 'Farm') && goap.blackboard.targetFarmId) {
                 const t = ecs.entities.find(e => e.id === goap.blackboard.targetFarmId);
                 if (!t || t.claimedBy !== entity.id) {
                     // Abort plan
                     goap.plan = [];
                     goap.currentActionIndex = 0;
                     goap.blackboard.targetFarmId = undefined;
                     continue;
                 }
            }
             // Safety for Smart Object
             if ((currentAction.name === 'GoToSmartObject' || currentAction.name === 'UseSmartObject') && goap.blackboard.targetSmartObjectId) {
                 const t = ecs.entities.find(e => e.id === goap.blackboard.targetSmartObjectId);
                 const slotIndex = goap.blackboard.targetSlotIndex;
                 if (!t || !t.smartObject || slotIndex === undefined || t.smartObject.slots[slotIndex].claimedBy !== entity.id) {
                     // Abort
                     goap.plan = [];
                     goap.currentActionIndex = 0;
                     goap.blackboard.targetSmartObjectId = undefined;
                     goap.blackboard.targetSlotIndex = -1;
                     goap.blackboard.usingSmartObject = false;
                     continue;
                 }
             }

            const completed = currentAction.execute(entity, deltaMS);
            if (completed) {
                goap.currentActionIndex++;
                // If plan finished, clear currentGoal to allow re-selection
                if (goap.currentActionIndex >= goap.plan.length) {
                    goap.currentGoal = undefined;
                }
            }
        }
    }
  });

  return null;
};

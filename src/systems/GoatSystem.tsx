
import { useTick } from '@pixi/react';
import { ecs, type Entity } from '../entities';
import type { GoatAction, GoatState } from '../entities/GoatComponent';
import { findPath } from '../utils/Pathfinding';

const TILE_SIZE = 16;
const GRID_W = Math.floor(360 / TILE_SIZE);
const GRID_H = Math.floor(640 / TILE_SIZE);

const HOME_POSITION = { x: 10 * TILE_SIZE, y: 10 * TILE_SIZE }; // Example home
const REST_RECOVERY_RATE = 1; // 1 stamina per second
const REST_DURATION = 10000; // 10 seconds mandatory rest at door (as per prompt)
const FARM_INTERVAL = 500; // 0.5s

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


// Actions
export const GoHomeAction: GoatAction = {
    name: 'GoHome',
    cost: 1,
    preconditions: (state) => true, // Can always try to go home
    effects: (state) => ({ atHome: true }),
    execute: (entity, deltaTime) => {
        const home = entity.goat?.blackboard.homePosition || HOME_POSITION;
        return navigateTo(entity, home.x, home.y);
    }
};

export const RestAction: GoatAction = {
    name: 'Rest',
    cost: 1,
    preconditions: (state) => state.atHome,
    effects: (state) => ({ stamina: 10 }), // Full stamina
    execute: (entity, deltaTime) => {
        if (!entity.goat || !entity.attributes?.stamina) return false;

        // Init rest timer
        if (entity.goat.blackboard.restTimer === undefined) {
             entity.goat.blackboard.restTimer = 0;
             if (entity.appearance) entity.appearance.animation = 'idle';
        }

        entity.goat.blackboard.restTimer += deltaTime;

        // Recover stamina: 1 per second
        const recovery = (deltaTime / 1000) * REST_RECOVERY_RATE;
        entity.attributes.stamina.current = Math.min(
            entity.attributes.stamina.max,
            entity.attributes.stamina.current + recovery
        );

        // Condition: Full stamina
        if (entity.attributes.stamina.current >= entity.attributes.stamina.max) {
             entity.goat.blackboard.restTimer = undefined; // Reset
             return true;
        }

        return false;
    }
};

export const FindFarmAction: GoatAction = {
    name: 'FindFarm',
    cost: 1,
    preconditions: (state) => !state.hasFarmTarget,
    effects: (state) => ({ hasFarmTarget: true }),
    execute: (entity, deltaTime) => {
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
            if (entity.goat) {
                // CLAIM THE FIELD
                closestField.claimedBy = entity.id;
                entity.goat.blackboard.targetFarmId = closestField.id;
            }
            return true;
        }

        // No field found
        return false;
    }
};

export const GoToFarmAction: GoatAction = {
    name: 'GoToFarm',
    cost: 2,
    preconditions: (state) => state.hasFarmTarget,
    effects: (state) => ({ atFarm: true }),
    execute: (entity, deltaTime) => {
        if (!entity.goat?.blackboard.targetFarmId) return false; // Fail/Abort (Do not return true, or it skips to Farm)

        const target = ecs.entities.find(e => e.id === entity.goat!.blackboard.targetFarmId);

        // Validation: Target exists AND is claimed by me
        if (!target || !target.position || target.claimedBy !== entity.id) {
            // Target lost or stolen (shouldn't happen with claimedBy, but safety first)
            if (target && target.claimedBy === entity.id) {
                target.claimedBy = undefined; // Release if we are aborting?
            }
            entity.goat!.blackboard.targetFarmId = undefined;
            return false;
        }

        return navigateTo(entity, target.position.x, target.position.y);
    }
};

export const FarmAction: GoatAction = {
    name: 'Farm',
    cost: 5,
    preconditions: (state) => state.atFarm && state.stamina > 0 && state.farmCooldown <= 0,
    effects: (state) => ({ stamina: state.stamina - 1 }),
    execute: (entity, deltaTime) => {
        if (!entity.goat || !entity.attributes?.stamina) return false;

        const targetId = entity.goat.blackboard.targetFarmId;
        const target = ecs.entities.find(e => e.id === targetId);

        // Validation
        if (!target || target.claimedBy !== entity.id) {
             // Lost target
             return true; // Abort action sequence
        }

        // Wait for cooldown
        const now = Date.now();
        const lastFarm = entity.goat.blackboard.lastFarmTime || 0;
        if (now - lastFarm < FARM_INTERVAL) {
            if (entity.appearance) entity.appearance.animation = 'idle';
            return false;
        }

        // Perform action
        entity.goat.blackboard.lastFarmTime = now;
        entity.attributes.stamina.current = Math.max(0, entity.attributes.stamina.current - 1);

        // Update target field stage
        if (target.growth) {
            target.growth.stage++;
            if (target.growth.stage > 4) target.growth.stage = 1;
             target.appearance!.sprite = `wheat_stage_${target.growth.stage}`;
        }

        // Animation
        if (entity.appearance) {
            entity.appearance.animation = 'attack';
        }

        return true;
    }
};

export const GoatSystem = () => {
  useTick((ticker) => {
    const deltaMS = ticker.elapsedMS;

    for (const entity of ecs.entities) {
        if (!entity.goat) continue;

        const goat = entity.goat;

        // 1. Check Goal
        const stamina = entity.attributes?.stamina?.current || 0;
        const maxStamina = entity.attributes?.stamina?.max || 10;

        // Transition Logic
        if (stamina <= 0) {
             // If we were farming, release claim
             if (goat.currentGoal === 'Farm' && goat.blackboard.targetFarmId) {
                 const t = ecs.entities.find(e => e.id === goat.blackboard.targetFarmId);
                 if (t && t.claimedBy === entity.id) {
                     t.claimedBy = undefined;
                 }
                 goat.blackboard.targetFarmId = undefined;
             }
            goat.currentGoal = 'RecoverStamina';
        } else if (stamina >= maxStamina && goat.currentGoal === 'RecoverStamina') {
            goat.currentGoal = 'Farm';
        } else if (!goat.currentGoal) {
            goat.currentGoal = 'Farm';
        }

        // 2. Planning
        if (goat.plan.length === 0 || goat.currentActionIndex >= goat.plan.length) {
            // Re-plan
            const currentState: GoatState = {
                stamina: stamina,
                atHome: false,
                atFarm: false,
                hasFarmTarget: !!goat.blackboard.targetFarmId,
                isResting: false,
                farmCooldown: 0
            };

            // State Sensing
            if (entity.position) {
                 const home = goat.blackboard.homePosition || HOME_POSITION;
                 const dHome = Math.hypot(entity.position.x - home.x, entity.position.y - home.y);
                 currentState.atHome = dHome < 5;

                 if (goat.blackboard.targetFarmId) {
                     const target = ecs.entities.find(e => e.id === goat.blackboard.targetFarmId);
                     // Check if valid AND claimed by us
                     if (target && target.position && target.claimedBy === entity.id) {
                         const dFarm = Math.hypot(entity.position.x - target.position.x, entity.position.y - target.position.y);
                         currentState.atFarm = dFarm < 5;
                     } else {
                         // Lost claim or target
                         goat.blackboard.targetFarmId = undefined;
                         currentState.hasFarmTarget = false;
                     }
                 }
            }

            // Plan Generation
            if (goat.currentGoal === 'RecoverStamina') {
                goat.plan = [];
                if (!currentState.atHome) {
                    goat.plan.push(GoHomeAction);
                }
                goat.plan.push(RestAction);
            } else if (goat.currentGoal === 'Farm') {
                goat.plan = [];
                if (!currentState.hasFarmTarget) {
                    goat.plan.push(FindFarmAction);
                }
                goat.plan.push(GoToFarmAction);
                goat.plan.push(FarmAction);
            }

            goat.currentActionIndex = 0;
        }

        // 3. Execution
        const currentAction = goat.plan[goat.currentActionIndex];
        if (currentAction) {
            // Safety: Ensure we still own the target if we are acting on it
            if ((currentAction.name === 'GoToFarm' || currentAction.name === 'Farm') && goat.blackboard.targetFarmId) {
                 const t = ecs.entities.find(e => e.id === goat.blackboard.targetFarmId);
                 if (!t || t.claimedBy !== entity.id) {
                     // Abort plan
                     goat.plan = [];
                     goat.currentActionIndex = 0;
                     goat.blackboard.targetFarmId = undefined;
                     continue;
                 }
            }

            const completed = currentAction.execute(entity, deltaMS);
            if (completed) {
                goat.currentActionIndex++;
            }
        }
    }
  });

  return null;
};

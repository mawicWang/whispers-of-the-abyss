
import { useTick } from '@pixi/react';
import { ecs, type Entity } from '../entities';
import type { GoatAction, GoatState } from '../entities/GoatComponent';

const TILE_SIZE = 16;
const HOME_POSITION = { x: 10 * TILE_SIZE, y: 10 * TILE_SIZE }; // Example home
const REST_RECOVERY_RATE = 1; // 1 stamina per second
const REST_DURATION = 10000; // 10 seconds mandatory rest at door (as per prompt)
const FARM_INTERVAL = 500; // 0.5s

// Actions
const GoHomeAction: GoatAction = {
    name: 'GoHome',
    cost: 1,
    preconditions: (state) => true, // Can always try to go home
    effects: (state) => ({ atHome: true }),
    execute: (entity, deltaTime) => {
        const home = entity.goat?.blackboard.homePosition || HOME_POSITION;
        // Simple move logic - this should ideally integrate with pathfinding
        // For now, let's use direct movement
        if (!entity.position) return false;

        const dx = home.x - entity.position.x;
        const dy = home.y - entity.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 5) {
            entity.position.x = home.x;
            entity.position.y = home.y;
            return true;
        }

        // Set move target for MoveSystem if available, or move directly
        if (entity.move) {
            entity.move.targetX = home.x;
            entity.move.targetY = home.y;
        } else {
             // Fallback direct move if no MoveSystem
            const speed = (entity.speed || 1) * deltaTime * 0.06; // adjust for delta
            const moveX = (dx / dist) * speed;
            const moveY = (dy / dist) * speed;
            entity.position.x += moveX;
            entity.position.y += moveY;
        }

        // Face direction
        if (entity.appearance) {
            if (Math.abs(dx) > Math.abs(dy)) {
                entity.appearance.direction = dx > 0 ? 'right' : 'left';
            } else {
                entity.appearance.direction = dy > 0 ? 'down' : 'up';
            }
            entity.appearance.animation = 'walk';
        }

        return false;
    }
};

const RestAction: GoatAction = {
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
        // We can accumulate and add integer amounts or just add fractional
        // Prompt says "Every second recovers 1 point"
        // Let's do it continuously
        const recovery = (deltaTime / 1000) * REST_RECOVERY_RATE;
        entity.attributes.stamina.current = Math.min(
            entity.attributes.stamina.max,
            entity.attributes.stamina.current + recovery
        );

        // Completion condition: Full stamina AND maybe strict 10s wait?
        // Prompt: "Rest, then pathfind home then rest at door for 10s"
        // Also "Stamina full -> can work". 10s is exactly time to fill 0->10.
        // Let's use stamina full as the condition.
        if (entity.attributes.stamina.current >= entity.attributes.stamina.max) {
             entity.goat.blackboard.restTimer = undefined; // Reset
             return true;
        }

        return false;
    }
};

const FindFarmAction: GoatAction = {
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

        // Simple check for "unoccupied"
        // We need to check if any OTHER entity has this field as target
        const occupiedFieldIds = new Set<string>();
        ecs.entities.forEach(e => {
            if (e !== entity && e.goat?.blackboard.targetFarmId) {
                occupiedFieldIds.add(e.goat.blackboard.targetFarmId);
            }
        });

        for (const field of fields) {
             if (occupiedFieldIds.has(field.id!)) continue; // Skip occupied

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
                entity.goat.blackboard.targetFarmId = closestField.id;
            }
            return true;
        }

        // No field found, keep searching (return false implies action continues, maybe fail?)
        // If we can't find a field, maybe we should just idle or wait.
        // For now, let's return false to retry next frame.
        return false;
    }
};

const GoToFarmAction: GoatAction = {
    name: 'GoToFarm',
    cost: 2, // Prefer nearby?
    preconditions: (state) => state.hasFarmTarget,
    effects: (state) => ({ atFarm: true }),
    execute: (entity, deltaTime) => {
        if (!entity.goat?.blackboard.targetFarmId) return true; // Should ideally fail plan if target lost

        const target = ecs.entities.find(e => e.id === entity.goat!.blackboard.targetFarmId);
        if (!target || !target.position) {
            // Target lost
            entity.goat!.blackboard.targetFarmId = undefined;
            return false; // Fail action
        }

        if (!entity.position) return false;

        const dx = target.position.x - entity.position.x;
        const dy = target.position.y - entity.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 5) {
             entity.position.x = target.position.x;
             entity.position.y = target.position.y;
             return true;
        }

        if (entity.move) {
            entity.move.targetX = target.position.x;
            entity.move.targetY = target.position.y;
        } else {
             // Fallback
            const speed = (entity.speed || 1) * deltaTime * 0.06;
            const moveX = (dx / dist) * speed;
            const moveY = (dy / dist) * speed;
            entity.position.x += moveX;
            entity.position.y += moveY;
        }

        if (entity.appearance) {
             if (Math.abs(dx) > Math.abs(dy)) {
                entity.appearance.direction = dx > 0 ? 'right' : 'left';
            } else {
                entity.appearance.direction = dy > 0 ? 'down' : 'up';
            }
            entity.appearance.animation = 'walk';
        }

        return false;
    }
};

const FarmAction: GoatAction = {
    name: 'Farm',
    cost: 5,
    preconditions: (state) => state.atFarm && state.stamina > 0 && state.farmCooldown <= 0,
    effects: (state) => ({ stamina: state.stamina - 1 }),
    execute: (entity, deltaTime) => {
        if (!entity.goat || !entity.attributes?.stamina) return false;

        const targetId = entity.goat.blackboard.targetFarmId;
        const target = ecs.entities.find(e => e.id === targetId);

        if (!target) {
             return true; // Target gone, action done (sort of)
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
            if (target.growth.stage > 12) target.growth.stage = 1;
            // Update appearance
            // target.appearance!.sprite = `wheat_stage_${target.growth.stage}`;
            // Assuming wheat field logic handles appearance based on stage, or we update it here
            // The prompt says "stage 1234-12 loop". Wait "1234-12". Maybe 1,2,3,4 then 1,2,3,4?
            // "阶段1234-12循环" -> "Stages 1,2,3,4 - 1,2 loop". Or "1 to 12".
            // "1234-12循环" is ambiguous. "1,2,3,4 -> 1,2..." or "1..12".
            // Common implementation is 1->2->3->4->1...
            // But "1234-12" might mean 1,2,3,4,1,2,3,4...
            // I'll assume 1-4 loop.
            if (target.growth.stage > 4) target.growth.stage = 1;
             target.appearance!.sprite = `wheat_stage_${target.growth.stage}`;
        }

        // Animation
        if (entity.appearance) {
            entity.appearance.animation = 'attack';
            // Direction is already set by approach
        }

        // Action complete (one swing)
        // Since we return true, the plan advances. But if we want to loop farming,
        // the planner needs to re-plan or we have a "FarmUntilDone" action.
        // Prompt: "Every swing...". "Think next action... choose Rest or Farm".
        // If we choose Farm, we farm once? Or we farm until tired?
        // "Think next action... select Rest or Farm. If Farm... check time... then do action."
        // This implies one action cycle.
        return true;
    }
};

const ALL_ACTIONS = [GoHomeAction, RestAction, FindFarmAction, GoToFarmAction, FarmAction];

export const GoatSystem = () => {
  useTick((ticker) => {
    // Ticker provides deltaTime in MS if configured, or frame count.
    // Pixi 8 Ticker gives deltaTime (scalar relative to target FPS) and elapsedMS.
    // Let's safe check.
    const deltaMS = ticker.elapsedMS;

    for (const entity of ecs.entities) {
        if (!entity.goat) continue;

        const goat = entity.goat;

        // 1. Check Goal
        // Logic: if stamina == 0 -> Goal = RecoverStamina.
        // If stamina full -> Goal = Farm.
        // If mid stamina -> keep current goal?
        const stamina = entity.attributes?.stamina?.current || 0;
        const maxStamina = entity.attributes?.stamina?.max || 10;

        if (stamina <= 0) {
            goat.currentGoal = 'RecoverStamina';
        } else if (stamina >= maxStamina && goat.currentGoal === 'RecoverStamina') {
            goat.currentGoal = 'Farm';
        } else if (!goat.currentGoal) {
            goat.currentGoal = 'Farm'; // Default
        }

        // 2. Planning
        // If no plan or current plan invalid/finished, make new plan.
        // Simple planner:
        // Identify desired state based on Goal.
        // Backtrack from desired state using Actions.

        if (goat.plan.length === 0 || goat.currentActionIndex >= goat.plan.length) {
            // Re-plan
            const currentState: GoatState = {
                stamina: stamina,
                atHome: false, // Calculate real state
                atFarm: false,
                hasFarmTarget: !!goat.blackboard.targetFarmId,
                isResting: false,
                farmCooldown: 0
            };

            // Refine current state checks
            if (entity.position) {
                 const home = goat.blackboard.homePosition || HOME_POSITION;
                 const dHome = Math.hypot(entity.position.x - home.x, entity.position.y - home.y);
                 currentState.atHome = dHome < 10;

                 if (goat.blackboard.targetFarmId) {
                     const target = ecs.entities.find(e => e.id === goat.blackboard.targetFarmId);
                     if (target && target.position) {
                         const dFarm = Math.hypot(entity.position.x - target.position.x, entity.position.y - target.position.y);
                         currentState.atFarm = dFarm < 10;
                     } else {
                         goat.blackboard.targetFarmId = undefined;
                         currentState.hasFarmTarget = false;
                     }
                 }
            }

            // Desired state
            // Goal: RecoverStamina -> Effects include { stamina: 10 } (provided by Rest)
            // Goal: Farm -> Effects include { stamina: stamina - 1 } (provided by Farm)

            // Manual hardcoded plans for simplicity given the small scope
            if (goat.currentGoal === 'RecoverStamina') {
                // Plan: GoHome -> Rest
                goat.plan = [];
                if (!currentState.atHome) {
                    goat.plan.push(GoHomeAction);
                }
                goat.plan.push(RestAction);
            } else if (goat.currentGoal === 'Farm') {
                // Plan: FindFarm -> GoToFarm -> Farm
                goat.plan = [];
                if (!currentState.hasFarmTarget) {
                    goat.plan.push(FindFarmAction);
                }
                if (!currentState.atFarm) {
                    goat.plan.push(GoToFarmAction);
                }
                goat.plan.push(FarmAction);
            }

            goat.currentActionIndex = 0;
        }

        // 3. Execution
        const currentAction = goat.plan[goat.currentActionIndex];
        if (currentAction) {
            const completed = currentAction.execute(entity, deltaMS);
            if (completed) {
                goat.currentActionIndex++;
            }
        }
    }
  });

  return null;
};

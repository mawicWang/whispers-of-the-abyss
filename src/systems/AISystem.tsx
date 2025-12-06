
import { useTick } from '@pixi/react';
import { ecs } from '../entities';

// Simple AI logic constants
const SUSPICION_DURATION = 2000; // ms
const FLEE_DURATION = 5000; // ms

// Helper to get time
const now = () => Date.now();

export const AISystem = () => {
  useTick(() => {
    // Iterate over all entities with aiState
    for (const entity of ecs.entities) {
        if (!entity.aiState) continue;

        // Ensure we track when state changes happened (simplified)
        // In a real ECS, we might attach a 'Timer' component.
        // Here, we will hack it by adding a property to the entity at runtime if needed,
        // or just store it in a local map if we wanted to be pure, but modifying entity is easier.
        // We will assume 'stateEnterTime' exists on entity if we add it to the type,
        // or we just cast it.

        if (!entity.stateEnterTime) entity.stateEnterTime = now();

        const timeInState = now() - entity.stateEnterTime;

        // State Machine Logic
        switch (entity.aiState) {
            case 'IDLE':
                // Do nothing, wait for event (handled in event handlers)
                // Random movement could go here
                 if (Math.random() < 0.01) {
                    // Wander a bit
                    // entity.velocity = { x: Math.random() - 0.5, y: Math.random() - 0.5 };
                 }
                break;

            case 'SUSPICIOUS':
                if (timeInState > SUSPICION_DURATION) {
                    console.log(`Entity ${entity.name} returning to IDLE from SUSPICIOUS`);
                    entity.aiState = 'IDLE';
                    entity.stateEnterTime = now();
                    // Reset texture or color if we changed it
                }
                break;

            case 'FLEE':
                 if (timeInState > FLEE_DURATION) {
                    console.log(`Entity ${entity.name} returning to IDLE from FLEE`);
                    entity.aiState = 'IDLE';
                    entity.stateEnterTime = now();
                } else {
                    // Run away logic
                    // For now just random jitter
                     if (entity.position) {
                         entity.position.x += (Math.random() - 0.5) * 2;
                         entity.position.y += (Math.random() - 0.5) * 2;
                     }
                }
                break;
        }
    }
  });

  return null;
};

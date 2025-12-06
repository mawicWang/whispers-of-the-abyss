
import { useTick } from '@pixi/react';
import { ecs } from '../entities';

// Simple AI logic constants
const SUSPICION_DURATION = 2000; // ms
const FLEE_DURATION = 5000; // ms
const MOVE_INTERVAL = 1000; // ms
const MOVE_SPEED = 2;

// Helper to get time
const now = () => Date.now();

export const AISystem = () => {
  useTick((delta) => {
    // Iterate over all entities with aiState
    for (const entity of ecs.entities) {
        if (!entity.aiState) continue;

        if (!entity.stateEnterTime) entity.stateEnterTime = now();
        if (!entity.lastMoveTime) entity.lastMoveTime = now();

        const timeInState = now() - entity.stateEnterTime;
        const timeSinceMove = now() - entity.lastMoveTime;

        // State Machine Logic
        switch (entity.aiState) {
            case 'IDLE':
                // Random movement every interval
                if (timeSinceMove > MOVE_INTERVAL) {
                    const directions = [
                        { x: 0, y: -1 }, // Up
                        { x: 0, y: 1 },  // Down
                        { x: -1, y: 0 }, // Left
                        { x: 1, y: 0 }   // Right
                    ];
                    const randomDir = directions[Math.floor(Math.random() * directions.length)];

                    // Update position directly for now
                    if (entity.position) {
                         entity.position.x += randomDir.x * 32; // Move one tile size roughly
                         entity.position.y += randomDir.y * 32;
                    }
                    entity.lastMoveTime = now();

                    // Simple boundary check (assuming 360x640)
                     if (entity.position) {
                        entity.position.x = Math.max(0, Math.min(360, entity.position.x));
                        entity.position.y = Math.max(0, Math.min(640, entity.position.y));
                     }
                }
                break;

            case 'SUSPICIOUS':
                if (timeInState > SUSPICION_DURATION) {
                    console.log(`Entity ${entity.name} returning to IDLE from SUSPICIOUS`);
                    entity.aiState = 'IDLE';
                    entity.stateEnterTime = now();
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
                         entity.position.x += (Math.random() - 0.5) * 5;
                         entity.position.y += (Math.random() - 0.5) * 5;
                     }
                }
                break;
        }
    }
  });

  return null;
};

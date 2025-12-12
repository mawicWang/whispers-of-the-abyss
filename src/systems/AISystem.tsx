
import { useTick } from '@pixi/react';
import { ecs } from '../entities';
import { findPath } from '../utils/Pathfinding';

// Simple AI logic constants
const SUSPICION_DURATION = 2000; // ms
const FLEE_DURATION = 5000; // ms
const MOVE_INTERVAL = 2000; // ms
const MOVE_SPEED = 2;

const TILE_SIZE = 16;
const GRID_W = Math.floor(360 / TILE_SIZE);
const GRID_H = Math.floor(640 / TILE_SIZE);

// Helper to get time
const now = () => Date.now();

export const AISystem = () => {
  useTick((ticker) => {
    // Iterate over all entities with aiState
    for (const entity of ecs.entities) {
        if (!entity.aiState) continue;

        if (!entity.stateEnterTime) entity.stateEnterTime = now();
        if (!entity.lastMoveTime) entity.lastMoveTime = now();

        const timeInState = now() - entity.stateEnterTime;
        const timeSinceMove = now() - entity.lastMoveTime;

        // Skip if currently moving along a path
        if (entity.path && entity.path.length > 0) continue;
        if (entity.move) continue;

        // State Machine Logic
        switch (entity.aiState) {
            case 'IDLE':
                // Random movement every interval
                if (timeSinceMove > MOVE_INTERVAL) {
                    if (!entity.position) break;

                    const startGridX = Math.round(entity.position.x / TILE_SIZE);
                    const startGridY = Math.round(entity.position.y / TILE_SIZE);

                    const directions = [
                        { x: 0, y: -3 }, // Up
                        { x: 0, y: 3 },  // Down
                        { x: -3, y: 0 }, // Left
                        { x: 3, y: 0 }   // Right
                    ];
                    const randomDir = directions[Math.floor(Math.random() * directions.length)];
                    const targetGridX = startGridX + randomDir.x;
                    const targetGridY = startGridY + randomDir.y;

                    // Collect Obstacles
                    const obstacles = new Set<string>();
                    for(const e of ecs.entities) {
                        if (e.isObstacle && e.position) {
                            const gx = Math.round(e.position.x / TILE_SIZE);
                            const gy = Math.round(e.position.y / TILE_SIZE);
                            obstacles.add(`${gx},${gy}`);
                        }
                    }

                    // Find Path
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
                    }

                    entity.lastMoveTime = now();
                }
                break;

            case 'SUSPICIOUS':
                if (timeInState > SUSPICION_DURATION) {
                    console.log(`Entity ${entity.id} returning to IDLE from SUSPICIOUS`);
                    entity.aiState = 'IDLE';
                    entity.stateEnterTime = now();
                }
                break;

            case 'FLEE':
                 if (timeInState > FLEE_DURATION) {
                    console.log(`Entity ${entity.id} returning to IDLE from FLEE`);
                    entity.aiState = 'IDLE';
                    entity.stateEnterTime = now();
                } else {
                    // Run away logic - naive for now, could use Pathfinding away from threat
                    // For now, let's just wait it out or implementation better fleeing later
                }
                break;
        }
    }
  });

  return null;
};

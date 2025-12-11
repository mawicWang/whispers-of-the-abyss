
import { useTick } from '@pixi/react';
import { ecs } from '../entities';

export const MoveSystem = () => {
  useTick((ticker) => {
    const delta = ticker.deltaTime;

    for (const entity of ecs.entities) {
      if (entity.move && entity.position && entity.appearance) {
        const dx = entity.move.targetX - entity.position.x;
        const dy = entity.move.targetY - entity.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Move
        const step = entity.move.speed * delta;

        if (dist <= step) {
          // Reached target
          entity.position.x = entity.move.targetX;
          entity.position.y = entity.move.targetY;
          // Remove move component
          delete entity.move;
          // Update animation to idle
          entity.appearance.animation = 'idle';
        } else {
          // Normalize and move
          entity.position.x += (dx / dist) * step;
          entity.position.y += (dy / dist) * step;

          // Update direction
          if (Math.abs(dx) > Math.abs(dy)) {
             entity.appearance.direction = dx > 0 ? 'right' : 'left';
          } else {
             entity.appearance.direction = dy > 0 ? 'down' : 'up';
          }
           // Update animation to walk
           if (entity.appearance.animation !== 'walk') {
               entity.appearance.animation = 'walk';
           }
        }
      }
    }
  });

  return null;
};

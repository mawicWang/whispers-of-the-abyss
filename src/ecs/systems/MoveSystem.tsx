
import { useTick } from '@pixi/react';
import { ecs } from '../world';

export const MoveSystem = () => {
  useTick((ticker) => {
    const delta = ticker.deltaTime;

    for (const entity of ecs.entities) {
      // Handle Path Following
      if (entity.path && entity.path.length > 0 && !entity.move && entity.position) {
          const nextPoint = entity.path[0];
          // Simple check: if we are close to next point, pop it?
          // Actually, we should set move target to next point.
          ecs.addComponent(entity, 'move', {
              targetX: nextPoint.x,
              targetY: nextPoint.y,
              speed: entity.speed ?? 1.0
          });
      }


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

          // Check if there are more points in path
          if (entity.path && entity.path.length > 0) {
             // Remove the point we just reached (assuming it was the first one)
             // We need to be careful not to remove if we just added it.
             // Logic: If we reached target, and target matches path[0], pop it.
             if (entity.path[0].x === entity.move.targetX && entity.path[0].y === entity.move.targetY) {
                 entity.path.shift();
             }

             if (entity.path.length > 0) {
                 const next = entity.path[0];
                 entity.move.targetX = next.x;
                 entity.move.targetY = next.y;
                 // speed remains
             } else {
                 delete entity.move;
                 entity.appearance.animation = 'idle';
             }
          } else {
              // Remove move component
              delete entity.move;
              // Update animation to idle
              entity.appearance.animation = 'idle';
          }

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

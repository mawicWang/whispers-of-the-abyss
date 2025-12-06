
import { useTick } from '@pixi/react';
import { useState } from 'react';

export const GameLoop = () => {
  const [_, setTick] = useState(0);

  useTick(() => {
    // Update logic here
    // ecs.archetype('velocity', 'position').forEach((entity) => {
    //   entity.position.x += entity.velocity.x * ticker.deltaTime;
    //   entity.position.y += entity.velocity.y * ticker.deltaTime;
    // });

    // Force re-render if needed, or rely on internal state updates
    // For Miniplex with React, usually we bind components to entities

    setTick(t => t + 1);
  });

  return null;
};

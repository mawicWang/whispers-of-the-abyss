
import { Application, extend, useTick } from '@pixi/react';
import { Container, Sprite, Text, Graphics, TextStyle } from 'pixi.js';
import { useState, useEffect } from 'react';
import { ecs, type Entity } from './entities';
import { useGameStore } from './state/store';

// Register PixiJS components
extend({ Container, Sprite, Text, Graphics });

// Component to render a single entity
const EntityRenderer = ({ entity }: { entity: Entity }) => {
  if (!entity.position) return null;

  return (
    <pixiContainer x={entity.position.x} y={entity.position.y}>
        <pixiGraphics draw={(g) => {
          g.clear();
          g.circle(0, 0, 20);
          g.fill(entity.role === 'TARGET' ? 0xff0000 : 0x00ff00);
          g.stroke({ width: 2, color: 0xffffff });
        }} />
      {entity.name && (
        <pixiText
          text={entity.name}
          anchor={{ x: 0.5, y: -1.5 }}
          style={new TextStyle({ fontSize: 12, fill: 'white' })}
        />
      )}
    </pixiContainer>
  );
};

// Component to handle the Ghost Interaction (Clicking)
const GhostInteractionLayer = () => {
  const { addMana, increaseSuspicion } = useGameStore();
  const [clickEffects, setClickEffects] = useState<{x:number, y:number, id: number}[]>([]);

  const handlePointerDown = (e: any) => {
    // Basic interaction: Create a disturbance at click location
    const x = e.global.x;
    const y = e.global.y;
    console.log(`Ghost interaction at ${x}, ${y}`);

    // Visual feedback
    setClickEffects(prev => [...prev, {x, y, id: Date.now()}]);

    // Game Logic
    addMana(1);
    increaseSuspicion(0.5);

    // Notify nearby NPCs
    for (const entity of ecs.entities) {
        if (entity.isNPC && entity.position) {
            const dx = entity.position.x - x;
            const dy = entity.position.y - y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 100) {
                console.log(`Disturbed NPC: ${entity.name}`);
                if (entity.aiState === 'IDLE') {
                    entity.aiState = 'SUSPICIOUS';
                }
            }
        }
    }
  };

  return (
    <pixiContainer>
       {/* Fullscreen interactive graphics */}
       <pixiGraphics
        draw={(g) => {
           g.clear();
           g.rect(0, 0, 800, 600);
           g.fill({ color: 0xffffff, alpha: 0.05 });
        }}
        eventMode="static"
        cursor="pointer"
        onPointerDown={handlePointerDown}
       />
       {/* Click effects */}
       {clickEffects.map(effect => (
           <pixiGraphics key={effect.id} x={effect.x} y={effect.y} draw={(g) => {
               g.clear();
               g.circle(0,0, 10);
               g.stroke({ width: 2, color: 0xffff00 });
           }} />
       ))}
    </pixiContainer>
  );
}

const ECSLayer = () => {
    const [entities, setEntities] = useState<Entity[]>([]);

    // Subscribe to ECS changes (naive implementation for prototype)
    useTick(() => {
        setEntities([...ecs.entities]); // Force re-render entities
    });

    return (
        <pixiContainer>
            {entities.map((entity, i) => (
                <EntityRenderer key={entity.id || i} entity={entity} />
            ))}
        </pixiContainer>
    );
}

export const App = () => {
  const { mana, suspicion } = useGameStore();

  useEffect(() => {
      // Initialize some entities
      if (ecs.entities.length === 0) {
          ecs.add({
              id: 'npc-1',
              name: 'Arthur',
              role: 'TARGET',
              position: { x: 400, y: 300 },
              isNPC: true,
              aiState: 'IDLE',
              stats: { willpower: 5, sanity: 10, corruption: 0 }
          });

           ecs.add({
              id: 'obj-1',
              name: 'Candle',
              position: { x: 450, y: 300 },
              isObject: true,
          });
      }
  }, []);

  return (
    <>
        <div style={{ position: 'absolute', top: 10, left: 10, color: 'white', zIndex: 10, pointerEvents: 'none' }}>
            <div>Mana: {mana}</div>
            <div>Suspicion: {suspicion}</div>
        </div>
        <Application width={800} height={600} backgroundColor={0x222222}>
            <GhostInteractionLayer />
            <ECSLayer />
        </Application>
    </>
  );
};

export default App;

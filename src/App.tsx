
import { Application, extend, useTick } from '@pixi/react';
import { Container, Sprite, Text, Graphics, TextStyle, AnimatedSprite } from 'pixi.js';
import { useState, useEffect, useRef } from 'react';
import { ecs, type Entity } from './entities';
import { useGameStore } from './state/store';
import { AssetLoader } from './utils/AssetLoader';
import DemonKingInterface from './ui/DemonKingInterface';

// Register PixiJS components
extend({ Container, Sprite, Text, Graphics, AnimatedSprite });

// Component to render a single entity
const EntityRenderer = ({ entity }: { entity: Entity }) => {
  if (!entity.position) return null;

  const assetLoader = AssetLoader.getInstance();
  const [texture, setTexture] = useState<any>(null);
  const [animations, setAnimations] = useState<any>(null);
  const animatedSpriteRef = useRef<AnimatedSprite>(null);

  useEffect(() => {
    if (entity.sprite) {
      const tex = assetLoader.getTexture(entity.sprite);
      if (tex) setTexture(tex);
    }
    if (entity.animation) {
      const anims = assetLoader.getAnimation(entity.animation);
      if (anims) setAnimations(anims);
    }
  }, [entity.sprite, entity.animation]);

  useEffect(() => {
    if (animatedSpriteRef.current && animations) {
      animatedSpriteRef.current.play();
    }
  }, [animations]);

  return (
    <pixiContainer x={entity.position.x} y={entity.position.y}>
      {animations ? (
        <pixiAnimatedSprite
          ref={animatedSpriteRef}
          textures={animations}
          animationSpeed={0.1}
          anchor={0.5}
        />
      ) : texture ? (
        <pixiSprite texture={texture} anchor={0.5} />
        ) : (
             <pixiGraphics draw={(g) => {
                g.clear();
                g.circle(0, 0, 20);
                g.fill(entity.role === 'TARGET' ? 0xff0000 : 0x00ff00);
                g.stroke({ width: 2, color: 0xffffff });
              }} />
        )}

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
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  useEffect(() => {
      const load = async () => {
          await AssetLoader.getInstance().loadAssets();
          setAssetsLoaded(true);
      };
      load();
  }, []);

  useEffect(() => {
      if (!assetsLoaded) return;

      // Initialize some entities
      if (ecs.entities.length === 0) {
          ecs.add({
              id: 'npc-1',
              name: 'Arthur',
              role: 'TARGET',
              position: { x: 400, y: 300 },
              isNPC: true,
              aiState: 'IDLE',
              stats: { willpower: 5, sanity: 10, corruption: 0 },
              animation: 'FarmerTemplate_walk_down'
          });

           ecs.add({
              id: 'house-1',
              name: 'House',
              position: { x: 200, y: 200 },
              isObject: true,
              sprite: 'house_1'
          });

           ecs.add({
              id: 'tavern-1',
              name: 'Tavern',
              position: { x: 600, y: 200 },
              isObject: true,
              sprite: 'tavern_1'
          });
      }
  }, [assetsLoaded]);

  if (!assetsLoaded) {
      return <div>Loading Assets...</div>;
  }

  return (
    <>
        <DemonKingInterface />
        <Application width={800} height={600} backgroundColor={0x222222}>
            <GhostInteractionLayer />
            <ECSLayer />
        </Application>
    </>
  );
};

export default App;

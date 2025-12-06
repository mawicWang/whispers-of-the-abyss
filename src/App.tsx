
import { Application, extend, useTick } from '@pixi/react';
import { Container, Sprite, Text, Graphics, TextStyle, AnimatedSprite } from 'pixi.js';
import { useState, useEffect, useRef } from 'react';
import { ecs, type Entity } from './entities';
import { useGameStore } from './state/store';
import { AssetLoader } from './utils/AssetLoader';
import { DemonKingInterface } from './ui/DemonKingInterface';
import { AISystem } from './systems/AISystem';

// Register PixiJS components
extend({ Container, Sprite, Text, Graphics, AnimatedSprite });

// Component to render a single entity
const EntityRenderer = ({ entity }: { entity: Entity }) => {
  const containerRef = useRef<Container>(null);
  const assetLoader = AssetLoader.getInstance();
  const [texture, setTexture] = useState<any>(null);
  const [animations, setAnimations] = useState<any>(null);
  const [animSpeed, setAnimSpeed] = useState<number>(0.1);
  const [loop, setLoop] = useState<boolean>(true);
  const animatedSpriteRef = useRef<AnimatedSprite>(null);

  useEffect(() => {
    if (entity.sprite) {
      const tex = assetLoader.getTexture(entity.sprite);
      if (tex) setTexture(tex);
    }
    if (entity.animation) {
      // Determine the specific animation key based on entity state
      let animKey = entity.animation;
      let targetSpeed = 0.1;
      let targetLoop = true;

      // If animation name doesn't have underscores (and isn't a specific legacy key), assume it's a character base name
      // and append state suffix.
      // Legacy keys like "FarmerTemplate_walk_down" have underscores.
      // New base names like "SwordsmanPurple" or "SwordsmanPurple.png" (if I used filename as key base,
      // but AssetLoader strips extension for key base usually, let's verify).
      // AssetLoader uses `sheetPath.split('/').pop()?.replace(/\.[^/.]+$/, "")` -> "SwordsmanPurple"

      const isSpecificKey = animKey.includes('_');

      if (!isSpecificKey) {
          // Map aiState to animation suffix
          let suffix = 'idle';
          if (entity.aiState === 'IDLE') {
              suffix = 'idle';
              targetSpeed = 0.22; // ~13 fps (300ms for 4 frames)
              targetLoop = true;
          } else if (entity.aiState === 'SUSPICIOUS' || entity.aiState === 'CHASING' || entity.aiState === 'FLEEING') {
              suffix = 'walk';
              targetSpeed = 0.33; // ~20 fps (200ms for 4 frames)
              targetLoop = true;
          } else if (entity.aiState === 'ATTACK') {
              suffix = 'attack';
              targetSpeed = 0.66; // ~40 fps (100ms for 4 frames)
              targetLoop = false;
          } else {
             // Default fallbacks
             suffix = 'idle';
          }

          animKey = `${entity.animation}_${suffix}`;
      }

      const anims = assetLoader.getAnimation(animKey);
      if (anims) {
          setAnimations(anims);
          setAnimSpeed(targetSpeed);
          setLoop(targetLoop);
      } else {
          // Fallback to original key if constructed one not found
          const fallbackAnims = assetLoader.getAnimation(entity.animation);
          if (fallbackAnims) {
              setAnimations(fallbackAnims);
              setAnimSpeed(0.1);
              setLoop(true);
          }
      }
    }
  }, [entity.sprite, entity.animation, entity.aiState]); // Re-run when aiState changes

  useEffect(() => {
    if (animatedSpriteRef.current && animations) {
      animatedSpriteRef.current.stop(); // Stop before playing new
      animatedSpriteRef.current.loop = loop;
      animatedSpriteRef.current.animationSpeed = animSpeed;
      animatedSpriteRef.current.play();
    }
  }, [animations, animSpeed, loop]);

  // Imperatively update position on tick to avoid React re-renders
  useTick(() => {
      if (containerRef.current && entity.position) {
          containerRef.current.x = entity.position.x;
          containerRef.current.y = entity.position.y;
      }
  });

  if (!entity.position) return null;

  return (
    <pixiContainer ref={containerRef} x={entity.position.x} y={entity.position.y}>
      {animations ? (
        <pixiAnimatedSprite
          ref={animatedSpriteRef}
          textures={animations}
          animationSpeed={animSpeed}
          loop={loop}
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
  const { addMana, increaseSuspicion, isDrawerOpen } = useGameStore();
  const [clickEffects, setClickEffects] = useState<{x:number, y:number, id: number}[]>([]);

  const handlePointerDown = (e: any) => {
    // If UI is open, prevent interaction with game world if necessary.
    // Although the CSS pointer-events should handle most of this,
    // it's good to have a logical check if we want to completely disable gameplay interactions.
    if (isDrawerOpen) return;

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
           g.rect(0, 0, 360, 640);
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
        // Optimization: Only update the list if length changes or we need to add/remove entities.
        // For position updates, we rely on EntityRenderer's useTick.
        // But for this prototype, checking entities length is a simple heuristic.
        // Actually, we should just set entities once or on add/remove.
        // Miniplex has onEntityAdded/Removed subscriptions.
        // For now, let's just stick to what we had but trust EntityRenderer to animate position.
        // But we DO need to make sure entities list is up to date initially.
        if (ecs.entities.length !== entities.length) {
            setEntities([...ecs.entities]);
        }
    });

    useEffect(() => {
         // Initial load
         setEntities([...ecs.entities]);

         // In a real app we'd subscribe to ECS events
         const unsubscribeAdded = ecs.onEntityAdded.subscribe(() => setEntities([...ecs.entities]));
         const unsubscribeRemoved = ecs.onEntityRemoved.subscribe(() => setEntities([...ecs.entities]));
         return () => { unsubscribeAdded(); unsubscribeRemoved(); };
    }, []);

    return (
        <pixiContainer>
            {entities.map((entity, i) => (
                <EntityRenderer key={entity.id || i} entity={entity} />
            ))}
        </pixiContainer>
    );
}

// Map Rendering Component
const MapLayer = () => {
  const assetLoader = AssetLoader.getInstance();
  const [tiles, setTiles] = useState<{x: number, y: number, texture: any, id: string}[]>([]);

  useEffect(() => {
      const cols = 12; // 360 / 32 ~= 11.25
      const rows = 20; // 640 / 32 = 20
      const newTiles = [];

      const grassTexture = assetLoader.getTexture('grass');

      if (grassTexture) {
          for (let y = 0; y < rows; y++) {
              for (let x = 0; x < cols; x++) {
                   newTiles.push({
                       id: `tile_${x}_${y}`,
                       x: x * 32,
                       y: y * 32,
                       texture: grassTexture
                   });
              }
          }
          setTiles(newTiles);
      }
  }, []);

  return <pixiContainer>
      {tiles.map(tile => (
          <pixiSprite key={tile.id} texture={tile.texture} x={tile.x} y={tile.y} />
      ))}
  </pixiContainer>;
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
          console.log("Initializing Game Entities...");
          // Initialize Arthur (Target)
          ecs.add({
              id: 'npc-1',
              name: 'Arthur',
              role: 'TARGET',
              position: { x: 180, y: 320 },
              isNPC: true,
              aiState: 'IDLE',
              stats: { willpower: 5, sanity: 10, corruption: 0 },
              animation: 'SwordsmanPurple' // Use the base name, EntityRenderer handles _idle/_walk
          });

          // Add a chest
           ecs.add({
              id: 'chest-1',
              name: 'Chest',
              position: { x: 100, y: 300 },
              isObject: true,
              sprite: 'chest_closed'
          });

           // Add another chest
           ecs.add({
              id: 'chest-2',
              name: 'Chest',
              position: { x: 260, y: 300 },
              isObject: true,
              sprite: 'chest_closed'
          });

           // Use tavern as background/environment context
           ecs.add({
              id: 'tavern-1',
              name: 'Tavern',
              position: { x: 180, y: 200 },
              isObject: true,
              sprite: 'tavern_1'
          });
      }
  }, [assetsLoaded]);

  if (!assetsLoaded) {
      return <div>Loading Assets...</div>;
  }

  return (
    <div className="game-container">
        <Application width={360} height={640} backgroundColor={0x222222}>
            <MapLayer />
            <GhostInteractionLayer />
            <AISystem />
            <ECSLayer />
        </Application>
        <DemonKingInterface />
    </div>
  );
};

export default App;

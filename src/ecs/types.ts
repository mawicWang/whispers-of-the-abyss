
import type { GoapComponent } from './components/GoapComponent';

// Component Interfaces

export interface BaseAttributeComponent {
  attributes: {
    // Stats (Value)
    might: number;
    magic: number;
    will: number;

    // Points (Current/Max)
    health: { current: number; max: number };
    sanity: { current: number; max: number };
    stamina?: { current: number; max: number };
    corruption?: { current: number; max: number };
    boredom?: { current: number; max: number };
    satiety?: { current: number; max: number };
  };
}

export interface AppearanceComponent {
  appearance: {
    sprite: string; // Key for static texture or spritesheet base name
    animation?: string; // Current animation state (e.g., 'idle', 'walk')
    direction?: 'up' | 'down' | 'left' | 'right';
  };
}

export interface Debuff {
  type: 'INFLUENCE';
  duration: number; // Seconds remaining
  tickTimer: number; // For periodic effects
  icon: string; // Texture key or icon name
}

export interface SmartObjectComponent {
    interactionType: string; // e.g., "ENTERTAINMENT", "WORSHIP"
    advertisedEffects: {
        boredom?: number;
        stamina?: number;
        sanity?: number;
        corruption?: number;
    };
    duration: number; // ms
    animation: string; // e.g., "sit", "pray"
    faceTarget: boolean;
    capacity: number;
    slots: {
        id: number;
        x: number; // Local offset X
        y: number; // Local offset Y
        claimedBy: string | null; // Entity ID
    }[];
}

export type Entity = {
  // Core
  id?: string;
  name?: string;

  // Render (Legacy/Direct)
  position?: { x: number; y: number };

  // New Composition Components
  attributes?: BaseAttributeComponent['attributes'];
  appearance?: AppearanceComponent['appearance'];
  smartObject?: SmartObjectComponent;

  // Physics/Logic
  velocity?: { x: number; y: number };
  speed?: number; // Base movement speed (pixels per frame approx)
  interactive?: boolean;

  // Movement
  move?: {
    targetX: number;
    targetY: number;
    speed: number;
  };

  path?: { x: number; y: number }[]; // Queue of path points

  // Game Logic
  role?: 'CIVILIAN' | 'GUARD' | 'PRIEST' | 'TARGET' | 'GHOST';

  // NPC Stats (Legacy - keeping for compatibility with existing systems if needed)
  stats?: {
    willpower: number;
    sanity: number;
    corruption: number;
  };

  // AI
  aiState?: 'IDLE' | 'WORK' | 'SUSPICIOUS' | 'FLEE' | 'SLEEP' | 'CHASING' | 'ATTACK' | 'FLEEING';
  goap?: GoapComponent['goap'];
  stateEnterTime?: number;
  lastMoveTime?: number;

  // Zone / Effect Logic
  zone?: {
    type: 'WHISPER';
    radius: number;
    duration: number; // seconds remaining
    damageMin: number;
    damageMax: number;
    tickTimer: number; // Accumulates delta time
  };

  // Debuffs
  debuffs?: Debuff[];

  // Inventory & Storage
  inventory?: { item: string; count: number }[];
  storage?: { [key: string]: number };

  // Tags
  isNPC?: boolean;
  isObject?: boolean;
  isGhost?: boolean;
  isObstacle?: boolean;
  isWheat?: boolean;
  isHouse?: boolean;

  // New Logic
  growth?: {
    stage: number;
    maxStage: number;
    timer: number;
    durationPerStage: number;
  };

  claimedBy?: string;
};


import { World } from 'miniplex';

// Component Interfaces
export interface BaseAttributeComponent {
  attributes: {
    sanity: {
      current: number;
      max: number;
    };
  };
}

export interface AppearanceComponent {
  appearance: {
    sprite: string; // Key for static texture or spritesheet base name
    animation?: string; // Current animation state (e.g., 'idle', 'walk')
    direction?: 'up' | 'down' | 'left' | 'right';
  };
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

  // Physics/Logic
  velocity?: { x: number; y: number };
  interactive?: boolean;

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
  stateEnterTime?: number;
  lastMoveTime?: number;

  // Tags
  isNPC?: boolean;
  isObject?: boolean;
  isGhost?: boolean;
};

export const ecs = new World<Entity>();

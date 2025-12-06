
import { World } from 'miniplex';

export type Entity = {
  // Core
  id?: string;
  name?: string;

  // Render
  position?: { x: number; y: number };
  sprite?: string; // Path to sprite asset

  // Physics/Logic
  velocity?: { x: number; y: number };
  interactive?: boolean;

  // Game Logic
  role?: 'CIVILIAN' | 'GUARD' | 'PRIEST' | 'TARGET' | 'GHOST';

  // NPC Stats
  stats?: {
    willpower: number;
    sanity: number;
    corruption: number;
  };

  // AI
  aiState?: 'IDLE' | 'WORK' | 'SUSPICIOUS' | 'FLEE' | 'SLEEP';

  // Tags
  isNPC?: boolean;
  isObject?: boolean;
  isGhost?: boolean;
};

export const ecs = new World<Entity>();

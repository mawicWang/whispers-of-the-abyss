
import { World } from 'miniplex';

export type Entity = {
  // Core
  id?: string;
  name?: string;

  // Render
  position?: { x: number; y: number };
  sprite?: string; // Key for static texture (e.g., 'house_1')
  animation?: string; // Key for animation (e.g., 'FarmerTemplate_walk_down')

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
  stateEnterTime?: number;

  // Tags
  isNPC?: boolean;
  isObject?: boolean;
  isGhost?: boolean;
};

export const ecs = new World<Entity>();

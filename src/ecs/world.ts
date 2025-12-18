
import { World } from 'miniplex';
import type { Entity } from './types';

// Export a singleton instance of the ECS world
export const ecs = new World<Entity>();

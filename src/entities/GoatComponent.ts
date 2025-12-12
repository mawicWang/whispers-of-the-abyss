
// Basic implementation of a GOAP system for our needs
// This is not a full general-purpose library, but a specific implementation for the task

import type { Entity } from './index';

export type Goal = 'RecoverStamina' | 'Farm';

export interface GoatState {
    stamina: number;
    atHome: boolean;
    atFarm: boolean;
    hasFarmTarget: boolean;
    isResting: boolean;
    farmCooldown: number;
}

export interface GoatAction {
    name: string;
    cost: number;
    preconditions: (state: GoatState) => boolean;
    effects: (state: GoatState) => Partial<GoatState>;
    execute: (entity: Entity, deltaTime: number) => boolean; // returns true if completed
}

export interface GoatComponent {
    goat: {
        goals: Goal[];
        currentGoal?: Goal;
        plan: GoatAction[];
        currentActionIndex: number;
        blackboard: {
            targetFarmId?: string;
            homePosition?: { x: number, y: number };
            lastFarmTime?: number;
            farmStartTime?: number; // Added for animation timing
            restTimer?: number;
        };
    };
}

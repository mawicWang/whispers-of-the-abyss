// Basic implementation of a GOAP system for our needs
// This is not a full general-purpose library, but a specific implementation for the task

import type { Entity } from './index';

export type Goal = 'RecoverStamina' | 'Farm' | 'Pray' | 'Meditate';

export interface GoatState {
    stamina: number;
    sanity: number;
    atHome: boolean;
    atFarm: boolean;
    atQuietSpot: boolean; // Added
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
        currentActionName?: string;
        plan: GoatAction[];
        currentActionIndex: number;
        blackboard: {
            targetFarmId?: string;
            homePosition?: { x: number, y: number };
            targetSpot?: { x: number, y: number }; // Added
            lastFarmTime?: number;
            farmStartTime?: number;
            restTimer?: number;
            prayTimer?: number;
            meditateTimer?: number;
        };
    };
}

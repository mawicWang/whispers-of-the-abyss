// Basic implementation of a GOAP system for our needs
// This is not a full general-purpose library, but a specific implementation for the task

import type { Entity } from './index';

export type Goal = 'RecoverStamina' | 'Farm' | 'Pray' | 'Meditate' | 'KillBoredom';

export interface GoapState {
    stamina: number;
    sanity: number;
    boredom: number;
    atHome: boolean;
    atFarm: boolean;
    atQuietSpot: boolean; // Added
    hasFarmTarget: boolean;
    hasNeighbor: boolean; // Added for Social
    isResting: boolean;
    farmCooldown: number;
}

export interface GoapAction {
    name: string;
    cost: number;
    preconditions: (state: GoapState) => boolean;
    effects: (state: GoapState) => Partial<GoapState>;
    execute: (entity: Entity, deltaTime: number) => boolean; // returns true if completed
}

export interface GoapComponent {
    goap: {
        goals: Goal[];
        currentGoal?: Goal;
        currentActionName?: string;
        plan: GoapAction[];
        currentActionIndex: number;
        blackboard: {
            targetFarmId?: string;
            homePosition?: { x: number, y: number };
            targetSpot?: { x: number, y: number }; // Added
            socialTargetId?: string; // Added for Social
            socialRequestFrom?: string; // Added for Handshake
            socialAccepted?: boolean; // Added for Handshake
            socialTimer?: number;
            lastFarmTime?: number;
            farmStartTime?: number;
            restTimer?: number;
            prayTimer?: number;
            meditateTimer?: number;
            wanderTimer?: number;
        };
    };
}

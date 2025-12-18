
import { ecs } from '../world';
import { WORKER_VARIANTS } from '../../config/gameData';

const AXEMAN_VARIANTS = ['AxemanCyan', 'AxemanRed']; // Assumed available based on prompt

export class EntityFactory {
    static createWorker(x: number, y: number, id: string, houseId: string) {
        const variant = WORKER_VARIANTS[Math.floor(Math.random() * WORKER_VARIANTS.length)];
        ecs.add({
            id,
            name: `工人 ${id.split('-')[1]}`,
            position: { x, y },
            speed: 1.0,
            appearance: {
                sprite: variant,
                animation: 'idle',
                direction: 'down'
            },
            attributes: {
                might: Math.floor(Math.random() * 10) + 1,
                magic: Math.floor(Math.random() * 10) + 1,
                will: Math.floor(Math.random() * 10) + 1,
                health: {
                    current: 100,
                    max: 100
                },
                sanity: {
                    current: Math.floor(Math.random() * 101),
                    max: 100
                },
                stamina: {
                    current: 10,
                    max: 10
                },
                corruption: {
                    current: 0,
                    max: 100
                },
                boredom: {
                    current: Math.floor(Math.random() * 50),
                    max: 100
                },
                satiety: {
                    current: 70 + Math.floor(Math.random() * 30),
                    max: 100
                }
            },
            goap: {
                goals: ['Farm', 'Eat', 'StoreFood', 'RecoverStamina', 'KillBoredom'],
                currentGoal: 'Farm',
                plan: [],
                currentActionIndex: 0,
                blackboard: {
                    homePosition: { x, y },
                    homeHouseId: houseId
                }
            },
            lastMoveTime: Date.now(),
            stateEnterTime: Date.now(),
            path: [],
            debuffs: [],
            inventory: [],
            isNPC: true,
            isWorker: true,
            role: 'CIVILIAN'
        });
    }

    static createGuard(x: number, y: number, id: string) {
        const variant = AXEMAN_VARIANTS[Math.floor(Math.random() * AXEMAN_VARIANTS.length)];
        ecs.add({
            id,
            name: `侍卫 ${id.split('-')[1]}`,
            position: { x, y },
            speed: 1.1, // Slightly faster
            appearance: {
                sprite: variant,
                animation: 'idle',
                direction: 'down'
            },
            attributes: {
                might: 15, // Stronger
                magic: 5,
                will: 10,
                health: { current: 150, max: 150 },
                sanity: { current: 100, max: 100 },
                stamina: { current: 20, max: 20 },
                corruption: { current: 0, max: 100 },
                boredom: { current: 0, max: 100 },
                satiety: { current: 100, max: 100 }
            },
            goap: {
                goals: ['Patrol', 'MaintainOrder', 'Eat', 'RecoverStamina'],
                currentGoal: 'Patrol',
                plan: [],
                currentActionIndex: 0,
                blackboard: {
                    homePosition: { x, y }
                }
            },
            lastMoveTime: Date.now(),
            stateEnterTime: Date.now(),
            path: [],
            debuffs: [],
            inventory: [],
            isNPC: true,
            isGuard: true,
            role: 'GUARD'
        });
    }

    static createHouse(x: number, y: number, variant: number, id: string) {
        ecs.add({
            id,
            name: '民居',
            position: { x, y },
            appearance: {
                sprite: `House_${variant}`,
            },
            storage: {
                food: 0
            },
            isObstacle: true,
            isObject: true,
            isHouse: true
        });
    }

    static createCampfire(x: number, y: number, id: string) {
        ecs.add({
            id,
            name: '篝火',
            position: { x, y },
            appearance: {
                sprite: 'Bonfire',
                animation: 'idle'
            },
            isObstacle: true,
            isObject: true,
            smartObject: {
                interactionType: "ENTERTAINMENT",
                advertisedEffects: { boredom: -20, sanity: 5 },
                duration: 10000,
                animation: "sit",
                faceTarget: true,
                capacity: 4,
                slots: [
                    { id: 0, x: 0, y: -24, claimedBy: null }, // Up
                    { id: 1, x: 0, y: 24, claimedBy: null },  // Down
                    { id: 2, x: -24, y: 0, claimedBy: null }, // Left
                    { id: 3, x: 24, y: 0, claimedBy: null }   // Right
                ]
            }
        });
    }

    static createStatue(x: number, y: number, id: string) {
        ecs.add({
            id,
            name: '神像',
            position: { x, y },
            appearance: {
                sprite: 'Statue',
            },
            isObstacle: true,
            isObject: true,
            smartObject: {
                interactionType: "WORSHIP",
                advertisedEffects: { sanity: -100, corruption: 20 },
                duration: 8000,
                animation: "idle",
                faceTarget: true,
                capacity: 1,
                slots: [
                    { id: 0, x: 0, y: 24, claimedBy: null } // Front
                ]
            }
        });
    }

    static createWhisperZone(x: number, y: number, level: number) {
        const isLevel1 = level >= 1;
        // Import logic for damage/duration from config if needed, or keep here
        ecs.add({
            position: { x, y },
            zone: {
                type: 'WHISPER',
                radius: 30,
                duration: isLevel1 ? 20 : 10,
                damageMin: isLevel1 ? 2 : 1,
                damageMax: isLevel1 ? 12 : 6,
                tickTimer: 0
            }
        });
    }
}

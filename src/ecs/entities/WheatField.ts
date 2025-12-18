import { ecs } from '../world';

export const createWheatField = (x: number, y: number, gridX: number, gridY: number, stage: number, id: string) => {
    ecs.add({
        id,
        position: { x, y },
        appearance: {
            sprite: `wheat_stage_${stage}`,
        },
        growth: {
            stage: stage,
            maxStage: 4,
            timer: 0,
            durationPerStage: 10
        },
        isWheat: true,
        isObject: true
    });
};

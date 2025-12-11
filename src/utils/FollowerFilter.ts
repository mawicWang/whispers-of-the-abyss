import { ColorMatrixFilter } from 'pixi.js';

export class FollowerFilter extends ColorMatrixFilter {
    constructor() {
        super();
        // Apply purple tint
        // 0x9d4edd is the purple color used elsewhere (approx), or 0x800080
        this.tint(0x9d4edd, true);
    }
}

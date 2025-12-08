import React from 'react';
import { TextStyle } from 'pixi.js';

export const TilemapTestScene: React.FC = () => {
    return (
        <pixiContainer>
            <pixiText
                text="Tilemap Test Scene"
                x={50}
                y={300}
                style={
                    new TextStyle({
                        fill: '#ffffff',
                        fontSize: 24,
                    })
                }
            />
        </pixiContainer>
    );
};

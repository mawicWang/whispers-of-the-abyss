import React, { useEffect, useRef } from 'react';
import { AnimatedSprite as PixiAnimatedSprite } from 'pixi.js';

// Helper component for animated sprite to handle imperative play()
export const AutoPlaySprite: React.FC<{
    textures: any[];
    speed: number;
    loop: boolean;
}> = ({ textures, speed, loop }) => {
    const spriteRef = useRef<PixiAnimatedSprite>(null);

    useEffect(() => {
        if (spriteRef.current) {
            spriteRef.current.textures = textures;
            spriteRef.current.animationSpeed = speed;
            spriteRef.current.loop = loop;
            spriteRef.current.play();
        }
    }, [textures, speed, loop]);

    return (
        <pixiAnimatedSprite
            ref={spriteRef}
            textures={textures}
            animationSpeed={speed}
            loop={loop}
            anchor={0.5}
            x={180}
            y={200}
            scale={{ x: 6, y: 6 }}
        />
    );
};

export const buttonStyle = {
    pointerEvents: 'auto' as const,
    cursor: 'pointer',
    fill: '#ffffff',
    fontSize: 16,
};

export const activeColor = '#ffff00';

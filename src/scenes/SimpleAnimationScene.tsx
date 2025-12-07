import React, { useEffect, useState, useRef } from 'react';
import { AssetLoader } from '../utils/AssetLoader';
import { TextStyle, AnimatedSprite as PixiAnimatedSprite } from 'pixi.js';

// Helper component for animated sprite to handle imperative play()
const AutoPlaySprite: React.FC<{
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

const SimpleAnimationScene: React.FC = () => {
    // State for interactive viewer
    const [characterType, setCharacterType] = useState('Farmer');
    const [color, setColor] = useState('Cyan');
    const [action, setAction] = useState('idle');
    const [direction, setDirection] = useState('down');

    const characterTypes = ['Farmer', 'Axeman'];
    const colors = ['Cyan', 'Red', 'Lime', 'Purple'];
    const actions = ['idle', 'walk', 'run', 'attack'];
    const directions = ['down', 'up', 'left', 'right'];

    // At this point, assets are already loaded by App.tsx
    const loader = AssetLoader.getInstance();

    const characterName = `${characterType}${color}`;
    const animKey = `${characterName}_${action}_${direction}`;
    const textures = loader.getAnimation(animKey);

    // Speed logic
    let intervalMs = 300;
    if (action === 'walk') intervalMs = 200;
    if (action === 'run') intervalMs = 150;
    if (action === 'attack') intervalMs = 100;

    // Speed = 1 / (interval / 16.666)
    const speed = 1 / (intervalMs / 16.666);

    // Button style helper
    const buttonStyle = {
        pointerEvents: 'auto' as const,
        cursor: 'pointer',
        fill: '#ffffff',
        fontSize: 16,
    };

    const activeColor = '#ffff00';

    return (
        <pixiContainer>
             {/* Title */}
            <pixiText text="Character Viewer" x={20} y={20} style={{ fill: '#ffffff', fontSize: 24 }} />

            {/* Display Area */}
            {textures && textures.length > 0 ? (
                 <AutoPlaySprite
                    textures={textures}
                    speed={speed}
                    loop={true}
                />
            ) : (
                <pixiText text="Missing Animation" x={180} y={200} anchor={0.5} style={{ fill: 'red', fontSize: 20 }} />
            )}

            {/* Controls */}

            {/* Character Type */}
            <pixiText text="Type:" x={20} y={270} style={{ fill: '#aaa', fontSize: 14 }} />
             {characterTypes.map((t, i) => (
                <pixiText
                    key={t}
                    text={t}
                    x={20 + i * 80}
                    y={290}
                    style={{ ...buttonStyle, fill: characterType === t ? activeColor : '#ffffff' }}
                    eventMode="static"
                    onPointerDown={() => setCharacterType(t)}
                />
            ))}

            {/* Colors */}
            <pixiText text="Color:" x={20} y={330} style={{ fill: '#aaa', fontSize: 14 }} />
            {colors.map((c, i) => (
                <pixiText
                    key={c}
                    text={c}
                    x={20 + i * 60}
                    y={350}
                    style={{ ...buttonStyle, fill: color === c ? activeColor : '#ffffff' }}
                    eventMode="static"
                    onPointerDown={() => setColor(c)}
                />
            ))}

            {/* Actions */}
            <pixiText text="Action:" x={20} y={400} style={{ fill: '#aaa', fontSize: 14 }} />
            {actions.map((a, i) => (
                <pixiText
                    key={a}
                    text={a}
                    x={20 + i * 60}
                    y={420}
                    style={{ ...buttonStyle, fill: action === a ? activeColor : '#ffffff' }}
                    eventMode="static"
                    onPointerDown={() => setAction(a)}
                />
            ))}

             {/* Directions */}
             <pixiText text="Direction:" x={20} y={470} style={{ fill: '#aaa', fontSize: 14 }} />
            {directions.map((d, i) => (
                <pixiText
                    key={d}
                    text={d}
                    x={20 + i * 60}
                    y={490}
                    style={{ ...buttonStyle, fill: direction === d ? activeColor : '#ffffff' }}
                    eventMode="static"
                    onPointerDown={() => setDirection(d)}
                />
            ))}

        </pixiContainer>
    );
};

export default SimpleAnimationScene;

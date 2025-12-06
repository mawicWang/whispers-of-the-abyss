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
    const [loaded, setLoaded] = useState(false);

    // State for interactive viewer
    const [color, setColor] = useState('Cyan');
    const [action, setAction] = useState('idle');
    const [direction, setDirection] = useState('down');

    const colors = ['Cyan', 'Red', 'Lime', 'Purple'];
    const actions = ['idle', 'walk', 'attack'];
    const directions = ['down', 'up', 'left', 'right'];

    useEffect(() => {
        const load = async () => {
            const loader = AssetLoader.getInstance();
            await loader.loadAssets();
            setLoaded(true);
        };
        load();
    }, []);

    if (!loaded) return null;

    const loader = AssetLoader.getInstance();

    const characterName = `Farmer${color}`;
    const animKey = `${characterName}_${action}_${direction}`;
    const textures = loader.getAnimation(animKey);

    // Speed logic
    let intervalMs = 300;
    if (action === 'walk') intervalMs = 200;
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

            {/* Colors */}
            <pixiText text="Color:" x={20} y={350} style={{ fill: '#aaa', fontSize: 14 }} />
            {colors.map((c, i) => (
                <pixiText
                    key={c}
                    text={c}
                    x={20 + i * 60}
                    y={370}
                    style={{ ...buttonStyle, fill: color === c ? activeColor : '#ffffff' }}
                    eventMode="static"
                    onpointerdown={() => setColor(c)}
                />
            ))}

            {/* Actions */}
            <pixiText text="Action:" x={20} y={420} style={{ fill: '#aaa', fontSize: 14 }} />
            {actions.map((a, i) => (
                <pixiText
                    key={a}
                    text={a}
                    x={20 + i * 60}
                    y={440}
                    style={{ ...buttonStyle, fill: action === a ? activeColor : '#ffffff' }}
                    eventMode="static"
                    onpointerdown={() => setAction(a)}
                />
            ))}

             {/* Directions */}
             <pixiText text="Direction:" x={20} y={490} style={{ fill: '#aaa', fontSize: 14 }} />
            {directions.map((d, i) => (
                <pixiText
                    key={d}
                    text={d}
                    x={20 + i * 60}
                    y={510}
                    style={{ ...buttonStyle, fill: direction === d ? activeColor : '#ffffff' }}
                    eventMode="static"
                    onpointerdown={() => setDirection(d)}
                />
            ))}

        </pixiContainer>
    );
};

export default SimpleAnimationScene;

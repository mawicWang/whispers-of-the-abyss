import React, { useState } from 'react';
import { AssetLoader } from '../utils/AssetLoader';
import { AutoPlaySprite, buttonStyle, activeColor } from './SceneUtils';

interface AxemanControlProps {
    // Props if needed
}

export const AxemanControl: React.FC<AxemanControlProps> = () => {
    const [color, setColor] = useState('Cyan');
    const [action, setAction] = useState('idle');
    const [direction, setDirection] = useState('down');

    const colors = ['Cyan', 'Red', 'Lime', 'Purple'];
    const actions = ['idle', 'walk', 'attack_1', 'attack_2'];
    const directions = ['down', 'up', 'left', 'right'];

    // At this point, assets are already loaded by App.tsx
    const loader = AssetLoader.getInstance();
    const characterName = `Axeman${color}`;

    // Logic for key generation: Attack actions are direction-independent in the config
    let animKey = '';
    if (action === 'attack_1' || action === 'attack_2') {
        animKey = `${characterName}_${action}`;
    } else {
        animKey = `${characterName}_${action}_${direction}`;
    }

    const textures = loader.getAnimation(animKey);

    // Speed logic
    let intervalMs = 300;
    if (action === 'walk') intervalMs = 200;
    if (action.startsWith('attack')) intervalMs = 100;

    // Speed = 1 / (interval / 16.666)
    const speed = 1 / (intervalMs / 16.666);

    return (
        <pixiContainer>
            {/* Display Area */}
            {textures && textures.length > 0 ? (
                <AutoPlaySprite
                    textures={textures}
                    speed={speed}
                    loop={true}
                />
            ) : (
                <pixiText text={`Missing: ${animKey}`} x={180} y={200} anchor={0.5} style={{ fill: 'red', fontSize: 16 }} />
            )}

            {/* Controls */}
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
                    x={20 + i * 80} // Increased spacing for longer names
                    y={420}
                    style={{ ...buttonStyle, fill: action === a ? activeColor : '#ffffff' }}
                    eventMode="static"
                    onPointerDown={() => setAction(a)}
                />
            ))}

            {/* Directions (Only relevant for Idle/Walk) */}
            { (action === 'idle' || action === 'walk') && (
                <>
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
                </>
            )}
        </pixiContainer>
    );
};

import React, { useState } from 'react';
import { buttonStyle, activeColor } from './SceneUtils';
import { WorkerControl } from './WorkerControl';
import { AxemanControl } from './AxemanControl';

const SimpleAnimationScene: React.FC = () => {
    // State for interactive viewer
    const [characterType, setCharacterType] = useState('Farmer');
    const characterTypes = ['Farmer', 'Axeman'];

    return (
        <pixiContainer>
             {/* Title */}
            <pixiText text="Character Viewer" x={20} y={20} style={{ fill: '#ffffff', fontSize: 24 }} />

            {/* Character Type Selection - Always Visible */}
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

            {/* Render sub-components based on type */}
            {characterType === 'Farmer' && <WorkerControl />}
            {characterType === 'Axeman' && <AxemanControl />}

        </pixiContainer>
    );
};

export default SimpleAnimationScene;

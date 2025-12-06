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
            x={16}
            y={16}
            scale={{ x: 2, y: 2 }} // Scale up small 16x16 sprites
        />
    );
};

const SimpleAnimationScene: React.FC = () => {
    const [loaded, setLoaded] = useState(false);

    // We will use the 'FarmerCyan' character
    const characterName = 'FarmerCyan';

    // Animation keys
    const anims = {
        idleDown: `${characterName}_idle_down`,
        idleUp: `${characterName}_idle_up`,
        idleLeft: `${characterName}_idle_left`,
        idleRight: `${characterName}_idle_right`,
        walkDown: `${characterName}_walk_down`,
        walkUp: `${characterName}_walk_up`,
        walkLeft: `${characterName}_walk_left`,
        walkRight: `${characterName}_walk_right`,
    };

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

    const textStyle = new TextStyle({
        fill: '#ffffff',
        fontSize: 16,
        fontFamily: 'Arial', // Fallback
    });

    // Helper to render an animation row
    const renderAnimRow = (y: number, label: string, animKey: string, intervalMs: number) => {
        const textures = loader.getAnimation(animKey);

        if (!textures || textures.length === 0) {
            console.warn(`Missing animation: ${animKey}`);
            return null;
        }

        // Calculate speed relative to 60fps
        // Speed = 1 means change every frame (16.6ms)
        // Wanted Interval = 300ms.
        // Frames per sprite = 300 / 16.6 = 18.
        // Speed = 1 / 18 = 0.055
        const speed = 1 / (intervalMs / 16.666);

        return (
            <pixiContainer x={50} y={y}>
                <pixiText text={label} style={textStyle} anchor={{ x: 0, y: 0.5 }} y={16} />
                <pixiContainer x={150}>
                   <AutoPlaySprite
                        textures={textures}
                        speed={speed}
                        loop={true}
                   />
                </pixiContainer>
            </pixiContainer>
        );
    };

    const IDLE_INTERVAL = 300;
    const WALK_INTERVAL = 200;

    return (
        <pixiContainer x={0} y={0}>
             {/* Title */}
            <pixiText text="Farmer Cyan Test" x={20} y={20} style={{ fill: '#ffffff', fontSize: 24 }} />

            {/* Animations */}
            {renderAnimRow(60, "Idle Down", anims.idleDown, IDLE_INTERVAL)}
            {renderAnimRow(100, "Idle Up", anims.idleUp, IDLE_INTERVAL)}
            {renderAnimRow(140, "Idle Left", anims.idleLeft, IDLE_INTERVAL)}
            {renderAnimRow(180, "Idle Right", anims.idleRight, IDLE_INTERVAL)}

            {renderAnimRow(240, "Walk Down", anims.walkDown, WALK_INTERVAL)}
            {renderAnimRow(280, "Walk Up", anims.walkUp, WALK_INTERVAL)}
            {renderAnimRow(320, "Walk Left", anims.walkLeft, WALK_INTERVAL)}
            {renderAnimRow(360, "Walk Right", anims.walkRight, WALK_INTERVAL)}
        </pixiContainer>
    );
};

export default SimpleAnimationScene;

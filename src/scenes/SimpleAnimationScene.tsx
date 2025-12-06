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
        />
    );
};

const SimpleAnimationScene: React.FC = () => {
    const [loaded, setLoaded] = useState(false);

    // We will use the 'Arthax' character
    const characterName = 'Arthax';

    // Animation keys
    const anims = {
        idle: `${characterName}_idle_down`,
        walkUp: `${characterName}_walk_up`,
        walkDown: `${characterName}_walk_down`,
        walkLeft: `${characterName}_walk_left`,
        walkRight: `${characterName}_walk_right`,
        attack: `${characterName}_attack_down` // Using down attack as representative
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
    const renderAnimRow = (y: number, label: string, animKey: string, speed: number = 0.15) => {
        const textures = loader.getAnimation(animKey);

        if (!textures || textures.length === 0) {
            console.warn(`Missing animation: ${animKey}`);
            return null;
        }

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

    return (
        <pixiContainer x={0} y={0}>
             {/* Title */}
            <pixiText text="Character Animation Test" x={20} y={20} style={{ fill: '#ffffff', fontSize: 24 }} />

            {/* Animations */}
            {renderAnimRow(80, "待机 (Idle)", anims.idle, 0.1)}
            {renderAnimRow(130, "上移 (Move Up)", anims.walkUp)}
            {renderAnimRow(180, "下移 (Move Down)", anims.walkDown)}
            {renderAnimRow(230, "左移 (Move Left)", anims.walkLeft)}
            {renderAnimRow(280, "右移 (Move Right)", anims.walkRight)}
            {renderAnimRow(330, "攻击 (Attack)", anims.attack, 0.1)}
        </pixiContainer>
    );
};

export default SimpleAnimationScene;

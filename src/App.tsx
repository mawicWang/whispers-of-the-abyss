import { Application, extend } from '@pixi/react';
import { Container, Sprite, Text, Graphics, TextStyle, AnimatedSprite } from 'pixi.js';
import SimpleAnimationScene from './scenes/SimpleAnimationScene';

// Register PixiJS components
extend({ Container, Sprite, Text, Graphics, AnimatedSprite });

export const App = () => {
  return (
    <div className="game-container">
        <Application width={360} height={640} backgroundColor={0x222222}>
            <SimpleAnimationScene />
        </Application>
    </div>
  );
};

export default App;

import React, { useEffect, useState } from 'react';
import { Application, extend } from '@pixi/react';
import { Container, Sprite, Text, Graphics, TextStyle, AnimatedSprite } from 'pixi.js';
import SimpleAnimationScene from './scenes/SimpleAnimationScene';
import { AssetLoader } from './utils/AssetLoader';
import LoadingScreen from './ui/LoadingScreen';

// Register PixiJS components
extend({ Container, Sprite, Text, Graphics, AnimatedSprite });

export const App = () => {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Initializing...');

  useEffect(() => {
    const loadGameAssets = async () => {
      const loader = AssetLoader.getInstance();
      try {
        await loader.loadAssets((prog, msg) => {
          setProgress(prog);
          setLoadingText(msg);
        });
        setLoading(false);
      } catch (e) {
        console.error("Fatal error loading assets:", e);
        setLoadingText("Error loading assets. Please refresh.");
      }
    };

    loadGameAssets();
  }, []);

  return (
    <div className="game-container">
        {loading ? (
            <LoadingScreen progress={progress} currentAsset={loadingText} />
        ) : (
            <Application width={360} height={640} backgroundColor={0x222222}>
                <SimpleAnimationScene />
            </Application>
        )}
    </div>
  );
};

export default App;

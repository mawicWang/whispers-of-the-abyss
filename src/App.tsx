import React, { useEffect, useState } from 'react';
import { Application, extend } from '@pixi/react';
import { Container, Sprite, Text, Graphics, TextStyle, AnimatedSprite } from 'pixi.js';
import SimpleAnimationScene from './scenes/SimpleAnimationScene';
import { TilemapTestScene } from './scenes/TilemapTestScene';
import { AssetLoader } from './utils/AssetLoader';
import LoadingScreen from './ui/LoadingScreen';
import { MainMenu } from './ui/MainMenu';
import { NavigationHeader } from './ui/NavigationHeader';
import { DemonKingInterface } from './ui/DemonKingInterface';
import './App.css';

// Register PixiJS components
extend({ Container, Sprite, Text, Graphics, AnimatedSprite });

type SceneState = 'menu' | 'sprites' | 'tilemap';

export const App = () => {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Initializing...');
  const [currentScene, setCurrentScene] = useState<SceneState>('menu');

  useEffect(() => {
    // Inject CSS variable for global UI icons
    // Use document.baseURI to construct an absolute URL, ensuring robust path resolution
    // whether hosted at root, in a subdirectory, or via local dev server.
    const iconUrl = new URL('assets/UserInterface/UiIcons.png', document.baseURI).href;
    document.documentElement.style.setProperty('--dk-icon-sheet', `url('${iconUrl}')`);

    const loadGameAssets = async () => {
      const loader = AssetLoader.getInstance();
      const assetsToLoad = [
        "Characters/Workers/CyanWorker/FarmerCyan.png",
        "Characters/Workers/RedWorker/FarmerRed.png",
        "Characters/Workers/LimeWorker/FarmerLime.png",
        "Characters/Workers/PurpleWorker/FarmerPurple.png",
        "Characters/Soldiers/Melee/CyanMelee/AxemanCyan.png",
        "Characters/Soldiers/Melee/RedMelee/AxemanRed.png",
        "Characters/Soldiers/Melee/LimeMelee/AxemanLime.png",
        "Characters/Soldiers/Melee/PurpleMelee/AxemanPurple.png",
        // UI Icons are needed for the interface
        "UserInterface/UiIcons.png",
        // Tilemap assets
        "Buildings/WoodenTiles.png"
      ];

      try {
        await loader.loadAssets((prog, msg) => {
          setProgress(prog);
          setLoadingText(msg);
        }, assetsToLoad);
        setLoading(false);
      } catch (e) {
        console.error("Fatal error loading assets:", e);
        setLoadingText("Error loading assets. Please refresh.");
      }
    };

    loadGameAssets();
  }, []);

  const getSceneTitle = () => {
    switch(currentScene) {
        case 'sprites': return 'Sprites Test';
        case 'tilemap': return 'Tile Map Test';
        default: return '';
    }
  };

  return (
    <div className="game-container">
        {loading ? (
            <LoadingScreen progress={progress} currentAsset={loadingText} />
        ) : (
            <>
                {currentScene === 'menu' && (
                    <MainMenu onNavigate={(scene) => setCurrentScene(scene as SceneState)} />
                )}

                {currentScene !== 'menu' && (
                    <NavigationHeader
                        title={getSceneTitle()}
                        onBack={() => setCurrentScene('menu')}
                    />
                )}

                <Application width={360} height={640} backgroundColor={0x222222}>
                    {/* Render SimpleAnimationScene as background for menu */}
                    {currentScene === 'menu' && <SimpleAnimationScene />}
                    {currentScene === 'sprites' && <SimpleAnimationScene />}
                    {currentScene === 'tilemap' && <TilemapTestScene />}
                </Application>

                {/* Only show DemonKingInterface in the sprites scene for now */}
                {/* DemonKingInterface removed from sprites scene per user request */}
            </>
        )}
    </div>
  );
};

export default App;

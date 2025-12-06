import { Assets, Texture, Rectangle } from 'pixi.js';

interface SpriteSheetConfig {
  spriteSize: [number, number];
  columns: number;
  animations?: Record<string, { frames: string }>;
  tiles?: Record<string, { frame: number }>;
  icons?: Record<string, { frame: number }>;
  comment?: string;
}

interface ConfigFile {
  defaults: Record<string, SpriteSheetConfig>;
  sheets: Record<string, SpriteSheetConfig | { $ref: string }>;
}

export class AssetLoader {
  private static instance: AssetLoader;
  private textures: Map<string, Texture> = new Map();
  private animations: Map<string, Texture[]> = new Map();
  private initialized = false;

  private constructor() {}

  public static getInstance(): AssetLoader {
    if (!AssetLoader.instance) {
      AssetLoader.instance = new AssetLoader();
    }
    return AssetLoader.instance;
  }

  public async loadAssets(): Promise<void> {
    if (this.initialized) return;

    try {
      // 1. Load the configuration
      // Use BASE_URL to handle deployment in subdirectories (e.g. GitHub Pages)
      const baseUrl = import.meta.env.BASE_URL;
      const configUrl = `${baseUrl}assets/spritesheet_config.json`;

      const configResponse = await fetch(configUrl);
      const config: ConfigFile = await configResponse.json();

      // 2. Process each sheet in the config
      const loadPromises = Object.entries(config.sheets).map(async ([path, sheetConfig]) => {
        // Resolve $ref if present
        let finalConfig = sheetConfig as SpriteSheetConfig;
        if ('$ref' in sheetConfig) {
             const refPath = (sheetConfig as any).$ref.replace('#/defaults/', '');
             if (config.defaults[refPath]) {
                 finalConfig = { ...config.defaults[refPath], ...sheetConfig };
                 delete (finalConfig as any).$ref;
             }
        }

        // Construct the full URL for the asset
        // The path in keys is like "Characters/Workers/FarmerTemplate.png"
        // We prepend the base URL and assets/
        const assetUrl = `${baseUrl}assets/${path}`;

        // Skip if file doesn't exist (handle 404 gracefully or check existence first if possible,
        // but here we might just try to load and catch error)
        try {
             const texture = await Assets.load(assetUrl);
             if (!texture) {
                 console.warn(`Failed to load texture: ${assetUrl}`);
                 return;
             }

             this.processSheet(texture, finalConfig, path);

        } catch (e) {
            console.warn(`Could not load asset ${assetUrl}:`, e);
        }
      });

      await Promise.all(loadPromises);
      this.initialized = true;
      console.log('Assets loaded successfully');
      console.log('Textures:', this.textures.keys());
      console.log('Animations:', this.animations.keys());

    } catch (error) {
      console.error('Failed to load assets:', error);
    }
  }

  private processSheet(baseTexture: Texture, config: SpriteSheetConfig, sheetPath: string) {
      const [width, height] = config.spriteSize;
      const columns = config.columns;

      // Helper to get frame rect
      const getFrameRect = (index: number) => {
          const col = index % columns;
          const row = Math.floor(index / columns);
          return new Rectangle(col * width, row * height, width, height);
      };

      // Process Animations
      if (config.animations) {
          Object.entries(config.animations).forEach(([animName, animData]) => {
              // Parse frames string "0-5" or "0,1,2"
              const frames: number[] = [];
              if (animData.frames.includes('-')) {
                  const [start, end] = animData.frames.split('-').map(Number);
                  for (let i = start; i <= end; i++) frames.push(i);
              } else {
                  animData.frames.split(',').map(s => frames.push(Number(s.trim())));
              }

              const animTextures = frames.map(i => {
                  const rect = getFrameRect(i);
                  // Ensure rect is within bounds
                  if (rect.x + rect.width > baseTexture.width || rect.y + rect.height > baseTexture.height) {
                      console.warn(`Frame ${i} out of bounds for ${sheetPath}`);
                      return Texture.EMPTY;
                  }
                  return new Texture({ source: baseTexture.source, frame: rect });
              });

              // Store animation with a key.
              // Key convention: "FileNameWithoutExt_AnimationName" or just "AnimationName" if unique?
              // The plan implies we might want to lookup by "FarmerTemplate_walk_down"
              const sheetName = sheetPath.split('/').pop()?.replace(/\.[^/.]+$/, "") || "unknown";
              const key = `${sheetName}_${animName}`;
              this.animations.set(key, animTextures);
          });
      }

      // Process Tiles/Icons (Static Sprites)
      const processStatic = (items: Record<string, { frame: number }>) => {
           Object.entries(items).forEach(([name, data]) => {
              const rect = getFrameRect(data.frame);
               if (rect.x + rect.width > baseTexture.width || rect.y + rect.height > baseTexture.height) {
                      console.warn(`Frame ${data.frame} out of bounds for ${sheetPath}`);
                      return;
               }
              const texture = new Texture({ source: baseTexture.source, frame: rect });

              // Key convention: "name" (assuming unique across project or valid enough)
              // Or "SheetName_name"
              // Given "house_1" in Houses.png, "house_1" seems good.
              this.textures.set(name, texture);
           });
      };

      if (config.tiles) processStatic(config.tiles);
      if (config.icons) processStatic(config.icons);
  }

  public getTexture(key: string): Texture | undefined {
    return this.textures.get(key);
  }

  public getAnimation(key: string): Texture[] | undefined {
    return this.animations.get(key);
  }
}

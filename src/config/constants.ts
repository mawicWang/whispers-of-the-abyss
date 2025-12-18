
// Grid
export const TILE_SIZE = 16;
export const SCREEN_WIDTH = 360;
export const SCREEN_HEIGHT = 640;
export const GRID_W = Math.floor(SCREEN_WIDTH / TILE_SIZE);
export const GRID_H = Math.floor(SCREEN_HEIGHT / TILE_SIZE);

// Colors
export const COLORS = {
  BACKGROUND: 0x333333,
  MANA_BAR: 0x4fc3f7,
  SATIETY_BAR: 0xffb74d,
  SANITY_BAR: 0x0000ff,
  SANITY_BG: 0x000000,
  FOLLOWER_TINT: 0x9d4edd,
  OUTLINE: 0xffffff,
  PLACEHOLDER_BONFIRE: 0xff6600,
  PLACEHOLDER_STATUE: 0x888888,
  PLACEHOLDER_DEFAULT: 0xcccccc
};

// UI
export const UI_Z_INDEX = {
  DEFAULT: 100,
  OVERLAY: 200,
};

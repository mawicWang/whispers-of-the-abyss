
export const SPEEDS = {
  IDLE: 300,
  WALK: 200,
  RUN: 150,
  ATTACK: 100
};

export const SKILL_COSTS = {
  WHISPER: 5,
  INFLUENCE: 1
};

export const SKILL_PARAMS = {
  WHISPER: {
      RADIUS: 30,
      LEVEL_0_DURATION: 10,
      LEVEL_1_DURATION: 20,
      LEVEL_0_DMG_MIN: 1,
      LEVEL_0_DMG_MAX: 6,
      LEVEL_1_DMG_MIN: 2,
      LEVEL_1_DMG_MAX: 12
  },
  INFLUENCE: {
      DURATION: 20,
      TICK_RATE: 2.0,
      SANITY_DRAIN: 1
  }
};

export const WORKER_VARIANTS = ['FarmerCyan', 'FarmerRed', 'FarmerLime', 'FarmerPurple'];

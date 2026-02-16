export interface PhysicsModifiers {
  gravity: number; // Vertical gravity (y-axis relative to table slope)
  friction: number;
  restitution: number; // Bounciness
  slope: number; // Z-axis gravity component
}

export interface VisualTheme {
  primaryColor: string;
  secondaryColor: string;
  floorColor: string;
  ambientIntensity: number;
  neonColor: string;
}

export interface Upgrade {
  name: string;
  description: string;
  icon: string; // Emoji representation
  effectType: 'score_multiplier' | 'extra_life' | 'warp_charge_boost';
}

export interface Planet {
  id: string;
  name: string;
  description: string;
  physics: PhysicsModifiers;
  theme: VisualTheme;
  crewMessage: string;
  bossName?: string;
  artifact?: Upgrade;
}

export enum GameStatus {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  WARPING = 'WARPING',
  GAME_OVER = 'GAME_OVER'
}

export interface GameState {
  status: GameStatus;
  score: number;
  highScore: number;
  currentPlanet: Planet;
  warpReady: boolean;
  lives: number;
  warpCharge: number; // 0 to 100
  artifacts: Upgrade[];
  scoreMultiplier: number;
}

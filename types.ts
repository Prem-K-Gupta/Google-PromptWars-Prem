
export interface PhysicsModifiers {
  gravity: number;
  friction: number;
  restitution: number;
  slope: number;
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
  icon: string;
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
  imageUrl?: string;
  videoUrl?: string; // New: Cinematic entry video
  audioBase64?: string;
  sources?: string[];
}

export enum GameStatus {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  WARPING = 'WARPING',
  GAME_OVER = 'GAME_OVER',
  KEY_SELECTION = 'KEY_SELECTION' // New: Billing compliance step
}

export interface GameState {
  status: GameStatus;
  score: number;
  highScore: number;
  currentPlanet: Planet;
  warpReady: boolean;
  lives: number;
  warpCharge: number;
  artifacts: Upgrade[];
  scoreMultiplier: number;
  performanceReview?: string; // New: AI post-game analysis
}

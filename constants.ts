import { Planet, GameState, GameStatus } from './types';

export const INITIAL_PLANET: Planet = {
  id: 'home-base',
  name: 'Home Base',
  description: 'The standard training facility for Void Cadets.',
  physics: {
    gravity: -12, // Slightly heavier for better feel
    friction: 0.1,
    restitution: 0.6,
    slope: 8, // Steeper slope for speed
  },
  theme: {
    primaryColor: '#3b82f6', // Blue-500
    secondaryColor: '#1d4ed8', // Blue-700
    floorColor: '#0f172a', // Slate-900
    ambientIntensity: 0.5,
    neonColor: '#60a5fa',
  },
  crewMessage: "Welcome aboard, Cadet. Hold SPACE to launch!",
  bossName: "Training Drone Alpha"
};

export const INITIAL_GAME_STATE: GameState = {
  status: GameStatus.MENU,
  score: 0,
  highScore: 0,
  currentPlanet: INITIAL_PLANET,
  warpReady: false,
  lives: 3,
  warpCharge: 0,
  artifacts: [],
  scoreMultiplier: 1
};

export const WARP_THRESHOLD = 2000;

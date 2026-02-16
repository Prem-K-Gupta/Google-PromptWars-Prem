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

export interface Planet {
  id: string;
  name: string;
  description: string;
  physics: PhysicsModifiers;
  theme: VisualTheme;
  crewMessage: string;
  bossName?: string;
}

export interface GameState {
  score: number;
  highScore: number;
  currentPlanet: Planet;
  isWarping: boolean;
  warpReady: boolean;
  lives: number;
  warpCharge: number; // 0 to 100
}

export interface WarpData {
  planet: Planet;
  generationDuration: number;
}

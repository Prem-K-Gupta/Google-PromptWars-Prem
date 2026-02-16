import { Planet } from './types';

export const INITIAL_PLANET: Planet = {
  id: 'home-base',
  name: 'Home Base',
  description: 'The standard training facility for Void Cadets.',
  physics: {
    gravity: -9.8,
    friction: 0.1,
    restitution: 0.5,
    slope: 5,
  },
  theme: {
    primaryColor: '#3b82f6', // Blue-500
    secondaryColor: '#1d4ed8', // Blue-700
    floorColor: '#111827', // Gray-900
    ambientIntensity: 0.5,
    neonColor: '#60a5fa',
  },
  crewMessage: "Welcome aboard, Cadet. Launch the ball to begin systems check.",
  bossName: "Training Drone Alpha"
};

export const WARP_THRESHOLD = 500; // Score needed to charge warp

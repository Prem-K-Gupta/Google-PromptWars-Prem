import React, { useState, useEffect, useCallback } from 'react';
import { GameScene } from './components/Scene';
import { INITIAL_PLANET, WARP_THRESHOLD } from './constants';
import { GameState, Planet } from './types';
import { generateNextPlanet } from './services/geminiService';
import { GoogleGenAI } from "@google/genai";

// UI Components
const HUD = ({ state }: { state: GameState }) => (
  <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none z-10 text-white font-mono">
    <div>
      <h1 className="text-4xl font-black italic tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
        VOID CADET
      </h1>
      <div className="mt-2 text-sm opacity-80">
        <p>SECTOR: <span style={{ color: state.currentPlanet.theme.neonColor }}>{state.currentPlanet.name}</span></p>
        <p>GRAVITY: {state.currentPlanet.physics.gravity} G</p>
      </div>
    </div>
    
    <div className="text-right">
      <div className="text-6xl font-bold drop-shadow-md">{state.score.toLocaleString()}</div>
      <div className="mt-2 flex flex-col items-end gap-1">
         <div className="text-sm">WARP CHARGE</div>
         <div className="w-48 h-4 bg-gray-800 border border-gray-600 rounded overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${state.warpReady ? 'bg-green-400 animate-pulse' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(state.warpCharge, 100)}%` }}
            />
         </div>
         {state.warpReady && <div className="text-green-400 font-bold animate-bounce text-xs mt-1">WARP GATE OPEN</div>}
      </div>
    </div>
  </div>
);

const CrewMessage = ({ message, boss }: { message: string, boss?: string }) => (
  <div className="absolute bottom-8 left-8 max-w-md pointer-events-none z-10">
    <div className="bg-black/80 border-l-4 border-blue-500 p-4 rounded backdrop-blur-sm shadow-lg transform transition-all hover:scale-105">
      <div className="flex items-center gap-3 mb-2">
         <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">AI</div>
         <span className="text-blue-400 font-bold text-sm tracking-widest">TACTICIAN</span>
      </div>
      <p className="text-gray-200 text-sm leading-relaxed typing-effect">"{message}"</p>
      {boss && (
        <div className="mt-2 border-t border-gray-700 pt-2 text-red-400 text-xs">
           WARNING: {boss} DETECTED
        </div>
      )}
    </div>
  </div>
);

const WarpOverlay = ({ planet, visible }: { planet: Planet, visible: boolean }) => {
  if (!visible) return null;
  return (
    <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center animate-in fade-in duration-1000">
      <div className="text-center space-y-8 p-10 relative overflow-hidden">
        {/* Hyperspace Effect Background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900 via-black to-black opacity-50 animate-pulse"></div>
        
        <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 relative z-10">
          WARP JUMP INITIATED
        </h2>
        
        <div className="relative z-10 bg-gray-900/90 p-8 rounded-xl border border-gray-700 max-w-xl mx-auto text-left shadow-2xl">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-4">Destination Scanned</div>
          <h3 className="text-3xl font-bold text-white mb-2" style={{ color: planet.theme.neonColor }}>{planet.name}</h3>
          <p className="text-gray-400 mb-6 italic">{planet.description}</p>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-800 p-3 rounded">
               <span className="block text-gray-500 text-xs">GRAVITY</span>
               <span className="text-white font-mono">{planet.physics.gravity} m/s²</span>
            </div>
            <div className="bg-gray-800 p-3 rounded">
               <span className="block text-gray-500 text-xs">FRICTION</span>
               <span className="text-white font-mono">{planet.physics.friction.toFixed(2)} Coeff</span>
            </div>
          </div>
          
          <div className="mt-6 flex items-center gap-3 text-yellow-400 text-xs border border-yellow-900/50 bg-yellow-900/20 p-2 rounded">
             <span className="text-lg">⚠</span>
             <span>Physics parameters reconfigured. Adjust playstyle immediately.</span>
          </div>
        </div>
        
        <div className="text-gray-500 text-sm animate-pulse relative z-10">
           Stabilizing Reality Engine...
        </div>
      </div>
    </div>
  );
};

const ApiKeyModal = ({ onSave }: { onSave: () => void }) => {
   // Since the user is not allowed to input API KEY, this component is technically not needed by the prompt instructions 
   // "The application must not ask the user for it under any circumstances."
   // However, for local dev without env vars, one might need it. 
   // Following strict instructions: "Do not generate any UI elements ... for entering or managing the API key."
   // I will rely purely on process.env.API_KEY as instructed.
   // This component is intentionally left empty/unused in final render logic if strictly following guidelines,
   // but to ensure the app works if the key is missing (fallback mode), I will handle it gracefully in the service.
   return null; 
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    highScore: 0,
    currentPlanet: INITIAL_PLANET,
    isWarping: false,
    warpReady: false,
    lives: 3,
    warpCharge: 0
  });

  const [nextPlanet, setNextPlanet] = useState<Planet | null>(null);

  // Score Logic
  const handleScore = useCallback((points: number) => {
    setGameState(prev => {
      const newScore = prev.score + points;
      const charge = Math.min(prev.warpCharge + (points / WARP_THRESHOLD) * 100, 100);
      return {
        ...prev,
        score: newScore,
        warpCharge: charge,
        warpReady: charge >= 100
      };
    });
  }, []);

  // Ball Lost Logic
  const handleBallLost = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      lives: Math.max(0, prev.lives - 1),
      score: Math.max(0, prev.score - 500) // Penalty
    }));
  }, []);

  // Warp Logic
  const handleWarpEnter = useCallback(async () => {
    // Only warp if ready and not already warping
    if (!gameState.warpReady || gameState.isWarping) return;

    setGameState(prev => ({ ...prev, isWarping: true }));

    // 1. Fetch next planet data from Gemini
    console.log("Warping! contacting Gemini...");
    const newPlanet = await generateNextPlanet(gameState);
    
    setNextPlanet(newPlanet);

    // 2. Delay for effect, then switch
    setTimeout(() => {
        setGameState(prev => ({
            ...prev,
            currentPlanet: newPlanet,
            isWarping: false,
            warpReady: false,
            warpCharge: 0,
            lives: prev.lives + 1 // Bonus life for warping
        }));
        setNextPlanet(null);
    }, 4000); // 4 second transition

  }, [gameState.warpReady, gameState.isWarping, gameState.currentPlanet, gameState.score]);

  return (
    <div className="w-full h-full relative bg-black font-sans select-none">
      
      {/* 3D Game Layer */}
      <div className={`w-full h-full transition-opacity duration-1000 ${gameState.isWarping ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        <GameScene 
            planet={gameState.currentPlanet} 
            onScore={handleScore}
            onWarpEnter={handleWarpEnter}
            onBallLost={handleBallLost}
            warpReady={gameState.warpReady}
            active={!gameState.isWarping}
        />
      </div>

      {/* UI Overlay Layer */}
      <HUD state={gameState} />
      <CrewMessage message={gameState.currentPlanet.crewMessage} boss={gameState.currentPlanet.bossName} />

      {/* Controls Hint */}
      <div className="absolute bottom-4 right-4 text-gray-500 text-xs pointer-events-none">
          CONTROLS: LEFT/RIGHT ARROWS or A/D
      </div>

      {/* Warp Transition Screen */}
      <WarpOverlay planet={nextPlanet || gameState.currentPlanet} visible={gameState.isWarping} />
      
    </div>
  );
}

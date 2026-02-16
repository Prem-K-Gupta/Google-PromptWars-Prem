import React, { useState, useEffect, useCallback } from 'react';
import { GameScene } from './components/Scene';
import { INITIAL_PLANET, INITIAL_GAME_STATE, WARP_THRESHOLD } from './constants';
import { GameState, Planet, GameStatus } from './types';
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
        <div className="flex gap-2 mt-1">
           {[...Array(state.lives)].map((_, i) => (
               <div key={i} className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_5px_red]" />
           ))}
        </div>
      </div>
      
      {/* Artifacts Display */}
      <div className="mt-4 flex flex-col gap-2">
         {state.artifacts.map((art, i) => (
             <div key={i} className="flex items-center gap-2 bg-black/50 p-1 rounded px-2 border border-gray-700 animate-in fade-in slide-in-from-left">
                 <span>{art.icon}</span>
                 <span className="text-xs text-gray-300">{art.name}</span>
             </div>
         ))}
      </div>
    </div>
    
    <div className="text-right">
      <div className="text-6xl font-bold drop-shadow-md text-blue-100">{state.score.toLocaleString()}</div>
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

const MenuScreen = ({ onStart, highScore }: { onStart: () => void, highScore: number }) => (
    <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center text-white p-8">
        <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-purple-600 mb-4">
            VOID CADET
        </h1>
        <p className="text-2xl font-mono text-blue-200 mb-12 tracking-widest">THE INFINITE ARCADE</p>
        
        <div className="bg-gray-900/50 p-8 rounded-xl border border-blue-500/30 backdrop-blur-sm mb-8 text-center">
            <div className="text-sm text-gray-400 mb-2">HIGH SCORE</div>
            <div className="text-4xl font-bold">{highScore.toLocaleString()}</div>
        </div>

        <button 
            onClick={onStart}
            className="group relative px-12 py-4 bg-blue-600 hover:bg-blue-500 transition-all rounded text-xl font-bold tracking-wider overflow-hidden"
        >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"/>
            LAUNCH MISSION
        </button>
        
        <div className="mt-8 text-gray-500 text-sm font-mono">
            CONTROLS: ARROWS (FLIPPERS) • SPACE (PLUNGER)
        </div>
    </div>
);

const GameOverScreen = ({ score, onRestart }: { score: number, onRestart: () => void }) => (
    <div className="absolute inset-0 z-50 bg-red-900/90 flex flex-col items-center justify-center text-white p-8 animate-in fade-in">
        <h2 className="text-6xl font-black mb-4 tracking-tighter">CRITICAL FAILURE</h2>
        <div className="text-2xl mb-8">FINAL SCORE: {score.toLocaleString()}</div>
        <button 
            onClick={onRestart}
            className="px-8 py-3 border-2 border-white hover:bg-white hover:text-black transition-colors font-bold tracking-widest"
        >
            REBOOT SYSTEM
        </button>
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
          
          <div className="grid grid-cols-2 gap-4 text-sm mb-6">
            <div className="bg-gray-800 p-3 rounded">
               <span className="block text-gray-500 text-xs">GRAVITY</span>
               <span className="text-white font-mono">{planet.physics.gravity} m/s²</span>
            </div>
            <div className="bg-gray-800 p-3 rounded">
               <span className="block text-gray-500 text-xs">FRICTION</span>
               <span className="text-white font-mono">{planet.physics.friction.toFixed(2)} Coeff</span>
            </div>
          </div>

          {planet.artifact && (
              <div className="bg-blue-900/30 border border-blue-500/50 p-4 rounded flex items-center gap-4">
                  <span className="text-4xl">{planet.artifact.icon}</span>
                  <div>
                      <div className="text-blue-300 text-xs font-bold uppercase">Artifact Detected</div>
                      <div className="font-bold text-white">{planet.artifact.name}</div>
                      <div className="text-gray-400 text-xs">{planet.artifact.description}</div>
                  </div>
              </div>
          )}
        </div>
        
        <div className="text-gray-500 text-sm animate-pulse relative z-10">
           Stabilizing Reality Engine...
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>(INITIAL_GAME_STATE);
  const [nextPlanet, setNextPlanet] = useState<Planet | null>(null);
  const [resetTrigger, setResetTrigger] = useState(0); // Signal to scene to respawn ball

  // Score Logic
  const handleScore = useCallback((points: number) => {
    if (gameState.status !== GameStatus.PLAYING) return;
    
    setGameState(prev => {
      const multipliedPoints = points * prev.scoreMultiplier;
      const newScore = prev.score + multipliedPoints;
      // Calculate warp charge: 100% at Threshold
      const charge = Math.min(prev.warpCharge + (multipliedPoints / WARP_THRESHOLD) * 100, 100);
      return {
        ...prev,
        score: newScore,
        highScore: Math.max(newScore, prev.highScore),
        warpCharge: charge,
        warpReady: charge >= 100
      };
    });
  }, [gameState.status]);

  // Ball Lost Logic
  const handleBallLost = useCallback(() => {
    if (gameState.status !== GameStatus.PLAYING) return;

    setGameState(prev => {
      const newLives = prev.lives - 1;
      if (newLives < 0) {
          return { ...prev, status: GameStatus.GAME_OVER };
      }
      return { ...prev, lives: newLives };
    });
    
    // Trigger respawn if not game over
    if (gameState.lives > 0) {
        setResetTrigger(n => n + 1);
    }
  }, [gameState.status, gameState.lives]);

  // Warp Logic
  const handleWarpEnter = useCallback(async () => {
    if (!gameState.warpReady || gameState.status === GameStatus.WARPING) return;

    setGameState(prev => ({ ...prev, status: GameStatus.WARPING }));

    // 1. Fetch next planet data from Gemini
    const newPlanet = await generateNextPlanet(gameState);
    setNextPlanet(newPlanet);

    // 2. Delay for transition effect
    setTimeout(() => {
        setGameState(prev => {
            // Apply Artifact Effects
            let newMultiplier = prev.scoreMultiplier;
            let newLives = prev.lives;
            let newCharge = 0;

            if (newPlanet.artifact) {
                if (newPlanet.artifact.effectType === 'score_multiplier') newMultiplier += 0.5;
                if (newPlanet.artifact.effectType === 'extra_life') newLives += 1;
                if (newPlanet.artifact.effectType === 'warp_charge_boost') newCharge = 50;
            }

            return {
                ...prev,
                currentPlanet: newPlanet,
                status: GameStatus.PLAYING,
                warpReady: false,
                warpCharge: newCharge,
                lives: newLives, // Bonus life logic handled by artifact or warp? Let's just do artifact.
                scoreMultiplier: newMultiplier,
                artifacts: newPlanet.artifact ? [...prev.artifacts, newPlanet.artifact] : prev.artifacts
            };
        });
        setNextPlanet(null);
        setResetTrigger(n => n + 1); // Respawn ball on new planet
    }, 4000);

  }, [gameState.warpReady, gameState.status]);

  // Game Start
  const startGame = () => {
      setGameState({
          ...INITIAL_GAME_STATE,
          highScore: gameState.highScore,
          status: GameStatus.PLAYING
      });
      setResetTrigger(n => n + 1);
  };

  return (
    <div className="w-full h-full relative bg-black font-sans select-none overflow-hidden">
      
      {/* 3D Game Layer */}
      <div className={`w-full h-full transition-opacity duration-1000 ${gameState.status === GameStatus.WARPING ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        <GameScene 
            planet={gameState.currentPlanet} 
            onScore={handleScore}
            onWarpEnter={handleWarpEnter}
            onBallLost={handleBallLost}
            warpReady={gameState.warpReady}
            gameStatus={gameState.status}
            resetTrigger={resetTrigger}
        />
      </div>

      {/* Screens */}
      {gameState.status === GameStatus.MENU && <MenuScreen onStart={startGame} highScore={gameState.highScore} />}
      {gameState.status === GameStatus.GAME_OVER && <GameOverScreen score={gameState.score} onRestart={() => setGameState(prev => ({...INITIAL_GAME_STATE, highScore: prev.highScore}))} />}
      
      {/* HUD Layer (Only visible when playing) */}
      {(gameState.status === GameStatus.PLAYING || gameState.status === GameStatus.WARPING) && (
          <>
            <HUD state={gameState} />
            <CrewMessage message={gameState.currentPlanet.crewMessage} boss={gameState.currentPlanet.bossName} />
            
            {/* Controls Hint */}
            <div className="absolute bottom-4 right-4 text-gray-500 text-xs pointer-events-none">
                CONTROLS: LEFT/RIGHT (Flip) • SPACE (Launch)
            </div>
          </>
      )}

      {/* Warp Transition Screen */}
      <WarpOverlay planet={nextPlanet || gameState.currentPlanet} visible={gameState.status === GameStatus.WARPING} />
      
    </div>
  );
}

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameScene } from './components/Scene';
import { INITIAL_PLANET, INITIAL_GAME_STATE, WARP_THRESHOLD } from './constants';
import { GameState, Planet, GameStatus } from './types';
import { generateNextPlanet, fetchGalacticNews } from './services/geminiService';

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
    
    <div className="text-right flex flex-col items-end gap-2">
      <div className="text-6xl font-bold drop-shadow-md text-blue-100">{state.score.toLocaleString()}</div>
      <div className="flex flex-col items-end gap-1">
         <div className="text-sm">WARP CHARGE</div>
         <div className="w-48 h-4 bg-gray-800 border border-gray-600 rounded overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${state.warpReady ? 'bg-green-400 animate-pulse' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(state.warpCharge, 100)}%` }}
            />
         </div>
         {state.warpReady && <div className="text-green-400 font-bold animate-bounce text-xs mt-1">WARP GATE OPEN</div>}
      </div>
      
      {/* Real-time Galactic News */}
      <GalacticNewsFeed />
    </div>
  </div>
);

const GalacticNewsFeed = () => {
  const [news, setNews] = useState<{ text: string; url: string | null; title: string } | null>(null);

  useEffect(() => {
    const loadNews = async () => {
      const data = await fetchGalacticNews();
      if (data) setNews(data);
    };
    loadNews();
    const interval = setInterval(loadNews, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  if (!news) return null;

  return (
    <div className="mt-4 max-w-xs bg-indigo-900/30 border border-indigo-500/30 p-2 rounded text-[10px] text-indigo-200 pointer-events-auto cursor-default hover:bg-indigo-900/50 transition-colors">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
        <span className="font-bold text-indigo-400 uppercase tracking-tighter">GALACTIC BROADCAST</span>
      </div>
      <p className="line-clamp-2">{news.text}</p>
      {news.url && (
        <a 
          href={news.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-white underline mt-1 block"
        >
          View Source: {news.title}
        </a>
      )}
    </div>
  );
};

const CrewMessage = ({ message, boss }: { message: string, boss?: string }) => (
  <div className="absolute bottom-8 left-8 max-w-md pointer-events-none z-10">
    <div className="bg-black/80 border-l-4 border-blue-500 p-4 rounded backdrop-blur-sm shadow-lg transform transition-all hover:scale-105">
      <div className="flex items-center gap-3 mb-2">
         <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">AI</div>
         <span className="text-blue-400 font-bold text-sm tracking-widest uppercase">Tactician</span>
      </div>
      <p className="text-gray-200 text-sm leading-relaxed">"{message}"</p>
      {boss && (
        <div className="mt-2 border-t border-gray-700 pt-2 text-red-400 text-xs font-bold animate-pulse">
           TARGET DETECTED: {boss.toUpperCase()}
        </div>
      )}
    </div>
  </div>
);

const MenuScreen = ({ onStart, highScore }: { onStart: () => void, highScore: number }) => (
    <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center text-white p-8">
        <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-purple-600 mb-4 drop-shadow-[0_0_30px_rgba(59,130,246,0.5)]">
            VOID CADET
        </h1>
        <p className="text-2xl font-mono text-blue-200 mb-12 tracking-widest opacity-80">THE INFINITE ARCADE</p>
        
        <div className="bg-gray-900/50 p-8 rounded-xl border border-blue-500/30 backdrop-blur-sm mb-8 text-center">
            <div className="text-sm text-gray-400 mb-2 font-mono">HIGHEST LOGGED SCORE</div>
            <div className="text-4xl font-bold font-display">{highScore.toLocaleString()}</div>
        </div>

        <button 
            onClick={onStart}
            className="group relative px-12 py-4 bg-blue-600 hover:bg-blue-500 transition-all rounded text-xl font-bold tracking-wider overflow-hidden shadow-[0_0_20px_rgba(37,99,235,0.4)]"
        >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"/>
            LAUNCH MISSION
        </button>
        
        <div className="mt-12 flex flex-col items-center gap-2 text-gray-500 text-sm font-mono opacity-60">
            <div className="flex gap-8">
               <span>ARROWS : FLIPPERS</span>
               <span>SPACE : PLUNGER</span>
            </div>
            <p>Powered by Gemini Intelligence & Real-time Space Data</p>
        </div>
    </div>
);

const GameOverScreen = ({ score, onRestart }: { score: number, onRestart: () => void }) => (
    <div className="absolute inset-0 z-50 bg-red-900/95 flex flex-col items-center justify-center text-white p-8 animate-in fade-in duration-500">
        <h2 className="text-7xl font-black mb-4 tracking-tighter text-red-100">CRITICAL FAILURE</h2>
        <div className="text-2xl font-mono mb-8 opacity-80 uppercase tracking-widest">System Integrity Compromised</div>
        <div className="text-4xl font-bold mb-12 border-y border-red-500/30 py-4">FINAL SCORE: {score.toLocaleString()}</div>
        <button 
            onClick={onRestart}
            className="px-12 py-4 border-2 border-white hover:bg-white hover:text-black transition-all font-bold tracking-widest uppercase rounded"
        >
            REBOOT SYSTEM
        </button>
    </div>
);

const WarpOverlay = ({ planet, visible }: { planet: Planet, visible: boolean }) => {
  if (!visible) return null;
  return (
    <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center animate-in fade-in duration-700">
      <div className="text-center space-y-8 p-10 relative overflow-hidden w-full max-w-4xl">
        {/* Hyperspace Effect Background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900 via-black to-black opacity-50 animate-pulse"></div>
        
        <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-600 relative z-10 tracking-tighter">
          WARP JUMP INITIATED
        </h2>
        
        <div className="relative z-10 bg-black/80 p-10 rounded-xl border border-indigo-500/30 max-w-2xl mx-auto text-left shadow-[0_0_50px_rgba(79,70,229,0.2)] backdrop-blur-xl">
          <div className="text-xs text-indigo-400 font-bold uppercase tracking-[0.3em] mb-4 border-b border-indigo-500/20 pb-2">Grounded Data Syncing...</div>
          <h3 className="text-4xl font-black text-white mb-3" style={{ color: planet.theme.neonColor }}>{planet.name}</h3>
          <p className="text-indigo-100/70 mb-8 italic leading-relaxed text-sm">"{planet.description}"</p>
          
          <div className="grid grid-cols-2 gap-6 text-sm mb-8">
            <div className="bg-white/5 p-4 rounded-lg border border-white/10">
               <span className="block text-indigo-400 text-[10px] font-bold uppercase mb-1">Gravity Profile</span>
               <span className="text-white font-mono text-xl">{planet.physics.gravity} G</span>
            </div>
            <div className="bg-white/5 p-4 rounded-lg border border-white/10">
               <span className="block text-indigo-400 text-[10px] font-bold uppercase mb-1">Surface Friction</span>
               <span className="text-white font-mono text-xl">{(planet.physics.friction * 100).toFixed(0)}% MU</span>
            </div>
          </div>

          {planet.artifact && (
              <div className="bg-blue-600/20 border border-blue-500/50 p-5 rounded-lg flex items-center gap-6 animate-pulse">
                  <div className="text-5xl drop-shadow-lg">{planet.artifact.icon}</div>
                  <div>
                      <div className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-1">Local Artifact Recovered</div>
                      <div className="font-bold text-white text-lg leading-none mb-1">{planet.artifact.name}</div>
                      <div className="text-gray-400 text-xs">{planet.artifact.description}</div>
                  </div>
              </div>
          )}
        </div>
        
        <div className="flex flex-col items-center gap-2 relative z-10">
           <div className="w-64 h-1 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 animate-[loading_4s_ease-in-out_infinite]" />
           </div>
           <div className="text-blue-400 text-[10px] font-bold tracking-widest uppercase animate-pulse">
              Stabilizing Reality Engine...
           </div>
        </div>
      </div>
      <style>{`
        @keyframes loading {
          0% { width: 0%; transform: translateX(0%); }
          50% { width: 70%; }
          100% { width: 100%; transform: translateX(0%); }
        }
      `}</style>
    </div>
  );
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>(INITIAL_GAME_STATE);
  const [nextPlanet, setNextPlanet] = useState<Planet | null>(null);
  const [resetTrigger, setResetTrigger] = useState(0); 

  const handleScore = useCallback((points: number) => {
    if (gameState.status !== GameStatus.PLAYING) return;
    
    setGameState(prev => {
      const multipliedPoints = points * prev.scoreMultiplier;
      const newScore = prev.score + multipliedPoints;
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

  const handleBallLost = useCallback(() => {
    if (gameState.status !== GameStatus.PLAYING) return;

    setGameState(prev => {
      const newLives = prev.lives - 1;
      if (newLives < 0) {
          return { ...prev, status: GameStatus.GAME_OVER };
      }
      return { ...prev, lives: newLives };
    });
    
    if (gameState.lives > 0) {
        setResetTrigger(n => n + 1);
    }
  }, [gameState.status, gameState.lives]);

  const handleWarpEnter = useCallback(async () => {
    if (!gameState.warpReady || gameState.status === GameStatus.WARPING) return;

    setGameState(prev => ({ ...prev, status: GameStatus.WARPING }));

    const newPlanet = await generateNextPlanet(gameState);
    setNextPlanet(newPlanet);

    setTimeout(() => {
        setGameState(prev => {
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
                lives: newLives,
                scoreMultiplier: newMultiplier,
                artifacts: newPlanet.artifact ? [...prev.artifacts, newPlanet.artifact] : prev.artifacts
            };
        });
        setNextPlanet(null);
        setResetTrigger(n => n + 1); 
    }, 4500);

  }, [gameState.warpReady, gameState.status]);

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
      <div className={`w-full h-full transition-all duration-1000 ${gameState.status === GameStatus.WARPING ? 'opacity-0 scale-90 rotate-1 blur-xl' : 'opacity-100 scale-100 rotate-0 blur-0'}`}>
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
            
            <div className="absolute bottom-4 right-4 text-white/20 text-[10px] font-mono pointer-events-none uppercase tracking-[0.2em]">
                VOID-NET CONNECTION ACTIVE • QUANTUM SYNC STABLE
            </div>
          </>
      )}

      {/* Warp Transition Screen */}
      <WarpOverlay planet={nextPlanet || gameState.currentPlanet} visible={gameState.status === GameStatus.WARPING} />
      
    </div>
  );
}
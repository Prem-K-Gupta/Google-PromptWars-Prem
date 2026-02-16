
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameScene } from './components/Scene';
import { INITIAL_GAME_STATE, WARP_THRESHOLD } from './constants';
import { GameState, Planet, GameStatus } from './types';
import { generateNextPlanet, fetchGalacticNews, playCrewAudio, fetchNearbySpaceHubs, generatePerformanceReview } from './services/geminiService';

const HUD = ({ state }: { state: GameState }) => (
  <header className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none z-10 text-white font-mono">
    <div>
      <h1 className="text-4xl font-black italic tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">VOID CADET</h1>
      <div className="mt-2 text-sm opacity-80">
        <p>SECTOR: <span style={{ color: state.currentPlanet.theme.neonColor }}>{state.currentPlanet.name}</span></p>
        <div className="flex gap-2 mt-1" aria-label={`Lives: ${state.lives}`}>
           {[...Array(state.lives)].map((_, i) => (
               <div key={i} className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_5px_red]" />
           ))}
        </div>
      </div>
    </div>
    <div className="text-right flex flex-col items-end gap-2">
      <div className="text-6xl font-bold tabular-nums">{state.score.toLocaleString()}</div>
      <div className="w-48 h-2 bg-gray-800 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ${state.warpReady ? 'bg-green-400' : 'bg-blue-500'}`}
          style={{ width: `${Math.min(state.warpCharge, 100)}%` }}
        />
      </div>
      <GalacticNewsFeed />
    </div>
  </header>
);

const GalacticNewsFeed = () => {
  const [news, setNews] = useState<{ text: string; url: string | null; title: string } | null>(null);
  useEffect(() => { fetchGalacticNews().then(d => d && setNews(d)); }, []);
  if (!news) return null;
  return (
    <div className="mt-4 max-w-xs bg-indigo-900/30 border border-indigo-500/30 p-2 rounded text-[10px] text-indigo-200 pointer-events-auto">
      <p className="line-clamp-2 italic">{news.text}</p>
    </div>
  );
};

const CrewMessage = ({ message, audio }: { message: string, audio?: string }) => {
  useEffect(() => { if (audio) playCrewAudio(audio); }, [audio]);
  return (
    <div className="absolute bottom-8 left-8 max-w-md pointer-events-none z-10" aria-live="polite">
      <div className="bg-black/90 border-l-4 border-blue-500 p-5 rounded backdrop-blur-md">
        <p className="text-gray-100 text-sm italic">"{message}"</p>
      </div>
    </div>
  );
};

const WarpOverlay = ({ planet, visible }: { planet: Planet, visible: boolean }) => {
  if (!visible) return null;
  return (
    <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center animate-in fade-in duration-1000">
      <div className="relative z-10 flex flex-col items-center gap-8 max-w-3xl text-center px-6">
        <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600 italic">WARP SEQUENCE</h2>
        
        {planet.videoUrl ? (
          <div className="w-full aspect-video rounded-2xl border border-blue-500/50 overflow-hidden shadow-[0_0_50px_rgba(37,99,235,0.3)]">
            <video 
              src={planet.videoUrl} 
              autoPlay 
              muted 
              loop 
              playsInline 
              className="w-full h-full object-cover" 
            />
          </div>
        ) : planet.imageUrl ? (
          <img src={planet.imageUrl} className="w-full aspect-video rounded-2xl object-cover border border-blue-500/50" alt="Destination" />
        ) : (
          <div className="w-full aspect-video flex items-center justify-center bg-gray-900 rounded-2xl animate-pulse">
            <span className="text-blue-400 font-mono">CALCULATING TRAJECTORY...</span>
          </div>
        )}

        <div className="bg-black/80 p-6 rounded-xl border border-indigo-500/30">
          <h3 className="text-3xl font-bold" style={{ color: planet.theme.neonColor }}>{planet.name}</h3>
          <p className="text-gray-400 text-xs mt-2 uppercase tracking-[0.3em]">Distance Syncing: 100%</p>
        </div>
      </div>
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
      return { ...prev, score: newScore, warpCharge: charge, warpReady: charge >= 100 };
    });
  }, [gameState.status]);

  const handleBallLost = useCallback(async () => {
    if (gameState.status !== GameStatus.PLAYING) return;
    
    const newLives = gameState.lives - 1;
    if (newLives < 0) {
        setGameState(prev => ({ ...prev, status: GameStatus.GAME_OVER }));
        const review = await generatePerformanceReview(gameState);
        setGameState(prev => ({ ...prev, performanceReview: review }));
    } else {
        setGameState(prev => ({ ...prev, lives: newLives }));
        setResetTrigger(n => n + 1);
    }
  }, [gameState]);

  const handleWarpEnter = useCallback(async () => {
    if (!gameState.warpReady || gameState.status === GameStatus.WARPING) return;
    setGameState(prev => ({ ...prev, status: GameStatus.WARPING }));
    const planetData = await generateNextPlanet(gameState);
    setNextPlanet(planetData);

    setTimeout(() => {
        setGameState(prev => ({
            ...prev,
            currentPlanet: planetData,
            status: GameStatus.PLAYING,
            warpReady: false,
            warpCharge: 0,
            lives: Math.min(prev.lives + 1, 5),
            artifacts: planetData.artifact ? [...prev.artifacts, planetData.artifact] : prev.artifacts
        }));
        setNextPlanet(null);
        setResetTrigger(n => n + 1); 
    }, 8000); // Longer timeout for video appreciation
  }, [gameState.warpReady, gameState.status, gameState]);

  const initKeySelection = async () => {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      setGameState(p => ({...p, status: GameStatus.PLAYING}));
  };

  return (
    <div className="w-full h-full relative bg-black select-none overflow-hidden text-white">
      <div className={`w-full h-full transition-opacity duration-1000 ${gameState.status === GameStatus.PLAYING ? 'opacity-100' : 'opacity-20 blur-sm'}`}>
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

      {gameState.status === GameStatus.MENU && (
        <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-8 animate-in fade-in">
          <h1 className="text-8xl font-black text-blue-500 mb-8 font-display italic tracking-tighter">VOID CADET</h1>
          <button 
            onClick={() => setGameState(p => ({...p, status: GameStatus.KEY_SELECTION}))} 
            className="px-16 py-5 bg-blue-600 font-black rounded hover:bg-blue-500 transition-all text-xl"
          >
            INITIATE MISSION
          </button>
        </div>
      )}

      {gameState.status === GameStatus.KEY_SELECTION && (
        <div className="absolute inset-0 z-50 bg-indigo-950/90 flex flex-col items-center justify-center p-8 text-center">
            <h2 className="text-4xl font-bold mb-4">VE-O ENGINE COMPLIANCE</h2>
            <p className="max-w-md mb-8 text-indigo-200">Cinematic warp generation requires a paid API key for high-compute video processing. Please select your project.</p>
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-blue-400 underline mb-6 block">Billing Documentation</a>
            <button 
                onClick={initKeySelection}
                className="px-12 py-4 bg-white text-indigo-900 font-bold rounded-full hover:scale-105 transition-transform"
            >
                SELECT API KEY
            </button>
        </div>
      )}

      {gameState.status === GameStatus.GAME_OVER && (
        <div className="absolute inset-0 z-50 bg-red-950/95 flex flex-col items-center justify-center p-8 text-center" role="alert">
          <h2 className="text-7xl font-black mb-4 text-red-500 font-display italic">MISSION FAILED</h2>
          <div className="max-w-xl bg-black/40 p-6 rounded border border-red-500/20 mb-8">
              <h3 className="text-xs uppercase tracking-widest text-red-400 mb-2">AI Performance Debrief</h3>
              <p className="text-lg italic text-red-100">{gameState.performanceReview || "Analyzing fatal errors..."}</p>
          </div>
          <button onClick={() => location.reload()} className="px-12 py-4 border-2 border-white font-black rounded">REBOOT SYSTEM</button>
        </div>
      )}
      
      {gameState.status === GameStatus.PLAYING && (
          <main>
            <HUD state={gameState} />
            <CrewMessage message={gameState.currentPlanet.crewMessage} audio={gameState.currentPlanet.audioBase64} />
          </main>
      )}

      <WarpOverlay planet={nextPlanet || gameState.currentPlanet} visible={gameState.status === GameStatus.WARPING} />
    </div>
  );
}

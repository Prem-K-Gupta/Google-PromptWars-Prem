
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameScene } from './components/Scene';
import { INITIAL_GAME_STATE, WARP_THRESHOLD } from './constants';
import { GameState, Planet, GameStatus } from './types';
import { generateNextPlanet, fetchGalacticNews, playCrewAudio, fetchNearbySpaceHubs, generatePerformanceReview } from './services/geminiService';
import { LiveTactician } from './components/LiveTactician';

const HUD = ({ state, toggleLive, liveActive }: { state: GameState, toggleLive: () => void, liveActive: boolean }) => (
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
      <button 
        onClick={toggleLive}
        className={`mt-4 pointer-events-auto px-3 py-1 rounded border text-[10px] font-bold transition-all ${liveActive ? 'bg-blue-600 border-blue-400' : 'bg-gray-800 border-gray-600 opacity-50'}`}
      >
        {liveActive ? 'DISABLE COMMS' : 'ENABLE LIVE COMMS'}
      </button>
    </div>
    <div className="text-right flex flex-col items-end gap-2">
      <div className="text-6xl font-bold tabular-nums">{state.score.toLocaleString()}</div>
      <div className="w-48 h-2 bg-gray-800 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ${state.warpReady ? 'bg-green-400 shadow-[0_0_10px_#4ade80]' : 'bg-blue-500'}`}
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
    <div className="mt-4 max-w-xs bg-indigo-900/30 border border-indigo-500/30 p-2 rounded text-[10px] text-indigo-200 pointer-events-auto backdrop-blur-md">
      <p className="line-clamp-2 italic">{news.text}</p>
    </div>
  );
};

const CrewMessage = ({ message, audio }: { message: string, audio?: string }) => {
  useEffect(() => { if (audio) playCrewAudio(audio); }, [audio]);
  return (
    <div className="absolute bottom-8 left-8 max-w-md pointer-events-none z-10" aria-live="polite">
      <div className="bg-black/90 border-l-4 border-blue-500 p-5 rounded backdrop-blur-md shadow-2xl">
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
        <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600 italic tracking-tighter">WARP SEQUENCE</h2>
        
        {planet.videoUrl ? (
          <div className="w-full aspect-video rounded-2xl border border-blue-500/50 overflow-hidden shadow-[0_0_80px_rgba(37,99,235,0.4)]">
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
            <span className="text-blue-400 font-mono text-sm tracking-widest">CALCULATING TRAJECTORY...</span>
          </div>
        )}

        <div className="bg-black/80 p-8 rounded-2xl border border-indigo-500/30 backdrop-blur-xl">
          <h3 className="text-4xl font-black" style={{ color: planet.theme.neonColor }}>{planet.name.toUpperCase()}</h3>
          <p className="text-gray-400 text-xs mt-4 uppercase tracking-[0.5em] opacity-50 italic">Distance Syncing: 100%</p>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>(INITIAL_GAME_STATE);
  const [nextPlanet, setNextPlanet] = useState<Planet | null>(null);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [liveActive, setLiveActive] = useState(false);

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
    }, 8000);
  }, [gameState.warpReady, gameState.status, gameState]);

  const initKeySelection = async () => {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      setGameState(p => ({...p, status: GameStatus.PLAYING}));
  };

  return (
    <div className="w-full h-full relative bg-black select-none overflow-hidden text-white">
      <div className={`w-full h-full transition-all duration-[2s] ${gameState.status === GameStatus.PLAYING ? 'opacity-100 scale-100' : 'opacity-20 blur-xl scale-95'}`}>
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

      <LiveTactician active={liveActive && gameState.status === GameStatus.PLAYING} />

      {gameState.status === GameStatus.MENU && (
        <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-8 animate-in fade-in duration-1000">
          <h1 className="text-8xl font-black text-blue-500 mb-8 font-display italic tracking-tighter drop-shadow-[0_0_30px_rgba(59,130,246,0.6)]">VOID CADET</h1>
          <button 
            onClick={() => setGameState(p => ({...p, status: GameStatus.KEY_SELECTION}))} 
            className="px-16 py-5 bg-blue-600 font-black rounded-lg hover:bg-blue-500 transition-all text-xl shadow-[0_0_40px_rgba(37,99,235,0.4)] hover:scale-105 active:scale-95"
          >
            INITIATE MISSION
          </button>
        </div>
      )}

      {gameState.status === GameStatus.KEY_SELECTION && (
        <div className="absolute inset-0 z-50 bg-indigo-950/90 flex flex-col items-center justify-center p-8 text-center backdrop-blur-xl">
            <h2 className="text-4xl font-black mb-4 tracking-tight">ENGINE COMPLIANCE</h2>
            <p className="max-w-md mb-8 text-indigo-200 leading-relaxed font-mono text-sm opacity-70">Cinematic warp generation requires a paid API key for high-compute video processing. Please link your GCP project to proceed.</p>
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-blue-400 underline mb-8 block text-xs tracking-widest hover:text-white transition-colors">BILLING DOCUMENTATION</a>
            <button 
                onClick={initKeySelection}
                className="px-12 py-4 bg-white text-indigo-900 font-black rounded-full hover:scale-110 transition-transform shadow-2xl"
            >
                SELECT API KEY
            </button>
        </div>
      )}

      {gameState.status === GameStatus.GAME_OVER && (
        <div className="absolute inset-0 z-50 bg-red-950/95 flex flex-col items-center justify-center p-8 text-center animate-in fade-in" role="alert">
          <h2 className="text-8xl font-black mb-8 text-red-500 font-display italic tracking-tighter">MISSION FAILED</h2>
          <div className="max-w-xl bg-black/60 p-8 rounded-2xl border border-red-500/30 mb-12 shadow-2xl backdrop-blur-md">
              <h3 className="text-[10px] uppercase tracking-[0.5em] text-red-400 mb-4 font-black">AI Performance Debrief</h3>
              <p className="text-xl italic text-red-100 leading-relaxed">"{gameState.performanceReview || "Analyzing fatal trajectory errors..."}"</p>
          </div>
          <button onClick={() => location.reload()} className="px-16 py-5 border-4 border-white font-black rounded-xl hover:bg-white hover:text-black transition-all text-xl uppercase tracking-widest">REBOOT SYSTEM</button>
        </div>
      )}
      
      {gameState.status === GameStatus.PLAYING && (
          <main>
            <HUD 
              state={gameState} 
              toggleLive={() => setLiveActive(!liveActive)} 
              liveActive={liveActive} 
            />
            <CrewMessage message={gameState.currentPlanet.crewMessage} audio={gameState.currentPlanet.audioBase64} />
          </main>
      )}

      <WarpOverlay planet={nextPlanet || gameState.currentPlanet} visible={gameState.status === GameStatus.WARPING} />
    </div>
  );
}

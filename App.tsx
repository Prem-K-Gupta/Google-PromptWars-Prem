
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GameScene } from './components/Scene';
import { INITIAL_GAME_STATE, WARP_THRESHOLD } from './constants';
import { GameState, Planet, GameStatus } from './types';
import { generateNextPlanet, fetchGalacticData, generatePerformanceReview } from './services/geminiService';
import { LiveTactician } from './components/LiveTactician';

const GroundingPanel = ({ data }: { data: { text: string; sources: { title: string; uri: string }[] } | null }) => {
  if (!data) return null;
  return (
    <div className="mt-4 pointer-events-auto bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/10 max-w-xs transition-all hover:border-blue-500/50">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">Galactic Grounding</h3>
      <p className="text-xs text-gray-300 italic mb-3 leading-relaxed">"{data.text}"</p>
      <div className="flex flex-col gap-2">
        {data.sources.map((source, i) => (
          <a key={i} href={source.uri} target="_blank" rel="noopener noreferrer" className="text-[9px] text-blue-300 underline hover:text-white truncate">
            {source.title}
          </a>
        ))}
      </div>
    </div>
  );
};

const HUD = ({ state, toggleLive, liveActive, galacticData }: { 
  state: GameState, 
  toggleLive: () => void, 
  liveActive: boolean,
  galacticData: any
}) => (
  <nav className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none z-10 text-white font-mono" aria-label="Game Stats">
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-4xl font-black italic tracking-tighter drop-shadow-xl">VOID CADET</h1>
        <p className="text-sm opacity-60">SECTOR: <span style={{ color: state.currentPlanet.theme.neonColor }}>{state.currentPlanet.name}</span></p>
      </div>
      <button 
        onClick={toggleLive}
        aria-pressed={liveActive}
        className={`pointer-events-auto px-4 py-2 rounded-full border text-[10px] font-black tracking-widest transition-all ${liveActive ? 'bg-blue-600 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-gray-950 border-gray-700 opacity-70 hover:opacity-100'}`}
      >
        {liveActive ? 'COMMS: ONLINE' : 'ESTABLISH LIVE COMMS'}
      </button>
      <GroundingPanel data={galacticData} />
    </div>
    
    <div className="text-right flex flex-col items-end gap-3">
      <div className="text-6xl font-black tabular-nums tracking-tighter" aria-label={`Score: ${state.score}`}>{state.score.toLocaleString()}</div>
      <div className="flex gap-2" aria-label={`${state.lives} Lives remaining`}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className={`w-3 h-3 rounded-full transition-all duration-500 ${i < state.lives ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'bg-gray-800'}`} />
        ))}
      </div>
      <div className="w-48 h-1.5 bg-gray-900 rounded-full overflow-hidden" role="progressbar" aria-valuenow={state.warpCharge} aria-valuemin={0} aria-valuemax={100}>
        <div 
          className={`h-full transition-all duration-700 ${state.warpReady ? 'bg-green-400 shadow-[0_0_10px_#4ade80]' : 'bg-blue-500'}`}
          style={{ width: `${Math.min(state.warpCharge, 100)}%` }}
        />
      </div>
    </div>
  </nav>
);

export default function App() {
  const [gameState, setGameState] = useState<GameState>(INITIAL_GAME_STATE);
  const [galacticData, setGalacticData] = useState<any>(null);
  const [isWarping, setIsWarping] = useState(false);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [liveActive, setLiveActive] = useState(false);

  useEffect(() => { fetchGalacticData().then(setGalacticData); }, []);

  const handleScore = useCallback((points: number) => {
    setGameState(prev => {
      const charge = Math.min(prev.warpCharge + (points / WARP_THRESHOLD) * 100, 100);
      return { ...prev, score: prev.score + points, warpCharge: charge, warpReady: charge >= 100 };
    });
  }, []);

  const handleBallLost = useCallback(async () => {
    setGameState(prev => {
      const newLives = prev.lives - 1;
      if (newLives < 0) return { ...prev, status: GameStatus.GAME_OVER };
      setResetTrigger(n => n + 1);
      return { ...prev, lives: newLives };
    });
    
    if (gameState.lives === 0) {
      const review = await generatePerformanceReview(gameState);
      setGameState(p => ({ ...p, performanceReview: review }));
    }
  }, [gameState]);

  const handleWarpEnter = useCallback(async () => {
    setIsWarping(true);
    setGameState(prev => ({ ...prev, status: GameStatus.WARPING }));
    const next = await generateNextPlanet(gameState);
    
    setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        currentPlanet: next,
        status: GameStatus.PLAYING,
        warpReady: false,
        warpCharge: 0,
        lives: Math.min(prev.lives + 1, 5)
      }));
      setIsWarping(false);
      setResetTrigger(n => n + 1);
    }, 8000);
  }, [gameState]);

  return (
    <div className="w-full h-full relative bg-black select-none overflow-hidden">
      <div className={`w-full h-full transition-all duration-[2s] ${gameState.status === GameStatus.PLAYING ? 'scale-100 blur-0' : 'scale-95 blur-2xl opacity-40'}`}>
        {/* Fix: Added gameStatus={gameState.status} to SceneProps */}
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

      {gameState.status === GameStatus.PLAYING && (
        <HUD state={gameState} toggleLive={() => setLiveActive(!liveActive)} liveActive={liveActive} galacticData={galacticData} />
      )}

      {gameState.status === GameStatus.MENU && (
        <main className="absolute inset-0 z-50 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-blue-950/20 to-black">
          <h1 className="text-8xl font-black text-blue-500 font-display italic tracking-tighter drop-shadow-2xl animate-pulse">VOID CADET</h1>
          <p className="text-blue-200/40 font-mono tracking-widest mt-4 uppercase text-xs mb-12">Universal Procedural Pinball Engine v2.6</p>
          <button 
            onClick={() => setGameState(p => ({ ...p, status: GameStatus.KEY_SELECTION }))}
            className="px-20 py-6 bg-blue-600 font-black rounded-2xl hover:bg-blue-500 transition-all text-xl shadow-2xl hover:scale-110 active:scale-95 text-white"
          >
            INITIATE MISSION
          </button>
        </main>
      )}

      {gameState.status === GameStatus.KEY_SELECTION && (
        <section className="absolute inset-0 z-50 flex flex-col items-center justify-center p-8 backdrop-blur-3xl bg-black/80">
          <h2 className="text-4xl font-black mb-4">SYSTEM AUTHENTICATION</h2>
          <p className="max-w-md text-center text-gray-400 font-mono text-sm leading-relaxed mb-12">Veo cinematic rendering and Live Comms require an authenticated API key. Please secure your connection to proceed.</p>
          {/* Added required link to billing documentation */}
          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-blue-400 underline mb-8 text-xs hover:text-blue-300 font-mono"
          >
            Billing Setup Guide
          </a>
          <button 
            onClick={async () => {
              // @ts-ignore
              await window.aistudio.openSelectKey();
              // Proceed assuming success as per guidelines to avoid race condition
              setGameState(p => ({ ...p, status: GameStatus.PLAYING }));
            }}
            className="px-16 py-5 bg-white text-black font-black rounded-full hover:bg-blue-400 transition-all shadow-2xl"
          >
            SELECT API KEY
          </button>
        </section>
      )}

      {gameState.status === GameStatus.WARPING && (
        <section className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center animate-in fade-in duration-1000" aria-live="assertive">
          <h2 className="text-6xl font-black text-blue-500 italic tracking-tighter mb-12">WARP IN PROGRESS</h2>
          {gameState.currentPlanet.videoUrl && (
            <video src={gameState.currentPlanet.videoUrl} autoPlay muted loop className="w-3/4 aspect-video rounded-3xl border border-blue-500/50 shadow-2xl object-cover" />
          )}
        </section>
      )}

      {gameState.status === GameStatus.GAME_OVER && (
        <section className="absolute inset-0 z-50 flex flex-col items-center justify-center p-8 bg-red-950/90 backdrop-blur-xl" role="alert">
          <h2 className="text-7xl font-black text-red-500 font-display mb-8">MISSION FAILED</h2>
          <div className="max-w-xl bg-black/60 p-8 rounded-3xl border border-red-500/30 mb-12 shadow-inner">
            <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-red-400 mb-4">AI Tactical Debrief</h3>
            <p className="text-xl italic text-red-100 font-mono">"{gameState.performanceReview || "Analyzing trajectory collapse..."}"</p>
          </div>
          <button onClick={() => location.reload()} className="px-16 py-5 border-4 border-white font-black rounded-2xl hover:bg-white hover:text-black transition-all text-xl tracking-widest uppercase">REBOOT</button>
        </section>
      )}
    </div>
  );
}

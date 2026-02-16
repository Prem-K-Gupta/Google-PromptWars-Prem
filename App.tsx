import React, { useState, useEffect, useCallback } from 'react';
import { GameScene } from './components/Scene';
import { INITIAL_GAME_STATE, WARP_THRESHOLD } from './constants';
import { GameState, Planet, GameStatus } from './types';
import { generateNextPlanet, fetchGalacticNews, playCrewAudio, fetchNearbySpaceHubs } from './services/geminiService';

const HUD = ({ state }: { state: GameState }) => (
  <header className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none z-10 text-white font-mono">
    <div>
      <h1 className="text-4xl font-black italic tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">VOID CADET</h1>
      <div className="mt-2 text-sm opacity-80">
        <p>SECTOR: <span style={{ color: state.currentPlanet.theme.neonColor }}>{state.currentPlanet.name}</span></p>
        <p>GRAVITY: {state.currentPlanet.physics.gravity} G</p>
        <div className="flex gap-2 mt-1" aria-label={`Lives remaining: ${state.lives}`}>
           {[...Array(state.lives)].map((_, i) => (
               <div key={i} className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_5px_red]" />
           ))}
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2">
         {state.artifacts.map((art, i) => (
             <div key={i} className="flex items-center gap-2 bg-black/50 p-1 rounded px-2 border border-gray-700 animate-in slide-in-from-left">
                 <span aria-hidden="true">{art.icon}</span>
                 <span className="text-xs text-gray-300 uppercase">{art.name}</span>
             </div>
         ))}
      </div>
    </div>
    
    <div className="text-right flex flex-col items-end gap-2">
      <div className="text-6xl font-bold text-blue-100 tabular-nums">{state.score.toLocaleString()}</div>
      <div className="flex flex-col items-end gap-1">
         <div className="text-[10px] font-black tracking-widest uppercase">Warp Capacitor</div>
         <div className="w-48 h-3 bg-gray-800 border border-gray-600 rounded-full overflow-hidden" role="progressbar" aria-valuenow={state.warpCharge} aria-valuemin={0} aria-valuemax={100}>
            <div 
              className={`h-full transition-all duration-500 ${state.warpReady ? 'bg-green-400 shadow-[0_0_10px_#4ade80]' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(state.warpCharge, 100)}%` }}
            />
         </div>
         {state.warpReady && <div className="text-green-400 font-bold animate-pulse text-[10px] mt-1 uppercase tracking-tighter">Gate Synchronization Complete</div>}
      </div>
      <GalacticNewsFeed />
    </div>
  </header>
);

const GalacticNewsFeed = () => {
  const [news, setNews] = useState<{ text: string; url: string | null; title: string } | null>(null);
  useEffect(() => {
    fetchGalacticNews().then(d => d && setNews(d));
  }, []);
  if (!news) return null;
  return (
    <div className="mt-4 max-w-xs bg-indigo-900/30 border border-indigo-500/30 p-3 rounded-lg text-[10px] text-indigo-200 pointer-events-auto shadow-xl backdrop-blur-md">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
        <span className="font-bold tracking-widest uppercase text-indigo-300">Galactic Broadcast</span>
      </div>
      <p className="line-clamp-2 italic opacity-90">{news.text}</p>
      {news.url && (
        <a 
          href={news.url} target="_blank" rel="noopener noreferrer" 
          className="mt-2 block text-indigo-400 underline truncate hover:text-white transition-colors"
        >
          {news.title}
        </a>
      )}
    </div>
  );
};

const CrewMessage = ({ message, audio }: { message: string, audio?: string }) => {
  useEffect(() => {
    if (audio) playCrewAudio(audio);
  }, [audio]);

  return (
    <div className="absolute bottom-8 left-8 max-w-md pointer-events-none z-10" aria-live="polite">
      <div className="bg-black/90 border-l-4 border-blue-500 p-5 rounded-r-xl backdrop-blur-md shadow-2xl">
        <div className="flex items-center justify-between mb-2">
           <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-black shadow-[0_0_10px_#2563eb]">AI</div>
             <span className="text-blue-400 font-black text-xs tracking-widest uppercase">Tactical Relay</span>
           </div>
           {audio && (
             <div className="audio-bars" aria-hidden="true">
               {[1,2,3,4].map(i => <div key={i} className="audio-bar" style={{animationDelay: `${i*0.1}s`}} />)}
             </div>
           )}
        </div>
        <p className="text-gray-100 text-sm leading-relaxed tracking-tight">"{message}"</p>
      </div>
    </div>
  );
};

const WarpOverlay = ({ planet, visible }: { planet: Planet, visible: boolean }) => {
  if (!visible) return null;
  return (
    <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center animate-in fade-in duration-1000">
      <div className="absolute inset-0 bg-blue-900/10 animate-pulse"></div>
      
      <div className="relative z-10 flex flex-col items-center gap-8 max-w-3xl text-center px-6">
        <h2 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600 italic tracking-tighter">WARP JUMP ACTIVE</h2>
        
        {planet.imageUrl && (
          <div className="w-full aspect-video rounded-2xl border border-indigo-500/50 overflow-hidden shadow-[0_0_80px_rgba(79,70,229,0.4)] transition-transform duration-[3s] hover:scale-105">
            <img src={planet.imageUrl} alt={`Destination: ${planet.name}`} className="w-full h-full object-cover animate-in zoom-in duration-1000" />
          </div>
        )}

        <div className="bg-black/80 p-8 rounded-2xl border border-indigo-500/30 backdrop-blur-2xl shadow-2xl">
          <h3 className="text-4xl font-black mb-2 tracking-tight" style={{ color: planet.theme.neonColor }}>{planet.name.toUpperCase()}</h3>
          <p className="text-indigo-100/70 text-sm leading-relaxed mb-6 italic">{planet.description}</p>
          <div className="grid grid-cols-2 gap-4 text-xs font-mono uppercase tracking-[0.2em] text-indigo-400 border-t border-white/10 pt-4">
             <div className="text-left">GRAVITY: <span className="text-white font-bold">{planet.physics.gravity} G</span></div>
             <div className="text-right">FRICTION: <span className="text-white font-bold">{(planet.physics.friction * 100).toFixed(0)}%</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const NearbyHubsList = () => {
  const [hubs, setHubs] = useState<{title: string, uri: string}[]>([]);
  const [loading, setLoading] = useState(false);

  const getHubs = () => {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const data = await fetchNearbySpaceHubs(pos.coords.latitude, pos.coords.longitude);
      setHubs(data);
      setLoading(false);
    }, () => setLoading(false));
  };

  return (
    <div className="mt-8 p-4 bg-white/5 border border-white/10 rounded-xl text-left max-w-sm">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">Ground Exploration Units</h3>
      {hubs.length === 0 ? (
        <button 
          onClick={getHubs} 
          disabled={loading}
          className="text-xs bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded font-bold transition-all w-full"
        >
          {loading ? "SCANNIG TERRA..." : "SYNC LOCAL OBSERVATORIES"}
        </button>
      ) : (
        <ul className="space-y-2">
          {hubs.map((h, i) => (
            <li key={i}>
              <a href={h.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-300 underline hover:text-white truncate block">
                {h.title}
              </a>
            </li>
          ))}
        </ul>
      )}
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

  const handleBallLost = useCallback(() => {
    if (gameState.status !== GameStatus.PLAYING) return;
    setGameState(prev => {
      const newLives = prev.lives - 1;
      return newLives < 0 ? { ...prev, status: GameStatus.GAME_OVER } : { ...prev, lives: newLives };
    });
    setResetTrigger(n => n + 1);
  }, [gameState.status]);

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
    }, 6000);
  }, [gameState.warpReady, gameState.status, gameState]);

  return (
    <div className="w-full h-full relative bg-black select-none overflow-hidden text-white">
      <div className={`w-full h-full transition-all duration-[2s] ${gameState.status === GameStatus.WARPING ? 'opacity-0 scale-90 blur-3xl' : 'opacity-100 scale-100 blur-0'}`}>
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
        <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-8 animate-in fade-in duration-1000">
          <h1 className="text-8xl font-black text-blue-500 mb-4 font-display italic tracking-tighter drop-shadow-[0_0_30px_rgba(59,130,246,0.5)]">VOID CADET</h1>
          <p className="text-blue-200/60 font-mono tracking-[0.5em] mb-12 uppercase">The Infinite Arcade</p>
          <button 
            onClick={() => setGameState(p => ({...p, status: GameStatus.PLAYING}))} 
            className="px-16 py-5 bg-blue-600 font-black rounded-lg hover:bg-blue-500 transition-all text-xl shadow-[0_0_50px_rgba(37,99,235,0.4)] hover:scale-105 active:scale-95"
          >
            INITIATE MISSION
          </button>
          <NearbyHubsList />
        </div>
      )}

      {gameState.status === GameStatus.GAME_OVER && (
        <div className="absolute inset-0 z-50 bg-red-950/95 flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
          <h2 className="text-8xl font-black mb-4 tracking-tighter text-red-500 font-display italic">CRITICAL FAILURE</h2>
          <div className="text-2xl font-mono mb-12 text-red-200/50">SYSTEM INTEGRITY COMPROMISED</div>
          <button 
            onClick={() => location.reload()} 
            className="px-16 py-5 border-4 border-white font-black rounded-lg hover:bg-white hover:text-black transition-all text-xl"
          >
            REBOOT CORE
          </button>
        </div>
      )}
      
      {(gameState.status === GameStatus.PLAYING || gameState.status === GameStatus.WARPING) && (
          <main>
            <HUD state={gameState} />
            <CrewMessage message={gameState.currentPlanet.crewMessage} audio={gameState.currentPlanet.audioBase64} />
          </main>
      )}

      <WarpOverlay planet={nextPlanet || gameState.currentPlanet} visible={gameState.status === GameStatus.WARPING} />
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { GameScene } from './components/Scene';
import { INITIAL_GAME_STATE, WARP_THRESHOLD } from './constants';
import { GameState, Planet, GameStatus } from './types';
import { generateNextPlanet, fetchGalacticNews, playCrewAudio } from './services/geminiService';

const HUD = ({ state }: { state: GameState }) => (
  <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none z-10 text-white font-mono">
    <div>
      <h1 className="text-4xl font-black italic tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">VOID CADET</h1>
      <div className="mt-2 text-sm opacity-80">
        <p>SECTOR: <span style={{ color: state.currentPlanet.theme.neonColor }}>{state.currentPlanet.name}</span></p>
        <p>GRAVITY: {state.currentPlanet.physics.gravity} G</p>
        <div className="flex gap-2 mt-1">
           {[...Array(state.lives)].map((_, i) => (
               <div key={i} className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_5px_red]" />
           ))}
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2">
         {state.artifacts.map((art, i) => (
             <div key={i} className="flex items-center gap-2 bg-black/50 p-1 rounded px-2 border border-gray-700">
                 <span>{art.icon}</span>
                 <span className="text-xs text-gray-300">{art.name}</span>
             </div>
         ))}
      </div>
    </div>
    
    <div className="text-right flex flex-col items-end gap-2">
      <div className="text-6xl font-bold text-blue-100">{state.score.toLocaleString()}</div>
      <div className="flex flex-col items-end gap-1">
         <div className="text-sm">WARP CHARGE</div>
         <div className="w-48 h-4 bg-gray-800 border border-gray-600 rounded overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${state.warpReady ? 'bg-green-400 animate-pulse' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(state.warpCharge, 100)}%` }}
            />
         </div>
         {state.warpReady && <div className="text-green-400 font-bold animate-bounce text-xs mt-1">GATE OPEN</div>}
      </div>
      <GalacticNewsFeed />
    </div>
  </div>
);

const GalacticNewsFeed = () => {
  const [news, setNews] = useState<{ text: string; url: string | null; title: string } | null>(null);
  useEffect(() => {
    fetchGalacticNews().then(d => d && setNews(d));
  }, []);
  if (!news) return null;
  return (
    <div className="mt-4 max-w-xs bg-indigo-900/30 border border-indigo-500/30 p-2 rounded text-[10px] text-indigo-200 pointer-events-auto">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
        <span className="font-bold">GALACTIC BROADCAST</span>
      </div>
      <p className="line-clamp-2">{news.text}</p>
      {/* Search grounding requirement: Extract and list URLs */}
      {news.url && (
        <a 
          href={news.url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="mt-1 block text-indigo-400 underline truncate hover:text-indigo-300 transition-colors"
        >
          Source: {news.title}
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
    <div className="absolute bottom-8 left-8 max-w-md pointer-events-none z-10">
      <div className="bg-black/80 border-l-4 border-blue-500 p-4 rounded backdrop-blur-sm shadow-lg">
        <div className="flex items-center justify-between mb-2">
           <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">AI</div>
             <span className="text-blue-400 font-bold text-sm tracking-widest">TACTICIAN</span>
           </div>
           {audio && (
             <div className="audio-bars">
               <div className="audio-bar" style={{animationDelay: '0s'}}></div>
               <div className="audio-bar" style={{animationDelay: '0.1s'}}></div>
               <div className="audio-bar" style={{animationDelay: '0.2s'}}></div>
               <div className="audio-bar" style={{animationDelay: '0.15s'}}></div>
             </div>
           )}
        </div>
        <p className="text-gray-200 text-sm italic">"{message}"</p>
      </div>
    </div>
  );
};

const WarpOverlay = ({ planet, visible }: { planet: Planet, visible: boolean }) => {
  if (!visible) return null;
  return (
    <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center animate-in fade-in duration-700">
      <div className="absolute inset-0 bg-blue-900/20 animate-pulse"></div>
      
      <div className="relative z-10 flex flex-col items-center gap-8 max-w-2xl text-center px-6">
        <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600 italic">WARP JUMP ACTIVE</h2>
        
        {planet.imageUrl && (
          <div className="w-full aspect-video rounded-xl border border-indigo-500/50 overflow-hidden shadow-[0_0_50px_rgba(79,70,229,0.3)]">
            <img src={planet.imageUrl} alt="Target Planet" className="w-full h-full object-cover animate-in zoom-in duration-1000" />
          </div>
        )}

        <div className="bg-black/80 p-6 rounded-lg border border-indigo-500/20 backdrop-blur-xl">
          <h3 className="text-3xl font-bold mb-2" style={{ color: planet.theme.neonColor }}>{planet.name}</h3>
          <p className="text-gray-400 text-sm leading-relaxed mb-4">{planet.description}</p>
          <div className="flex justify-center gap-4 text-xs font-mono uppercase tracking-widest text-indigo-400">
             <span>{planet.physics.gravity} G</span>
             <span>•</span>
             <span>{(planet.physics.friction * 100).toFixed(0)}% MU</span>
          </div>
          {/* Displaying grounding URLs for the planet if available */}
          {planet.sources && planet.sources.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10 text-[9px] text-left">
              <p className="mb-1 opacity-50 uppercase tracking-tighter">Grounding sources:</p>
              {planet.sources.map((url, i) => (
                <a 
                  key={i} 
                  href={url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="block text-indigo-400 underline truncate hover:text-indigo-300"
                >
                  {url}
                </a>
              ))}
            </div>
          )}
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
    <div className="w-full h-full relative bg-black select-none overflow-hidden">
      <div className={`w-full h-full transition-all duration-1000 ${gameState.status === GameStatus.WARPING ? 'opacity-0 scale-95 blur-xl' : 'opacity-100 scale-100 blur-0'}`}>
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
        <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center">
          <h1 className="text-8xl font-black text-blue-500 mb-8 font-display">VOID CADET</h1>
          <button onClick={() => setGameState(p => ({...p, status: GameStatus.PLAYING}))} className="px-12 py-4 bg-blue-600 font-bold rounded hover:bg-blue-400 transition-colors">LAUNCH</button>
        </div>
      )}

      {gameState.status === GameStatus.GAME_OVER && (
        <div className="absolute inset-0 z-50 bg-red-900/95 flex flex-col items-center justify-center">
          <h2 className="text-7xl font-black mb-4">CRITICAL FAILURE</h2>
          <button onClick={() => location.reload()} className="px-12 py-4 border-2 border-white font-bold rounded">REBOOT</button>
        </div>
      )}
      
      {(gameState.status === GameStatus.PLAYING || gameState.status === GameStatus.WARPING) && (
          <>
            <HUD state={gameState} />
            <CrewMessage message={gameState.currentPlanet.crewMessage} audio={gameState.currentPlanet.audioBase64} />
          </>
      )}

      <WarpOverlay planet={nextPlanet || gameState.currentPlanet} visible={gameState.status === GameStatus.WARPING} />
    </div>
  );
}

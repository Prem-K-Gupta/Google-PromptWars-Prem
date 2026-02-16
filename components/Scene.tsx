/// <reference lib="dom" />
import React, { useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics, useSphere, usePlane } from '@react-three/cannon';
import { Stars, Text, Float, Sparkles, PerspectiveCamera } from '@react-three/drei';
import { Planet, GameStatus } from '../types';
import { Wall, Bumper, WarpGate, Slingshot, Plunger, BossTarget } from './TableObjects';
import { SimpleFlipper } from './Flippers';

// --- Ball ---
const Ball = ({ startPos, onLost, theme, isActive }: { startPos: [number, number, number], onLost: () => void, theme: any, isActive: boolean }) => {
  const [ref, api] = useSphere(() => ({
    mass: 1,
    position: startPos,
    args: [0.3],
    // Low friction to roll easily, decent restitution
    material: { friction: 0.001, restitution: 0.7 },
    allowSleep: false,
    fixedRotation: false,
  }));
  
  useEffect(() => {
      // @ts-ignore
      ref.current.name = 'ball';
  }, [ref]);

  // Respawn logic
  useEffect(() => {
      if (isActive) {
          api.position.set(startPos[0], startPos[1], startPos[2]);
          api.velocity.set(0,0,0);
          api.angularVelocity.set(0,0,0);
          api.wakeUp();
      }
  }, [isActive, startPos, api]);

  useFrame(() => {
    if (!ref.current) return;
    
    // Ball Lost Logic (Past flippers)
    if (ref.current.position.z > 16) { 
      onLost();
      // Reset temporarily to avoid multi-trigger
      api.position.set(startPos[0], startPos[1], startPos[2]);
      api.velocity.set(0, 0, 0);
    }
    
    // Glitch prevention: If ball falls through floor
    if (ref.current.position.y < -5) {
        api.position.set(startPos[0], startPos[1], startPos[2]);
        api.velocity.set(0, 0, 0);
    }
  });

  return (
    <mesh ref={ref as any} castShadow>
      <sphereGeometry args={[0.3, 32, 32]} />
      <meshStandardMaterial 
        color="#fff" 
        metalness={0.9} 
        roughness={0.1} 
        emissive={theme.neonColor} 
        emissiveIntensity={0.5} 
      />
      <Sparkles count={5} scale={1} size={2} speed={0.4} opacity={0.5} color={theme.neonColor} />
    </mesh>
  );
};

// --- Floor ---
const Floor = ({ color, friction }: { color: string, friction: number }) => {
  const [ref] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, -0.5, 0],
    material: { friction: friction, restitution: 0.3 }
  }));
  return (
    <group>
        <mesh ref={ref as any} receiveShadow>
            <planeGeometry args={[20, 50]} />
            <meshPhysicalMaterial 
                color={color} 
                metalness={0.4} 
                roughness={0.2} 
                transmission={0.1}
                clearcoat={1}
            />
        </mesh>
        <gridHelper args={[20, 20, '#ffffff', '#333333']} position={[0, -0.49, 0]} />
    </group>
  );
};

// --- Main Game Scene ---
interface SceneProps {
  planet: Planet;
  onScore: (points: number) => void;
  onWarpEnter: () => void;
  onBallLost: () => void;
  warpReady: boolean;
  gameStatus: GameStatus;
  resetTrigger: number;
}

export const GameScene: React.FC<SceneProps> = ({ planet, onScore, onWarpEnter, onBallLost, warpReady, gameStatus, resetTrigger }) => {
  const [keys, setKeys] = useState({ left: false, right: false, space: false });

  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') setKeys(k => ({ ...k, left: true }));
      if (e.key === 'ArrowRight' || e.key === 'd') setKeys(k => ({ ...k, right: true }));
      if (e.code === 'Space') setKeys(k => ({ ...k, space: true }));
    };
    const handleUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') setKeys(k => ({ ...k, left: false }));
      if (e.key === 'ArrowRight' || e.key === 'd') setKeys(k => ({ ...k, right: false }));
      if (e.code === 'Space') setKeys(k => ({ ...k, space: false }));
    };
    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
    };
  }, []);

  const gravity: [number, number, number] = [
    0, 
    planet.physics.gravity, 
    planet.physics.slope 
  ];

  return (
    <Canvas shadows dpr={[1, 2]}>
      <PerspectiveCamera makeDefault position={[0, 22, 16]} fov={35} />
      <color attach="background" args={[planet.theme.floorColor]} />
      <fog attach="fog" args={[planet.theme.floorColor, 10, 60]} />
      
      {/* Lighting */}
      <ambientLight intensity={planet.theme.ambientIntensity} />
      <pointLight position={[0, 10, 0]} intensity={1} castShadow distance={20} />
      <spotLight 
        position={[0, 30, 10]} 
        angle={0.3} 
        penumbra={0.5} 
        intensity={2} 
        color={planet.theme.primaryColor} 
        castShadow 
      />
      
      <Stars radius={100} depth={50} count={2000} factor={4} saturation={1} fade speed={0.5} />

      <Physics gravity={gravity} defaultContactMaterial={{ restitution: planet.physics.restitution, friction: planet.physics.friction }}>
        
        <Ball 
            startPos={[6.5, 0.5, 11]} 
            onLost={onBallLost} 
            theme={planet.theme} 
            isActive={resetTrigger > 0}
        />
        
        <Floor color={planet.theme.floorColor} friction={planet.physics.friction} />

        {/* --- Table Walls --- */}
        <Wall args={[1, 4, 34]} position={[-8, 0, 2]} color={planet.theme.primaryColor} /> 
        <Wall args={[1, 4, 34]} position={[8, 0, 2]} color={planet.theme.primaryColor} />  
        <Wall args={[17, 4, 1]} position={[0, 0, -12]} color={planet.theme.primaryColor} />

        {/* Plunger Lane */}
        <Wall args={[0.5, 2, 24]} position={[5.5, 0, 4]} color={planet.theme.secondaryColor} />
        
        {/* Top Curve */}
        <Wall args={[6, 2, 1]} position={[-3, 0, -10]} rotation={[0, 0.3, 0]} color={planet.theme.secondaryColor} />
        <Wall args={[6, 2, 1]} position={[2, 0, -10]} rotation={[0, -0.3, 0]} color={planet.theme.secondaryColor} />

        {/* Objects */}
        <Bumper position={[0, 0.5, -6]} theme={planet.theme} onHit={() => onScore(100)} />
        <Bumper position={[-2.5, 0.5, -4]} theme={planet.theme} onHit={() => onScore(100)} />
        <Bumper position={[2.5, 0.5, -4]} theme={planet.theme} onHit={() => onScore(100)} />

        <BossTarget 
            position={[0, 2, -2]} 
            name={planet.bossName || "BOSS"} 
            theme={planet.theme}
            onHit={() => onScore(500)}
        />

        <Slingshot 
            position={[-4.5, 0.5, 7]} 
            rotation={[0, 0.4, 0]} 
            theme={planet.theme} 
            onHit={() => onScore(50)} 
        />
        <Slingshot 
            position={[3.5, 0.5, 7]} 
            rotation={[0, -0.4, 0]} 
            theme={planet.theme} 
            onHit={() => onScore(50)} 
        />

        {/* Flippers */}
        <SimpleFlipper side="left" position={[-2.5, 0.5, 11]} rotation={[0, 0, 0]} color={planet.theme.neonColor} isPressed={keys.left} />
        <SimpleFlipper side="right" position={[2.5, 0.5, 11]} rotation={[0, 0, 0]} color={planet.theme.neonColor} isPressed={keys.right} />

        {/* Plunger */}
        <Plunger position={[6.5, 0.5, 13]} color={planet.theme.secondaryColor} isPressed={keys.space} />

        <WarpGate 
            position={[0, 0.5, -11]} 
            isOpen={warpReady} 
            onEnter={onWarpEnter} 
            theme={planet.theme} 
        />
      </Physics>
      
      {/* 3D Title */}
      <Float speed={2} rotationIntensity={0.1} floatIntensity={0.2}>
         <Text 
            position={[0, 8, -15]} 
            fontSize={3} 
            color={planet.theme.neonColor}
            anchorX="center" 
            anchorY="middle"
            font="https://fonts.gstatic.com/s/audiowide/v16/l7gdbjpo0cum0ckerdt6.woff"
         >
           {planet.name.toUpperCase()}
         </Text>
      </Float>
    </Canvas>
  );
};
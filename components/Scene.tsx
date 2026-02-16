/// <reference lib="dom" />
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics, useSphere, usePlane } from '@react-three/cannon';
import { OrbitControls, Stars, Text, Float } from '@react-three/drei';
import { GameState, Planet, PhysicsModifiers } from '../types';
import { Wall, Bumper, WarpGate } from './TableObjects';
import { SimpleFlipper } from './Flippers';
import * as THREE from 'three';

// --- Ball ---
const Ball = ({ startPos, onLost, theme }: { startPos: [number, number, number], onLost: () => void, theme: any }) => {
  const [ref, api] = useSphere(() => ({
    mass: 1,
    position: startPos,
    args: [0.3],
    material: { friction: 0.05, restitution: 0.7 }, // Base ball physics
  }));
  
  // Name the body for collision detection
  useEffect(() => {
      // @ts-ignore
      ref.current.name = 'ball';
  }, [ref]);

  useFrame(() => {
    if (!ref.current) return;
    // Check if ball fell out
    if (ref.current.position.z > 12) { // Bottom of table
      onLost();
      api.position.set(startPos[0], startPos[1], startPos[2]);
      api.velocity.set(0, 0, 0);
      api.angularVelocity.set(0, 0, 0);
    }
  });

  return (
    <mesh ref={ref as any} castShadow>
      <sphereGeometry args={[0.3, 32, 32]} />
      <meshStandardMaterial color="#fff" metalness={0.8} roughness={0.2} emissive={theme.neonColor} emissiveIntensity={0.5} />
    </mesh>
  );
};

// --- Floor ---
const Floor = ({ color, friction }: { color: string, friction: number }) => {
  const [ref] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0], // Flat on ground (initially), we will rotate camera or gravity
    position: [0, -0.5, 0],
    material: { friction: friction, restitution: 0.2 }
  }));
  return (
    <mesh ref={ref as any} receiveShadow>
      <planeGeometry args={[20, 30]} />
      <meshStandardMaterial color={color} metalness={0.5} roughness={0.5} />
      <gridHelper args={[20, 20, '#444', '#222']} rotation={[-Math.PI/2, 0, 0]} position={[0, 0.01, 0]} />
    </mesh>
  );
};

// --- Main Game Scene ---
interface SceneProps {
  planet: Planet;
  onScore: (points: number) => void;
  onWarpEnter: () => void;
  onBallLost: () => void;
  warpReady: boolean;
  active: boolean; // Is game playing
}

export const GameScene: React.FC<SceneProps> = ({ planet, onScore, onWarpEnter, onBallLost, warpReady, active }) => {
  const [keys, setKeys] = useState({ left: false, right: false });

  // Input Handling
  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') setKeys(k => ({ ...k, left: true }));
      if (e.key === 'ArrowRight' || e.key === 'd') setKeys(k => ({ ...k, right: true }));
    };
    const handleUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') setKeys(k => ({ ...k, left: false }));
      if (e.key === 'ArrowRight' || e.key === 'd') setKeys(k => ({ ...k, right: false }));
    };
    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
    };
  }, []);

  // Calculate Physics Gravity Vector based on Planet Data
  // Standard Gravity is -9.8 Y.
  // "Slope" simulates table tilt. In 3D physics, usually we just tilt the gravity vector.
  // Z+ is "down" the screen. So gravity should pull towards Z+.
  // And Y- is "down" into the floor.
  const gravity: [number, number, number] = [
    0, 
    planet.physics.gravity, 
    planet.physics.slope // Positive Z pulls ball "down" the table
  ];

  return (
    <Canvas shadows camera={{ position: [0, 15, 12], fov: 45 }}>
      <color attach="background" args={[planet.theme.floorColor]} />
      
      <ambientLight intensity={planet.theme.ambientIntensity} />
      <pointLight position={[0, 10, 0]} intensity={1} castShadow />
      <spotLight position={[0, 15, 5]} angle={0.5} penumbra={1} intensity={2} color={planet.theme.primaryColor} castShadow />

      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      <Physics gravity={gravity} defaultContactMaterial={{ restitution: planet.physics.restitution, friction: planet.physics.friction }}>
        
        {/* The Ball */}
        <Ball startPos={[4, 1, 8]} onLost={onBallLost} theme={planet.theme} />

        {/* Table Floor */}
        <Floor color={planet.theme.floorColor} friction={planet.physics.friction} />

        {/* Walls */}
        <Wall args={[1, 2, 22]} position={[-6, 0, 0]} color={planet.theme.primaryColor} /> {/* Left */}
        <Wall args={[1, 2, 22]} position={[6, 0, 0]} color={planet.theme.primaryColor} />  {/* Right */}
        <Wall args={[13, 2, 1]} position={[0, 0, -11]} color={planet.theme.primaryColor} /> {/* Top */}

        {/* Angled Wall at bottom left/right to funnel to flippers */}
        <Wall args={[1, 2, 6]} position={[-4, 0, 8]} rotation={[0, -0.5, 0]} color={planet.theme.secondaryColor} />
        <Wall args={[1, 2, 6]} position={[4, 0, 8]} rotation={[0, 0.5, 0]} color={planet.theme.secondaryColor} />

        {/* Bumpers */}
        <Bumper position={[0, 0.5, -4]} theme={planet.theme} onHit={() => onScore(100)} />
        <Bumper position={[-2.5, 0.5, -2]} theme={planet.theme} onHit={() => onScore(100)} />
        <Bumper position={[2.5, 0.5, -2]} theme={planet.theme} onHit={() => onScore(100)} />

        {/* Flippers */}
        <SimpleFlipper side="left" position={[-2, 0.5, 9]} rotation={[0, 0, 0]} color={planet.theme.neonColor} isPressed={keys.left} />
        <SimpleFlipper side="right" position={[2, 0.5, 9]} rotation={[0, 0, 0]} color={planet.theme.neonColor} isPressed={keys.right} />

        {/* Warp Gate (Top Center Ramp Area) */}
        <WarpGate 
            position={[0, 0.5, -9]} 
            isOpen={warpReady} 
            onEnter={onWarpEnter} 
            theme={planet.theme} 
        />
        
        {/* Plunger Lane Wall (Right side) */}
        <Wall args={[0.5, 1, 18]} position={[5, 0, 2]} color={planet.theme.secondaryColor} />

      </Physics>
      
      {/* 3D Text Overlay in World Space */}
      <Float speed={2} rotationIntensity={0.1} floatIntensity={0.5}>
         <Text 
            position={[0, 5, -15]} 
            fontSize={2} 
            color={planet.theme.neonColor}
            anchorX="center" 
            anchorY="middle"
         >
           {planet.name.toUpperCase()}
         </Text>
      </Float>
      
      <OrbitControls enableZoom={false} enableRotate={false} minPolarAngle={Math.PI/4} maxPolarAngle={Math.PI/3} />
    </Canvas>
  );
};
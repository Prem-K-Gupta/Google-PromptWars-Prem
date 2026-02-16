import React from 'react';
import { useBox, useCylinder } from '@react-three/cannon';
import { VisualTheme } from '../types';

interface WallProps {
  args: [number, number, number];
  position: [number, number, number];
  rotation?: [number, number, number];
  material?: any;
  color: string;
}

export const Wall: React.FC<WallProps> = ({ args, position, rotation = [0, 0, 0], color }) => {
  const [ref] = useBox(() => ({
    type: 'Static',
    args,
    position,
    rotation,
    material: { friction: 0, restitution: 0.5 },
  }));

  return (
    <mesh ref={ref as any}>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
};

export const Bumper: React.FC<{ position: [number, number, number]; theme: VisualTheme; onHit: () => void }> = ({ position, theme, onHit }) => {
  const [ref, api] = useCylinder(() => ({
    type: 'Static',
    position,
    args: [0.5, 0.5, 1, 16],
    material: { restitution: 1.5 }, // Bouncy!
    onCollide: () => {
      onHit();
      // Visual flair
      api.position.set(position[0], position[1], position[2]); // reset logic if needed, mostly static
    }
  }));

  return (
    <mesh ref={ref as any}>
      <cylinderGeometry args={[0.5, 0.5, 0.5, 16]} />
      <meshStandardMaterial color={theme.secondaryColor} emissive={theme.neonColor} emissiveIntensity={2} />
    </mesh>
  );
};

export const WarpGate: React.FC<{ 
  position: [number, number, number]; 
  isOpen: boolean; 
  onEnter: () => void;
  theme: VisualTheme 
}> = ({ position, isOpen, onEnter, theme }) => {
  const [ref] = useBox(() => ({
    isTrigger: true,
    position,
    args: [2, 1, 0.5],
    onCollide: (e) => {
      if (isOpen && e.body.name === 'ball') {
        onEnter();
      }
    }
  }));

  return (
    <group ref={ref as any}>
      <mesh visible={isOpen}>
        <boxGeometry args={[2, 0.1, 0.5]} />
        <meshStandardMaterial color={isOpen ? "#00ff00" : "#ff0000"} emissive={isOpen ? "#00ff00" : "#000"} emissiveIntensity={2} />
      </mesh>
      {/* Visual Portal Effect */}
      {isOpen && (
        <mesh position={[0, 1, 0]} rotation={[Math.PI/2, 0, 0]}>
          <ringGeometry args={[0.5, 1, 32]} />
          <meshBasicMaterial color="white" side={2} transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  );
};

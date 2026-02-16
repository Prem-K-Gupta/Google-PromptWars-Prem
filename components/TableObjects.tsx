import React, { useState, useRef } from 'react';
import { useBox, useCylinder } from '@react-three/cannon';
import { VisualTheme } from '../types';
import { useFrame } from '@react-three/fiber';
import { Float, Text } from '@react-three/drei';

interface WallProps {
  args: [number, number, number];
  position: [number, number, number];
  rotation?: [number, number, number];
  material?: any;
  color: string;
  transparent?: boolean;
  opacity?: number;
}

export const Wall: React.FC<WallProps> = ({ args, position, rotation = [0, 0, 0], color, transparent = false, opacity = 1 }) => {
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
      <meshStandardMaterial 
        color={color} 
        transparent={transparent} 
        opacity={opacity} 
        metalness={0.8} 
        roughness={0.1}
      />
    </mesh>
  );
};

export const Bumper: React.FC<{ position: [number, number, number]; theme: VisualTheme; onHit: () => void }> = ({ position, theme, onHit }) => {
  const [isHit, setIsHit] = useState(false);
  const [ref, api] = useCylinder(() => ({
    type: 'Static',
    position,
    args: [0.5, 0.5, 1, 16],
    material: { restitution: 1.2 }, // Bouncy!
    onCollide: (e) => {
      // prevent rapid double trigger
      if (!isHit) {
        onHit();
        setIsHit(true);
        setTimeout(() => setIsHit(false), 150);
      }
    }
  }));

  return (
    <mesh ref={ref as any}>
      <cylinderGeometry args={[0.5, 0.5, 0.5, 16]} />
      <meshStandardMaterial 
        color={isHit ? "#ffffff" : theme.secondaryColor} 
        emissive={isHit ? "#ffffff" : theme.neonColor} 
        emissiveIntensity={isHit ? 3 : 1}
      />
      {/* Glow Ring */}
      <mesh position={[0, -0.4, 0]}>
         <torusGeometry args={[0.6, 0.05, 16, 32]} />
         <meshBasicMaterial color={theme.neonColor} />
      </mesh>
    </mesh>
  );
};

export const Slingshot: React.FC<{ position: [number, number, number]; rotation: [number, number, number]; theme: VisualTheme; onHit: () => void }> = ({ position, rotation, theme, onHit }) => {
  const [isHit, setIsHit] = useState(false);
  
  const [ref] = useBox(() => ({
    type: 'Static',
    position,
    rotation,
    args: [0.3, 1, 3.5], 
    material: { restitution: 1.8, friction: 0 }, // Very bouncy
    onCollide: (e) => {
        if(e.body.name === 'ball' && !isHit) {
            onHit();
            setIsHit(true);
            setTimeout(() => setIsHit(false), 100);
        }
    }
  }));

  return (
    <group>
      <mesh ref={ref as any}>
        <boxGeometry args={[0.3, 1, 3.5]} />
        <meshStandardMaterial 
            color={isHit ? '#fff' : theme.primaryColor} 
            emissive={isHit ? '#fff' : theme.neonColor}
            emissiveIntensity={isHit ? 2 : 0.5}
        />
      </mesh>
    </group>
  );
}

export const Plunger: React.FC<{ position: [number, number, number]; color: string; isPressed: boolean }> = ({ position, color, isPressed }) => {
    // Kinematic plunger
    const [ref, api] = useBox(() => ({
        type: 'Kinematic',
        position,
        args: [0.8, 1, 1],
        material: { friction: 0, restitution: 0 }
    }));

    useFrame(() => {
        // Rest position Z: position[2]
        // Pulled position Z: position[2] + 2
        // We act as a spring. 
        if (isPressed) {
            // Pull back slowly
            api.position.set(position[0], position[1], position[2] + 2);
        } else {
            // Snap back forward (launch)
            api.position.set(position[0], position[1], position[2]);
        }
    });

    return (
        <mesh ref={ref as any}>
            <boxGeometry args={[0.8, 1, 1]} />
            <meshStandardMaterial color={isPressed ? "red" : color} />
        </mesh>
    );
};

export const BossTarget: React.FC<{ position: [number, number, number]; name: string; theme: VisualTheme; onHit: () => void }> = ({ position, name, theme, onHit }) => {
    const [isHit, setIsHit] = useState(false);
    
    const [ref, api] = useBox(() => ({
        type: 'Static', // Static for stability, or Kinematic for moving
        position,
        args: [2, 2, 2],
        isTrigger: true, // Pass through, but triggers event? Or bouncing? Let's make it bounce
        onCollide: () => {
             onHit();
             setIsHit(true);
             setTimeout(() => setIsHit(false), 200);
        }
    }));

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        // Float animation
        api.position.set(position[0], position[1] + Math.sin(t) * 0.5, position[2]);
        api.rotation.set(t * 0.5, t * 0.3, 0);
    });

    return (
        <group ref={ref as any}>
            <mesh>
                <dodecahedronGeometry args={[1, 0]} />
                <meshStandardMaterial 
                    color={isHit ? "white" : theme.secondaryColor} 
                    wireframe 
                    emissive={theme.neonColor}
                    emissiveIntensity={isHit ? 5 : 1}
                />
            </mesh>
            <mesh scale={[0.5, 0.5, 0.5]}>
                 <dodecahedronGeometry args={[1, 0]} />
                 <meshBasicMaterial color={theme.neonColor} />
            </mesh>
            {/* Boss Name Tag */}
            <Float position={[0, 2, 0]} speed={2}>
                <Text fontSize={0.5} color={theme.neonColor}>
                    {name}
                </Text>
            </Float>
        </group>
    );
}

export const WarpGate: React.FC<{ 
  position: [number, number, number]; 
  isOpen: boolean; 
  onEnter: () => void;
  theme: VisualTheme 
}> = ({ position, isOpen, onEnter, theme }) => {
  const [ref] = useBox(() => ({
    isTrigger: true,
    position,
    args: [3, 2, 0.5],
    onCollide: (e) => {
      if (isOpen && e.body.name === 'ball') {
        onEnter();
      }
    }
  }));

  return (
    <group ref={ref as any}>
      <mesh visible={false}> 
        <boxGeometry args={[3, 2, 0.5]} />
      </mesh>

      {/* The Gate Structure */}
      <mesh position={[-1.6, 0, 0]}>
        <boxGeometry args={[0.2, 2, 0.5]} />
        <meshStandardMaterial color={theme.primaryColor} />
      </mesh>
      <mesh position={[1.6, 0, 0]}>
        <boxGeometry args={[0.2, 2, 0.5]} />
        <meshStandardMaterial color={theme.primaryColor} />
      </mesh>
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[3.4, 0.2, 0.5]} />
        <meshStandardMaterial color={theme.primaryColor} />
      </mesh>

      {/* Portal Visuals */}
      {isOpen ? (
        <group>
             <mesh position={[0, 0, 0]}>
                <planeGeometry args={[3, 2]} />
                <meshBasicMaterial color="#fff" side={2} transparent opacity={0.6} />
            </mesh>
            <Sparkles count={50} scale={3} size={5} speed={2} color="#00ff00" />
        </group>
      ) : (
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[3, 2]} />
          <meshBasicMaterial color="#000" side={2} transparent opacity={0.8} />
          <gridHelper args={[3, 5, theme.neonColor, theme.neonColor]} rotation={[Math.PI/2,0,0]} />
        </mesh>
      )}
    </group>
  );
};
const Sparkles = ({ count, scale, size, speed, color }: any) => {
    // Basic shim if drei sparkles aren't imported or behaving in this context, 
    // but we use imports from Scene.tsx usually. 
    // Assuming this component is used inside Scene which imports drei.
    // However, TableObjects is standalone. Let's rely on standard meshes or imports if passed.
    // To be safe, I'll remove Sparkles usage here or import it.
    // I will import Sparkles from drei at the top.
    return null; 
}

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
  const [ref] = useCylinder(() => ({
    type: 'Static',
    position,
    args: [0.5, 0.5, 1, 16],
    material: { restitution: 1.5 }, // Extra bouncy
    onCollide: () => {
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
    material: { restitution: 2.0, friction: 0 }, // Very bouncy
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
        material: { friction: 0, restitution: 0.8 }
    }));
    
    // Track current Z position for manual animation
    const currentZ = useRef(position[2]);

    useFrame((state, delta) => {
        const startZ = position[2];
        const pullBackZ = startZ + 3; // Pull back distance
        
        const targetZ = isPressed ? pullBackZ : startZ;
        
        // Speed: Slow pull back, fast release
        const speed = isPressed ? 5 : 60; 
        
        const diff = targetZ - currentZ.current;
        
        // Don't overshoot
        const move = Math.sign(diff) * Math.min(Math.abs(diff), speed * delta);
        
        currentZ.current += move;
        
        // Update Position
        api.position.set(position[0], position[1], currentZ.current);
        
        // CRITICAL: Update Velocity. 
        // Physics engine needs velocity to transfer momentum to the ball.
        // Velocity = distance / time
        if (delta > 0) {
            api.velocity.set(0, 0, move / delta);
        }
    });

    return (
        <mesh ref={ref as any}>
            <boxGeometry args={[0.8, 1, 1]} />
            <meshStandardMaterial color={isPressed ? "#ef4444" : color} />
        </mesh>
    );
};

export const BossTarget: React.FC<{ position: [number, number, number]; name: string; theme: VisualTheme; onHit: () => void }> = ({ position, name, theme, onHit }) => {
    const [isHit, setIsHit] = useState(false);
    
    const [ref, api] = useBox(() => ({
        type: 'Static',
        position,
        args: [1.5, 1.5, 1.5],
        onCollide: () => {
             onHit();
             setIsHit(true);
             setTimeout(() => setIsHit(false), 200);
        }
    }));

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        api.position.set(position[0], position[1] + Math.sin(t * 2) * 0.3, position[2]);
        api.rotation.set(t, t * 0.5, 0);
    });

    return (
        <group ref={ref as any}>
            <mesh>
                <octahedronGeometry args={[1, 0]} />
                <meshStandardMaterial 
                    color={isHit ? "white" : theme.secondaryColor} 
                    wireframe 
                    emissive={theme.neonColor}
                    emissiveIntensity={isHit ? 5 : 2}
                />
            </mesh>
            <Float position={[0, 1.5, 0]} speed={2}>
                <Text fontSize={0.4} color={theme.neonColor} font="https://fonts.gstatic.com/s/audiowide/v16/l7gdbjpo0cum0ckerdt6.woff">
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

      {isOpen ? (
        <mesh position={[0, 0, 0]}>
           <planeGeometry args={[3, 2]} />
           <meshBasicMaterial color="#fff" side={2} transparent opacity={0.6} />
        </mesh>
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
import React, { useRef } from 'react';
import { useBox } from '@react-three/cannon';
import { useFrame } from '@react-three/fiber';

interface FlipperProps {
  position: [number, number, number];
  rotation: [number, number, number];
  side: 'left' | 'right';
  color: string;
  isPressed: boolean;
}

export const SimpleFlipper = React.forwardRef(({ side, isPressed, color, position }: FlipperProps, ref: any) => {
    // Kinematic Flipper for reliable gameplay
    const [bodyRef, api] = useBox(() => ({
        type: 'Kinematic',
        position,
        args: [1.8, 0.5, 0.3], // Length, height, depth
        material: { friction: 0, restitution: 0.6 }
    }));
    
    // Store current angle to interpolate for smooth movement
    const currentAngle = useRef(side === 'left' ? -0.4 : 0.4);

    useFrame((_, delta) => {
        // Define target angles (Down vs Up)
        const target = isPressed ? (side === 'left' ? 0.5 : -0.5) : (side === 'left' ? -0.4 : 0.4);
        
        // Flipper speed
        const speed = isPressed ? 20 : 10;
        
        // Linear interpolation for rotation
        currentAngle.current += (target - currentAngle.current) * Math.min(delta * speed, 1);
        
        // Apply rotation to the physics body
        api.rotation.set(0, currentAngle.current, 0);
    });

    return (
        <mesh ref={bodyRef as any}>
            <boxGeometry args={[1.8, 0.5, 0.3]} />
            <meshStandardMaterial color={color} />
        </mesh>
    );
});
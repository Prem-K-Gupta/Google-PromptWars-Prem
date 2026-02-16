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
    // We use a box that is slightly wider to catch the ball easier
    const [bodyRef, api] = useBox(() => ({
        type: 'Kinematic',
        position,
        args: [1.8, 0.5, 0.3], // Length, height, depth
        material: { friction: 0.1, restitution: 0.8 } // Good snap
    }));
    
    // Store current angle to interpolate for smooth movement
    const currentAngle = useRef(side === 'left' ? -0.4 : 0.4);

    useFrame((_, delta) => {
        // Define target angles (Down vs Up)
        // Left flipper: Rest at -0.5 (down), flip to 0.5 (up)
        // Right flipper: Rest at 0.5 (down), flip to -0.5 (up)
        const restAngle = side === 'left' ? -0.5 : 0.5;
        const activeAngle = side === 'left' ? 0.4 : -0.4;

        const target = isPressed ? activeAngle : restAngle;
        
        // Flipper speed - fast up, slightly slower down
        const speed = isPressed ? 25 : 15;
        
        // Linear interpolation for rotation
        const diff = target - currentAngle.current;
        const step = Math.sign(diff) * Math.min(Math.abs(diff), speed * delta);
        
        currentAngle.current += step;
        
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
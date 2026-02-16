import React, { useEffect, useRef } from 'react';
import { useBox, useHingeConstraint } from '@react-three/cannon';
import { useFrame } from '@react-three/fiber';

interface FlipperProps {
  position: [number, number, number];
  rotation: [number, number, number];
  side: 'left' | 'right';
  color: string;
  isPressed: boolean;
}

export const Flipper: React.FC<FlipperProps> = ({ position, rotation, side, color, isPressed }) => {
  const shapeArgs: [number, number, number] = [1.5, 0.4, 2.5]; // Flipper approximate box
  
  // The flipper body
  const [bodyRef, api] = useBox(() => ({
    mass: 10,
    position,
    args: shapeArgs,
    rotation,
    material: { friction: 0.1, restitution: 0.2 }
  }));

  // A static pivot point for the hinge
  const pivotPos = side === 'left' 
    ? [position[0] - 0.8, position[1], position[2]]
    : [position[0] + 0.8, position[1], position[2]];

  const [pivotRef] = useBox(() => ({
    type: 'Static',
    position: [pivotPos[0], pivotPos[1], pivotPos[2]],
    args: [0.1, 0.1, 0.1],
    collisionFilterGroup: 0 // Invisible, don't collide
  }));

  // Hinge constraint to rotate flipper around pivot
  useHingeConstraint(pivotRef as any, bodyRef as any, {
    pivotA: [0, 0, 0],
    pivotB: side === 'left' ? [-0.8, 0, 0] : [0.8, 0, 0],
    axisA: [0, 1, 0], // Rotate around Y axis (which is up in this context, but since we are tilted, it's relative)
    axisB: [0, 1, 0],
    collideConnected: false,
  });

  // Apply force/velocity based on press
  useFrame(() => {
    const targetAngle = isPressed 
        ? (side === 'left' ? Math.PI / 4 : -Math.PI / 4) 
        : (side === 'left' ? -Math.PI / 6 : Math.PI / 6);
    
    // Simple spring-like logic handled by setting rotation not ideal for physics body, 
    // better to use angular motor or simple impulse. 
    // For stability in R3F simple demo, we often just use position spring or motor.
    // Let's try kinematic approach if dynamic fails, but dynamic is more fun.
    
    // Actually, setting velocity is easier for 'snappy' flippers.
    // But precise angular control with cannon requires springs.
    // Hacky simpler version: Apply torque.
    
    const strength = 150;
    const impulse = isPressed ? strength : -strength;
    // This is hard to tune blindly.
    
    // Alternative: Kinematic Flipper (easiest for reliable gameplay)
    // We will switch body type to Kinematic? No, constraints need dynamic.
    
    // Let's just use a simple logic:
    // If pressed, drive to Up angle. If not, drive to Down angle.
    // Using simple angular velocity.
  });
  
  // Since Physics constraints in simple cannon can be wobbly, let's use a Kinematic box that rotates explicitly
  // This is much more stable for a "gamey" feel.
  
  return (
    <mesh ref={bodyRef as any}>
      <boxGeometry args={shapeArgs} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
};

// Re-implementing as Kinematic for stability
export const KinematicFlipper: React.FC<FlipperProps> = ({ position, side, color, isPressed }) => {
   const [ref, api] = useBox(() => ({
     type: 'Kinematic',
     position,
     args: [2.5, 0.5, 0.5], // Length, height, depth
   }));

   useFrame(() => {
     // Target angles
     const restAngle = side === 'left' ? -Math.PI / 6 : Math.PI / 6;
     const activeAngle = side === 'left' ? Math.PI / 4 : -Math.PI / 4;
     
     const target = isPressed ? activeAngle : restAngle;
     
     // Interpolate current rotation to target
     // We need to manage the rotation state.
     // For kinematic, we assume we set rotation directly.
     
     const speed = 0.4; // Slerp speed
     
     // Note: This simple lerp inside a frame without reading current rotation is tricky.
     // In a real app we'd read api.rotation, but subscribing is expensive.
     // We'll trust the visual mesh rotation for this demo logic or just snap for responsiveness.
   });
   
   // Back to the "Hinge" idea but with a Motor.
   // Or actually, simple "Impulse" is best for pinball.
   // Let's stick to the simple Box geometry which acts as a wall that moves.
   
   return (
       <FlipperMesh physicsRef={ref} api={api} color={color} isPressed={isPressed} side={side} />
   )
}

const FlipperMesh: React.FC<{physicsRef: any, api: any, color: string, isPressed: boolean, side: 'left' | 'right'}> = ({ physicsRef, api, color, isPressed, side }) => {
    const meshRef = useRef<any>(null);
    const angle = useRef(side === 'left' ? -0.5 : 0.5);
    
    useFrame((state, delta) => {
        const target = isPressed ? (side === 'left' ? 0.6 : -0.6) : (side === 'left' ? -0.4 : 0.4);
        const diff = target - angle.current;
        // Fast move up, slow move down
        const speed = isPressed ? 15 : 8;
        angle.current += diff * Math.min(delta * speed, 1);
        
        if (physicsRef.current) {
            // Sync physics body to this calculated rotation
            // We rotate around a pivot.
            // Simplified: Just rotate around center for this demo to ensure ball hits it.
            // A true flipper pivots at one end.
            
            // Pivot offset calculation
            const pivotOffset = side === 'left' ? -1.2 : 1.2;
            // We want to rotate around local x point `pivotOffset`
            
            // To achieve pivot effect with center-positioned kinematic body:
            // x = pivotX + cos(angle) * radius
            // z = pivotZ + sin(angle) * radius
            // For now, let's keep it simple: Center rotation. It looks okayish for a web toy.
            
            // physicsRef.current.rotation.set(0, angle.current, 0) // Z is up in R3F defaults? No Y is up.
            // Our table is flat on XZ plane usually, or tilted.
            // Let's assume Table is in X-Z plane. Gravity is -Y.
            
            // Set Rotation
            api.rotation.set(0, angle.current, 0);
        }
    });

    // We need the API here.
    // Redoing the export to include API access in component.
    return null;
}

// Final Flipper Implementation used in GameScene
export const SimpleFlipper = React.forwardRef(({ side, isPressed, color, position }: FlipperProps, ref: any) => {
    const [bodyRef, api] = useBox(() => ({
        type: 'Kinematic',
        position,
        args: [1.8, 0.5, 0.3], // Shape
        material: { friction: 0, restitution: 0.6 }
    }));
    
    const currentAngle = useRef(side === 'left' ? -0.4 : 0.4);

    useFrame((_, delta) => {
        const target = isPressed ? (side === 'left' ? 0.5 : -0.5) : (side === 'left' ? -0.4 : 0.4);
        const speed = isPressed ? 20 : 10;
        
        currentAngle.current += (target - currentAngle.current) * Math.min(delta * speed, 1);
        
        api.rotation.set(0, currentAngle.current, 0);
        
        // Pivot adjustment? (Optional polish)
        // Without pivot adjustment, flipper rotates around center.
    });

    return (
        <mesh ref={bodyRef as any}>
            <boxGeometry args={[1.8, 0.5, 0.3]} />
            <meshStandardMaterial color={color} />
        </mesh>
    );
});
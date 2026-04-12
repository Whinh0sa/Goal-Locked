import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { usePhysics } from '../../hooks/usePhysics';

const BALL_RADIUS = 0.8;

// Tactical Amber Shaders
const BallShader = {
  uniforms: {
    uTime: { value: 0 },
    uVelocity: { value: 0 },
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uVelocity;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
      float fresnel = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
      vec3 baseColor = vec3(1.0, 0.75, 0.0); // Amber
      
      // Dynamic core pulse based on velocity
      float pulse = 0.7 + 0.3 * sin(uTime * (10.0 + uVelocity));
      vec3 finalColor = mix(baseColor * pulse, vec3(1.0), fresnel * 0.5);
      
      // Speed glow
      finalColor += vec3(1.0, 0.5, 0.0) * (uVelocity * 0.05);
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

export const Ball = () => {
  const { world } = usePhysics();
  const meshRef = useRef<THREE.Mesh>(null);
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  
  const body = useMemo(() => {
    const b = new CANNON.Body({
      mass: 1,
      shape: new CANNON.Sphere(BALL_RADIUS),
      linearDamping: 0.1,
      angularDamping: 0.1,
    });
    b.position.set(0, 5, 0);
    return b;
  }, []);

  useEffect(() => {
    world.addBody(body);
    return () => { world.removeBody(body); };
  }, [world, body]);

  useFrame(({ clock }) => {
    if (!meshRef.current || !body) return;
    
    // Sync mesh to physics body
    meshRef.current.position.copy(body.position as any);
    meshRef.current.quaternion.copy(body.quaternion as any);
    
    // Update shader
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = clock.getElapsedTime();
      shaderRef.current.uniforms.uVelocity.value = body.velocity.length();
    }
    
    // Bounce decay or velocity cap logic can go here
  });

  return (
    <group>
      <mesh ref={meshRef} castShadow>
        <sphereGeometry args={[BALL_RADIUS, 32, 32]} />
        <shaderMaterial 
          ref={shaderRef}
          vertexShader={BallShader.vertexShader}
          fragmentShader={BallShader.fragmentShader}
          uniforms={BallShader.uniforms}
        />
      </mesh>
      
      {/* Outer Wireframe Shell */}
      <mesh position={meshRef.current?.position} quaternion={meshRef.current?.quaternion}>
        <sphereGeometry args={[BALL_RADIUS + 0.05, 12, 12]} />
        <meshBasicMaterial color="#FFBF00" wireframe transparent opacity={0.2} />
      </mesh>
    </group>
  );
};

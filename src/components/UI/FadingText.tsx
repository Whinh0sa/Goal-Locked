import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import React, { type ComponentProps } from 'react';
import * as THREE from 'three';

type TextProps = ComponentProps<typeof Text>;

interface FadingTextProps extends TextProps {
  children?: React.ReactNode;
  /** Milliseconds before the text starts fading out. Default: 10000 (10s) */
  fadeDelay?: number;
}

/**
 * <FadingText>
 * Drop-in wrapper around @react-three/drei <Text> that smoothly fades
 * the text to invisible after `fadeDelay` milliseconds.
 */
export const FadingText = ({ fadeDelay = 10000, children, ...props }: FadingTextProps) => {
  const textRef = useRef<any>(null);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setIsFading(true), fadeDelay);
    return () => clearTimeout(id);
  }, [fadeDelay]);

  useFrame(() => {
    const mesh = textRef.current;
    if (!mesh || !isFading) return;

    // Lerp opacity toward 0
    const mat = mesh.material as THREE.MeshBasicMaterial;
    if (!mat) return;
    mat.opacity = THREE.MathUtils.lerp(mat.opacity, 0, 0.05);

    // Kill render cycles once fully transparent
    if (mat.opacity < 0.005) {
      mesh.visible = false;
    }
  });

  return (
    <Text ref={textRef} {...props} material-transparent material-opacity={1}>
      {children}
    </Text>
  );
};

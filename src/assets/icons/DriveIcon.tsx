import React from 'react';
import Svg, { Path, G } from 'react-native-svg';

interface DriveIconProps {
  size?: number;
  color?: string;
}

export function DriveIcon({ size = 24, color = '#000' }: DriveIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M4.5 18.5 8.2 11l-1.05-1.85a1.52 1.52 0 0 1 .02-1.53L9.6 3.9a1.51 1.51 0 0 1 2.05-.53l7.9 4.52c.7.4 1.06 1.19.9 1.95L16.9 18.5Z" />
        <Path d="M9 3.5 4.6 18.5H19.5" />
      </G>
    </Svg>
  );
}
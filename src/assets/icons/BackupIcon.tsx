import React from 'react';
import Svg, { Path, G } from 'react-native-svg';

interface BackupIconProps {
  size?: number;
  color?: string;
}

export function BackupIcon({ size = 24, color = '#000' }: BackupIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19Z"
        fill={color}
      />
      <Path d="M12 7V13M15 10L12 13L9 10" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M8 16H16" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface Props { size?: number; color?: string; }
export const PlusIcon: React.FC<Props> = ({ size = 40, color = '#fff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

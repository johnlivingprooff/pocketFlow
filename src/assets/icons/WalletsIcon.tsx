import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

interface Props { size?: number; color?: string; focused?: boolean; }
export const WalletsIcon: React.FC<Props> = ({ size = 26, color = '#888', focused }) => {
  const stroke = focused ? '#007aff' : color;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={6} width={18} height={12} rx={2} stroke={stroke} strokeWidth={2} />
      <Path d="M17 12h2" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      <Path d="M3 9h18" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
};

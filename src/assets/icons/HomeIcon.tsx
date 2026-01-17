import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface Props { size?: number; color?: string; focused?: boolean; }
export const HomeIcon: React.FC<Props> = ({ size = 26, color = '#888', focused }) => {
  const stroke = color;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 11.4 12 4l9 7.4M5.5 10v9.5h13V10" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

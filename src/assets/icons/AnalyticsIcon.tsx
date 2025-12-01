import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface Props { size?: number; color?: string; focused?: boolean; }
export const AnalyticsIcon: React.FC<Props> = ({ size = 26, color = '#888', focused }) => {
  const stroke = focused ? '#007aff' : color;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 20V10" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      <Path d="M10 20V4" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      <Path d="M16 20v-6" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      <Path d="M22 20V8" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
};

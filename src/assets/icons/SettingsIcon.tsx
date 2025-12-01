import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface Props { size?: number; color?: string; focused?: boolean; }
export const SettingsIcon: React.FC<Props> = ({ size = 26, color = '#888', focused }) => {
  const stroke = focused ? '#007aff' : color;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={3} stroke={stroke} strokeWidth={2} />
      <Path d="M4.6 9.6a1 1 0 0 1 .53-1.33l1.5-.6a1 1 0 0 0 .57-.57l.6-1.5a1 1 0 0 1 1.33-.53l1.6.64a1 1 0 0 0 .74 0l1.6-.64a1 1 0 0 1 1.33.53l.6 1.5a1 1 0 0 0 .57.57l1.5.6a1 1 0 0 1 .53 1.33l-.64 1.6a1 1 0 0 0 0 .74l.64 1.6a1 1 0 0 1-.53 1.33l-1.5.6a1 1 0 0 0-.57.57l-.6 1.5a1 1 0 0 1-1.33.53l-1.6-.64a1 1 0 0 0-.74 0l-1.6.64a1 1 0 0 1-1.33-.53l-.6-1.5a1 1 0 0 0-.57-.57l-1.5-.6a1 1 0 0 1-.53-1.33l.64-1.6a1 1 0 0 0 0-.74l-.64-1.6Z" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface ReceiptIconProps {
  size?: number;
  color?: string;
}

export function ReceiptIcon({ size = 24, color = '#000' }: ReceiptIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 3H6C4.9 3 4 3.9 4 5V21L12 18L20 21V5C20 3.9 19.1 3 18 3ZM12 10H8V12H12V10ZM14 6H8V8H14V6ZM16 14H8V16H16V14Z"
        fill={color}
      />
    </Svg>
  );
}

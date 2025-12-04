import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface FingerprintIconProps {
  size?: number;
  color?: string;
}

export function FingerprintIcon({ size = 64, color = '#000000' }: FingerprintIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Fingerprint SVG paths */}
      <Path
        d="M12 11C11.4477 11 11 11.4477 11 12V16C11 16.5523 11.4477 17 12 17C12.5523 17 13 16.5523 13 16V12C13 11.4477 12.5523 11 12 11Z"
        fill={color}
      />
      <Path
        d="M9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12V14C15 14.5523 15.4477 15 16 15C16.5523 15 17 14.5523 17 14V12C17 9.23858 14.7614 7 12 7C9.23858 7 7 9.23858 7 12V16C7 16.5523 7.44772 17 8 17C8.55228 17 9 16.5523 9 16V12Z"
        fill={color}
      />
      <Path
        d="M5 12C5 8.13401 8.13401 5 12 5C15.866 5 19 8.13401 19 12V17C19 17.5523 19.4477 18 20 18C20.5523 18 21 17.5523 21 17V12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12V13C3 13.5523 3.44772 14 4 14C4.55228 14 5 13.5523 5 13V12Z"
        fill={color}
      />
      <Path
        d="M12 15C11.4477 15 11 15.4477 11 16V20C11 20.5523 11.4477 21 12 21C12.5523 21 13 20.5523 13 20V16C13 15.4477 12.5523 15 12 15Z"
        fill={color}
      />
      <Path
        d="M7 16C7 15.4477 7.44772 15 8 15C8.55228 15 9 15.4477 9 16V19C9 19.5523 8.55228 20 8 20C7.44772 20 7 19.5523 7 19V16Z"
        fill={color}
      />
      <Path
        d="M16 15C15.4477 15 15 15.4477 15 16V18C15 18.5523 15.4477 19 16 19C16.5523 19 17 18.5523 17 18V16C17 15.4477 16.5523 15 16 15Z"
        fill={color}
      />
    </Svg>
  );
}

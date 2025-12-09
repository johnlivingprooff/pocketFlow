import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface FingerprintIconProps {
  size?: number;
  color?: string;
}

export function FingerprintIcon({ size = 64, color = '#000000' }: FingerprintIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Fingerprint SVG paths with thinner strokes and slightly looser spacing */}
      <Path
        d="M12 11.1C11.5029 11.1 11.1 11.5029 11.1 12V16C11.1 16.4971 11.5029 16.9 12 16.9C12.4971 16.9 12.9 16.4971 12.9 16V12C12.9 11.5029 12.4971 11.1 12 11.1Z"
        stroke={color}
        strokeWidth={0.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M9.25 12C9.25 10.55 10.55 9.25 12 9.25C13.45 9.25 14.75 10.55 14.75 12V13.85C14.75 14.4023 15.1977 14.85 15.75 14.85C16.3023 14.85 16.75 14.4023 16.75 13.85V12C16.75 9.42 14.58 7.25 12 7.25C9.42 7.25 7.25 9.42 7.25 12V15.9C7.25 16.4523 7.69772 16.9 8.25 16.9C8.80228 16.9 9.25 16.4523 9.25 15.9V12Z"
        stroke={color}
        strokeWidth={0.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M5.3 12C5.3 8.2929 8.2929 5.3 12 5.3C15.7071 5.3 18.7 8.2929 18.7 12V16.9C18.7 17.4523 19.1477 17.9 19.7 17.9C20.2523 17.9 20.7 17.4523 20.7 16.9V12C20.7 7.19442 16.8056 3.3 12 3.3C7.19442 3.3 3.3 7.19442 3.3 12V12.9C3.3 13.4523 3.74772 13.9 4.3 13.9C4.85228 13.9 5.3 13.4523 5.3 12.9V12Z"
        stroke={color}
        strokeWidth={0.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M12 15.1C11.5029 15.1 11.1 15.5029 11.1 16V20C11.1 20.4971 11.5029 20.9 12 20.9C12.4971 20.9 12.9 20.4971 12.9 20V16C12.9 15.5029 12.4971 15.1 12 15.1Z"
        stroke={color}
        strokeWidth={0.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M7.1 16C7.1 15.5029 7.50228 15.1 8 15.1C8.49772 15.1 8.9 15.5029 8.9 16V19C8.9 19.4971 8.49772 19.9 8 19.9C7.50228 19.9 7.1 19.4971 7.1 19V16Z"
        stroke={color}
        strokeWidth={0.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M16 15.1C15.5029 15.1 15.1 15.5029 15.1 16V18C15.1 18.4971 15.5029 18.9 16 18.9C16.4971 18.9 16.9 18.4971 16.9 18V16C16.9 15.5029 16.4971 15.1 16 15.1Z"
        stroke={color}
        strokeWidth={0.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

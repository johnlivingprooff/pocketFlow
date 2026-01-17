import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

interface IconProps {
    size?: number;
    color?: string;
}

export const EmptyBudgetIcon = ({ size = 64, color = '#999' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        {/* Wallet outline */}
        <Rect x="8" y="16" width="48" height="36" rx="4" stroke={color} strokeWidth="2" fill="none" />
        <Path d="M8 24 H56" stroke={color} strokeWidth="2" />
        {/* Dollar sign */}
        <Path d="M32 30 L32 42 M28 33 L36 33 M28 39 L36 39" stroke={color} strokeWidth="2" strokeLinecap="round" />
        {/* Credit card stripe */}
        <Rect x="14" y="28" width="12" height="2" rx="1" fill={color} opacity="0.3" />
    </Svg>
);

export const EmptyGoalIcon = ({ size = 64, color = '#999' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        {/* Target circles */}
        <Circle cx="32" cy="32" r="20" stroke={color} strokeWidth="2" />
        <Circle cx="32" cy="32" r="14" stroke={color} strokeWidth="2" opacity="0.6" />
        <Circle cx="32" cy="32" r="8" stroke={color} strokeWidth="2" opacity="0.3" />
        {/* Arrow pointing to center */}
        <Path d="M48 16 L32 32 M48 16 L44 16 M48 16 L48 20" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

export const CheckCircleIcon = ({ size = 24, color = '#10b981' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill="none" />
        <Path d="M8 12 L11 15 L16 9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

export const AlertCircleIcon = ({ size = 24, color = '#f59e0b' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill="none" />
        <Path d="M12 8 L12 12" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Circle cx="12" cy="16" r="1" fill={color} />
    </Svg>
);

export const TrendUpIcon = ({ size = 20, color = '#10b981' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
        <Path d="M3 15 L7 11 L11 13 L17 7 M17 7 L17 11 M17 7 L13 7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

export const TrendDownIcon = ({ size = 20, color = '#ef4444' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
        <Path d="M3 7 L7 11 L11 9 L17 15 M17 15 L17 11 M17 15 L13 15" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

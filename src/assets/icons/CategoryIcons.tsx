import React from 'react';
import Svg, { Path, Circle, Rect, Polyline, Line } from 'react-native-svg';

interface IconProps { size?: number; color?: string; }

// Food & Dining
export const FoodIcon: React.FC<IconProps> = ({ size = 24, color = '#888' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Transport
export const TransportIcon: React.FC<IconProps> = ({ size = 24, color = '#888' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0zm10 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0zM5 9l2-4h10l2 4M3 11h18v6H3v-6z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Home/Rent
export const HomeIcon: React.FC<IconProps> = ({ size = 24, color = '#888' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 11.4 12 4l9 7.4M5.5 10v9.5h13V10" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Shopping/Cart
export const ShoppingIcon: React.FC<IconProps> = ({ size = 24, color = '#888' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="9" cy="21" r="1" stroke={color} strokeWidth={2} />
    <Circle cx="20" cy="21" r="1" stroke={color} strokeWidth={2} />
    <Path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Utilities (lightbulb)
export const UtilitiesIcon: React.FC<IconProps> = ({ size = 24, color = '#888' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 18h6M10 22h4M15 2a7 7 0 0 1-3 13.6V18H12v-2.4A7 7 0 0 1 9 2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Healthcare
export const HealthcareIcon: React.FC<IconProps> = ({ size = 24, color = '#888' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2v20M2 12h20M8 2h8a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Entertainment
export const EntertainmentIcon: React.FC<IconProps> = ({ size = 24, color = '#888' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M5 3l14 9-14 9V3z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Education/Book
export const EducationIcon: React.FC<IconProps> = ({ size = 24, color = '#888' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Bills/Document
export const BillsIcon: React.FC<IconProps> = ({ size = 24, color = '#888' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Salary/Money
export const SalaryIcon: React.FC<IconProps> = ({ size = 24, color = '#888' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
    <Path d="M12 6v12M15 9H9.5a2.5 2.5 0 0 0 0 5h5a2.5 2.5 0 0 1 0 5H9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Freelance/Briefcase
export const FreelanceIcon: React.FC<IconProps> = ({ size = 24, color = '#888' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="7" width="20" height="14" rx="2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2M12 11v4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Business/Building
export const BusinessIcon: React.FC<IconProps> = ({ size = 24, color = '#888' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-2M9 9v.01M9 12v.01M9 15v.01M9 18v.01" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Investment/Chart
export const InvestmentIcon: React.FC<IconProps> = ({ size = 24, color = '#888' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 3v18h18M7 16l4-4 4 4 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="m17 10 4-4v4h-4z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Gift
export const GiftIcon: React.FC<IconProps> = ({ size = 24, color = '#888' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="8" width="18" height="4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 8v13M5 12v9h14v-9M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8M16.5 8a2.5 2.5 0 0 0 0-5C13 3 12 8 12 8" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Clothing/Shirt
export const ClothingIcon: React.FC<IconProps> = ({ size = 24, color = '#888' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Travel/Plane
export const TravelIcon: React.FC<IconProps> = ({ size = 24, color = '#888' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Groceries
export const GroceriesIcon: React.FC<IconProps> = ({ size = 24, color = '#888' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 3h18v18H3zM8 3v18M16 3v18M3 8h18M3 16h18" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Other/More
export const OtherIcon: React.FC<IconProps> = ({ size = 24, color = '#888' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="1" fill={color} />
    <Circle cx="12" cy="5" r="1" fill={color} />
    <Circle cx="12" cy="19" r="1" fill={color} />
  </Svg>
);

export const CATEGORY_ICONS = {
  Food: FoodIcon,
  Transport: TransportIcon,
  Rent: HomeIcon,
  Groceries: GroceriesIcon,
  Utilities: UtilitiesIcon,
  Shopping: ShoppingIcon,
  Healthcare: HealthcareIcon,
  Entertainment: EntertainmentIcon,
  Education: EducationIcon,
  Bills: BillsIcon,
  Salary: SalaryIcon,
  Freelance: FreelanceIcon,
  Business: BusinessIcon,
  Investment: InvestmentIcon,
  Gift: GiftIcon,
  Clothing: ClothingIcon,
  Travel: TravelIcon,
  Other: OtherIcon,
  'Other Income': SalaryIcon,
  Offering: GiftIcon,
};

export type CategoryIconName = keyof typeof CATEGORY_ICONS;

import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';

interface DataPoint {
  date: string;
  amount: number;
}

interface SevenDayTrendChartProps {
  data: DataPoint[];
  color: string;
  textColor: string;
  backgroundColor: string;
  gridColor: string;
  formatCurrency: (amount: number) => string;
}

export default function SevenDayTrendChart({
  data,
  color,
  textColor,
  backgroundColor,
  gridColor,
  formatCurrency,
}: SevenDayTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: textColor, fontSize: 14 }}>No data available</Text>
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 64; // Accounting for padding
  const chartHeight = 180;
  const paddingTop = 20;
  const paddingBottom = 30;
  const paddingLeft = 10;
  const paddingRight = 10;

  const graphWidth = chartWidth - paddingLeft - paddingRight;
  const graphHeight = chartHeight - paddingTop - paddingBottom;

  // Find min and max values
  const amounts = data.map(d => d.amount);
  const maxAmount = Math.max(...amounts, 1);
  const minAmount = 0;

  // Calculate points for the line
  const points = data.map((point, index) => {
    const x = paddingLeft + (index / (data.length - 1)) * graphWidth;
    const y = paddingTop + graphHeight - ((point.amount - minAmount) / (maxAmount - minAmount)) * graphHeight;
    return { x, y, amount: point.amount, date: point.date };
  });

  // Create SVG path
  let pathD = '';
  points.forEach((point, index) => {
    if (index === 0) {
      pathD += `M ${point.x} ${point.y}`;
    } else {
      pathD += ` L ${point.x} ${point.y}`;
    }
  });

  // Format day labels (show day of week)
  const getDayLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
  };

  return (
    <View>
      <Svg width={chartWidth} height={chartHeight}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const y = paddingTop + graphHeight * (1 - ratio);
          return (
            <Line
              key={`grid-${index}`}
              x1={paddingLeft}
              y1={y}
              x2={chartWidth - paddingRight}
              y2={y}
              stroke={gridColor}
              strokeWidth="1"
              strokeDasharray="4,4"
              opacity={0.3}
            />
          );
        })}

        {/* Line path */}
        <Path
          d={pathD}
          stroke={color}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((point, index) => (
          <Circle
            key={`point-${index}`}
            cx={point.x}
            cy={point.y}
            r="5"
            fill={color}
            stroke={backgroundColor}
            strokeWidth="2"
          />
        ))}

        {/* X-axis labels */}
        {points.map((point, index) => {
          // Only show every other label to avoid crowding
          if (index % 2 === 0 || index === points.length - 1) {
            return (
              <SvgText
                key={`label-${index}`}
                x={point.x}
                y={chartHeight - 10}
                fill={textColor}
                fontSize="10"
                textAnchor="middle"
                opacity={0.7}
              >
                {getDayLabel(point.date)}
              </SvgText>
            );
          }
          return null;
        })}
      </Svg>
      
      {/* Summary info */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <View>
          <Text style={{ color: textColor, fontSize: 11, opacity: 0.7 }}>Avg/day</Text>
          <Text style={{ color: textColor, fontSize: 13, fontWeight: '600' }}>
            {formatCurrency(amounts.reduce((a, b) => a + b, 0) / amounts.length)}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: textColor, fontSize: 11, opacity: 0.7 }}>Total 7 days</Text>
          <Text style={{ color: textColor, fontSize: 13, fontWeight: '600' }}>
            {formatCurrency(amounts.reduce((a, b) => a + b, 0))}
          </Text>
        </View>
      </View>
    </View>
  );
}

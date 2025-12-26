import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';

interface CandlestickData {
  label: string;
  income: number;
  expense: number;
  net: number;
}

interface CandlestickChartProps {
  data: CandlestickData[];
  positiveColor: string;
  negativeColor: string;
  textColor: string;
  backgroundColor: string;
  formatCurrency: (amount: number) => string;
}

export default function CandlestickChart({
  data,
  positiveColor,
  negativeColor,
  textColor,
  backgroundColor,
  formatCurrency,
}: CandlestickChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: textColor, fontSize: 14 }}>No data available</Text>
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 64;
  const chartHeight = 300;
  const candleWidth = 40;
  const spacing = (chartWidth - (data.length * candleWidth)) / (data.length + 1);

  // Find the absolute max value for scaling (to ensure symmetric scaling)
  const maxAbsValue = Math.max(
    ...data.flatMap(d => [Math.abs(d.income), Math.abs(d.expense), Math.abs(d.net)]),
    1
  );

  const scaleY = (value: number) => {
    // Center the chart at y=0 (middle of chart)
    const centerY = chartHeight / 2;
    // Scale so that maxAbsValue maps to the full height
    const scale = (chartHeight / 2 - 20) / maxAbsValue;
    return centerY - (value * scale);
  };

  return (
    <View>
      <Svg width={chartWidth} height={chartHeight}>
        {/* X-axis */}
        <Line
          x1={0}
          y1={chartHeight / 2}
          x2={chartWidth}
          y2={chartHeight / 2}
          stroke={textColor}
          strokeWidth={1}
          opacity={0.3}
        />

        {data.map((item, index) => {
          const x = spacing + index * (candleWidth + spacing);
          const centerX = x + candleWidth / 2;

          // Calculate positions - expenses are negative (below x-axis)
          const incomeY = scaleY(item.income);        // Positive income above x-axis
          const expenseY = scaleY(-item.expense);     // Negative expense below x-axis
          const highY = Math.min(incomeY, expenseY);  // Higher value (more positive) is visually higher
          const lowY = Math.max(incomeY, expenseY);   // Lower value (more negative) is visually lower

          // Body represents net flow (income - expense)
          const netY = scaleY(item.net);
          const bodyTop = Math.min(netY, scaleY(0));  // Body extends from net to zero
          const bodyBottom = Math.max(netY, scaleY(0));
          const bodyHeight = Math.max(bodyBottom - bodyTop, 2); // Minimum height of 2

          // Determine if this is a bullish (green) or bearish (red) candle
          const isPositive = item.net >= 0;
          const candleColor = isPositive ? positiveColor : negativeColor;

          return (
            <React.Fragment key={`candle-${index}`}>
              {/* High-Low wick */}
              <Line
                x1={centerX}
                y1={highY}
                x2={centerX}
                y2={lowY}
                stroke={candleColor}
                strokeWidth={2}
              />

              {/* Candle body */}
              <Rect
                x={x}
                y={bodyTop}
                width={candleWidth}
                height={bodyHeight}
                fill={candleColor}
                stroke={candleColor}
                strokeWidth={1}
                rx={2}
              />

              {/* Label */}
              <SvgText
                x={centerX}
                y={chartHeight - 5}
                fontSize={12}
                fill={textColor}
                textAnchor="middle"
                fontWeight="500"
              >
                {item.label}
              </SvgText>

              {/* Net value label */}
              <SvgText
                x={centerX}
                y={bodyTop - 8}
                fontSize={10}
                fill={textColor}
                textAnchor="middle"
              >
                {formatCurrency(item.net)}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}
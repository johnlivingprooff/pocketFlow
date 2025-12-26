import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';

interface BarData {
  category: string;
  total: number;
  percentage: number;
  color: string;
}

interface HorizontalBarChartProps {
  data: BarData[];
  textColor: string;
  backgroundColor: string;
  formatCurrency: (amount: number) => string;
}

export default function HorizontalBarChart({
  data,
  textColor,
  backgroundColor,
  formatCurrency,
}: HorizontalBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: textColor, fontSize: 14 }}>No data available</Text>
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 64;
  const barHeight = 32;
  const barSpacing = 12;
  const labelWidth = 80;
  const percentageWidth = 50;
  const barAreaWidth = chartWidth - labelWidth - percentageWidth - 20;

  // Find max value for scaling
  const maxValue = Math.max(...data.map(d => d.total), 1);

  const chartHeight = data.length * (barHeight + barSpacing) + 20;

  return (
    <View>
      <Svg width={chartWidth} height={chartHeight}>
        {data.map((item, index) => {
          const y = index * (barHeight + barSpacing) + 10;
          const barWidth = (item.total / maxValue) * barAreaWidth;

          return (
            <React.Fragment key={`bar-${index}`}>
              {/* Category label */}
              <SvgText
                x={0}
                y={y + barHeight / 2 + 5}
                fontSize={12}
                fill={textColor}
                fontWeight="500"
              >
                {item.category}
              </SvgText>

              {/* Bar background */}
              <Rect
                x={labelWidth}
                y={y}
                width={barAreaWidth}
                height={barHeight}
                fill={`${item.color}20`}
                rx={4}
              />

              {/* Bar fill */}
              <Rect
                x={labelWidth}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={item.color}
                rx={4}
              />

              {/* Percentage */}
              <SvgText
                x={labelWidth + barAreaWidth + 10}
                y={y + barHeight / 2 + 5}
                fontSize={12}
                fill={textColor}
                fontWeight="600"
              >
                {item.percentage.toFixed(1)}%
              </SvgText>

              {/* Value label on bar (if bar is wide enough) */}
              {barWidth > 60 && (
                <SvgText
                  x={labelWidth + barWidth - 8}
                  y={y + barHeight / 2 + 5}
                  fontSize={10}
                  fill="white"
                  textAnchor="end"
                  fontWeight="500"
                >
                  {formatCurrency(item.total)}
                </SvgText>
              )}
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}
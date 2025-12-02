import React from 'react';
import { View, Text, Dimensions, ScrollView } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';

interface DailyData {
  day: number;
  amount: number;
}

interface MonthlyBarChartProps {
  data: DailyData[];
  color: string;
  textColor: string;
  gridColor: string;
  formatCurrency: (amount: number) => string;
}

export default function MonthlyBarChart({
  data,
  color,
  textColor,
  gridColor,
  formatCurrency,
}: MonthlyBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: textColor, fontSize: 14 }}>No data available</Text>
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width;
  const chartHeight = 180;
  const barWidth = 8;
  const barSpacing = 4;
  const totalWidth = data.length * (barWidth + barSpacing);
  const chartWidth = Math.max(screenWidth - 64, totalWidth + 40);
  
  const paddingTop = 20;
  const paddingBottom = 30;
  const paddingLeft = 20;
  const paddingRight = 20;

  const graphHeight = chartHeight - paddingTop - paddingBottom;

  // Find max value
  const amounts = data.map(d => d.amount);
  const maxAmount = amounts.reduce((max, val) => Math.max(max, val), 1);
  const totalAmount = amounts.reduce((a, b) => a + b, 0);
  const avgAmount = totalAmount / data.length;

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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

          {/* Bars */}
          {data.map((item, index) => {
            const barHeight = (item.amount / maxAmount) * graphHeight;
            const x = paddingLeft + index * (barWidth + barSpacing);
            const y = paddingTop + graphHeight - barHeight;
            
            return (
              <React.Fragment key={`bar-${index}`}>
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={color}
                  rx={2}
                />
                {/* Show day labels for every 5th day and first/last */}
                {(item.day % 5 === 0 || item.day === 1 || item.day === data.length) && (
                  <SvgText
                    x={x + barWidth / 2}
                    y={chartHeight - 10}
                    fill={textColor}
                    fontSize="9"
                    textAnchor="middle"
                    opacity={0.7}
                  >
                    {item.day}
                  </SvgText>
                )}
              </React.Fragment>
            );
          })}
        </Svg>
      </ScrollView>
      
      {/* Summary info */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <View>
          <Text style={{ color: textColor, fontSize: 11, opacity: 0.7 }}>Daily avg</Text>
          <Text style={{ color: textColor, fontSize: 13, fontWeight: '600' }}>
            {formatCurrency(avgAmount)}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: textColor, fontSize: 11, opacity: 0.7 }}>Month total</Text>
          <Text style={{ color: textColor, fontSize: 13, fontWeight: '600' }}>
            {formatCurrency(totalAmount)}
          </Text>
        </View>
      </View>
    </View>
  );
}

import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import Svg, { Path, Circle, Text as SvgText } from 'react-native-svg';

interface CategoryData {
  category: string;
  total: number;
  percentage: number;
}

interface CategoryPieChartProps {
  data: CategoryData[];
  colors: string[];
  textColor: string;
  formatCurrency: (amount: number) => string;
}

export default function CategoryPieChart({
  data,
  colors,
  textColor,
  formatCurrency,
}: CategoryPieChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: textColor, fontSize: 14 }}>No data available</Text>
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width;
  const size = Math.min(screenWidth - 64, 240);
  const radius = size / 2 - 10;
  const centerX = size / 2;
  const centerY = size / 2;

  // Calculate total
  const total = data.reduce((sum, item) => sum + item.total, 0);

  // Create pie slices
  const createArcPath = (
    startAngle: number,
    endAngle: number,
    radius: number
  ): string => {
    const startX = centerX + radius * Math.cos((startAngle - 90) * (Math.PI / 180));
    const startY = centerY + radius * Math.sin((startAngle - 90) * (Math.PI / 180));
    const endX = centerX + radius * Math.cos((endAngle - 90) * (Math.PI / 180));
    const endY = centerY + radius * Math.sin((endAngle - 90) * (Math.PI / 180));

    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

    return `M ${centerX} ${centerY} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
  };

  let currentAngle = 0;
  const slices = data.map((item, index) => {
    const percentage = (item.total / total) * 100;
    const sliceAngle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;

    return {
      ...item,
      percentage,
      startAngle,
      endAngle,
      color: colors[index % colors.length],
    };
  });

  return (
    <View>
      <View style={{ alignItems: 'center', marginBottom: 16 }}>
        <Svg width={size} height={size}>
          {/* Pie slices */}
          {slices.map((slice, index) => (
            <Path
              key={`slice-${index}`}
              d={createArcPath(slice.startAngle, slice.endAngle, radius)}
              fill={slice.color}
            />
          ))}
          
          {/* Center circle for donut effect */}
          <Circle cx={centerX} cy={centerY} r={radius * 0.5} fill="transparent" />
        </Svg>
      </View>

      {/* Legend */}
      <View style={{ gap: 8 }}>
        {slices.map((slice, index) => (
          <View
            key={`legend-${index}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 2,
                  backgroundColor: slice.color,
                }}
              />
              <Text
                style={{ color: textColor, fontSize: 13, flex: 1 }}
                numberOfLines={1}
              >
                {slice.category}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: textColor, fontSize: 13, fontWeight: '600' }}>
                {formatCurrency(slice.total)}
              </Text>
              <Text style={{ color: textColor, fontSize: 11, opacity: 0.7 }}>
                {slice.percentage.toFixed(1)}%
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import Svg, { Line, Circle, Polyline, Text as SvgText } from 'react-native-svg';

interface DataPoint {
  date: string;
  income: number;
  expense: number;
}

interface IncomeExpenseLineChartProps {
  data: DataPoint[];
  height?: number;
  textColor: string;
  backgroundColor: string;
  incomeColor?: string;
  expenseColor?: string;
  gridColor?: string;
}

export function IncomeExpenseLineChart({
  data,
  height = 200,
  textColor,
  backgroundColor,
  incomeColor = '#10B981',
  expenseColor = '#EF4444',
  gridColor = '#E5E7EB',
}: IncomeExpenseLineChartProps) {
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 64;
  const paddingLeft = 40;
  const paddingRight = 16;
  const paddingTop = 20;
  const paddingBottom = 32;
  const legendHeight = 40;
  const chartHeight = height - paddingTop - paddingBottom - legendHeight;

  if (data.length === 0) {
    return (
      <View style={{ height, justifyContent: 'center', alignItems: 'center', backgroundColor }}>
        <Text style={{ color: textColor, fontSize: 14 }}>No data available</Text>
      </View>
    );
  }

  // Find max value for scaling
  const maxIncome = Math.max(...data.map(d => d.income), 0);
  const maxExpense = Math.max(...data.map(d => d.expense), 0);
  const maxValue = Math.max(maxIncome, maxExpense, 100) * 1.1; // Add 10% headroom

  // Calculate points for income and expense lines
  const xStep = (chartWidth - paddingLeft - paddingRight) / (data.length - 1 || 1);
  
  const incomePoints = data.map((d, i) => ({
    x: paddingLeft + i * xStep,
    y: paddingTop + (chartHeight - (d.income / maxValue) * chartHeight),
  }));

  const expensePoints = data.map((d, i) => ({
    x: paddingLeft + i * xStep,
    y: paddingTop + (chartHeight - (d.expense / maxValue) * chartHeight),
  }));

  // Create polyline strings
  const incomePolyline = incomePoints.map(p => `${p.x},${p.y}`).join(' ');
  const expensePolyline = expensePoints.map(p => `${p.x},${p.y}`).join(' ');

  // Y-axis labels (3 levels)
  const yLabels = [
    { value: maxValue, y: paddingTop },
    { value: maxValue / 2, y: paddingTop + chartHeight / 2 },
    { value: 0, y: paddingTop + chartHeight },
  ];

  // Format number with abbreviations
  const formatNumber = (num: number): string => {
    if (num < 1000) {
      return Math.round(num).toString();
    } else if (num < 1000000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    } else if (num < 1000000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    } else {
      return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
    }
  };

  return (
    <View style={{ backgroundColor, borderRadius: 12, padding: 8 }}>
      <Svg width={chartWidth} height={height - legendHeight}>
        {/* Grid lines */}
        {yLabels.map((label, i) => (
          <Line
            key={`grid-${i}`}
            x1={paddingLeft}
            y1={label.y}
            x2={chartWidth - paddingRight}
            y2={label.y}
            stroke={gridColor}
            strokeWidth="1"
            strokeDasharray="4,4"
          />
        ))}

        {/* Y-axis labels */}
        {yLabels.map((label, i) => (
          <SvgText
            key={`ylabel-${i}`}
            x={paddingLeft - 8}
            y={label.y + 4}
            fontSize="10"
            fill={textColor}
            textAnchor="end"
          >
            {formatNumber(label.value)}
          </SvgText>
        ))}

        {/* Expense line (draw first so it's behind) */}
        <Polyline
          points={expensePolyline}
          fill="none"
          stroke={expenseColor}
          strokeWidth="2.5"
        />

        {/* Income line */}
        <Polyline
          points={incomePolyline}
          fill="none"
          stroke={incomeColor}
          strokeWidth="2.5"
        />

        {/* Expense points */}
        {expensePoints.map((point, i) => (
          <Circle
            key={`expense-${i}`}
            cx={point.x}
            cy={point.y}
            r="4"
            fill={expenseColor}
          />
        ))}

        {/* Income points */}
        {incomePoints.map((point, i) => (
          <Circle
            key={`income-${i}`}
            cx={point.x}
            cy={point.y}
            r="4"
            fill={incomeColor}
          />
        ))}

        {/* X-axis labels */}
        {data.map((d, i) => {
          const x = paddingLeft + i * xStep;
          const dateLabel = new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          return (
            <SvgText
              key={`xlabel-${i}`}
              x={x}
              y={paddingTop + chartHeight + 20}
              fontSize="9"
              fill={textColor}
              textAnchor="middle"
            >
              {dateLabel}
            </SvgText>
          );
        })}
      </Svg>

      {/* Legend */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: incomeColor }} />
          <Text style={{ color: textColor, fontSize: 12, fontWeight: '600' }}>Income</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: expenseColor }} />
          <Text style={{ color: textColor, fontSize: 12, fontWeight: '600' }}>Expenses</Text>
        </View>
      </View>
    </View>
  );
}

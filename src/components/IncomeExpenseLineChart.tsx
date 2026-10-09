import React, { memo, useMemo } from 'react';
import { View, Text, useWindowDimensions, StyleSheet } from 'react-native';
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

// Hoisted: pure helper (was recreated per render)
function formatNumber(num: number): string {
  if (num < 1000) {
    return Math.round(num).toString();
  } else if (num < 1000000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  } else if (num < 1000000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  } else {
    return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
}

const styles = StyleSheet.create({
  empty: { justifyContent: 'center', alignItems: 'center' },
  container: { borderRadius: 12, padding: 8 },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 12, height: 12, borderRadius: 6 },
});

export const IncomeExpenseLineChart = memo(function IncomeExpenseLineChart({
  data,
  height = 200,
  textColor,
  backgroundColor,
  incomeColor = '#10B981',
  expenseColor = '#EF4444',
  gridColor = '#E5E7EB',
}: IncomeExpenseLineChartProps) {
  // Reactive width (was Dimensions.get per render — stale on rotation,
  // and forced full recompute without memo).
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - 64;
  const paddingLeft = 40;
  const paddingRight = 16;
  const paddingTop = 20;
  const paddingBottom = 32;
  const legendHeight = 40;
  const chartHeight = height - paddingTop - paddingBottom - legendHeight;

  // All geometry memoized on data+size (was rebuilt object/arrays per render)
  const geometry = useMemo(() => {
    if (data.length === 0) return null;
    // Single pass for max (was 2 spreads + 2 maps = 4 scans)
    let maxValue = 100;
    for (const d of data) {
      if (d.income > maxValue) maxValue = d.income;
      if (d.expense > maxValue) maxValue = d.expense;
    }
    maxValue *= 1.1; // 10% headroom

    const xStep = (chartWidth - paddingLeft - paddingRight) / (data.length - 1 || 1);

    const incomePoints = new Array<{ x: number; y: number }>(data.length);
    const expensePoints = new Array<{ x: number; y: number }>(data.length);
    const incomeParts: string[] = new Array(data.length);
    const expenseParts: string[] = new Array(data.length);
    const xLabels: string[] = new Array(data.length);
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      const x = paddingLeft + i * xStep;
      const iy = paddingTop + (chartHeight - (d.income / maxValue) * chartHeight);
      const ey = paddingTop + (chartHeight - (d.expense / maxValue) * chartHeight);
      incomePoints[i] = { x, y: iy };
      expensePoints[i] = { x, y: ey };
      incomeParts[i] = `${x},${iy}`;
      expenseParts[i] = `${x},${ey}`;
      xLabels[i] = new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    return {
      maxValue,
      xStep,
      incomePoints,
      expensePoints,
      incomePolyline: incomeParts.join(' '),
      expensePolyline: expenseParts.join(' '),
      xLabels,
      yLabels: [
        { value: maxValue, y: paddingTop },
        { value: maxValue / 2, y: paddingTop + chartHeight / 2 },
        { value: 0, y: paddingTop + chartHeight },
      ],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, chartWidth, chartHeight]);

  if (data.length === 0 || !geometry) {
    return (
      <View style={[styles.empty, { height, backgroundColor }]}>
        <Text style={{ color: textColor, fontSize: 14 }}>No data available</Text>
      </View>
    );
  }

  const { incomePoints, expensePoints, incomePolyline, expensePolyline, yLabels, xLabels, xStep } = geometry;

  return (
    <View style={[styles.container, { backgroundColor }]}>
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

        {/* X-axis labels (precomputed — was new Date().toLocaleDateString per label per render) */}
        {xLabels.map((dateLabel, i) => {
          const x = paddingLeft + i * xStep;
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
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: incomeColor }]} />
          <Text style={{ color: textColor, fontSize: 12, fontWeight: '600' }}>Income</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: expenseColor }]} />
          <Text style={{ color: textColor, fontSize: 12, fontWeight: '600' }}>Expenses</Text>
        </View>
      </View>
    </View>
  );
});

import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText, Rect } from 'react-native-svg';

interface TrendPoint {
  date: string;
  income: number;
  expense: number;
}

interface TrendLineChartProps {
  data: TrendPoint[];
  days: number;
  incomeColor: string;
  expenseColor: string;
  textColor: string;
  backgroundColor: string;
  gridColor: string;
  formatCurrency: (amount: number) => string;
}

function abbreviate(num: number): string {
  if (num < 999) return Math.round(num).toLocaleString('en-US');
  if (num < 1_000_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  if (num < 1_000_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
}

function getXLabels(days: number): number[] {
  if (days <= 7) return Array.from({ length: days }, (_, i) => i + 1);
  if (days <= 30) {
    const step = 5;
    const labels: number[] = [];
    for (let i = 1; i <= days; i += step) labels.push(i);
    if (labels[labels.length - 1] !== days) labels.push(days);
    return labels;
  }
  const step = 15;
  const labels: number[] = [];
  for (let i = 1; i <= days; i += step) labels.push(i);
  if (labels[labels.length - 1] !== days) labels.push(days);
  return labels;
}

export default function TrendLineChart({
  data,
  days,
  incomeColor,
  expenseColor,
  textColor,
  backgroundColor,
  gridColor,
  formatCurrency,
}: TrendLineChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={{ height: 220, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: textColor, fontSize: 14 }}>No data available</Text>
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 64;
  const chartHeight = 220;
  const paddingTop = 20;
  const paddingBottom = 35;
  const paddingLeft = 50;
  const paddingRight = 16;

  const graphWidth = chartWidth - paddingLeft - paddingRight;
  const graphHeight = chartHeight - paddingTop - paddingBottom;

  const allValues = data.flatMap(d => [d.income, d.expense]);
  const maxVal = Math.max(...allValues, 1);

  const scaleY = (val: number) => paddingTop + graphHeight - (val / maxVal) * graphHeight;

  const incomePoints = data.map((point, i) => ({
    x: paddingLeft + (i / (data.length - 1)) * graphWidth,
    y: scaleY(point.income),
  }));

  const expensePoints = data.map((point, i) => ({
    x: paddingLeft + (i / (data.length - 1)) * graphWidth,
    y: scaleY(point.expense),
  }));

  const incomePath = incomePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const expensePath = expensePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  const yLabels = [0, 0.25, 0.5, 0.75, 1].map(r => Math.round(maxVal * r));
  const xLabels = getXLabels(days);

  const totalIncome = data.reduce((s, d) => s + d.income, 0);
  const totalExpense = data.reduce((s, d) => s + d.expense, 0);

  return (
    <View>
      <Svg width={chartWidth} height={chartHeight}>
        {yLabels.map((val, i) => {
          const y = scaleY(val);
          return (
            <React.Fragment key={`y-${i}`}>
              <Line x1={paddingLeft} y1={y} x2={chartWidth - paddingRight} y2={y} stroke={gridColor} strokeWidth="1" strokeDasharray="4,4" opacity={0.25} />
              <SvgText x={paddingLeft - 8} y={y + 4} fill={textColor} fontSize={10} textAnchor="end" opacity={0.6}>
                {abbreviate(val)}
              </SvgText>
            </React.Fragment>
          );
        })}

        {xLabels.map((dayNum) => {
          const i = dayNum - 1;
          if (i < 0 || i >= data.length) return null;
          const x = paddingLeft + (i / (data.length - 1)) * graphWidth;
          return (
            <SvgText key={`x-${dayNum}`} x={x} y={chartHeight - 10} fill={textColor} fontSize={10} textAnchor="middle" opacity={0.6}>
              {dayNum}
            </SvgText>
          );
        })}

        <Path d={expensePath} stroke={expenseColor} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {expensePoints.map((p, i) => (
          <Circle key={`ep-${i}`} cx={p.x} cy={p.y} r="3.5" fill={expenseColor} stroke={backgroundColor} strokeWidth="1.5" />
        ))}

        <Path d={incomePath} stroke={incomeColor} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {incomePoints.map((p, i) => (
          <Circle key={`ip-${i}`} cx={p.x} cy={p.y} r="3.5" fill={incomeColor} stroke={backgroundColor} strokeWidth="1.5" />
        ))}
      </Svg>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: incomeColor }} />
            <Text style={{ color: textColor, fontSize: 11, opacity: 0.7 }}>Income</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: expenseColor }} />
            <Text style={{ color: textColor, fontSize: 11, opacity: 0.7 }}>Expense</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <Text style={{ color: incomeColor, fontSize: 12, fontWeight: '700' }}>{formatCurrency(totalIncome)}</Text>
          <Text style={{ color: expenseColor, fontSize: 12, fontWeight: '700' }}>{formatCurrency(totalExpense)}</Text>
        </View>
      </View>
    </View>
  );
}

import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';

interface ComparisonData {
  income: number;
  expense: number;
  label: string;
}

interface IncomeExpenseChartProps {
  data: ComparisonData[];
  incomeColor: string;
  expenseColor: string;
  textColor: string;
  backgroundColor: string;
  formatCurrency: (amount: number) => string;
}

export default function IncomeExpenseChart({
  data,
  incomeColor,
  expenseColor,
  textColor,
  backgroundColor,
  formatCurrency,
}: IncomeExpenseChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: textColor, fontSize: 14 }}>No data available</Text>
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 64;
  const chartHeight = 200;
  const barHeight = 40;
  const barSpacing = 40;
  const paddingLeft = 80;
  const paddingRight = 20;

  const graphWidth = chartWidth - paddingLeft - paddingRight;

  // Find max value for scaling
  const maxValue = Math.max(
    ...data.map(d => Math.max(d.income, d.expense)),
    1
  );

  return (
    <View>
      <Svg width={chartWidth} height={chartHeight}>
        {data.map((item, index) => {
          const y = index * (barHeight + barSpacing) + 20;
          const incomeWidth = (item.income / maxValue) * graphWidth;
          const expenseWidth = (item.expense / maxValue) * graphWidth;

          return (
            <React.Fragment key={`group-${index}`}>
              {/* Label */}
              <SvgText
                x={paddingLeft - 10}
                y={y + barHeight / 2 + 15}
                fill={textColor}
                fontSize="12"
                textAnchor="end"
                fontWeight="600"
              >
                {item.label}
              </SvgText>

              {/* Income bar */}
              <Rect
                x={paddingLeft}
                y={y}
                width={incomeWidth}
                height={barHeight / 2 - 2}
                fill={incomeColor}
                rx={4}
              />

              {/* Expense bar */}
              <Rect
                x={paddingLeft}
                y={y + barHeight / 2 + 2}
                width={expenseWidth}
                height={barHeight / 2 - 2}
                fill={expenseColor}
                rx={4}
              />
            </React.Fragment>
          );
        })}
      </Svg>

      {/* Legend */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16, gap: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: incomeColor }} />
          <Text style={{ color: textColor, fontSize: 12 }}>Income</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: expenseColor }} />
          <Text style={{ color: textColor, fontSize: 12 }}>Expense</Text>
        </View>
      </View>

      {/* Totals */}
      <View style={{ marginTop: 12 }}>
        {data.map((item, index) => (
          <View key={`total-${index}`} style={{ marginBottom: 8 }}>
            <Text style={{ color: textColor, fontSize: 11, opacity: 0.7 }}>{item.label}</Text>
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 2 }}>
              <Text style={{ color: incomeColor, fontSize: 12, fontWeight: '600' }}>
                +{formatCurrency(item.income)}
              </Text>
              <Text style={{ color: expenseColor, fontSize: 12, fontWeight: '600' }}>
                -{formatCurrency(item.expense)}
              </Text>
              <Text style={{ color: textColor, fontSize: 12, fontWeight: '700', marginLeft: 'auto' }}>
                Net: {formatCurrency(item.income - item.expense)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

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

  const adjustedChartHeight = data.length * (barHeight + barSpacing) + 20;
  const adjustedPaddingLeft = 20;
  const adjustedGraphWidth = chartWidth - adjustedPaddingLeft - paddingRight;

  return (
    <View>
      <Svg width={chartWidth} height={adjustedChartHeight}>
        {data.map((item, index) => {
          const y = index * (barHeight + barSpacing) + 10;
          const incomeWidth = (item.income / maxValue) * adjustedGraphWidth;
          const expenseWidth = (item.expense / maxValue) * adjustedGraphWidth;

          return (
            <React.Fragment key={`group-${index}`}>
              {/* Income bar */}
              <Rect
                x={adjustedPaddingLeft}
                y={y}
                width={incomeWidth}
                height={barHeight / 2 - 2}
                fill={incomeColor}
                rx={4}
              />

              {/* Expense bar */}
              <Rect
                x={adjustedPaddingLeft}
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
    </View>
  );
}

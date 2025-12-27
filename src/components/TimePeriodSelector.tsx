import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

export type TimePeriod = '7days' | '30days' | '3months' | '6months';

interface TimePeriodSelectorProps {
  selectedPeriod: TimePeriod;
  onSelectPeriod: (period: TimePeriod) => void;
  textColor: string;
  backgroundColor: string;
  primaryColor: string;
  borderColor: string;
}

export default function TimePeriodSelector({
  selectedPeriod,
  onSelectPeriod,
  textColor,
  backgroundColor,
  primaryColor,
  borderColor,
}: TimePeriodSelectorProps) {
  const periods: { value: TimePeriod; label: string }[] = [
    { value: '7days', label: '7D' },
    { value: '30days', label: '30D' },
    { value: '3months', label: '3M' },
    { value: '6months', label: '6M' },
  ];

  return (
    <View style={{ marginBottom: 16 }}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {periods.map((period) => {
          const isSelected = selectedPeriod === period.value;
          return (
            <TouchableOpacity
              key={period.value}
              onPress={() => onSelectPeriod(period.value)}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: isSelected ? primaryColor : borderColor,
                backgroundColor: isSelected ? primaryColor : backgroundColor,
              }}
            >
              <Text
                style={{
                  color: isSelected ? '#FFFFFF' : textColor,
                  fontSize: 14,
                  fontWeight: isSelected ? '700' : '600',
                }}
              >
                {period.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

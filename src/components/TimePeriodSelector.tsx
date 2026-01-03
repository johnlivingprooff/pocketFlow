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
    { value: '7days', label: 'last 7 days' },
    { value: '30days', label: 'last 30 days' },
    { value: '3months', label: 'last 3 months' },
    { value: '6months', label: 'last 6 months' },
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
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: isSelected ? primaryColor : borderColor,
                backgroundColor: isSelected ? primaryColor : backgroundColor,
              }}
            >
              <Text
                style={{
                  color: isSelected ? '#FFFFFF' : textColor,
                  fontSize: 12,
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

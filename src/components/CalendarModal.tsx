import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, useColorScheme } from 'react-native';
import { theme } from '../theme/theme';
import { useSettings } from '../store/useStore';
import { CalendarMode, CalendarConfig } from '../types/calendar';
import {
  WEEKDAY_NAMES,
  MONTH_NAMES_SHORT,
  generateCalendarDays,
  generateCalendarMonths,
  generateCalendarYears,
  getHeaderLabel,
} from '../utils/calendarUtils';

interface CalendarModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
  selectedDate?: Date;
  minDate?: Date;
  maxDate?: Date;
  title?: string;
  showAdjacentMonthDays?: boolean;
}

export function CalendarModal({
  visible,
  onClose,
  onSelectDate,
  selectedDate = new Date(),
  minDate,
  maxDate,
  title = 'Select Date',
  showAdjacentMonthDays = false,
}: CalendarModalProps) {
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettings();
  const effectiveMode = themeMode === 'system' ? (systemColorScheme || 'light') : themeMode;
  const t = theme(effectiveMode);

  // Calendar state
  const [mode, setMode] = useState<CalendarMode>('day');
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());
  const [yearRangeStart, setYearRangeStart] = useState(
    Math.floor(selectedDate.getFullYear() / 12) * 12
  );

  const yearsPerPage = 12;

  const config: CalendarConfig = {
    minDate,
    maxDate,
    showAdjacentMonthDays,
    yearsPerPage,
  };

  // Reset view when modal opens
  useEffect(() => {
    if (visible) {
      setMode('day');
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
      setYearRangeStart(Math.floor(selectedDate.getFullYear() / 12) * 12);
    }
  }, [visible, selectedDate]);

  // Navigation handlers
  const handlePrevious = () => {
    switch (mode) {
      case 'day':
        if (viewMonth === 0) {
          setViewMonth(11);
          setViewYear(viewYear - 1);
        } else {
          setViewMonth(viewMonth - 1);
        }
        break;
      case 'month':
        setViewYear(viewYear - 1);
        break;
      case 'year':
        setYearRangeStart(yearRangeStart - yearsPerPage);
        break;
    }
  };

  const handleNext = () => {
    switch (mode) {
      case 'day':
        if (viewMonth === 11) {
          setViewMonth(0);
          setViewYear(viewYear + 1);
        } else {
          setViewMonth(viewMonth + 1);
        }
        break;
      case 'month':
        setViewYear(viewYear + 1);
        break;
      case 'year':
        setYearRangeStart(yearRangeStart + yearsPerPage);
        break;
    }
  };

  const handleHeaderTap = () => {
    switch (mode) {
      case 'day':
        setMode('month');
        break;
      case 'month':
        setMode('year');
        // Ensure year range includes current view year
        const rangeStart = Math.floor(viewYear / yearsPerPage) * yearsPerPage;
        setYearRangeStart(rangeStart);
        break;
      case 'year':
        // Cycle back to day mode
        setMode('day');
        break;
    }
  };

  // Selection handlers
  const handleDaySelect = (date: Date) => {
    onSelectDate(date);
    onClose();
  };

  const handleMonthSelect = (monthIndex: number) => {
    setViewMonth(monthIndex);
    setMode('day');
  };

  const handleYearSelect = (year: number) => {
    setViewYear(year);
    setMode('month');
  };

  // Generate data based on mode
  const calendarDays = mode === 'day' 
    ? generateCalendarDays(viewYear, viewMonth, selectedDate, config)
    : [];
  
  const calendarMonths = mode === 'month'
    ? generateCalendarMonths(viewYear, selectedDate, config)
    : [];
  
  const calendarYears = mode === 'year'
    ? generateCalendarYears(yearRangeStart, yearsPerPage, selectedDate, config)
    : [];

  const headerLabel = getHeaderLabel(mode, viewYear, viewMonth, yearRangeStart, yearsPerPage);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 16 }}>
        <View style={{ backgroundColor: t.card, borderRadius: 12, borderWidth: 1, borderColor: t.border }}>
          {/* Header */}
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: t.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800' }}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ fontSize: 28, color: t.textSecondary, lineHeight: 28 }}>×</Text>
            </TouchableOpacity>
          </View>

          {/* Navigation Header */}
          <View style={{ paddingHorizontal: 16, paddingTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <TouchableOpacity
              onPress={handlePrevious}
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                backgroundColor: t.background,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: t.border,
              }}
            >
              <Text style={{ color: t.textPrimary, fontSize: 20, fontWeight: '800' }}>‹</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleHeaderTap}>
              <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '700' }}>
                {headerLabel}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleNext}
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                backgroundColor: t.background,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: t.border,
              }}
            >
              <Text style={{ color: t.textPrimary, fontSize: 20, fontWeight: '800' }}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Calendar Content */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            {/* Day Mode */}
            {mode === 'day' && (
              <>
                {/* Weekday headers */}
                <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                  {WEEKDAY_NAMES.map((day) => (
                    <View key={day} style={{ flex: 1, alignItems: 'center' }}>
                      <Text
                        style={{
                          color: t.textSecondary,
                          fontSize: 12,
                          fontWeight: '700',
                          marginBottom: 8,
                        }}
                      >
                        {day}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Days grid - 6 weeks x 7 days */}
                <View>
                  {Array.from({ length: 6 }).map((_, weekIdx) => (
                    <View key={weekIdx} style={{ flexDirection: 'row', marginBottom: 4 }}>
                      {calendarDays.slice(weekIdx * 7, (weekIdx + 1) * 7).map((dayData, dayIdx) => {
                        const isDisabled = dayData.isDisabled || dayData.day === 0;
                        const isSelected = dayData.isSelected;
                        const isToday = dayData.isToday;
                        const isAdjacentMonth = !dayData.isCurrentMonth && dayData.day !== 0;

                        return (
                          <View key={dayIdx} style={{ flex: 1, padding: 2 }}>
                            <TouchableOpacity
                              disabled={isDisabled}
                              onPress={() => handleDaySelect(dayData.date)}
                              style={{
                                aspectRatio: 1,
                                borderRadius: 8,
                                justifyContent: 'center',
                                alignItems: 'center',
                                backgroundColor: isSelected 
                                  ? t.primary 
                                  : isToday
                                  ? t.primary + '20'
                                  : 'transparent',
                                borderWidth: isToday && !isSelected ? 1 : 0,
                                borderColor: t.primary,
                              }}
                            >
                              {dayData.day !== 0 && (
                                <Text
                                  style={{
                                    color: isSelected
                                      ? '#FFFFFF'
                                      : isDisabled
                                      ? t.textTertiary
                                      : isAdjacentMonth
                                      ? t.textSecondary
                                      : t.textPrimary,
                                    fontSize: 14,
                                    fontWeight: isSelected || isToday ? '800' : '600',
                                  }}
                                >
                                  {dayData.day}
                                </Text>
                              )}
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Month Mode */}
            {mode === 'month' && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {calendarMonths.map((monthData) => (
                  <View key={monthData.monthIndex} style={{ width: '33.33%', padding: 4 }}>
                    <TouchableOpacity
                      disabled={monthData.isDisabled}
                      onPress={() => handleMonthSelect(monthData.monthIndex)}
                      style={{
                        paddingVertical: 16,
                        borderRadius: 8,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: monthData.isSelected
                          ? t.primary
                          : t.background,
                        borderWidth: 1,
                        borderColor: monthData.isSelected ? t.primary : t.border,
                      }}
                    >
                      <Text
                        style={{
                          color: monthData.isSelected
                            ? '#FFFFFF'
                            : monthData.isDisabled
                            ? t.textTertiary
                            : t.textPrimary,
                          fontSize: 14,
                          fontWeight: monthData.isSelected ? '800' : '600',
                        }}
                      >
                        {MONTH_NAMES_SHORT[monthData.monthIndex]}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Year Mode */}
            {mode === 'year' && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {calendarYears.map((yearData) => (
                  <View key={yearData.year} style={{ width: '33.33%', padding: 4 }}>
                    <TouchableOpacity
                      disabled={yearData.isDisabled}
                      onPress={() => handleYearSelect(yearData.year)}
                      style={{
                        paddingVertical: 16,
                        borderRadius: 8,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: yearData.isSelected
                          ? t.primary
                          : t.background,
                        borderWidth: 1,
                        borderColor: yearData.isSelected ? t.primary : t.border,
                      }}
                    >
                      <Text
                        style={{
                          color: yearData.isSelected
                            ? '#FFFFFF'
                            : yearData.isDisabled
                            ? t.textTertiary
                            : t.textPrimary,
                          fontSize: 14,
                          fontWeight: yearData.isSelected ? '800' : '600',
                        }}
                      >
                        {yearData.year}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

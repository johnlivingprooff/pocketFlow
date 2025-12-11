// Calendar Type Definitions
export type CalendarMode = 'day' | 'month' | 'year';

export interface CalendarDay {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isDisabled: boolean;
  isSelected: boolean;
}

export interface CalendarMonth {
  monthIndex: number;
  monthName: string;
  year: number;
  isDisabled: boolean;
  isSelected: boolean;
}

export interface CalendarYear {
  year: number;
  isDisabled: boolean;
  isSelected: boolean;
}

export interface CalendarState {
  mode: CalendarMode;
  currentDate: Date;
  selectedDate: Date;
  viewYear: number;
  viewMonth: number;
  yearRangeStart: number;
}

export interface CalendarConfig {
  minDate?: Date;
  maxDate?: Date;
  showAdjacentMonthDays?: boolean;
  yearsPerPage?: number;
}

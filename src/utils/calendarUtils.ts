import { CalendarDay, CalendarMonth, CalendarYear, CalendarConfig } from '../types/calendar';

/**
 * Month names for display
 */
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Short month names
 */
export const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Weekday names
 */
export const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Get number of days in a month
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Get the day of week (0-6) for the first day of a month
 */
export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
}

/**
 * Check if a date is disabled based on min/max constraints
 */
export function isDateDisabled(date: Date, config: CalendarConfig): boolean {
  if (config.minDate && date < config.minDate) {
    // Compare without time component
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const minDateOnly = new Date(config.minDate.getFullYear(), config.minDate.getMonth(), config.minDate.getDate());
    if (dateOnly < minDateOnly) return true;
  }
  
  if (config.maxDate && date > config.maxDate) {
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const maxDateOnly = new Date(config.maxDate.getFullYear(), config.maxDate.getMonth(), config.maxDate.getDate());
    if (dateOnly > maxDateOnly) return true;
  }
  
  return false;
}

/**
 * Generate calendar days for a given month with proper alignment
 * Returns a grid that always starts on Sunday and fills 6 weeks (42 days)
 */
export function generateCalendarDays(
  year: number,
  month: number,
  selectedDate: Date,
  config: CalendarConfig
): CalendarDay[] {
  const days: CalendarDay[] = [];
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfWeek = getFirstDayOfMonth(year, month);
  const daysInPrevMonth = getDaysInMonth(year, month - 1);
  
  // Calculate previous month/year
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  
  // Calculate next month/year
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  
  // Add trailing days from previous month
  if (config.showAdjacentMonthDays) {
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const date = new Date(prevYear, prevMonth, day);
      days.push({
        date,
        day,
        isCurrentMonth: false,
        isToday: isToday(date),
        isDisabled: isDateDisabled(date, config),
        isSelected: isSameDay(date, selectedDate),
      });
    }
  } else {
    // Add empty placeholders
    for (let i = 0; i < firstDayOfWeek; i++) {
      const date = new Date(prevYear, prevMonth, 1); // Placeholder date
      days.push({
        date,
        day: 0, // 0 indicates empty cell
        isCurrentMonth: false,
        isToday: false,
        isDisabled: true,
        isSelected: false,
      });
    }
  }
  
  // Add current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    days.push({
      date,
      day,
      isCurrentMonth: true,
      isToday: isToday(date),
      isDisabled: isDateDisabled(date, config),
      isSelected: isSameDay(date, selectedDate),
    });
  }
  
  // Fill remaining cells to complete 6 weeks (42 days total)
  const remainingCells = 42 - days.length;
  if (config.showAdjacentMonthDays) {
    for (let day = 1; day <= remainingCells; day++) {
      const date = new Date(nextYear, nextMonth, day);
      days.push({
        date,
        day,
        isCurrentMonth: false,
        isToday: isToday(date),
        isDisabled: isDateDisabled(date, config),
        isSelected: isSameDay(date, selectedDate),
      });
    }
  } else {
    for (let i = 0; i < remainingCells; i++) {
      const date = new Date(nextYear, nextMonth, 1);
      days.push({
        date,
        day: 0,
        isCurrentMonth: false,
        isToday: false,
        isDisabled: true,
        isSelected: false,
      });
    }
  }
  
  return days;
}

/**
 * Generate 12 months for a given year
 */
export function generateCalendarMonths(
  year: number,
  selectedDate: Date,
  config: CalendarConfig
): CalendarMonth[] {
  return MONTH_NAMES.map((monthName, monthIndex) => {
    const firstDayOfMonth = new Date(year, monthIndex, 1);
    const lastDayOfMonth = new Date(year, monthIndex + 1, 0);
    
    // Check if entire month is disabled
    let isDisabled = false;
    if (config.minDate && lastDayOfMonth < config.minDate) {
      isDisabled = true;
    }
    if (config.maxDate && firstDayOfMonth > config.maxDate) {
      isDisabled = true;
    }
    
    const isSelected = 
      selectedDate.getMonth() === monthIndex && 
      selectedDate.getFullYear() === year;
    
    return {
      monthIndex,
      monthName,
      year,
      isDisabled,
      isSelected,
    };
  });
}

/**
 * Generate years for display in year mode
 */
export function generateCalendarYears(
  rangeStart: number,
  yearsPerPage: number,
  selectedDate: Date,
  config: CalendarConfig
): CalendarYear[] {
  const years: CalendarYear[] = [];
  
  for (let i = 0; i < yearsPerPage; i++) {
    const year = rangeStart + i;
    const firstDayOfYear = new Date(year, 0, 1);
    const lastDayOfYear = new Date(year, 11, 31);
    
    // Check if entire year is disabled
    let isDisabled = false;
    if (config.minDate && lastDayOfYear < config.minDate) {
      isDisabled = true;
    }
    if (config.maxDate && firstDayOfYear > config.maxDate) {
      isDisabled = true;
    }
    
    const isSelected = selectedDate.getFullYear() === year;
    
    years.push({
      year,
      isDisabled,
      isSelected,
    });
  }
  
  return years;
}

/**
 * Get the year range string for display (e.g., "2020–2031")
 */
export function getYearRangeString(rangeStart: number, yearsPerPage: number): string {
  const rangeEnd = rangeStart + yearsPerPage - 1;
  return `${rangeStart}–${rangeEnd}`;
}

/**
 * Get header label based on mode
 */
export function getHeaderLabel(
  mode: 'day' | 'month' | 'year',
  year: number,
  month: number,
  yearRangeStart: number,
  yearsPerPage: number
): string {
  switch (mode) {
    case 'day':
      return `${MONTH_NAMES[month]} ${year}`;
    case 'month':
      return `${year}`;
    case 'year':
      return getYearRangeString(yearRangeStart, yearsPerPage);
    default:
      return '';
  }
}

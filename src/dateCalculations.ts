import { addDays, subDays, differenceInDays, format, parseISO, isWeekend, addWeeks } from 'date-fns';
import { formatInTimeZone, utcToZonedTime } from 'date-fns-tz';
import { isUKBankHoliday } from './bankHolidays.js';

const UK_TIMEZONE = 'Europe/London';

export async function isWorkingDay(date: Date): Promise<boolean> {
  if (isWeekend(date)) {
    return false;
  }
  return !(await isUKBankHoliday(date));
}

export async function getNextWorkingDay(fromDate: Date): Promise<Date> {
  let current = addDays(fromDate, 1);
  
  while (!(await isWorkingDay(current))) {
    current = addDays(current, 1);
  }
  
  return current;
}

export async function calculateWorkingDays(
  startDate: Date,
  numDays: number,
  direction: 'forward' | 'backward' = 'forward'
): Promise<Date> {
  let current = new Date(startDate);
  let workingDaysCount = 0;
  
  const increment = direction === 'forward' ? 1 : -1;
  const addOrSubtract = direction === 'forward' ? addDays : subDays;
  
  while (workingDaysCount < Math.abs(numDays)) {
    current = addOrSubtract(current, 1);
    
    if (await isWorkingDay(current)) {
      workingDaysCount++;
    }
  }
  
  return current;
}

export async function getWorkingDaysBetween(startDate: Date, endDate: Date): Promise<number> {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (start > end) {
    return 0;
  }
  
  let workingDays = 0;
  let current = new Date(start);
  
  while (current <= end) {
    if (await isWorkingDay(current)) {
      workingDays++;
    }
    current = addDays(current, 1);
  }
  
  return workingDays;
}

export function calculateSprintDates(startDate: Date, sprintLengthWeeks: number): {
  start: Date;
  end: Date;
  length: number;
} {
  const start = new Date(startDate);
  const end = addWeeks(start, sprintLengthWeeks);
  const endAdjusted = subDays(end, 1); // Sprint ends day before next sprint starts
  
  return {
    start,
    end: endAdjusted,
    length: sprintLengthWeeks
  };
}

export function getCurrentSprintInfo(sprintStart: Date, sprintLengthWeeks: number): {
  sprintNumber: number;
  daysIntoSprint: number;
  daysRemaining: number;
  currentSprintStart: Date;
  currentSprintEnd: Date;
} {
  const now = new Date();
  const daysSinceStart = differenceInDays(now, sprintStart);
  const sprintLengthDays = sprintLengthWeeks * 7;
  
  const sprintNumber = Math.floor(daysSinceStart / sprintLengthDays) + 1;
  const daysIntoSprint = daysSinceStart % sprintLengthDays;
  const daysRemaining = sprintLengthDays - daysIntoSprint;
  
  const currentSprintStart = addDays(sprintStart, (sprintNumber - 1) * sprintLengthDays);
  const currentSprintEnd = addDays(currentSprintStart, sprintLengthDays - 1);
  
  return {
    sprintNumber,
    daysIntoSprint,
    daysRemaining,
    currentSprintStart,
    currentSprintEnd
  };
}

export function formatDateUK(date: Date): string {
  return formatInTimeZone(date, UK_TIMEZONE, 'EEEE, MMMM d, yyyy');
}

export function formatDateISO(date: Date): string {
  return formatInTimeZone(date, UK_TIMEZONE, 'yyyy-MM-dd');
}

export function formatDateTimeUK(date: Date): string {
  return formatInTimeZone(date, UK_TIMEZONE, 'EEEE, MMMM d, yyyy \'at\' h:mm a');
}

export function parseDate(dateString: string): Date {
  try {
    return utcToZonedTime(parseISO(dateString), UK_TIMEZONE);
  } catch (error) {
    throw new Error(`Invalid date string: ${dateString}. Expected ISO format (YYYY-MM-DD)`);
  }
}

export function getTodayUK(): Date {
  return utcToZonedTime(new Date(), UK_TIMEZONE);
}
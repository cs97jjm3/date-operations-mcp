import { getDay, setHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { getNextWorkingDay, getTodayUK } from './dateCalculations.js';

const UK_TIMEZONE = 'Europe/London';
const ASANA_DUE_HOUR = 16; // 4:00 PM

/**
 * Get Asana due date following James's rules:
 * - Next working day at 4:00 PM
 * - If today is Friday, return Monday at 4:00 PM
 */
export async function getAsanaDueDate(fromDate?: Date): Promise<Date> {
  const startDate = fromDate || getTodayUK();
  const dayOfWeek = getDay(startDate);
  
  let dueDate: Date;
  
  // If Friday (5), skip to Monday
  if (dayOfWeek === 5) {
    dueDate = await getNextWorkingDay(startDate);
    // Get the next working day after that (Monday)
    dueDate = await getNextWorkingDay(dueDate);
  } else {
    dueDate = await getNextWorkingDay(startDate);
  }
  
  // Set time to 4:00 PM
  dueDate = setHours(dueDate, ASANA_DUE_HOUR);
  dueDate = setMinutes(dueDate, 0);
  dueDate = setSeconds(dueDate, 0);
  dueDate = setMilliseconds(dueDate, 0);
  
  return dueDate;
}

/**
 * Format date for Asana API (ISO 8601 with timezone)
 */
export function formatAsanaDate(date: Date): string {
  return formatInTimeZone(date, UK_TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

/**
 * Format date for human-readable Asana descriptions
 */
export function formatAsanaDisplayDate(date: Date): string {
  return formatInTimeZone(date, UK_TIMEZONE, 'EEEE, MMMM d, yyyy \'at\' h:mm a');
}

/**
 * Parse natural language date requests for Asana
 * Examples: "tomorrow", "next monday", "in 3 days", "in 2 weeks"
 */
export async function parseAsanaDateRequest(request: string): Promise<Date> {
  const today = getTodayUK();
  const lowerRequest = request.toLowerCase().trim();
  
  // Tomorrow
  if (lowerRequest === 'tomorrow') {
    return await getAsanaDueDate(today);
  }
  
  // Next working day (default)
  if (lowerRequest === 'next working day' || lowerRequest === 'default') {
    return await getAsanaDueDate(today);
  }
  
  // "in X days" pattern
  const daysMatch = lowerRequest.match(/in (\d+) days?/);
  if (daysMatch) {
    const days = parseInt(daysMatch[1]);
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + days);
    return await getAsanaDueDate(targetDate);
  }
  
  // "in X weeks" pattern
  const weeksMatch = lowerRequest.match(/in (\d+) weeks?/);
  if (weeksMatch) {
    const weeks = parseInt(weeksMatch[1]);
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + (weeks * 7));
    return await getAsanaDueDate(targetDate);
  }
  
  // Default to next working day
  return await getAsanaDueDate(today);
}
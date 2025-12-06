import fetch from 'node-fetch';
import { format, parseISO } from 'date-fns';
import { config } from './config.js';

interface BankHoliday {
  date: string;
  localName: string;
  name: string;
}

interface UKBankHolidayResponse {
  'england-and-wales': {
    division: string;
    events: Array<{
      title: string;
      date: string;
      notes: string;
      bunting: boolean;
    }>;
  };
}

let cachedHolidays: Set<string> | null = null;
let cacheExpiry: number = 0;
let cachedCountry: string | null = null;

async function fetchUKBankHolidays(): Promise<Set<string>> {
  try {
    const response = await fetch('https://www.gov.uk/bank-holidays.json');
    const data = await response.json() as UKBankHolidayResponse;
    
    const holidays = new Set<string>();
    data['england-and-wales'].events.forEach(event => {
      holidays.add(event.date);
    });
    
    return holidays;
  } catch (error) {
    console.error('Failed to fetch UK bank holidays:', error);
    return new Set<string>();
  }
}

async function fetchNagerDateHolidays(countryCode: string): Promise<Set<string>> {
  try {
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    
    const holidays = new Set<string>();
    
    // Fetch current year and next year holidays
    for (const year of [currentYear, nextYear]) {
      const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`);
      
      if (!response.ok) {
        console.error(`Failed to fetch holidays for ${countryCode} ${year}: ${response.status}`);
        continue;
      }
      
      const data = await response.json() as BankHoliday[];
      data.forEach(holiday => {
        holidays.add(holiday.date);
      });
    }
    
    return holidays;
  } catch (error) {
    console.error(`Failed to fetch ${countryCode} bank holidays:`, error);
    return new Set<string>();
  }
}

export async function fetchBankHolidays(): Promise<Set<string>> {
  const now = Date.now();
  const country = config.bankHolidayCountry;
  
  // Return empty set if bank holidays are disabled
  if (!config.enableBankHolidays) {
    return new Set<string>();
  }
  
  // Cache for 24 hours if same country
  if (cachedHolidays && now < cacheExpiry && cachedCountry === country) {
    return cachedHolidays;
  }
  
  let holidays: Set<string>;
  
  // UK uses GOV.UK API for more detailed data
  if (country === 'GB') {
    holidays = await fetchUKBankHolidays();
  } else {
    holidays = await fetchNagerDateHolidays(country);
  }
  
  cachedHolidays = holidays;
  cachedCountry = country;
  cacheExpiry = now + (24 * 60 * 60 * 1000); // 24 hours
  
  return holidays;
}

export async function isUKBankHoliday(date: Date): Promise<boolean> {
  if (!config.enableBankHolidays) {
    return false;
  }
  
  const holidays = await fetchBankHolidays();
  const dateString = format(date, 'yyyy-MM-dd');
  return holidays.has(dateString);
}

export async function getUpcomingBankHolidays(monthsAhead: number = 6): Promise<Array<{date: string, title: string}>> {
  if (!config.enableBankHolidays) {
    return [];
  }
  
  const country = config.bankHolidayCountry;
  
  try {
    // UK uses GOV.UK API
    if (country === 'GB') {
      const response = await fetch('https://www.gov.uk/bank-holidays.json');
      const data = await response.json() as UKBankHolidayResponse;
      
      const now = new Date();
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + monthsAhead);
      
      return data['england-and-wales'].events
        .filter(event => {
          const eventDate = parseISO(event.date);
          return eventDate >= now && eventDate <= futureDate;
        })
        .map(event => ({
          date: event.date,
          title: event.title
        }));
    }
    
    // Other countries use Nager.Date API
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    const allHolidays: Array<{date: string, title: string}> = [];
    
    for (const year of [currentYear, nextYear]) {
      const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`);
      if (!response.ok) continue;
      
      const data = await response.json() as BankHoliday[];
      data.forEach(holiday => {
        allHolidays.push({
          date: holiday.date,
          title: holiday.localName || holiday.name
        });
      });
    }
    
    const now = new Date();
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + monthsAhead);
    
    return allHolidays.filter(holiday => {
      const holidayDate = parseISO(holiday.date);
      return holidayDate >= now && holidayDate <= futureDate;
    });
    
  } catch (error) {
    console.error(`Failed to fetch upcoming bank holidays for ${country}:`, error);
    return [];
  }
}
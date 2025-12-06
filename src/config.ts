// Configuration file for Date Operations MCP Server
// Reads from environment variables with sensible defaults

export interface Config {
  timezone: string;
  asanaDueHour: number;
  bankHolidayCountry: string;
  enableBankHolidays: boolean;
}

// Country to timezone mapping
const COUNTRY_TIMEZONES: Record<string, string> = {
  'NONE': 'Europe/London',
  'GB': 'Europe/London',
  'RO': 'Europe/Bucharest',
  'ES': 'Europe/Madrid',
  'IE': 'Europe/Dublin',
  'DK': 'Europe/Copenhagen',
  'DE': 'Europe/Berlin',
  'PL': 'Europe/Warsaw',
  'US': 'America/New_York', // Default to Eastern, users can override
  'NZ': 'Pacific/Auckland',
  'AU': 'Australia/Sydney', // Default to Sydney, users can override
  'MY': 'Asia/Kuala_Lumpur',
  'LK': 'Asia/Colombo',
  'TH': 'Asia/Bangkok',
  'VN': 'Asia/Ho_Chi_Minh',
};

function getConfig(): Config {
  // Bank holiday country - defaults to NONE (weekends only)
  const bankHolidayCountry = (process.env.BANK_HOLIDAY_COUNTRY || 'NONE').toUpperCase();
  const enableBankHolidays = bankHolidayCountry !== 'NONE';
  
  // Timezone - use country-specific timezone or allow manual override
  const timezone = process.env.TIMEZONE || 
                   COUNTRY_TIMEZONES[bankHolidayCountry] || 
                   'Europe/London';
  
  // Asana due hour - defaults to 16 (4 PM)
  const asanaDueHour = parseInt(process.env.ASANA_DUE_HOUR || '16', 10);
  if (asanaDueHour < 0 || asanaDueHour > 23) {
    console.error(`Invalid ASANA_DUE_HOUR: ${process.env.ASANA_DUE_HOUR}. Using default: 16`);
  }
  
  return {
    timezone: timezone,
    asanaDueHour: Math.max(0, Math.min(23, asanaDueHour)),
    bankHolidayCountry: bankHolidayCountry,
    enableBankHolidays,
  };
}

export const config = getConfig();

// Log configuration on startup
console.error('Date Operations MCP Configuration:');
console.error(`  Country: ${config.bankHolidayCountry}`);
console.error(`  Timezone: ${config.timezone}`);
console.error(`  Asana Due Hour: ${config.asanaDueHour}:00`);
console.error(`  Bank Holidays: ${config.enableBankHolidays ? 'Enabled' : 'Disabled (weekends only)'}`);
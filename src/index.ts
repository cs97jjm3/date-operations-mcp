#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

import {
  calculateWorkingDays,
  getNextWorkingDay,
  getWorkingDaysBetween,
  calculateSprintDates,
  getCurrentSprintInfo,
  formatDateUK,
  formatDateISO,
  formatDateTimeUK,
  parseDate,
  getTodayUK,
} from './dateCalculations.js';

import { isUKBankHoliday, getUpcomingBankHolidays } from './bankHolidays.js';

import {
  getAsanaDueDate,
  formatAsanaDate,
  formatAsanaDisplayDate,
  parseAsanaDateRequest,
} from './asanaHelpers.js';

// Define tools
const tools: Tool[] = [
  {
    name: 'get_today_uk',
    description: 'Get the current date in UK timezone (Europe/London)',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'calculate_working_days',
    description: 'Calculate a date by adding or subtracting working days (excludes weekends and UK bank holidays)',
    inputSchema: {
      type: 'object',
      properties: {
        start_date: {
          type: 'string',
          description: 'Start date in ISO format (YYYY-MM-DD). Use "today" for current date.',
        },
        num_days: {
          type: 'number',
          description: 'Number of working days to add or subtract',
        },
        direction: {
          type: 'string',
          enum: ['forward', 'backward'],
          description: 'Direction to calculate (default: forward)',
        },
      },
      required: ['start_date', 'num_days'],
    },
  },
  {
    name: 'get_next_working_day',
    description: 'Get the next working day after a given date (excludes weekends and UK bank holidays)',
    inputSchema: {
      type: 'object',
      properties: {
        from_date: {
          type: 'string',
          description: 'Date to calculate from in ISO format (YYYY-MM-DD). Use "today" for current date.',
        },
      },
      required: ['from_date'],
    },
  },
  {
    name: 'get_working_days_between',
    description: 'Count working days between two dates (excludes weekends and UK bank holidays)',
    inputSchema: {
      type: 'object',
      properties: {
        start_date: {
          type: 'string',
          description: 'Start date in ISO format (YYYY-MM-DD)',
        },
        end_date: {
          type: 'string',
          description: 'End date in ISO format (YYYY-MM-DD)',
        },
      },
      required: ['start_date', 'end_date'],
    },
  },
  {
    name: 'is_uk_bank_holiday',
    description: 'Check if a specific date is a UK bank holiday',
    inputSchema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Date to check in ISO format (YYYY-MM-DD)',
        },
      },
      required: ['date'],
    },
  },
  {
    name: 'get_upcoming_bank_holidays',
    description: 'Get list of upcoming UK bank holidays',
    inputSchema: {
      type: 'object',
      properties: {
        months_ahead: {
          type: 'number',
          description: 'Number of months to look ahead (default: 6)',
        },
      },
      required: [],
    },
  },
  {
    name: 'calculate_sprint_dates',
    description: 'Calculate sprint start and end dates based on sprint length',
    inputSchema: {
      type: 'object',
      properties: {
        start_date: {
          type: 'string',
          description: 'Sprint start date in ISO format (YYYY-MM-DD)',
        },
        sprint_length_weeks: {
          type: 'number',
          description: 'Length of sprint in weeks (e.g., 2 for 2-week sprints)',
        },
      },
      required: ['start_date', 'sprint_length_weeks'],
    },
  },
  {
    name: 'get_current_sprint_info',
    description: 'Get information about current sprint based on first sprint start date and sprint length',
    inputSchema: {
      type: 'object',
      properties: {
        first_sprint_start: {
          type: 'string',
          description: 'Date when sprint 1 started in ISO format (YYYY-MM-DD)',
        },
        sprint_length_weeks: {
          type: 'number',
          description: 'Length of sprint in weeks',
        },
      },
      required: ['first_sprint_start', 'sprint_length_weeks'],
    },
  },
  {
    name: 'get_asana_due_date',
    description: "Get Asana due date following James's rules: next working day at 4:00 PM (Friday → Monday)",
    inputSchema: {
      type: 'object',
      properties: {
        from_date: {
          type: 'string',
          description: 'Date to calculate from in ISO format (YYYY-MM-DD). Use "today" for current date. Default: today',
        },
      },
      required: [],
    },
  },
  {
    name: 'parse_asana_date_request',
    description: 'Parse natural language date requests for Asana (e.g., "tomorrow", "in 3 days", "in 2 weeks")',
    inputSchema: {
      type: 'object',
      properties: {
        request: {
          type: 'string',
          description: 'Natural language date request (e.g., "tomorrow", "in 5 days", "next working day")',
        },
      },
      required: ['request'],
    },
  },
];

// Helper function to parse date input
function parseDateInput(dateStr: string): Date {
  if (dateStr.toLowerCase() === 'today') {
    return getTodayUK();
  }
  return parseDate(dateStr);
}

// Create server
const server = new Server(
  {
    name: 'date-operations-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_today_uk': {
        const today = getTodayUK();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                date: formatDateISO(today),
                formatted: formatDateUK(today),
                day_of_week: today.toLocaleDateString('en-GB', { weekday: 'long' }),
              }, null, 2),
            },
          ],
        };
      }

      case 'calculate_working_days': {
        const startDate = parseDateInput(args!.start_date as string);
        const numDays = args!.num_days as number;
        const direction = (args!.direction as 'forward' | 'backward') || 'forward';

        const result = await calculateWorkingDays(startDate, numDays, direction);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                start_date: formatDateISO(startDate),
                num_days: numDays,
                direction,
                result_date: formatDateISO(result),
                formatted: formatDateUK(result),
              }, null, 2),
            },
          ],
        };
      }

      case 'get_next_working_day': {
        const fromDate = parseDateInput(args!.from_date as string);
        const result = await getNextWorkingDay(fromDate);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                from_date: formatDateISO(fromDate),
                next_working_day: formatDateISO(result),
                formatted: formatDateUK(result),
              }, null, 2),
            },
          ],
        };
      }

      case 'get_working_days_between': {
        const startDate = parseDate(args!.start_date as string);
        const endDate = parseDate(args!.end_date as string);
        const count = await getWorkingDaysBetween(startDate, endDate);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                start_date: formatDateISO(startDate),
                end_date: formatDateISO(endDate),
                working_days: count,
              }, null, 2),
            },
          ],
        };
      }

      case 'is_uk_bank_holiday': {
        const date = parseDate(args!.date as string);
        const isHoliday = await isUKBankHoliday(date);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                date: formatDateISO(date),
                is_bank_holiday: isHoliday,
              }, null, 2),
            },
          ],
        };
      }

      case 'get_upcoming_bank_holidays': {
        const monthsAhead = (args!.months_ahead as number) || 6;
        const holidays = await getUpcomingBankHolidays(monthsAhead);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                months_ahead: monthsAhead,
                holidays: holidays.map(h => ({
                  date: h.date,
                  title: h.title,
                })),
              }, null, 2),
            },
          ],
        };
      }

      case 'calculate_sprint_dates': {
        const startDate = parseDate(args!.start_date as string);
        const sprintLengthWeeks = args!.sprint_length_weeks as number;
        const result = calculateSprintDates(startDate, sprintLengthWeeks);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                sprint_start: formatDateISO(result.start),
                sprint_end: formatDateISO(result.end),
                length_weeks: result.length,
                start_formatted: formatDateUK(result.start),
                end_formatted: formatDateUK(result.end),
              }, null, 2),
            },
          ],
        };
      }

      case 'get_current_sprint_info': {
        const firstSprintStart = parseDate(args!.first_sprint_start as string);
        const sprintLengthWeeks = args!.sprint_length_weeks as number;
        const info = getCurrentSprintInfo(firstSprintStart, sprintLengthWeeks);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                sprint_number: info.sprintNumber,
                days_into_sprint: info.daysIntoSprint,
                days_remaining: info.daysRemaining,
                current_sprint_start: formatDateISO(info.currentSprintStart),
                current_sprint_end: formatDateISO(info.currentSprintEnd),
                start_formatted: formatDateUK(info.currentSprintStart),
                end_formatted: formatDateUK(info.currentSprintEnd),
              }, null, 2),
            },
          ],
        };
      }

      case 'get_asana_due_date': {
        const fromDate = args!.from_date ? parseDateInput(args!.from_date as string) : undefined;
        const result = await getAsanaDueDate(fromDate);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                due_date: formatDateISO(result),
                due_datetime: formatAsanaDate(result),
                formatted: formatAsanaDisplayDate(result),
              }, null, 2),
            },
          ],
        };
      }

      case 'parse_asana_date_request': {
        const request = args!.request as string;
        const result = await parseAsanaDateRequest(request);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                request,
                due_date: formatDateISO(result),
                due_datetime: formatAsanaDate(result),
                formatted: formatAsanaDisplayDate(result),
              }, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: errorMessage }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Date Operations MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

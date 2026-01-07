# Date Operations MCP Server

A Model Context Protocol (MCP) server providing reliable date calculations with UK context, specifically designed for James Murrell's BA workflow.

## Features

- **Working Day Calculations**: Automatically excludes weekends and UK bank holidays
- **UK Bank Holiday Integration**: Fetches live data from GOV.UK API
- **Asana-Specific Helpers**: Follows James's rules (next working day at 4 PM, Friday → Monday)
- **Sprint Planning Tools**: Calculate sprint dates and current sprint information
- **UK Timezone**: All dates handled in Europe/London timezone (GMT/BST)

## Installation

```bash
# Clone or create the project directory
mkdir date-operations-mcp
cd date-operations-mcp

# Copy all the artifact files into the project:
# - package.json
# - tsconfig.json
# - src/index.ts
# - src/dateCalculations.ts
# - src/bankHolidays.ts
# - src/asanaHelpers.ts

# Install dependencies
npm install

# Build the project
npm run build
```

## Configuration for Claude Desktop

Add this to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "date-operations": {
      "command": "node",
      "args": ["/absolute/path/to/date-operations-mcp/build/index.js"]
    }
  }
}
```

Replace `/absolute/path/to/date-operations-mcp` with your actual project path.

## Restart Claude Desktop

After updating the config file, restart Claude Desktop completely for the MCP server to load.

## Available Tools

### Basic Date Operations

**`get_today_uk`**
- Get current date in UK timezone
- No parameters required

**`get_next_working_day`**
- Get next working day after a given date
- Parameters: `from_date` (ISO format or "today")

**`calculate_working_days`**
- Add or subtract working days from a date
- Parameters: `start_date`, `num_days`, `direction` (forward/backward)

**`get_working_days_between`**
- Count working days between two dates
- Parameters: `start_date`, `end_date`

### UK Bank Holidays

**`is_uk_bank_holiday`**
- Check if a date is a UK bank holiday
- Parameters: `date`

**`get_upcoming_bank_holidays`**
- Get list of upcoming UK bank holidays
- Parameters: `months_ahead` (optional, default: 6)

### Sprint Planning

**`calculate_sprint_dates`**
- Calculate sprint start and end dates
- Parameters: `start_date`, `sprint_length_weeks`

**`get_current_sprint_info`**
- Get current sprint number and remaining days
- Parameters: `first_sprint_start`, `sprint_length_weeks`

### Asana Helpers

**`get_asana_due_date`**
- Get Asana due date following James's rules
- Parameters: `from_date` (optional, defaults to today)
- Returns next working day at 4:00 PM (Friday → Monday)

**`parse_asana_date_request`**
- Parse natural language requests
- Parameters: `request` (e.g., "tomorrow", "in 5 days", "in 2 weeks")
- Returns appropriate Asana due date

## Example Usage

Once configured, Claude will automatically use these tools when you ask date-related questions:

```
You: "What's 5 working days from today?"
Claude: [Uses calculate_working_days tool] That's Wednesday, October 29, 2025

You: "Create an Asana reminder for next week"
Claude: [Uses parse_asana_date_request tool] Setting due date to Monday, October 27, 2025 at 4:00 PM

You: "When do we finish the current sprint?"
Claude: [Uses get_current_sprint_info tool] Current sprint ends Friday, October 31, 2025
```

## Technical Details

- **Language**: TypeScript
- **Runtime**: Node.js
- **Date Library**: date-fns with timezone support
- **UK Holidays**: GOV.UK official API (cached for 24 hours)
- **Timezone**: Europe/London (handles GMT/BST automatically)

## Troubleshooting

**Server not showing up in Claude:**
1. Check the absolute path in your config file
2. Ensure `npm run build` completed successfully
3. Restart Claude Desktop completely
4. Check Claude Desktop logs for errors

**Date calculations seem wrong:**
1. Verify UK bank holiday API is accessible
2. Check your system timezone settings
3. Use `get_today_uk` tool to verify current date

## Testing

You can test the server before integrating with Claude:

```bash
# Run the built server directly
node build/index.js

# It should output: "Date Operations MCP Server running on stdio"
```

## Notes

- Bank holiday data is cached for 24 hours to reduce API calls
- All dates use UK timezone (Europe/London) with automatic GMT/BST handling
- Friday tasks automatically roll to Monday per James's Asana rules
- Working days exclude weekends AND UK bank holidays

---

## 📚 Want to Build Tools Like This?

This tool was built using the process documented in **["The Business Analyst's Guide to AI-Assisted Tool Development"](https://gumroad.com/l/ba-ai-tools)**.

Learn how to:
- Identify workflows worth automating
- Work effectively with AI as a collaborator
- Build production-ready tools without being a developer
- Avoid common pitfalls and mistakes

**£5 • Real code • Real examples • Real process**

Available February 4th, 2025
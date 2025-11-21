# Job Tracker Browser Extension

A lightweight browser extension that automatically extracts job posting information from the current page and saves it to your Notion database.

## Features

- Automatically extracts job posting content from the current page
- Parses company name, position, location, and salary information
- Saves applications directly to Notion with one click
- Compact, easy-to-use interface
- Works on any job posting website
- Stores Company, Position, Location, Salary, Application Date, Stage, and more

## Installation

### Firefox

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Navigate to the extension directory and select `manifest.json`

The extension will remain loaded until you restart Firefox.

### Chrome/Edge

1. Open Chrome and go to `chrome://extensions/` (or `edge://extensions/`)
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the extension folder

## Setup

1. Click the extension icon in your Firefox toolbar
2. Click "⚙️ Settings" to expand the settings panel
3. Enter your Notion Integration Token
4. Enter your Notion Database ID
5. Click "Save Settings"

### Getting Notion Credentials

**Integration Token:**
1. Go to https://www.notion.so/my-integrations
2. Click "+ New integration"
3. Give it a name (e.g., "Job Tracker")
4. Select the workspace
5. Copy the "Internal Integration Token" (starts with `secret_`)

**Database ID:**
1. Open your Notion database in the browser
2. The URL will look like: `https://www.notion.so/workspace/DATABASE_ID?v=...`
3. Copy the DATABASE_ID part (32 characters, before the `?`)
4. Make sure you've shared the database with your integration:
   - Open the database in Notion
   - Click "..." menu → "Add connections"
   - Select your integration

### Database Schema

Your Notion database should have these properties:
- **Company** (Title)
- **Position** (Text)
- **Application Date** (Date)
- **Link** (URL)
- **Location** (Text)
- **Salary** (Text)
- **Salary Expectation** (Text)
- **Stage** (Status with options: To Apply, Applied, Interviewed, Interview Scheduled, No Answer, Offer, Rejected)

## Usage

1. Navigate to any job posting page
2. Click the Job Tracker extension icon
3. The extension will automatically extract the page content and parse it
4. Review the extracted information (edit if needed)
5. Click "Save to Notion"

The job posting will be added to your Notion database!

### Tips

- The extension works best on standard job posting pages (LinkedIn, company career sites, etc.)
- If parsing doesn't work well, you can manually edit the fields or paste content into the textarea
- Click "Re-parse Page" to re-extract content from the current page

## Auto-Parsing

The extension automatically extracts content from the current page and attempts to parse:
- **Company**: Looks for "at Company" patterns, company name in headers
- **Position**: Identifies job titles with keywords like Engineer, Developer, Manager, Senior, Lead, etc.
- **Location**: Finds "City, State, Country" formats, Remote, Hybrid patterns
- **Salary**: Detects salary ranges like "$100k-$150k" or "$172,000 - $215,000 USD"
- **Link**: Automatically captures the current page URL

You can always manually edit any field before saving.

## Security

- Your Notion token is stored locally in browser storage
- The token is only sent to `api.notion.com`
- For best security, create a Notion integration with access to only your job tracker database
- The extension requires minimal permissions: `activeTab`, `storage`, and `https://api.notion.com/*`

## Development

To modify the extension:

**Firefox:**
1. Edit the files
2. Go to `about:debugging#/runtime/this-firefox`
3. Click "Reload" next to the extension

**Chrome/Edge:**
1. Edit the files
2. Go to `chrome://extensions/`
3. Click the reload icon on the extension card

## Files

- `manifest.json` - Extension configuration
- `popup.html` - Extension popup interface
- `popup.js` - Main logic, parsing, and Notion API integration
- `icon.png` - Extension icon

## Troubleshooting

**"Please configure Notion settings first"**
- Make sure you've entered both the Integration Token and Database ID in settings

**"Failed to save to Notion"**
- Verify your integration token is correct
- Make sure you've shared the database with your integration in Notion
- Check that property names in your database match exactly (case-sensitive)

**Parsing doesn't work well**
- Try clicking "Re-parse Page" after the page fully loads
- Some sites may require you to manually copy/paste the job posting into the textarea
- The parser uses common patterns but may not work for all job posting formats
- Simply manually edit the fields - that's why they're all editable!

## Browser Compatibility

- Firefox (Manifest V2)
- Chrome (Manifest V2)
- Edge (Manifest V2)

## License

MIT

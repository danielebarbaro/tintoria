# Tintoria Podcast Ticket Monitor

A Node.js application that monitors the Tintoria Podcast website for ticket availability and sends email notifications when tickets become available.

## Features

- 🎟️ Monitors the Tintoria Podcast website for ticket availability
- 📧 Sends email notifications via Resend when tickets are found
- 🔄 Randomizes user agents and intervals to avoid detection
- 💾 Caches found tickets to avoid duplicate notifications
- 🌐 Works both locally and on serverless platforms (Render)
- 📱 Sends status updates and error notifications via Slack
- 🌙 Configurable night mode to skip checks during specific hours

## Prerequisites

- Node.js v22 or higher
- A Resend API key for email notifications
- A Slack Webhook URL for notifications
- Google Chrome installed (for local development)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/danielebarbaro/tintoria
cd tintoria-monitor
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```env
# Resend configuration
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=notifications@yourdomain.com
EMAIL_TO=your@email.com

# Site to monitor
SITE_URL=https://show.thecomedyclub.it/pages/tintoriapodcast

# Slack configuration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Monitoring schedule
NIGHT_START_HOUR=23    # Hour when night mode starts (default: 23)
NIGHT_END_HOUR=6      # Hour when night mode ends (default: 6)
MIN_CHECK_INTERVAL=20  # Minimum minutes between checks (default: 20)
MAX_CHECK_INTERVAL=90  # Maximum minutes between checks (default: 90)
```

## Slack Setup

1. Go to your Slack workspace
2. Click on the channel where you want to receive notifications
3. Click the gear icon (⚙️) next to the channel name
4. Select "Integrations" from the menu
5. Click "Add apps"
6. Search for "Incoming Webhooks"
7. Click "Add Incoming Webhooks integration"
8. Copy the Webhook URL
9. Paste the URL in your `.env` file as `SLACK_WEBHOOK_URL`

## Usage

### Local Development
```bash
npm run dev
```

### Production 
```bash
npm start
```

## Configuration

### Environment Variables

- `RESEND_API_KEY`: Your Resend API key for sending emails
- `EMAIL_FROM`: The email address that will send notifications
- `EMAIL_TO`: The email address that will receive notifications
- `SITE_URL`: The URL to monitor for ticket availability
- `SLACK_WEBHOOK_URL`: Your Slack Incoming Webhook URL
- `NIGHT_START_HOUR`: Hour when night mode starts (default: 23)
- `NIGHT_END_HOUR`: Hour when night mode ends (default: 6)
- `MIN_CHECK_INTERVAL`: Minimum minutes between checks (default: 20)
- `MAX_CHECK_INTERVAL`: Maximum minutes between checks (default: 90)

### Monitoring Settings

The application includes several configurable settings:

- Random user agent rotation
- Random check intervals (configurable via environment variables)
- Ticket caching to avoid duplicate notifications
- Human-like behavior simulation (scrolling, pauses)
- Configurable night mode to skip checks during specific hours
- Slack notifications for:
  - New tickets found
  - Status updates
  - Error alerts
  - Night mode status

## How It Works

1. The application starts and loads the configuration
2. It launches a headless Chrome browser
3. It visits the target URL with a random user agent
4. It searches for "BIGLIETTI" buttons with bit.ly URLs
5. If new tickets are found:
   - Sends an email notification
   - Sends a Slack notification
   - Caches the found tickets
6. If no tickets are found:
   - Sends a status update to Slack
7. If an error occurs:
   - Sends an error alert to Slack
8. If it's night time (between NIGHT_START_HOUR and NIGHT_END_HOUR):
   - Skips the check
   - Sends a night mode status to Slack
   - Schedules next check for NIGHT_END_HOUR
9. Otherwise:
   - Waits for a random interval (between MIN_CHECK_INTERVAL and MAX_CHECK_INTERVAL)
10. Repeats the process

## Cache System

The application maintains a cache of found tickets in `ticketCache.json` to:
- Avoid duplicate notifications
- Track ticket availability history
- Improve performance

## Error Handling

The application includes comprehensive error handling for:
- Network issues
- Browser launch failures
- Email sending errors
- Cache read/write operations
- Slack notification errors

## Deployment

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Puppeteer](https://pptr.dev/) for web scraping
- [Resend](https://resend.com) for email notifications
- [Slack Incoming Webhooks](https://api.slack.com/messaging/webhooks) for notifications

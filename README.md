# Tintoria Podcast Ticket Monitor

A Node.js application that monitors the Tintoria Podcast website for ticket availability and sends email notifications when tickets become available.

## Features

- 🎟️ Monitors the Tintoria Podcast website for ticket availability
- 📧 Sends email notifications via Resend when tickets are found
- 🔄 Randomizes user agents and intervals to avoid detection
- 💾 Caches found tickets to avoid duplicate notifications
- 🌐 Works both locally and on serverless platforms (Render)

## Prerequisites

- Node.js v22 or higher
- A Resend API key for email notifications
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
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=notifications@yourdomain.com
EMAIL_TO=your@email.com
SITE_URL=https://show.thecomedyclub.it/pages/tintoriapodcast
```

## Usage

### Local Development
```bash
npm run dev
```

### Production (Render)
```bash
npm start
```

## Configuration

### Environment Variables

- `RESEND_API_KEY`: Your Resend API key for sending emails
- `EMAIL_FROM`: The email address that will send notifications
- `EMAIL_TO`: The email address that will receive notifications
- `SITE_URL`: The URL to monitor for ticket availability

### Monitoring Settings

The application includes several configurable settings:

- Random user agent rotation
- Random check intervals (20-45 minutes)
- Ticket caching to avoid duplicate notifications
- Human-like behavior simulation (scrolling, pauses)

## How It Works

1. The application starts and loads the configuration
2. It launches a headless Chrome browser
3. It visits the target URL with a random user agent
4. It searches for "BIGLIETTI" buttons with bit.ly URLs
5. If new tickets are found:
   - Sends an email notification
   - Caches the found tickets
6. Waits for a random interval (20-45 minutes)
7. Repeats the process

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

## Deployment

### Render

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set the following environment variables:
   - `RESEND_API_KEY`
   - `EMAIL_FROM`
   - `EMAIL_TO`
   - `SITE_URL`
4. Set the build command: `npm install`
5. Set the start command: `npm start`

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
- [Render](https://render.com) for hosting 
import puppeteer from 'puppeteer';
import { Resend } from 'resend';
import dotenv from 'dotenv';
import { loadTicketCache, saveTicketCache, getNewTickets } from './ticketCache.js';
import os from 'os';

dotenv.config();

// Resend configuration (https://resend.com)
const resendConfig = {
  apiKey: process.env.RESEND_API_KEY,
  from: process.env.EMAIL_FROM,
  to: process.env.EMAIL_TO
};

// Initialize Resend client
const resend = new Resend(resendConfig.apiKey);

// URL to monitor
const URL = process.env.SITE_URL;

// Check if we're running in production (Render)
const isProduction = process.env.NODE_ENV === 'production';

// Array of common user agents for rotation
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPad; CPU OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/124.0.0.0 Safari/537.36'
];

function getRandomUserAgent() {
  const index = Math.floor(Math.random() * userAgents.length);
  return userAgents[index];
}

// Function to generate a random interval between MIN_CHECK_INTERVAL and MAX_CHECK_INTERVAL minutes (in milliseconds)
function getRandomInterval() {
  const minMinutes = parseInt(process.env.MIN_CHECK_INTERVAL) || 20;
  const maxMinutes = parseInt(process.env.MAX_CHECK_INTERVAL) || 90;
  const minutes = Math.floor(Math.random() * (maxMinutes - minMinutes + 1)) + minMinutes;
  return minutes * 60 * 1000;
}

async function sendSlackNotification(message, isError = false) {
  try {
    const response = await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: message,
        color: isError ? "#FF0000" : "#00FF00"
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('Error sending Slack notification:', error);
  }
}

// Function to check if current time is between NIGHT_START_HOUR and NIGHT_END_HOUR
function isNightTime() {
  const now = new Date();
  const hour = now.getHours();
  const nightStart = parseInt(process.env.NIGHT_START_HOUR) || 23;
  const nightEnd = parseInt(process.env.NIGHT_END_HOUR) || 6;
  return hour >= nightStart || hour < nightEnd;
}

function getNextCheckTime() {
  const now = new Date();
  const hour = now.getHours();
  const nightStart = parseInt(process.env.NIGHT_START_HOUR) || 23;
  const nightEnd = parseInt(process.env.NIGHT_END_HOUR) || 6;
  
  if (hour >= nightStart || hour < nightEnd) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(nightEnd, 0, 0, 0);
    return tomorrow;
  }
  
  const nextInterval = getRandomInterval();
  return new Date(now.getTime() + nextInterval);
}

async function monitorTickets() {
  if (isNightTime()) {
    const nextCheck = getNextCheckTime();
    console.log(`Skipping check during night hours. Next check scheduled for: ${nextCheck.toLocaleString()}`);
    await sendSlackNotification(`🌙 *Night Mode*\nSkipping check during night hours. Next check scheduled for: ${nextCheck.toLocaleString()}`);
    
    const delay = nextCheck.getTime() - Date.now();
    setTimeout(monitorTickets, delay);
    return;
  }

  const userAgent = getRandomUserAgent();
  console.log(`[${new Date().toLocaleString()}] Starting ticket check with user-agent: ${userAgent}`);
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-extensions',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ],
      timeout: 60000,
      ignoreHTTPSErrors: true
    });
    
    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent(userAgent);
    
    // Set additional headers to appear more human-like
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"'
    });
    
    // Set a reasonable timeout
    await page.setDefaultNavigationTimeout(60000);
    
    let retries = 3;
    while (retries > 0) {
      try {
        await page.goto(URL, { 
          waitUntil: 'networkidle0',
          timeout: 60000
        });
        break;
      } catch (error) {
        retries--;
        if (retries === 0) throw error;
        console.log(`Retrying page load... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    // Emulate human behavior with random scrolling
    await page.evaluate(() => {
      const scrollAmount = Math.floor(Math.random() * 1000) + 500;
      window.scrollBy(0, scrollAmount);
    });
    
    // Brief pause to simulate page reading
    await new Promise(resolve => setTimeout(resolve, Math.random() * 3000 + 2000));
    
    // Search for all buttons with "BIGLIETTI" label and URL containing "bit.ly"
    const tickets = await page.evaluate(() => {
      const results = [];
      
      // Search for all links on the page
      const links = Array.from(document.querySelectorAll('a'));
      
      for (const link of links) {
        // Check text and URL
        const text = link.textContent.trim();
        const href = link.href.toLowerCase();
        
        if (text === 'BIGLIETTI' && href.includes('bit.ly')) {
          results.push({
            text: text,
            url: link.href,
            element: link.outerHTML,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      return results;
    });
    
    console.log(`Found ${tickets.length} "BIGLIETTI" buttons with bit.ly URLs`);
    
    // Load cached tickets
    const cachedTickets = await loadTicketCache();
    
    // Get only new tickets
    const newTickets = getNewTickets(tickets, cachedTickets);
    
    if (newTickets.length > 0) {
      console.log(`Found ${newTickets.length} new tickets! Sending notification...`);
      await sendNotification(newTickets);
      
      await saveTicketCache(tickets);
      
      await sendSlackNotification(`🎉 *Tickets Found!*\nFound ${newTickets.length} new tickets for Tintoria Podcast!\nCheck the email for details.`);
    } else {
      console.log('No new tickets found.');
      await sendSlackNotification(`✅ *Status Update*\nNo new tickets found. Next check in ${Math.round(getRandomInterval()/60000)} minutes.`);
    }
    
  } catch (error) {
    console.error('Error during monitoring:', error);

    await sendSlackNotification(`❌ *Error Alert*\nAn error occurred during monitoring:\n\`\`\`${error.message}\`\`\`\nStack trace:\n\`\`\`${error.stack}\`\`\``, true);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (error) {
        console.error('Error closing browser:', error);
      }
    }
    
    // Schedule next check with random interval
    const nextCheck = getNextCheckTime();
    console.log(`Next check scheduled for: ${nextCheck.toLocaleString()}`);
    
    const delay = nextCheck.getTime() - Date.now();
    setTimeout(monitorTickets, delay);
  }
}

async function sendNotification(tickets) {
  // Prepare email content
  let emailContent = `
    <h2>Tickets available for Tintoria Podcast!</h2>
    <p>Found ${tickets.length} "BIGLIETTI" buttons with bit.ly URLs on ${URL}:</p>
    <ul>
  `;
  
  tickets.forEach(ticket => {
    emailContent += `
      <li><a href="${ticket.url}">${ticket.text}</a></li>
    `;
  });
  
  emailContent += `
    </ul>
    <p>Check now to purchase tickets before they run out!</p>
    <p><small>Detected on: ${new Date().toLocaleString()}</small></p>
  `;
  
  try {
    const { data, error } = await resend.emails.send({
      from: resendConfig.from,
      to: resendConfig.to,
      subject: `🎟️ Alert: ${tickets.length} tickets available for Tintoria Podcast!`,
      html: emailContent
    });
    
    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Notification email sent:', data.id);
    }
  } catch (error) {
    console.error('Error calling Resend API:', error);
  }
}

// Start monitoring
console.log('Starting Tintoria Podcast monitoring...');
monitorTickets();

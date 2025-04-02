import puppeteer from 'puppeteer';
import { Resend } from 'resend';
import dotenv from 'dotenv';
import { loadTicketCache, saveTicketCache, getNewTickets } from './ticketCache.js';

// Load environment variables
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
const URL = process.env.URL_MONITORATO;

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

// Function to get a random user agent
function getRandomUserAgent() {
  const index = Math.floor(Math.random() * userAgents.length);
  return userAgents[index];
}

// Function to generate a random interval between 20 and 45 minutes (in milliseconds)
function getRandomInterval() {
  const minMinutes = 20;
  const maxMinutes = 45;
  const minutes = Math.floor(Math.random() * (maxMinutes - minMinutes + 1)) + minMinutes;
  return minutes * 60 * 1000;
}

// Main monitoring function
async function monitorTickets() {
  const userAgent = getRandomUserAgent();
  console.log(`[${new Date().toLocaleString()}] Starting ticket check with user-agent: ${userAgent}`);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
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
    
    // Visit the page
    await page.goto(URL, { waitUntil: 'networkidle2' });
    
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
    
    // If new tickets are available, send a notification
    if (newTickets.length > 0) {
      console.log(`Found ${newTickets.length} new tickets! Sending notification...`);
      await sendNotification(newTickets);
      
      // Save all tickets to cache
      await saveTicketCache(tickets);
    } else {
      console.log('No new tickets found.');
    }
    
  } catch (error) {
    console.error('Error during monitoring:', error);
  } finally {
    await browser.close();
    
    // Schedule next check with random interval
    const nextInterval = getRandomInterval();
    const nextTime = new Date(Date.now() + nextInterval);
    console.log(`Next check scheduled for: ${nextTime.toLocaleString()} (in ${Math.round(nextInterval/60000)} minutes)`);
    
    setTimeout(monitorTickets, nextInterval);
  }
}

// Function to send email notification using Resend
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

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = path.join(__dirname, 'ticketCache.json');

// Load tickets from cache
export async function loadTicketCache() {
  try {
    const data = await fs.readFile(CACHE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or is invalid, return empty array
    return [];
  }
}

// Save tickets to cache
export async function saveTicketCache(tickets) {
  try {
    await fs.writeFile(CACHE_FILE, JSON.stringify(tickets, null, 2));
  } catch (error) {
    console.error('Error saving ticket cache:', error);
  }
}

// Compare new tickets with cached ones and return only new ones
export function getNewTickets(newTickets, cachedTickets) {
  return newTickets.filter(newTicket => 
    !cachedTickets.some(cachedTicket => 
      cachedTicket.url === newTicket.url
    )
  );
} 
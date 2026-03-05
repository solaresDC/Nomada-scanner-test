/**
 * Ticket Cache Module
 *
 * The "speed trick" that makes scanning instant:
 * - On login, fetches ALL valid tickets from the backend
 * - Stores them in a JavaScript Map: qrToken → ticketType
 * - When a QR is scanned, we check the Map (0ms, no network)
 * - In the background, we POST to the backend to mark it as used
 * - Every 10 minutes, we re-fetch the full list to stay in sync
 *
 * This means scanning works even if the venue Wi-Fi drops.
 */

// ─── State ────────────────────────────────────────────────
const ticketMap = new Map();    // qrToken → 'female' | 'male'
let refreshIntervalId = null;   // setInterval ID for auto-refresh
let lastRefreshTime = null;

/**
 * Load all valid tickets from the backend into the local Map.
 * Called on login and every 10 minutes.
 * @returns {Promise<number>} Number of tickets loaded
 */
async function loadTickets() {
  const token = getSessionToken();
  if (!token) {
    console.error('[Cache] No session token, cannot load tickets');
    return 0;
  }

  try {
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/scanner/tickets`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      console.warn('[Cache] Session expired, need to re-authenticate');
      clearSessionToken();
      return -1; // Signal that session is invalid
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // Rebuild the Map completely (not merge — we want the server's truth)
    ticketMap.clear();
    for (const ticket of data.tickets) {
      ticketMap.set(ticket.qrToken, ticket.ticketType);
    }

    lastRefreshTime = new Date();
    console.log(`[Cache] Loaded ${ticketMap.size} valid tickets`);
    return ticketMap.size;

  } catch (error) {
    console.error('[Cache] Failed to load tickets:', error);
    return -2; // Signal network error but don't clear existing cache
  }
}

/**
 * Start the auto-refresh timer.
 * Fetches fresh tickets every CONFIG.REFRESH_INTERVAL ms.
 */
function startAutoRefresh() {
  stopAutoRefresh(); // Clear any existing timer

  refreshIntervalId = setInterval(async () => {
    console.log('[Cache] Auto-refreshing tickets...');
    const count = await loadTickets();
    if (count >= 0) {
      // Update the UI with new count (if ui.js has a handler)
      if (typeof onTicketRefresh === 'function') {
        onTicketRefresh(count);
      }
    }
  }, CONFIG.REFRESH_INTERVAL);

  console.log(`[Cache] Auto-refresh started (every ${CONFIG.REFRESH_INTERVAL / 60000} min)`);
}

/**
 * Stop the auto-refresh timer.
 */
function stopAutoRefresh() {
  if (refreshIntervalId) {
    clearInterval(refreshIntervalId);
    refreshIntervalId = null;
  }
}

/**
 * Look up a QR token in the local cache.
 * This is the 0ms instant check.
 *
 * @param {string} qrToken
 * @returns {{ found: boolean, ticketType?: string }}
 */
function checkTicket(qrToken) {
  if (ticketMap.has(qrToken)) {
    const ticketType = ticketMap.get(qrToken);
    // Remove from local Map immediately (prevent double-scan on same phone)
    ticketMap.delete(qrToken);
    return { found: true, ticketType };
  }
  return { found: false };
}

/**
 * Send a scan result to the backend (background, non-blocking).
 * This updates the database so other phones get the update on next refresh.
 *
 * @param {string} qrToken
 * @returns {Promise<{result: string, ticketType?: string}>}
 */
async function reportScan(qrToken) {
  const token = getSessionToken();
  if (!token) return { result: 'error' };

  try {
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/scanner/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ qrToken }),
    });

    if (!response.ok) {
      console.error('[Cache] Scan report failed:', response.status);
      return { result: 'error' };
    }

    return await response.json();

  } catch (error) {
    console.error('[Cache] Scan report network error:', error);
    return { result: 'error' };
  }
}

/**
 * Get the current number of valid tickets in the cache.
 * @returns {number}
 */
function getCacheSize() {
  return ticketMap.size;
}
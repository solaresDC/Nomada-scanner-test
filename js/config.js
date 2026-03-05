/**
 * Scanner Configuration
 *
 * Change BACKEND_URL when switching between local development and production.
 * Everything else can stay as-is unless you have a specific reason to change it.
 */
const CONFIG = {
  // ── Backend URL ──────────────────────────────────────────────
  // Local development:
  // BACKEND_URL: 'http://localhost:3000',
  //
  // Production (your Render deployment):
   BACKEND_URL: 'https://nomada-tickets-com-test.onrender.com',

  // ── Ticket Refresh ──────────────────────────────────────────
  // How often to re-fetch all valid tickets from the backend.
  // 10 minutes = catches new purchases + syncs with other phones.
  REFRESH_INTERVAL: 10 * 60 * 1000,   // 10 minutes in milliseconds

  // ── Session Duration ────────────────────────────────────────
  // How long the scanner stays logged in before requiring PIN again.
  // 12 hours = covers a full event night.
  SESSION_DURATION: 12 * 60 * 60 * 1000,  // 12 hours in milliseconds

  // ── Scanner Settings ────────────────────────────────────────
  // Frames per second for QR scanning (higher = faster detection, more battery)
  SCAN_FPS: 15,

  // Size of the QR scanning box relative to the camera view (0.0 to 1.0)
  SCAN_BOX_SIZE: 0.55,

  // How long to wait for the backend to confirm a scan before showing the result anyway
  SCAN_CONFIRM_TIMEOUT: 2000,  // 2 seconds
};
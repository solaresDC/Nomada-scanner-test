/**
 * Scanner App — Main Entry Point
 *
 * Flow:
 * 1. Check for existing session (sessionStorage)
 *    → If valid, skip PIN and go straight to scanning
 *    → If expired or missing, show PIN screen
 *
 * 2. PIN Screen:
 *    → User enters 4-digit PIN
 *    → Backend verifies → returns session token
 *    → Load all valid tickets into memory Map
 *    → Start camera
 *
 * 3. Scanning:
 *    → Camera detects QR → check local Map (instant)
 *    → Show color overlay (blue/pink/red)
 *    → Background: report scan to backend
 *    → Door person taps "Next" → resume camera
 */

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[App] Scanner initializing...');

  // Initialize UI (set up event listeners, apply preferences)
  initUI(() => {
    // This callback fires when the door person taps "Next/Dismiss"
    resumeScanning();
  });

  // Set up PIN pad
  setupPinPad();

  // Check for existing session
  if (hasValidSession()) {
    console.log('[App] Existing session found, loading tickets...');
    await startScanningMode();
  } else {
    console.log('[App] No valid session, showing PIN screen');
    showPinScreen();
  }
});

/**
 * Set up the number pad for PIN entry.
 */
function setupPinPad() {
  // Number keys (0-9)
  document.querySelectorAll('.pin-key[data-digit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const digit = btn.dataset.digit;
      addDigit(digit, onPinComplete);
    });
  });

  // Backspace key
  const backspaceBtn = document.querySelector('.pin-key[data-action="backspace"]');
  if (backspaceBtn) {
    backspaceBtn.addEventListener('click', removeDigit);
  }

  // Confirm key (optional — PIN auto-submits on 4th digit)
  const confirmBtn = document.querySelector('.pin-key[data-action="confirm"]');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      // Only useful if we want manual submit; auto-submit handles it
    });
  }
}

/**
 * Called when 4 digits are entered.
 * Verifies the PIN with the backend.
 */
async function onPinComplete(pin) {
  await verifyPin(pin, async (data) => {
    console.log('[App] PIN verified, session created');
    await startScanningMode();
  });
}

/**
 * Transition from PIN screen to scanning mode.
 * Loads tickets and starts the camera.
 */
async function startScanningMode() {
  showScannerScreen();

  // Load tickets into the in-memory Map
  const count = await loadTickets();

  if (count === -1) {
    // Session expired
    showPinScreen();
    return;
  }

  // Show ticket count
  const refreshStatus = document.getElementById('refresh-status');
  if (refreshStatus && count >= 0) {
    refreshStatus.textContent = `${count} ${getText('ticketCount')}`;
    refreshStatus.classList.add('visible');
    setTimeout(() => refreshStatus.classList.remove('visible'), 2000);
  }

  // Start auto-refresh (every 10 minutes)
  startAutoRefresh();

  // Start the camera
  await initScanner('scanner-viewfinder', onQRScanned);
}

/**
 * Called when the camera decodes a QR code.
 * This is where the magic happens.
 */
async function onQRScanned(qrToken) {
  // Pause scanning immediately (no more detections while showing result)
  pauseScanning();

  // Step 1: Check local Map (instant, 0ms)
  const localResult = checkTicket(qrToken);

  if (localResult.found) {
    // Ticket found in cache — show the color
    const resultType = localResult.ticketType === 'female'
      ? 'accepted_female'
      : 'accepted_male';

    showScanResult(resultType);
    addToHistory(qrToken, localResult.ticketType, 'accepted');

    // Step 2: Report to backend in background (non-blocking)
    reportScan(qrToken).then(serverResult => {
      // If the server says it was already used (scanned by another phone),
      // correct the display to red
      if (serverResult.result === 'rejected') {
        console.log('[App] Server corrected: ticket was already used by another device');
        showScanResult('rejected');
        // Update the last history entry
        if (scanHistory.length > 0) {
          scanHistory[0].status = 'rejected';
          updateMiniHistory();
        }
      }
    });

  } else {
    // Not in cache — either already scanned or invalid
    showScanResult('rejected');
    addToHistory(qrToken, null, 'rejected');

    // Still report to backend for logging
    reportScan(qrToken);
  }
}
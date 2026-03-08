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
 *    → If found locally: show blue/pink instantly, report in background
 *    → If NOT found locally: show "Checking...", ask server, then:
 *       - Server says valid ticket → show blue/pink (accepted)
 *       - Server says already used → show red (duplicate)
 *       - Server says doesn't exist → show grey (not valid)
 *       - Server unreachable → show grey (can't verify)
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

  // Touch feedback for all pin keys (iOS doesn't show :active reliably)
  document.querySelectorAll('.pin-key').forEach(btn => {
    btn.addEventListener('touchstart', () => {
      btn.classList.add('pin-key-pressed');
    }, { passive: true });
    btn.addEventListener('touchend', () => {
      setTimeout(() => btn.classList.remove('pin-key-pressed'), 30);
    });
  });
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

  // Set the initial count so future refreshes can calculate the difference
  previousTicketCount = count >= 0 ? count : 0;

  // Show ticket count briefly
  const refreshStatus = document.getElementById('refresh-status');
  if (refreshStatus && count >= 0) {
    refreshStatus.textContent = `${count} ${getText('ticketCount')}`;
    refreshStatus.classList.add('visible');
    setTimeout(() => refreshStatus.classList.remove('visible'), 2000);
  }

  // Update the persistent counter bar with initial count
  updateTicketCounterBar();

  // Start auto-refresh (every 10 minutes)
  startAutoRefresh();

  // Start the camera
  await initScanner('scanner-viewfinder', onQRScanned);
}

/**
 * Called when the camera decodes a QR code.
 * This is where the magic happens.
 *
 * Two paths:
 * A) Found in local Map → instant color, background server report
 * B) Not in local Map → "Checking..." → wait for server → show correct color
 */
async function onQRScanned(qrToken) {
  // Pause scanning immediately (no more detections while showing result)
  pauseScanning();

  // Step 1: Check local Map (instant, 0ms)
  const localResult = checkTicket(qrToken);

  if (localResult.found) {
    // ─── PATH A: Found locally — instant response ─────────
    const resultType = localResult.ticketType === 'female'
      ? 'accepted_female'
      : 'accepted_male';

    showScanResult(resultType);
    addToHistory(qrToken, localResult.ticketType, 'accepted');

    // Report to backend in background (non-blocking)
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
    // ─── PATH B: Not in local Map — ask server ────────────
    // Show "Checking..." while we wait for the server
    showCheckingState();

    // Ask the server what this QR code is
    const serverResult = await reportScan(qrToken);

    if (serverResult.result === 'accepted') {
      // Server says it's a valid ticket we didn't know about
      // (purchased after last refresh)
      const resultType = serverResult.ticketType === 'female'
        ? 'accepted_female'
        : 'accepted_male';

      showScanResult(resultType);
      addToHistory(qrToken, serverResult.ticketType, 'accepted');
      updateTicketCounterBar();

    } else if (serverResult.result === 'rejected') {
      // Server says this ticket exists but was already scanned
      showScanResult('rejected');
      addToHistory(qrToken, serverResult.ticketType || null, 'rejected');

    } else {
      // 'not_found' or 'error' — not a Nomada ticket (or misread)
      // Show grey — do NOT add to history (trash data)
      showScanResult('not_valid');
    }
  }
}
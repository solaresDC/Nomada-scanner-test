/**
 * Authentication Module
 *
 * Handles:
 * - 4-digit PIN entry logic (adding/removing digits)
 * - Sending PIN to backend for verification
 * - Storing and retrieving session token from sessionStorage
 * - Lockout after 5 failed attempts
 */

// ─── State ────────────────────────────────────────────────
let pinDigits = [];             // Array of entered digits, max 4
let failedAttempts = 0;
let isLockedOut = false;
let lockoutTimer = null;

// ─── Session Token ────────────────────────────────────────
// sessionStorage = survives page refresh, cleared when tab closes
// This is intentional for security: closing the tab = logging out

function getSessionToken() {
  return sessionStorage.getItem('scanner-token');
}

function setSessionToken(token) {
  sessionStorage.setItem('scanner-token', token);
}

function clearSessionToken() {
  sessionStorage.removeItem('scanner-token');
}

/**
 * Check if we already have a valid (non-expired) session.
 * @returns {boolean}
 */
function hasValidSession() {
  const token = getSessionToken();
  if (!token) return false;

  const expiresAt = sessionStorage.getItem('scanner-token-expires');
  if (!expiresAt) return false;

  return new Date(expiresAt) > new Date();
}

/**
 * Add a digit to the PIN entry.
 * @param {string} digit — '0' through '9'
 * @param {Function} onPinComplete — called with the 4-digit string when all 4 are entered
 */
function addDigit(digit, onPinComplete) {
  if (isLockedOut) return;
  if (pinDigits.length >= 4) return;

  pinDigits.push(digit);
  updatePinDots();

  // When 4 digits are entered, auto-submit
  if (pinDigits.length === 4) {
    const pin = pinDigits.join('');
    onPinComplete(pin);
  }
}

/**
 * Remove the last digit (backspace).
 */
function removeDigit() {
  if (isLockedOut) return;
  pinDigits.pop();
  updatePinDots();
  hidePinError();
}

/**
 * Clear all entered digits.
 */
function clearPin() {
  pinDigits = [];
  updatePinDots();
}

/**
 * Update the visual dots on the PIN screen.
 */
function updatePinDots() {
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById(`pin-dot-${i}`);
    if (dot) {
      dot.classList.toggle('filled', i < pinDigits.length);
    }
  }
}

/**
 * Send the PIN to the backend and handle the response.
 * @param {string} pin — 4-digit PIN string
 * @param {Function} onSuccess — called with { token, expiresAt } on success
 */
async function verifyPin(pin, onSuccess) {
  if (isLockedOut) return;

  try {
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/scanner/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });

    if (response.ok) {
      const data = await response.json();

      // Save session
      setSessionToken(data.token);
      sessionStorage.setItem('scanner-token-expires', data.expiresAt);

      // Reset failure tracking
      failedAttempts = 0;
      clearPin();

      onSuccess(data);
    } else {
      // Wrong PIN
      failedAttempts++;
      clearPin();
      shakePinDots();
      showPinError(getText('pinIncorrect'));

      // Lockout after 5 failures
      if (failedAttempts >= 5) {
        startLockout();
      }
    }
  } catch (error) {
    console.error('[Auth] PIN verification failed:', error);
    clearPin();
    showPinError('Connection error');
  }
}

/**
 * Shake animation on the PIN dots (wrong PIN feedback).
 */
function shakePinDots() {
  const container = document.getElementById('pin-dots');
  if (container) {
    container.classList.add('shake');
    setTimeout(() => container.classList.remove('shake'), 500);
  }
}

/**
 * Show an error message below the PIN dots.
 * @param {string} message
 */
function showPinError(message) {
  const el = document.getElementById('pin-error');
  if (el) {
    el.textContent = message;
    el.classList.add('visible');
  }
}

/**
 * Hide the PIN error message.
 */
function hidePinError() {
  const el = document.getElementById('pin-error');
  if (el) {
    el.classList.remove('visible');
  }
}

/**
 * Start a 60-second lockout after too many failed attempts.
 */
function startLockout() {
  isLockedOut = true;
  showPinError(getText('pinLocked'));

  // Disable all number pad buttons
  document.querySelectorAll('.pin-key').forEach(btn => {
    btn.disabled = true;
  });

  lockoutTimer = setTimeout(() => {
    isLockedOut = false;
    failedAttempts = 0;
    hidePinError();
    document.querySelectorAll('.pin-key').forEach(btn => {
      btn.disabled = false;
    });
  }, 60000); // 60 seconds
}
/**
 * QR Scanner Module
 *
 * Uses the html5-qrcode library to:
 * - Access the phone's rear camera
 * - Continuously scan for QR codes
 * - Call a handler when a QR is detected
 *
 * The camera stays active between scans (no re-initialization needed).
 */

// ─── State ────────────────────────────────────────────────
let html5QrCode = null;          // Library instance
let isScanning = false;
let isScanPaused = false;        // Paused while showing scan result
let onScanCallback = null;       // Called when a QR code is decoded
let lastScannedCode = '';        // Prevent rapid duplicate triggers
let lastScanTime = 0;

const DEBOUNCE_MS = 1500;       // Ignore same code for 1.5 seconds

/**
 * Initialize the QR scanner.
 * @param {string} containerId — ID of the <div> where the camera renders
 * @param {Function} onScan — callback(qrCodeText) when a QR is detected
 */
async function initScanner(containerId, onScan) {
  onScanCallback = onScan;

  try {
    html5QrCode = new Html5Qrcode(containerId);

    const cameras = await Html5Qrcode.getCameras();
    if (!cameras || cameras.length === 0) {
      console.error('[Scanner] No cameras found');
      showScannerError('No camera found. Please allow camera access.');
      return;
    }

        await html5QrCode.start(
        { facingMode: "environment" },
        
      {
        fps: CONFIG.SCAN_FPS,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const size = Math.min(viewfinderWidth, viewfinderHeight) * CONFIG.SCAN_BOX_SIZE;
          return { width: Math.floor(size), height: Math.floor(size) };
        },
      },
      onQRCodeSuccess,
      onQRCodeError
    );

    isScanning = true;
    console.log('[Scanner] Camera started, scanning...');

  } catch (error) {
    console.error('[Scanner] Failed to start camera:', error);
    showScannerError('Camera access denied. Please allow camera in your browser settings.');
  }
}

/**
 * Called every time a QR code is successfully decoded.
 */
function onQRCodeSuccess(decodedText, decodedResult) {
  // If scan is paused (showing result overlay), ignore
  if (isScanPaused) return;

  // Debounce: ignore same code within 1.5 seconds
  const now = Date.now();
  if (decodedText === lastScannedCode && now - lastScanTime < DEBOUNCE_MS) {
    return;
  }

  lastScannedCode = decodedText;
  lastScanTime = now;

  console.log('[Scanner] QR decoded:', decodedText.substring(0, 12) + '...');

  if (onScanCallback) {
    onScanCallback(decodedText);
  }
}

/**
 * Called on every frame where no QR is found (we ignore this — it's noisy).
 */
function onQRCodeError(errorMessage) {
  // Intentionally empty — this fires constantly and is normal
}

/**
 * Pause scanning (while showing the color overlay result).
 */
function pauseScanning() {
  isScanPaused = true;
}

/**
 * Resume scanning (after dismissing the result overlay).
 */
function resumeScanning() {
  isScanPaused = false;
  lastScannedCode = '';
}

/**
 * Stop the camera completely (cleanup).
 */
async function stopScanner() {
  if (html5QrCode && isScanning) {
    try {
      await html5QrCode.stop();
      isScanning = false;
      console.log('[Scanner] Camera stopped');
    } catch (error) {
      console.error('[Scanner] Error stopping camera:', error);
    }
  }
}

/**
 * Show a camera/scanner error on the UI.
 */
function showScannerError(message) {
  const el = document.getElementById('scanner-error');
  if (el) {
    el.textContent = message;
    el.classList.add('visible');
  }
}
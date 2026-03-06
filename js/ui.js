/**
 * UI Module
 *
 * Handles all visual components of the scanner:
 * - Color overlays (scan results)
 * - Dismiss/Next button (hand preference aware)
 * - Mini history bar (last 2-3 scans)
 * - Full history panel (slide-up sheet with drag-to-close)
 * - Language selector
 * - Hand preference toggle
 * - Refresh button + status
 * - Persistent ticket counter bar
 */

// ─── Scan History State ───────────────────────────────────
const scanHistory = [];          // Array of { qrToken, ticketType, status, time }
let historyTimerInterval = null; // Updates "ago" text every second

// ─── Hand Preference ──────────────────────────────────────
let handPreference = localStorage.getItem('scanner-hand') || 'R';

// ─── Callback for when scan result is dismissed ───────────
let onDismissCallback = null;

// ─── Previous ticket count (for tracking new additions) ───
let previousTicketCount = 0;

/**
 * Initialize the UI module.
 * @param {Function} onDismiss — called when the door person taps "Next"
 */
function initUI(onDismiss) {
  onDismissCallback = onDismiss;

  // Apply saved hand preference
  applyHandPreference();

  // Apply saved language
  applyLanguage();

  // Start the "ago" timer for history
  startHistoryTimer();

  // Set up event listeners
  setupUIListeners();
}

/**
 * Show the scan result overlay.
 * @param {'accepted_female'|'accepted_male'|'rejected'|'not_found'} result
 */
function showScanResult(result) {
  const overlay = document.getElementById('scan-overlay');
  const overlayText = document.getElementById('scan-overlay-text');
  const dismissBtn = document.getElementById('dismiss-btn');

  if (!overlay || !overlayText) return;

  // Remove all previous result classes
  overlay.classList.remove('result-female', 'result-male', 'result-rejected');

  let text = '';
  let resultClass = '';

  switch (result) {
    case 'accepted_female':
      text = getText('scanAcceptedFemale');
      resultClass = 'result-female';
      break;
    case 'accepted_male':
      text = getText('scanAcceptedMale');
      resultClass = 'result-male';
      break;
    case 'rejected':
      text = getText('scanRejected');
      resultClass = 'result-rejected';
      break;
    case 'not_found':
      text = getText('scanNotFound');
      resultClass = 'result-rejected';
      break;
    default:
      text = getText('scanNotFound');
      resultClass = 'result-rejected';
  }

  overlayText.textContent = text;
  overlay.classList.add(resultClass);
  overlay.classList.add('visible');

  // Show the dismiss button
  if (dismissBtn) {
    dismissBtn.classList.add('visible');
  }
}

/**
 * Hide the scan result overlay and resume camera.
 */
function hideScanResult() {
  const overlay = document.getElementById('scan-overlay');
  const dismissBtn = document.getElementById('dismiss-btn');

  if (overlay) {
    overlay.classList.remove('visible', 'result-female', 'result-male', 'result-rejected');
  }
  if (dismissBtn) {
    dismissBtn.classList.remove('visible');
  }

  if (onDismissCallback) {
    onDismissCallback();
  }
}

/**
 * Add a scan to the history.
 * @param {string} qrToken
 * @param {string} ticketType — 'female' or 'male' or null
 * @param {string} status — 'accepted' or 'rejected'
 */
function addToHistory(qrToken, ticketType, status) {
  scanHistory.unshift({
    qrToken,
    ticketType,
    status,
    time: new Date(),
  });

  updateMiniHistory();
  updateFullHistoryCounters();
  updateTicketCounterBar();
}

/**
 * Update the mini history bar (bottom of scanner screen).
 * Shows last 3 scans as colored dots + truncated IDs.
 */
function updateMiniHistory() {
  const container = document.getElementById('mini-history');
  if (!container) return;

  const recent = scanHistory.slice(0, 3);

  if (recent.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = recent.map(scan => {
    let dotColor, label;
    if (scan.status === 'rejected') {
      dotColor = '#DC2626';
      label = getText('historyDuplicate');
    } else if (scan.ticketType === 'female') {
      dotColor = '#EC4899';
      label = getText('historyWomen');
    } else {
      dotColor = '#2563EB';
      label = getText('historyMen');
    }

    const shortId = '#' + scan.qrToken.substring(0, 4);

    return `<span class="mini-history-item">
      <span class="mini-dot" style="background:${dotColor}"></span>
      ${shortId} ${label}
    </span>`;
  }).join('<span class="mini-divider">|</span>');
}

/**
 * Update the counters in the full history panel.
 */
function updateFullHistoryCounters() {
  const accepted = scanHistory.filter(s => s.status === 'accepted');
  const rejected = scanHistory.filter(s => s.status === 'rejected');
  const women = accepted.filter(s => s.ticketType === 'female').length;
  const men = accepted.filter(s => s.ticketType === 'male').length;

  const admittedEl = document.getElementById('history-admitted-count');
  const rejectedEl = document.getElementById('history-rejected-count');
  const remainingEl = document.getElementById('history-remaining-count');
  const breakdownEl = document.getElementById('history-breakdown');

  if (admittedEl) admittedEl.textContent = accepted.length;
  if (rejectedEl) rejectedEl.textContent = rejected.length;
  if (remainingEl) remainingEl.textContent = getCacheSize();
  if (breakdownEl) {
    breakdownEl.innerHTML =
      `<span style="color:#2563EB">${getText('historyMen')}: ${men}</span>` +
      ` &nbsp;|&nbsp; ` +
      `<span style="color:#EC4899">${getText('historyWomen')}: ${women}</span>`;
  }
}

/**
 * Rebuild the full scan list inside the history panel.
 */
function renderFullHistory() {
  const list = document.getElementById('history-list');
  if (!list) return;

  if (scanHistory.length === 0) {
    list.innerHTML = `<p class="history-empty">${getText('historyEmpty')}</p>`;
    return;
  }

  list.innerHTML = scanHistory.map((scan, index) => {
    const shortId = '#' + scan.qrToken.substring(0, 4) + '...' + scan.qrToken.slice(-2);
    const timeStr = scan.time.toLocaleTimeString();
    const agoStr = formatTimeAgo(scan.time);

    let dotColor, typeLabel, statusLabel;
    if (scan.status === 'rejected') {
      dotColor = '#DC2626';
      typeLabel = '—';
      statusLabel = getText('scanRejected');
    } else if (scan.ticketType === 'female') {
      dotColor = '#EC4899';
      typeLabel = getText('historyWomen');
      statusLabel = getText('historyAccepted');
    } else {
      dotColor = '#2563EB';
      typeLabel = getText('historyMen');
      statusLabel = getText('historyAccepted');
    }

    return `<div class="history-row">
      <span class="history-id">${shortId}</span>
      <span class="mini-dot" style="background:${dotColor}"></span>
      <span class="history-type">${typeLabel}</span>
      <span class="history-status">${statusLabel}</span>
      <span class="history-time">${timeStr}</span>
      <span class="history-ago" data-time="${scan.time.toISOString()}">${agoStr}</span>
    </div>`;
  }).join('');
}

/**
 * Format a timestamp as "Xs ago", "Xm ago", "Xh ago", or "24h+".
 */
function formatTimeAgo(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds >= 86400) return getText('timeDayPlus');
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)}${getText('timeHours')} ${getText('historyAgo')}`;
  if (seconds >= 60) return `${Math.floor(seconds / 60)}${getText('timeMinutes')} ${getText('historyAgo')}`;
  return `${seconds}${getText('timeSeconds')} ${getText('historyAgo')}`;
}

/**
 * Update all "ago" timestamps every second.
 */
function startHistoryTimer() {
  historyTimerInterval = setInterval(() => {
    // Update mini history
    updateMiniHistory();
    // Update full history "ago" spans
    document.querySelectorAll('.history-ago').forEach(el => {
      const time = new Date(el.dataset.time);
      el.textContent = formatTimeAgo(time);
    });
  }, 1000);
}

// ─── Persistent Ticket Counter Bar ────────────────────────

/**
 * Update the persistent ticket counter bar (always visible below top bar).
 * Shows how many valid tickets remain in the local cache.
 */
function updateTicketCounterBar() {
  const textEl = document.getElementById('ticket-counter-text');
  const labelEl = document.getElementById('ticket-counter-label');

  if (textEl) {
    const prevValue = textEl.textContent;
    const newValue = String(getCacheSize());
    textEl.textContent = newValue;

    // Flash animation when the number changes
    if (prevValue !== newValue) {
      textEl.classList.add('counter-flash');
      setTimeout(() => textEl.classList.remove('counter-flash'), 300);
    }
  }

  if (labelEl) {
    labelEl.textContent = getText('ticketCountRemaining');
  }
}

// ─── History Panel (Slide-Up) ─────────────────────────────

function openHistoryPanel() {
  renderFullHistory();
  updateFullHistoryCounters();
  const panel = document.getElementById('history-panel');
  if (panel) {
    panel.style.transition = 'transform 0.3s ease-out';
    panel.classList.add('open');
  }
}

function closeHistoryPanel() {
  const panel = document.getElementById('history-panel');
  if (panel) {
    panel.style.transition = 'transform 0.3s ease-out';
    panel.classList.remove('open');
  }
}


// ─── History Panel Drag-to-Close ──────────────────────────

let dragStartY = 0;
let dragStartTime = 0;
let lastDragY = 0;
let isDragging = false;

function setupDragToClose() {
  const handle = document.getElementById('history-drag-handle');
  const panel = document.getElementById('history-panel');
  if (!handle || !panel) return;

  handle.addEventListener('touchstart', (e) => {
    // Only start drag if panel is open
    if (!panel.classList.contains('open')) return;
    isDragging = true;
    dragStartY = e.touches[0].clientY;
    lastDragY = dragStartY;
    dragStartTime = Date.now();
    panel.style.transition = 'none';
    e.preventDefault();
  });

  handle.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - dragStartY;
    lastDragY = currentY;
    if (diff > 0) {
      panel.style.transform = `translateY(${diff}px)`;
    }
    e.preventDefault();
  });

  handle.addEventListener('touchend', (e) => {
    if (!isDragging) return;
    isDragging = false;

    const diff = lastDragY - dragStartY;
    const elapsed = Date.now() - dragStartTime;
    const velocity = diff / elapsed; // pixels per millisecond

    panel.style.transition = 'transform 0.25s ease-out';

    // Close if: quick flick (velocity > 0.3) OR dragged more than 50px
    if (velocity > 0.3 || diff > 50) {
      panel.classList.remove('open');
      panel.style.transform = '';
    } else {
      // Snap back
      panel.style.transform = 'translateY(0)';
      // Reset transform after animation
      setTimeout(() => {
        panel.style.transform = '';
      }, 250);
    }

    dragStartY = 0;
    lastDragY = 0;
    dragStartTime = 0;
    e.preventDefault();
  });
}


// ─── Hand Preference ──────────────────────────────────────

function toggleHandPreference() {
  handPreference = handPreference === 'R' ? 'L' : 'R';
  localStorage.setItem('scanner-hand', handPreference);
  applyHandPreference();
}

function applyHandPreference() {
  const dismissBtn = document.getElementById('dismiss-btn');
  const handBtn = document.getElementById('hand-toggle');

  if (dismissBtn) {
    dismissBtn.classList.toggle('left-hand', handPreference === 'L');
    dismissBtn.classList.toggle('right-hand', handPreference === 'R');
  }

  if (handBtn) {
    handBtn.textContent = handPreference === 'R' ? getText('handRight') : getText('handLeft');
  }
}

// ─── Language Selector ────────────────────────────────────

function cycleLang() {
  const langs = ['en', 'es', 'pt-BR'];
  const current = getLanguage();
  const nextIndex = (langs.indexOf(current) + 1) % langs.length;
  setLanguage(langs[nextIndex]);
  applyLanguage();
}

function applyLanguage() {
  const langBtn = document.getElementById('lang-toggle');
  const lang = getLanguage();

  // Update language button text
  const displayNames = { 'en': 'EN', 'es': 'ES', 'pt-BR': 'PT' };
  if (langBtn) langBtn.textContent = displayNames[lang] || 'EN';

  // Update PIN screen text
  const pinPrompt = document.getElementById('pin-prompt');
  if (pinPrompt) pinPrompt.textContent = getText('pinPrompt');

  const pinSubtitle = document.getElementById('pin-subtitle');
  if (pinSubtitle) pinSubtitle.textContent = getText('pinSubtitle');

  // Update scanner screen text
  const readyText = document.getElementById('scan-ready-text');
  if (readyText) readyText.textContent = getText('scanReady');

  // Update hand toggle
  applyHandPreference();

  // Update history panel title
  const histTitle = document.getElementById('history-panel-title');
  if (histTitle) histTitle.textContent = getText('historyTitle');

  // Update history button text
  const histBtn = document.getElementById('history-btn');
  if (histBtn) histBtn.textContent = getText('historyTitle');

  // Update mini history
  updateMiniHistory();

  // Re-render the full history list so row labels translate
  renderFullHistory();
  updateFullHistoryCounters();

  // Update history counter labels
  const admLabel = document.getElementById('history-admitted-label');
  if (admLabel) admLabel.textContent = getText('historyTotalAdmitted');
  const rejLabel = document.getElementById('history-rejected-label');
  if (rejLabel) rejLabel.textContent = getText('historyRejected');
  const remLabel = document.getElementById('history-remaining-label');
  if (remLabel) remLabel.textContent = getText('historyRemaining');

  // Update persistent ticket counter bar
  updateTicketCounterBar();
}

// ─── Refresh Button ───────────────────────────────────────

let isRefreshing = false;

async function handleRefresh() {
  if (isRefreshing) return;
  isRefreshing = true;

  const refreshBtn = document.getElementById('refresh-btn');
  const refreshStatus = document.getElementById('refresh-status');

  if (refreshBtn) refreshBtn.classList.add('spinning');
  if (refreshStatus) {
    refreshStatus.textContent = getText('refreshing');
    refreshStatus.classList.add('visible');
  }

  const count = await loadTickets();

  if (refreshBtn) refreshBtn.classList.remove('spinning');

  if (count >= 0 && refreshStatus) {
    const added = count - previousTicketCount;
    if (added > 0) {
      refreshStatus.textContent = `+${added} ${getText('ticketCountAdded')}`;
    } else {
      refreshStatus.textContent = getText('refreshDone');
    }
    previousTicketCount = count;
    setTimeout(() => {
      refreshStatus.classList.remove('visible');
    }, 2000);
  } else if (count === -1) {
    // Session expired — go back to PIN screen
    showPinScreen();
  }

  // Update persistent counter and history panel (if open) after refresh
  updateTicketCounterBar();
  updateFullHistoryCounters();

  isRefreshing = false;
}

// Callback for auto-refresh (called from ticketCache.js)
function onTicketRefresh(count) {
  const refreshStatus = document.getElementById('refresh-status');
  if (refreshStatus) {
    const added = count - previousTicketCount;
    if (added > 0) {
      refreshStatus.textContent = `+${added} ${getText('ticketCountAdded')}`;
    } else {
      refreshStatus.textContent = getText('refreshDone');
    }
    previousTicketCount = count;
    refreshStatus.classList.add('visible');
    setTimeout(() => refreshStatus.classList.remove('visible'), 2000);
  }

  // Update persistent counter and history panel (if open) after auto-refresh
  updateTicketCounterBar();
  updateFullHistoryCounters();
}

// ─── Screen Switching ─────────────────────────────────────

function showPinScreen() {
  document.getElementById('pin-screen')?.classList.add('active');
  document.getElementById('scanner-screen')?.classList.remove('active');
}

function showScannerScreen() {
  document.getElementById('pin-screen')?.classList.remove('active');
  document.getElementById('scanner-screen')?.classList.add('active');
}

// ─── Event Listeners ──────────────────────────────────────

function setupUIListeners() {
  // Dismiss button
  const dismissBtn = document.getElementById('dismiss-btn');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', hideScanResult);
  }

  // History panel
  const historyBtn = document.getElementById('history-btn');
  if (historyBtn) {
    historyBtn.addEventListener('click', openHistoryPanel);
  }

  const historyClose = document.getElementById('history-close');
  if (historyClose) {
    historyClose.addEventListener('click', closeHistoryPanel);
  }

  // Hand preference toggle
  const handBtn = document.getElementById('hand-toggle');
  if (handBtn) {
    handBtn.addEventListener('click', toggleHandPreference);
  }

  // Language toggle
  const langBtn = document.getElementById('lang-toggle');
  if (langBtn) {
    langBtn.addEventListener('click', cycleLang);
  }

  // Refresh button
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', handleRefresh);
  }

  // Drag-to-close for history panel
  setupDragToClose();
}
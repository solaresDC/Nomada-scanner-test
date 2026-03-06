/**
 * Scanner Translations
 *
 * All UI text for the scanner app in 3 languages.
 * Access with: getText(key)  (uses current language from localStorage)
 */

const TRANSLATIONS = {
  en: {
    // PIN Screen
    pinTitle: 'NOMADA',
    pinSubtitle: 'Scanner',
    pinPrompt: 'Enter PIN to start',
    pinIncorrect: 'Incorrect PIN',
    pinLocked: 'Too many attempts. Wait 60s.',

    // Scanner Screen
    scanReady: 'Ready to scan',
    scanAcceptedFemale: 'Accepted — Female',
    scanAcceptedMale: 'Accepted — Male',
    scanRejected: 'Already Scanned',
    scanNotFound: 'QR Not Recognized',
    scanNotValid: 'Not Valid',
    scanChecking: 'Checking...',
    scanConfirming: 'Confirming...',

    // Controls
    refreshBtn: 'Refresh',
    refreshing: 'Updating...',
    refreshDone: 'Updated',
    ticketCount: 'tickets',
    ticketCountAdded: 'new tickets added',
    handLeft: 'L',
    handRight: 'R',

    // History
    historyTitle: 'View Full History',
    historyClose: 'Close',
    historyTotalAdmitted: 'Total Admitted',
    historyRejected: 'Rejected',
    historyEmpty: 'No scans yet',
    historyWomen: 'Women',
    historyMen: 'Men',
    historyDuplicate: 'Dup',
    historyAccepted: 'Accepted',
    historyAgo: 'ago',

    // Time units
    timeSeconds: 's',
    timeMinutes: 'm',
    timeHours: 'h',
    timeDayPlus: '24h+',

    // Persistent ticket counter
    ticketCountRemaining: 'remaining',
    historyRemaining: 'Remaining',
  },

  es: {
    pinTitle: 'NOMADA',
    pinSubtitle: 'Escáner',
    pinPrompt: 'Ingresa el PIN para iniciar',
    pinIncorrect: 'PIN incorrecto',
    pinLocked: 'Demasiados intentos. Espera 60s.',

    scanReady: 'Listo para escanear',
    scanAcceptedFemale: 'Aceptado — Mujer',
    scanAcceptedMale: 'Aceptado — Hombre',
    scanRejected: 'Ya Escaneado',
    scanNotFound: 'QR No Reconocido',
    scanNotValid: 'No Válido',
    scanChecking: 'Verificando...',
    scanConfirming: 'Confirmando...',

    refreshBtn: 'Actualizar',
    refreshing: 'Actualizando...',
    refreshDone: 'Actualizado',
    ticketCount: 'entradas',
    ticketCountAdded: 'nuevas entradas agregadas',
    handLeft: 'I',
    handRight: 'D',

    historyTitle: 'Ver Historial Completo',
    historyClose: 'Cerrar',
    historyTotalAdmitted: 'Total Admitidos',
    historyRejected: 'Rechazados',
    historyEmpty: 'Sin escaneos aún',
    historyWomen: 'Mujer',
    historyMen: 'Hombre',
    historyDuplicate: 'Dup',
    historyAccepted: 'Aceptado',
    historyAgo: 'hace',

    timeSeconds: 's',
    timeMinutes: 'm',
    timeHours: 'h',
    timeDayPlus: '24h+',

    ticketCountRemaining: 'restantes',
    historyRemaining: 'Restantes',
  },

  'pt-BR': {
    pinTitle: 'NOMADA',
    pinSubtitle: 'Scanner',
    pinPrompt: 'Digite o PIN para começar',
    pinIncorrect: 'PIN incorreto',
    pinLocked: 'Muitas tentativas. Aguarde 60s.',

    scanReady: 'Pronto para escanear',
    scanAcceptedFemale: 'Aceito — Feminino',
    scanAcceptedMale: 'Aceito — Masculino',
    scanRejected: 'Já Escaneado',
    scanNotFound: 'QR Não Reconhecido',
    scanNotValid: 'Não Válido',
    scanChecking: 'Verificando...',
    scanConfirming: 'Confirmando...',

    refreshBtn: 'Atualizar',
    refreshing: 'Atualizando...',
    refreshDone: 'Atualizado',
    ticketCount: 'ingressos',
    ticketCountAdded: 'novos ingressos adicionados',
    handLeft: 'E',
    handRight: 'D',

    historyTitle: 'Ver Histórico Completo',
    historyClose: 'Fechar',
    historyTotalAdmitted: 'Total Admitidos',
    historyRejected: 'Rejeitados',
    historyEmpty: 'Nenhum escaneamento ainda',
    historyWomen: 'Feminino',
    historyMen: 'Masculino',
    historyDuplicate: 'Dup',
    historyAccepted: 'Aceito',
    historyAgo: 'atrás',

    timeSeconds: 's',
    timeMinutes: 'm',
    timeHours: 'h',
    timeDayPlus: '24h+',

    ticketCountRemaining: 'restantes',
    historyRemaining: 'Restantes',
  },
};

// ─── Current Language ───────────────────────────────────────
let currentLang = localStorage.getItem('scanner-lang') || 'en';

/**
 * Get translated text for a key.
 * @param {string} key — e.g. 'pinTitle', 'scanAcceptedFemale'
 * @returns {string}
 */
function getText(key) {
  const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
  return dict[key] || TRANSLATIONS.en[key] || key;
}

/**
 * Set the current language and save to localStorage.
 * @param {string} lang — 'en', 'es', or 'pt-BR'
 */
function setLanguage(lang) {
  if (TRANSLATIONS[lang]) {
    currentLang = lang;
    localStorage.setItem('scanner-lang', lang);
  }
}

/**
 * Get the current language code.
 * @returns {string}
 */
function getLanguage() {
  return currentLang;
}
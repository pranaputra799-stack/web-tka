/**
 * TKA English Practice - Minimalist & Mobile-Optimized Application Engine
 * Features: Settings management, mobile split-view switcher, offline LocalStorage fallback,
 * CBT exam simulation, auto-grading, and comprehensive review.
 */

// User Preferences & Settings State
const userSettings = {
  timerMinutes: 30,
  timerWarning: true,
  fontSize: 1.0,
  autoScroll: true,
  mobileViewMode: 'question' // 'question' | 'passage'
};

// Application State
const state = {
  currentView: 'dashboard',
  packages: [],
  dashboardData: null,
  activePackage: null,
  currentQIndex: 0,
  userAnswers: {},       // { [qNumber]: answerValue }
  flaggedQuestions: new Set(),
  examTimerInterval: null,
  examSecondsRemaining: 1800,
  examTimeSpent: 0,
  lastAttemptResult: null,
  activeReviewData: null,
  reviewFilter: 'all',
  catalogFilter: 'all',
  catalogSearch: '',
  passageCollapsed: false,
  desktopNavCollapsed: false,
  mobileBarMinimized: false
};

// Chart.js instance holder
let scoreChartInstance = null;

// LocalStorage Persistence Keys
const STORAGE_KEYS = {
  SETTINGS: 'tka_user_settings',
  ATTEMPTS: 'tka_local_attempts',
  BOOKMARKS: 'tka_local_bookmarks',
  STREAK: 'tka_local_streak'
};

// ===================================================================
// DOM ELEMENTS CACHE
// ===================================================================
const DOM = {
  views: document.querySelectorAll('.view-section'),
  navItems: document.querySelectorAll('.nav-item'),
  mobileNavBtns: document.querySelectorAll('.mobile-nav-btn'),
  streakCount: document.getElementById('nav-streak-count'),
  
  // Dashboard
  dashAvgScore: document.getElementById('dash-avg-score'),
  dashTotalAttempts: document.getElementById('dash-total-attempts'),
  dashBestScore: document.getElementById('dash-best-score'),
  dashBestPackage: document.getElementById('dash-best-package'),
  dashWorstScore: document.getElementById('dash-worst-score'),
  dashWorstPackage: document.getElementById('dash-worst-package'),
  dashProgressText: document.getElementById('dash-progress-text'),
  dashRecentTableBody: document.getElementById('dash-recent-table-body'),
  dashRecentMobileList: document.getElementById('dash-recent-mobile-list'),
  dashEvaluationList: document.getElementById('dash-evaluation-list'),
  chartCanvas: document.getElementById('scoreProgressionChart'),

  // Catalog
  packageGrid: document.getElementById('package-card-grid'),
  packageSearchInput: document.getElementById('package-search-input'),
  filterButtons: document.querySelectorAll('.filter-btn[data-filter]'),

  // Exam
  examTitle: document.getElementById('exam-package-title'),
  examTimerDigits: document.getElementById('exam-timer-digits'),
  examTimerDisplay: document.getElementById('exam-timer-display'),
  examWorkspaceContainer: document.getElementById('exam-workspace-container'),
  passagePanelContainer: document.getElementById('passage-panel-container'),
  btnTogglePassage: document.getElementById('btn-toggle-passage'),
  passageCollapseIcon: document.getElementById('passage-collapse-icon'),
  passageCollapseLabel: document.getElementById('passage-collapse-label'),
  passageContextBar: document.getElementById('passage-context-bar'),
  passageContextText: document.getElementById('passage-context-text'),
  passageTabs: document.getElementById('passage-tabs'),
  passageTitle: document.getElementById('passage-title'),
  passageBody: document.getElementById('passage-body'),
  passageContentArea: document.getElementById('passage-content-area'),
  examQNumberBadge: document.getElementById('exam-q-number-badge'),
  examQTypeBadge: document.getElementById('exam-q-type-badge'),
  questionRefTitle: document.getElementById('question-ref-title'),
  btnScrollToText: document.getElementById('btn-scroll-to-text'),
  btnOpenDrawerInline: document.getElementById('btn-open-drawer-inline'),
  examQPrompt: document.getElementById('exam-q-prompt'),
  examOptionsContainer: document.getElementById('exam-options-container'),
  examNavSidebar: document.getElementById('exam-nav-sidebar'),
  examNavButtons: document.getElementById('exam-nav-buttons'),
  examAnsweredCounter: document.getElementById('exam-answered-counter'),
  btnToggleNavDesktop: document.getElementById('btn-toggle-nav-desktop'),
  desktopNavCollapseIcon: document.getElementById('desktop-nav-collapse-icon'),
  btnExpandNavDesktop: document.getElementById('btn-expand-nav-desktop'),
  desktopMinCounter: document.getElementById('desktop-min-counter'),
  btnPrevQ: document.getElementById('btn-prev-q'),
  btnNextQ: document.getElementById('btn-next-q'),
  btnFlagQ: document.getElementById('btn-flag-q'),
  btnFlagLabel: document.getElementById('btn-flag-label'),
  btnFontDec: document.getElementById('btn-font-dec'),
  btnFontInc: document.getElementById('btn-font-inc'),

  // Mobile Exam Controls
  mobileCurrentQNum: document.getElementById('mobile-current-q-num'),
  examMobileBottomBar: document.getElementById('exam-mobile-bottom-bar'),
  btnMinimizeMobileBar: document.getElementById('btn-minimize-mobile-bar'),
  btnRestoreMobileBar: document.getElementById('btn-restore-mobile-bar'),
  floatingQNum: document.getElementById('floating-q-num'),
  btnMobilePrev: document.getElementById('btn-mobile-prev'),
  btnMobileNext: document.getElementById('btn-mobile-next'),
  btnMobileFlag: document.getElementById('btn-mobile-flag'),
  btnMobileDrawerToggle: document.getElementById('btn-mobile-drawer-toggle'),
  mobileDrawerQNum: document.getElementById('mobile-drawer-q-num'),
  examNavDrawerModal: document.getElementById('exam-nav-drawer-modal'),
  mobileDrawerNavButtons: document.getElementById('mobile-drawer-nav-buttons'),
  btnCloseDrawer: document.getElementById('btn-close-drawer'),

  // Result
  resultPackageName: document.getElementById('result-package-name'),
  resultScoreValue: document.getElementById('result-score-value'),
  resultScoreCircle: document.getElementById('result-score-circle'),
  resultStatusBadge: document.getElementById('result-status-badge'),
  resultCorrectCount: document.getElementById('result-correct-count'),
  resultWrongCount: document.getElementById('result-wrong-count'),
  resultTotalCount: document.getElementById('result-total-count'),
  resultTimeSpent: document.getElementById('result-time-spent'),

  // Review
  reviewTitleHeading: document.getElementById('review-title-heading'),
  reviewItemsContainer: document.getElementById('review-items-container'),
  reviewFilterButtons: document.querySelectorAll('[data-review-filter]'),

  // Bookmarks
  bookmarksContainer: document.getElementById('bookmarks-container'),

  // Settings
  settingTimerSelect: document.getElementById('setting-timer-select'),
  settingTimerWarning: document.getElementById('setting-timer-warning'),
  settingFontSize: document.getElementById('setting-font-size'),
  settingAutoScroll: document.getElementById('setting-auto-scroll'),
  btnExportData: document.getElementById('btn-export-data'),
  btnResetData: document.getElementById('btn-reset-data'),

  // Modals & Toast
  submitModal: document.getElementById('submit-confirm-modal'),
  modalSubmitSummary: document.getElementById('modal-submit-summary'),
  toastContainer: document.getElementById('toast-container')
};

// ===================================================================
// INITIALIZATION
// ===================================================================
document.addEventListener('DOMContentLoaded', () => {
  loadUserSettings();
  setupNavigation();
  setupCatalogControls();
  setupExamControls();
  setupResultAndReviewControls();
  setupSettingsControls();
  
  // Initial data load
  loadDashboardData();
  loadPackages();
});

// Toast notification helper
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'warning') icon = '⚠️';
  if (type === 'error') icon = '❌';

  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    setTimeout(() => toast.remove(), 250);
  }, 2800);
}

// ===================================================================
// SETTINGS PERSISTENCE & CONTROLS
// ===================================================================
function loadUserSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (saved) {
      Object.assign(userSettings, JSON.parse(saved));
    }
  } catch (e) {
    console.warn('Failed to load settings from localStorage:', e);
  }

  // Sync with DOM
  if (DOM.settingTimerSelect) DOM.settingTimerSelect.value = String(userSettings.timerMinutes);
  if (DOM.settingTimerWarning) DOM.settingTimerWarning.checked = userSettings.timerWarning;
  if (DOM.settingFontSize) DOM.settingFontSize.value = String(userSettings.fontSize);
  if (DOM.settingAutoScroll) DOM.settingAutoScroll.checked = userSettings.autoScroll;

  // Apply font size
  if (DOM.passageContentArea) {
    DOM.passageContentArea.style.fontSize = `${userSettings.fontSize}rem`;
  }
}

function saveUserSettings() {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(userSettings));
  } catch (e) {
    console.warn('Failed to save settings:', e);
  }
}

function setupSettingsControls() {
  if (DOM.settingTimerSelect) {
    DOM.settingTimerSelect.addEventListener('change', (e) => {
      userSettings.timerMinutes = parseInt(e.target.value, 10);
      saveUserSettings();
      showToast(`Durasi timer diubah ke ${userSettings.timerMinutes === 0 ? 'Mode Bebas' : userSettings.timerMinutes + ' menit'}`, 'success');
    });
  }

  if (DOM.settingTimerWarning) {
    DOM.settingTimerWarning.addEventListener('change', (e) => {
      userSettings.timerWarning = e.target.checked;
      saveUserSettings();
    });
  }

  if (DOM.settingFontSize) {
    DOM.settingFontSize.addEventListener('change', (e) => {
      userSettings.fontSize = parseFloat(e.target.value);
      if (DOM.passageContentArea) {
        DOM.passageContentArea.style.fontSize = `${userSettings.fontSize}rem`;
      }
      saveUserSettings();
      showToast('Ukuran font teks diperbarui', 'info');
    });
  }

  if (DOM.settingAutoScroll) {
    DOM.settingAutoScroll.addEventListener('change', (e) => {
      userSettings.autoScroll = e.target.checked;
      saveUserSettings();
    });
  }

  if (DOM.btnExportData) {
    DOM.btnExportData.addEventListener('click', exportUserDataJSON);
  }

  if (DOM.btnResetData) {
    DOM.btnResetData.addEventListener('click', resetAllUserData);
  }
}

function exportUserDataJSON() {
  const data = {
    settings: userSettings,
    attempts: getLocalAttempts(),
    bookmarks: getLocalBookmarks(),
    exportDate: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tka_english_progress_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Data progres berhasil diekspor!', 'success');
}

function resetAllUserData() {
  if (!confirm('Apakah kamu yakin ingin MENGHAPUS SEMUA riwayat latihan, skor, dan bookmark? Tindakan ini tidak dapat dibatalkan.')) {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEYS.ATTEMPTS);
    localStorage.removeItem(STORAGE_KEYS.BOOKMARKS);
    localStorage.removeItem(STORAGE_KEYS.STREAK);
    showToast('Semua riwayat progres telah direset!', 'info');
    loadDashboardData();
    loadPackages();
  } catch (e) {
    showToast('Gagal mereset data: ' + e.message, 'error');
  }
}

// Local storage accessors
function getLocalAttempts() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.ATTEMPTS) || '[]');
  } catch {
    return [];
  }
}

function saveLocalAttempt(attempt) {
  try {
    const list = getLocalAttempts();
    list.unshift(attempt);
    localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(list));
  } catch (e) {
    console.warn(e);
  }
}

function getLocalBookmarks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKMARKS) || '[]');
  } catch {
    return [];
  }
}

function saveLocalBookmark(packageId, qNum, note) {
  try {
    const list = getLocalBookmarks().filter(b => !(b.package_id === packageId && b.question_number === qNum));
    list.unshift({ package_id: packageId, question_number: qNum, note, created_at: new Date().toISOString() });
    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(list));
  } catch (e) {
    console.warn(e);
  }
}

function deleteLocalBookmark(packageId, qNum) {
  try {
    const list = getLocalBookmarks().filter(b => !(b.package_id === packageId && b.question_number === qNum));
    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(list));
  } catch (e) {
    console.warn(e);
  }
}

// ===================================================================
// NAVIGATION & VIEW ROUTING
// ===================================================================
function switchView(viewName) {
  state.currentView = viewName;

  DOM.views.forEach(section => section.classList.remove('active'));

  const activeSection = document.getElementById(`view-${viewName}`);
  if (activeSection) activeSection.classList.add('active');

  // Sync Top Nav
  DOM.navItems.forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-view') === viewName);
  });

  // Sync Mobile Bottom Nav
  DOM.mobileNavBtns.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-view') === viewName);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Refresh data on view change
  if (viewName === 'dashboard') loadDashboardData();
  if (viewName === 'packages') loadPackages();
  if (viewName === 'bookmarks') loadBookmarks();
}

function setupNavigation() {
  // Top Nav Items
  DOM.navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = item.getAttribute('data-view');
      confirmAndSwitchView(targetView);
    });
  });

  // Mobile Bottom Nav Items
  DOM.mobileNavBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = btn.getAttribute('data-view');
      confirmAndSwitchView(targetView);
    });
  });

  document.getElementById('btn-brand-home').addEventListener('click', () => switchView('dashboard'));
  document.getElementById('btn-hero-start').addEventListener('click', () => switchView('packages'));
  document.getElementById('btn-see-all-packages').addEventListener('click', () => switchView('packages'));
}

function confirmAndSwitchView(targetView) {
  if (state.currentView === 'exam' && targetView !== 'exam') {
    if (!confirm('Ujian sedang berlangsung! Keluar sekarang akan membatalkan sesi ujian ini.')) {
      return;
    }
    clearInterval(state.examTimerInterval);
  }
  switchView(targetView);
}

// ===================================================================
// DASHBOARD LOGIC & ANALYTICS
// ===================================================================
async function loadDashboardData() {
  let data = null;
  
  // Try fetching from server
  try {
    const res = await fetch('/api/dashboard');
    if (res.ok) data = await res.json();
  } catch {
    // Server unavailable / static mode fallback
  }

  // If server data missing or offline, aggregate from LocalStorage
  if (!data) {
    const localAttempts = getLocalAttempts();
    const count = localAttempts.length;
    let avg = 0;
    let best = null;
    let worst = null;

    if (count > 0) {
      const sum = localAttempts.reduce((acc, a) => acc + a.score, 0);
      avg = Math.round((sum / count) * 10) / 10;

      const sorted = [...localAttempts].sort((a, b) => b.score - a.score);
      best = { package_id: sorted[0].package_id, package_name: sorted[0].package_name, best_score: sorted[0].score };
      worst = { package_id: sorted[sorted.length - 1].package_id, package_name: sorted[sorted.length - 1].package_name, best_score: sorted[sorted.length - 1].score };
    }

    const attemptedIds = new Set(localAttempts.map(a => a.package_id));

    data = {
      total_attempts: count,
      average_score: avg,
      best_package: best,
      worst_package: worst,
      recent_attempts: localAttempts.slice(0, 10),
      score_progression: [...localAttempts].reverse(),
      study_streak: count > 0 ? 1 : 0,
      total_packages: 25,
      attempted_packages: attemptedIds.size,
      weak_areas: {}
    };
  }

  state.dashboardData = data;
  renderDashboard(data);
}

function renderDashboard(data) {
  DOM.streakCount.textContent = `${data.study_streak} Hari Belajar`;
  DOM.dashAvgScore.textContent = data.average_score > 0 ? `${data.average_score}` : '0';
  DOM.dashTotalAttempts.textContent = `${data.total_attempts}x sesi ujian diselesaikan`;
  DOM.dashProgressText.textContent = `${data.attempted_packages} / ${data.total_packages}`;

  if (data.best_package) {
    DOM.dashBestScore.textContent = `${data.best_package.best_score}`;
    DOM.dashBestPackage.textContent = data.best_package.package_name;
  } else {
    DOM.dashBestScore.textContent = '-';
    DOM.dashBestPackage.textContent = 'Belum ada data';
  }

  if (data.worst_package) {
    DOM.dashWorstScore.textContent = `${data.worst_package.best_score}`;
    DOM.dashWorstPackage.textContent = data.worst_package.package_name;
  } else {
    DOM.dashWorstScore.textContent = '-';
    DOM.dashWorstPackage.textContent = 'Belum ada data';
  }

  renderScoreChart(data.score_progression || []);
  renderRecentAttempts(data.recent_attempts || []);
  renderEvaluations(data);
}

function renderScoreChart(progression) {
  if (!DOM.chartCanvas) return;
  const ctx = DOM.chartCanvas.getContext('2d');
  if (scoreChartInstance) scoreChartInstance.destroy();

  if (progression.length === 0) {
    scoreChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Sesi 1', 'Sesi 2', 'Sesi 3', 'Sesi 4'],
        datasets: [{
          label: 'Target',
          data: [70, 75, 80, 85],
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderDash: [4, 4],
          fill: false,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          y: { min: 0, max: 100, grid: { color: 'rgba(255, 255, 255, 0.04)' } },
          x: { grid: { color: 'transparent' } }
        }
      }
    });
    return;
  }

  const labels = progression.map((_, idx) => `#${idx + 1}`);
  const scores = progression.map(p => p.score);

  scoreChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Skor Ujian',
        data: scores,
        borderColor: '#3b82f6',
        borderWidth: 2.5,
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        tension: 0.25,
        fill: true,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#3b82f6',
        pointBorderWidth: 2,
        pointRadius: 3.5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#141720',
          titleColor: '#f4f5f8',
          bodyColor: '#9da4b4',
          borderColor: '#232734',
          borderWidth: 1,
          padding: 8,
          callbacks: {
            label: (ctx) => `Skor: ${ctx.parsed.y} / 100`
          }
        }
      },
      scales: {
        y: {
          min: 0,
          max: 100,
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: { color: '#646b7d', font: { size: 11 } }
        },
        x: {
          grid: { color: 'transparent' },
          ticks: { color: '#646b7d', font: { size: 11 } }
        }
      }
    }
  });
}

function renderRecentAttempts(attempts) {
  if (attempts.length === 0) {
    const emptyMsg = `
      <div style="text-align: center; color: var(--text-muted); padding: 2rem 1rem;">
        <p style="font-size: 0.95rem; margin-bottom: 0.25rem;">Belum ada riwayat ujian.</p>
        <p style="font-size: 0.82rem;">Pilih salah satu paket soal di menu "Paket" untuk mulai latihan!</p>
      </div>
    `;
    DOM.dashRecentTableBody.innerHTML = `<tr><td colspan="6">${emptyMsg}</td></tr>`;
    if (DOM.dashRecentMobileList) DOM.dashRecentMobileList.innerHTML = emptyMsg;
    return;
  }

  // 1. Desktop Table Rows
  DOM.dashRecentTableBody.innerHTML = attempts.map(att => {
    let scoreClass = 'mid';
    if (att.score >= 80) scoreClass = 'high';
    else if (att.score < 60) scoreClass = 'low';

    const minutes = Math.floor(att.time_spent / 60);
    const seconds = att.time_spent % 60;
    const timeFormatted = `${minutes}m ${seconds}s`;

    const dateFormatted = new Date(att.created_at).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <tr>
        <td style="font-weight: 600; color: #fff;">${att.package_name}</td>
        <td><span class="score-pill ${scoreClass}">${att.score}</span></td>
        <td><span style="color: var(--accent-emerald);">✓ ${att.correct}</span> / <span style="color: var(--accent-rose);">✗ ${att.wrong}</span></td>
        <td>${timeFormatted}</td>
        <td style="color: var(--text-muted); font-size: 0.8rem;">${dateFormatted}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="openAttemptReview(${att.id || 0})">
            Review
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // 2. Mobile Responsive Card List
  if (DOM.dashRecentMobileList) {
    DOM.dashRecentMobileList.innerHTML = attempts.map(att => {
      let scoreClass = 'mid';
      if (att.score >= 80) scoreClass = 'high';
      else if (att.score < 60) scoreClass = 'low';

      const minutes = Math.floor(att.time_spent / 60);
      const seconds = att.time_spent % 60;
      const timeFormatted = `${minutes}m ${seconds}s`;

      const dateFormatted = new Date(att.created_at).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });

      return `
        <div class="mobile-attempt-card">
          <div class="mac-header">
            <div class="mac-title">${att.package_name}</div>
            <span class="score-pill ${scoreClass}">${att.score}</span>
          </div>
          <div class="mac-meta-row">
            <span class="mac-chip correct">✓ ${att.correct} Benar</span>
            <span class="mac-chip wrong">✗ ${att.wrong} Salah</span>
            <span class="mac-chip">⏱️ ${timeFormatted}</span>
            <span class="mac-chip">📅 ${dateFormatted}</span>
          </div>
          <div class="mac-action">
            <button class="btn btn-secondary btn-sm mac-btn" onclick="openAttemptReview(${att.id || 0})">
              Lihat Pembahasan →
            </button>
          </div>
        </div>
      `;
    }).join('');
  }
}

function renderEvaluations(data) {
  const weak = data.weak_areas || {};
  const totalAttempts = data.total_attempts || 0;

  if (totalAttempts === 0) {
    DOM.dashEvaluationList.innerHTML = `
      <div class="eval-card priority-good">
        <div class="eval-card-header">
          <span class="eval-badge priority-good">Diagnostik Awal</span>
          <span class="eval-tag">Langkah 1</span>
        </div>
        <h4 class="eval-card-title">Kerjakan Paket 1 sebagai Tes Diagnostik</h4>
        <p class="eval-card-desc">Mulai dengan 1 paket untuk mengidentifikasi kecepatan membaca dan tipe soal yang paling menantang bagimu.</p>
      </div>
      <div class="eval-card priority-medium">
        <div class="eval-card-header">
          <span class="eval-badge priority-medium">Tips Belajar</span>
          <span class="eval-tag">Format TKA</span>
        </div>
        <h4 class="eval-card-title">Kuasai Format Soal TKA</h4>
        <p class="eval-card-desc">TKA menguji pemahaman teks autentik lewat Pilihan Ganda Tunggal, Pilihan Ganda Kompleks (MCMA), dan Matching Table.</p>
      </div>
    `;
    return;
  }

  const items = [];

  if (weak.multiple && weak.multiple > 0) {
    items.push(`
      <div class="eval-card priority-high">
        <div class="eval-card-header">
          <span class="eval-badge priority-high">Prioritas</span>
          <span class="eval-tag">Tipe MCMA</span>
        </div>
        <h4 class="eval-card-title">Pilihan Ganda Kompleks (MCMA)</h4>
        <p class="eval-card-desc">Terdeteksi ${weak.multiple} kesalahan pada soal pilihan ganda kompleks. <strong>Saran:</strong> Verifikasi setiap opsi A-E sebagai pernyataan Benar/Salah terpisah dari teks bacaan sebelum memilih.</p>
      </div>
    `);
  }

  if (weak.matching && weak.matching > 0) {
    items.push(`
      <div class="eval-card priority-medium">
        <div class="eval-card-header">
          <span class="eval-badge priority-medium">Perhatian</span>
          <span class="eval-tag">Klasifikasi Tabel</span>
        </div>
        <h4 class="eval-card-title">Matching Table / Klasifikasi</h4>
        <p class="eval-card-desc">Terdeteksi ${weak.matching} kesalahan pada matching table. <strong>Saran:</strong> Identifikasi kata kunci polaritas (positif vs negatif, fakta vs asumsi) dalam setiap pernyataan tabel.</p>
      </div>
    `);
  }

  if (data.average_score < 75) {
    items.push(`
      <div class="eval-card priority-high">
        <div class="eval-card-header">
          <span class="eval-badge priority-high">Target Skor</span>
          <span class="eval-tag">Evaluasi Nilai</span>
        </div>
        <h4 class="eval-card-title">Ulangi Paket dengan Skor Rendah</h4>
        <p class="eval-card-desc">Fokuskan latihan berikutnya untuk mengulang paket dengan nilai di bawah 75 setelah membaca bagian pembahasan kunci jawaban.</p>
      </div>
    `);
  } else {
    items.push(`
      <div class="eval-card priority-good">
        <div class="eval-card-header">
          <span class="eval-badge priority-good">Progres Baik</span>
          <span class="eval-tag">Konsistensi</span>
        </div>
        <h4 class="eval-card-title">Pertahankan Konsistensi Belajar</h4>
        <p class="eval-card-desc">Nilai rata-rata kamu (${data.average_score}) sangat kompetitif. Terus eksplorasi paket berikutnya untuk memperluas ragam kosakata.</p>
      </div>
    `);
  }

  DOM.dashEvaluationList.innerHTML = items.join('');
}

// ===================================================================
// PACKAGE CATALOG LOGIC
// ===================================================================
async function loadPackages() {
  let packages = null;

  try {
    const res = await fetch('/api/packages');
    if (res.ok) packages = await res.json();
  } catch {
    // Static / Local fallback
  }

  if (!packages) {
    try {
      const res = await fetch('/data/soal.json');
      const data = await res.json();
      const localAttempts = getLocalAttempts();

      packages = data.packages.map(p => {
        const atts = localAttempts.filter(a => a.package_id === p.id);
        const best = atts.length > 0 ? Math.max(...atts.map(a => a.score)) : null;
        return {
          id: p.id,
          name: p.package_name,
          total_questions: p.total_questions,
          texts_count: p.texts.length,
          has_answer_keys: p.questions.filter(q => q.answer_key).length,
          best_score: best,
          attempt_count: atts.length
        };
      });
    } catch (e) {
      console.error('Failed to load packages:', e);
    }
  }

  state.packages = packages || [];
  renderPackageGrid();
}

function setupCatalogControls() {
  DOM.packageSearchInput.addEventListener('input', (e) => {
    state.catalogSearch = e.target.value.toLowerCase().trim();
    renderPackageGrid();
  });

  DOM.filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      DOM.filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.catalogFilter = btn.getAttribute('data-filter');
      renderPackageGrid();
    });
  });
}

function renderPackageGrid() {
  const filtered = state.packages.filter(p => {
    const nameMatch = p.name.toLowerCase().includes(state.catalogSearch);
    if (!nameMatch) return false;

    if (state.catalogFilter === 'done') return p.attempt_count > 0;
    if (state.catalogFilter === 'undone') return p.attempt_count === 0;
    if (state.catalogFilter === 'high') return p.best_score !== null && p.best_score >= 80;
    return true;
  });

  if (filtered.length === 0) {
    DOM.packageGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
        <p style="font-size: 1rem; margin-bottom: 0.5rem;">Tidak ada paket soal yang cocok.</p>
        <button class="btn btn-secondary btn-sm" onclick="resetFilters()">Reset Filter</button>
      </div>
    `;
    return;
  }

  DOM.packageGrid.innerHTML = filtered.map(pkg => {
    let scoreDisplay = 'Belum Ada';
    let scoreColor = '';
    if (pkg.best_score !== null) {
      scoreDisplay = `${pkg.best_score}`;
      if (pkg.best_score >= 80) scoreColor = 'style="color: var(--accent-emerald);"';
      else if (pkg.best_score >= 60) scoreColor = 'style="color: var(--accent-amber);"';
      else scoreColor = 'style="color: var(--accent-rose);"';
    }

    return `
      <div class="package-card">
        <div>
          <div class="package-card-header">
            <span class="package-badge-num">PAKET #${pkg.id}</span>
            ${pkg.attempt_count > 0 ? `<span class="score-pill ${pkg.best_score >= 80 ? 'high' : pkg.best_score >= 60 ? 'mid' : 'low'}">Terbaik: ${pkg.best_score}</span>` : '<span style="font-size: 0.75rem; color: var(--text-muted);">Belum dicoba</span>'}
          </div>

          <h3 class="package-card-title">${pkg.name}</h3>

          <div class="package-meta-row">
            <div class="meta-item">📝 <span>${pkg.total_questions} Soal</span></div>
            <div class="meta-item">📖 <span>${pkg.texts_count} Teks</span></div>
            <div class="meta-item">🔑 <span>${pkg.has_answer_keys} Kunci</span></div>
          </div>

          <div class="package-progress-box">
            <div class="progress-info">
              <span class="progress-label">Percobaan Ujian</span>
              <span class="progress-value">${pkg.attempt_count}x</span>
            </div>
            <div class="progress-info" style="text-align: right;">
              <span class="progress-label">Skor Terbaik</span>
              <span class="progress-value" ${scoreColor}>${scoreDisplay}</span>
            </div>
          </div>
        </div>

        <div class="package-card-actions">
          <button class="btn btn-primary" onclick="startExam(${pkg.id})">
            Mulai Ujian
          </button>
          <button class="btn btn-secondary" onclick="viewPackageHistory(${pkg.id})">
            ${pkg.attempt_count > 0 ? 'Riwayat' : 'Info'}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function resetFilters() {
  state.catalogSearch = '';
  state.catalogFilter = 'all';
  DOM.packageSearchInput.value = '';
  DOM.filterButtons.forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-filter') === 'all');
  });
  renderPackageGrid();
}

// ===================================================================
// EXAM ENGINE LOGIC & MOBILE INTEGRATION
// ===================================================================
async function startExam(packageId) {
  try {
    showToast('Memuat paket soal ujian...', 'info');

    let pkg = null;
    try {
      const res = await fetch(`/api/packages/${packageId}`);
      if (res.ok) pkg = await res.json();
    } catch {
      // Fallback to static JSON
    }

    if (!pkg) {
      const res = await fetch('/data/soal.json');
      const data = await res.json();
      const rawPkg = data.packages.find(p => p.id === packageId);
      if (rawPkg) {
        pkg = {
          id: rawPkg.id,
          name: rawPkg.package_name,
          texts: rawPkg.texts,
          questions: rawPkg.questions.map(q => ({
            number: q.number,
            type: q.type,
            text_number: q.text_number,
            question: q.question,
            options: q.options
          })),
          total_questions: rawPkg.total_questions,
          full_questions: rawPkg.questions // keep answer keys for client-side grading fallback
        };
      }
    }

    if (!pkg) throw new Error('Paket soal tidak ditemukan');

    state.activePackage = pkg;
    state.currentQIndex = 0;
    state.userAnswers = {};
    state.flaggedQuestions = new Set();
    state.examTimeSpent = 0;

    // Apply Timer from user settings
    const timerMinutes = userSettings.timerMinutes;
    if (timerMinutes > 0) {
      state.examSecondsRemaining = timerMinutes * 60;
    } else {
      state.examSecondsRemaining = 0; // Free / no timer
    }

    DOM.examTitle.textContent = pkg.name;

    // Set font size preference
    if (DOM.passageContentArea) {
      DOM.passageContentArea.style.fontSize = `${userSettings.fontSize}rem`;
    }

    // Default to question view on mobile
    setMobileExamView('question');

    // Timer setup
    if (state.examTimerInterval) clearInterval(state.examTimerInterval);
    updateTimerDisplay();

    if (timerMinutes > 0) {
      state.examTimerInterval = setInterval(() => {
        state.examSecondsRemaining--;
        state.examTimeSpent++;
        updateTimerDisplay();

        if (state.examSecondsRemaining <= 0) {
          clearInterval(state.examTimerInterval);
          showToast('Waktu ujian habis! Menyimpan jawaban otomatis...', 'warning');
          submitExam();
        }
      }, 1000);
    } else {
      // Stopwatch mode
      state.examTimerInterval = setInterval(() => {
        state.examTimeSpent++;
        updateTimerDisplay();
      }, 1000);
    }

    switchView('exam');
    renderExamNavGrid();
    displayCurrentQuestion();

  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

function updateTimerDisplay() {
  if (userSettings.timerMinutes === 0) {
    // Stopwatch format
    const m = Math.floor(state.examTimeSpent / 60);
    const s = state.examTimeSpent % 60;
    DOM.examTimerDigits.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    DOM.examTimerDisplay.classList.remove('warning');
    return;
  }

  const m = Math.floor(state.examSecondsRemaining / 60);
  const s = state.examSecondsRemaining % 60;
  DOM.examTimerDigits.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  if (userSettings.timerWarning && state.examSecondsRemaining <= 300) {
    DOM.examTimerDisplay.classList.add('warning');
  } else {
    DOM.examTimerDisplay.classList.remove('warning');
  }
}

function setMobileExamView(viewType) {
  // Mobile view now unifies passage and question together seamlessly.
  userSettings.mobileViewMode = viewType;
}

function renderExamNavGrid() {
  if (!state.activePackage) return;
  const total = state.activePackage.questions.length;

  const generateButtons = () => Array.from({ length: total }, (_, i) => {
    const qNum = i + 1;
    let cls = 'q-nav-btn';
    if (i === state.currentQIndex) cls += ' current';
    if (state.flaggedQuestions.has(qNum)) cls += ' flagged';
    else if (isQuestionAnswered(qNum)) cls += ' answered';

    return `<button class="${cls}" data-q-index="${i}">${qNum}</button>`;
  }).join('');

  // Desktop sidebar
  DOM.examNavButtons.innerHTML = generateButtons();
  DOM.examNavButtons.querySelectorAll('.q-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      goToQuestion(parseInt(btn.getAttribute('data-q-index'), 10));
    });
  });

  // Mobile drawer grid
  if (DOM.mobileDrawerNavButtons) {
    DOM.mobileDrawerNavButtons.innerHTML = generateButtons();
    DOM.mobileDrawerNavButtons.querySelectorAll('.q-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        goToQuestion(parseInt(btn.getAttribute('data-q-index'), 10));
        DOM.examNavDrawerModal.classList.remove('active');
      });
    });
  }

  updateAnsweredCounter();
}

function isQuestionAnswered(qNum) {
  const ans = state.userAnswers[qNum];
  if (!ans) return false;
  if (Array.isArray(ans)) return ans.length > 0;
  if (typeof ans === 'object') return Object.keys(ans).length > 0;
  return true;
}

function updateAnsweredCounter() {
  if (!state.activePackage) return;
  let answered = 0;
  const total = state.activePackage.questions.length;
  for (let i = 1; i <= total; i++) {
    if (isQuestionAnswered(i)) answered++;
  }
  const counterStr = `${answered} / ${total} Terjawab`;
  DOM.examAnsweredCounter.textContent = counterStr;
  if (DOM.desktopMinCounter) DOM.desktopMinCounter.textContent = `${answered}/${total}`;
}

function displayCurrentQuestion() {
  if (!state.activePackage) return;
  const q = state.activePackage.questions[state.currentQIndex];
  if (!q) return;

  // Header badges
  DOM.examQNumberBadge.textContent = `Soal No. ${q.number} dari ${state.activePackage.questions.length}`;

  let typeLabel = 'Pilihan Ganda Tunggal';
  if (q.type === 'multiple') typeLabel = 'Pilihan Ganda Kompleks (MCMA)';
  if (q.type === 'matching') typeLabel = 'Matching Table';
  DOM.examQTypeBadge.textContent = typeLabel;

  // Mobile indicators & Floating Navigation Pill
  if (DOM.mobileCurrentQNum) DOM.mobileCurrentQNum.textContent = q.number;
  if (DOM.mobileDrawerQNum) DOM.mobileDrawerQNum.textContent = q.number;
  if (DOM.floatingQNum) DOM.floatingQNum.textContent = q.number;

  // Find corresponding text for this question
  const texts = state.activePackage.texts || [];
  let currentText = texts.find(t => (t.text_number || t.number) === q.text_number);
  if (!currentText && texts.length > 0) currentText = texts[0];
  const currentTextNum = currentText ? (currentText.text_number || currentText.number || 1) : (q.text_number || 1);
  const currentTitle = currentText ? currentText.title : `Reading Text ${currentTextNum}`;

  // Update question-text link notice so user knows exactly which passage matches this question!
  if (DOM.questionRefTitle) {
    DOM.questionRefTitle.textContent = `Teks ${currentTextNum} (${currentTitle})`;
  }
  if (DOM.passageContextText) {
    DOM.passageContextText.textContent = `Soal No. ${q.number} mengacu pada teks bacaan di bawah ini (Teks ${currentTextNum}):`;
  }

  // Prompt
  DOM.examQPrompt.textContent = q.question || `Bacalah teks yang bersangkutan dan tentukan jawaban yang tepat untuk soal nomor ${q.number}.`;

  // Reading Passage
  renderReadingPassage(q.text_number);

  // Options
  renderOptions(q);

  // Flag buttons
  const isFlagged = state.flaggedQuestions.has(q.number);
  DOM.btnFlagLabel.textContent = isFlagged ? 'Batal Ragu' : 'Ragu';
  DOM.btnFlagQ.classList.toggle('active', isFlagged);
  if (DOM.btnMobileFlag) DOM.btnMobileFlag.classList.toggle('active', isFlagged);

  // Prev / Next button states
  DOM.btnPrevQ.disabled = state.currentQIndex === 0;
  if (DOM.btnMobilePrev) DOM.btnMobilePrev.disabled = state.currentQIndex === 0;

  const isLast = state.currentQIndex === state.activePackage.questions.length - 1;
  DOM.btnNextQ.innerHTML = isLast
    ? 'Selesai <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>'
    : 'Selanjutnya <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>';

  // Update current in navigator grids
  DOM.examNavButtons.querySelectorAll('.q-nav-btn').forEach((btn, idx) => {
    btn.classList.toggle('current', idx === state.currentQIndex);
  });
  if (DOM.mobileDrawerNavButtons) {
    DOM.mobileDrawerNavButtons.querySelectorAll('.q-nav-btn').forEach((btn, idx) => {
      btn.classList.toggle('current', idx === state.currentQIndex);
    });
  }

  // Auto scroll top if enabled
  if (userSettings.autoScroll) {
    const qPanelBody = document.querySelector('.question-panel-body');
    if (qPanelBody) qPanelBody.scrollTop = 0;
  }
}

function renderReadingPassage(textNum) {
  const texts = state.activePackage.texts || [];

  DOM.passageTabs.innerHTML = texts.map((t, i) => {
    const tn = t.text_number || t.number || (i + 1);
    const isAct = tn === textNum || (texts.length === 1 && i === 0);
    return `<button class="text-tab-pill ${isAct ? 'active' : ''}" data-text-num="${tn}">Teks ${tn}</button>`;
  }).join('');

  DOM.passageTabs.querySelectorAll('.text-tab-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const tn = parseInt(pill.getAttribute('data-text-num'), 10);
      renderReadingPassage(tn);
    });
  });

  let currentText = texts.find(t => (t.text_number || t.number) === textNum);
  if (!currentText && texts.length > 0) currentText = texts[0];

  if (currentText) {
    const currentNum = currentText.text_number || currentText.number || 1;
    DOM.passageTitle.textContent = currentText.title || `Reading Text ${currentNum}`;
    
    let paras = [];
    if (typeof currentText.passage === 'string') {
      paras = currentText.passage.split(/\n+/).map(p => p.trim()).filter(p => p.length > 0);
    } else if (Array.isArray(currentText.paragraphs)) {
      paras = currentText.paragraphs;
    }
    
    DOM.passageBody.innerHTML = paras.length > 0 
      ? paras.map(p => `<p class="passage-paragraph">${p}</p>`).join('')
      : '<p class="passage-paragraph">Teks bacaan tersedia untuk soal ini.</p>';
  } else {
    DOM.passageTitle.textContent = 'Reading Passage';
    DOM.passageBody.innerHTML = '<p class="passage-paragraph" style="color: var(--text-muted);">Teks bacaan tersedia langsung pada soal ini.</p>';
  }
}

function renderOptions(q) {
  const container = DOM.examOptionsContainer;
  container.innerHTML = '';
  const currentVal = state.userAnswers[q.number];

  if (q.type === 'matching') {
    const headers = q.options?.headers || ['Pernyataan', 'Kategori A', 'Kategori B'];
    const categories = q.options?.categories || headers.slice(1);
    const statements = q.options?.statements || [];

    const tableWrap = document.createElement('div');
    tableWrap.className = 'matching-table-wrap';

    let html = `
      <table class="matching-table">
        <thead>
          <tr>
            <th>${headers[0] || 'Statements'}</th>
            ${categories.map(c => `<th>${c}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
    `;

    statements.forEach((stmt, sIdx) => {
      const stmtKey = `stmt_${sIdx + 1}`;
      const savedChoice = currentVal ? currentVal[stmtKey] : null;

      html += `
        <tr>
          <td>${stmt}</td>
          ${categories.map(cat => `
            <td>
              <input type="radio" 
                     name="matching_${q.number}_${sIdx}" 
                     class="matching-radio"
                     value="${cat}" 
                     ${savedChoice === cat ? 'checked' : ''}
                     onchange="handleMatchingChange(${q.number}, '${stmtKey}', '${cat}')">
            </td>
          `).join('')}
        </tr>
      `;
    });

    html += '</tbody></table>';
    tableWrap.innerHTML = html;
    container.appendChild(tableWrap);

  } else if (q.type === 'multiple') {
    const opts = q.options || {};
    const selectedArray = Array.isArray(currentVal) ? currentVal : [];

    Object.keys(opts).sort().forEach(letter => {
      const text = opts[letter];
      const isSelected = selectedArray.includes(letter);

      const div = document.createElement('div');
      div.className = `option-item ${isSelected ? 'selected' : ''}`;
      div.innerHTML = `
        <div class="option-indicator">${isSelected ? '✓' : letter}</div>
        <div class="option-text"><strong>(${letter})</strong> ${text}</div>
      `;

      div.addEventListener('click', () => {
        handleMultipleChoiceClick(q.number, letter);
      });

      container.appendChild(div);
    });

  } else {
    const opts = q.options || {};
    Object.keys(opts).sort().forEach(letter => {
      const text = opts[letter];
      const isSelected = currentVal === letter;

      const div = document.createElement('div');
      div.className = `option-item ${isSelected ? 'selected' : ''}`;
      div.innerHTML = `
        <div class="option-indicator">${letter}</div>
        <div class="option-text">${text}</div>
      `;

      div.addEventListener('click', () => {
        handleSingleChoiceClick(q.number, letter);
      });

      container.appendChild(div);
    });
  }
}

function handleSingleChoiceClick(qNum, letter) {
  state.userAnswers[qNum] = letter;
  displayCurrentQuestion();
  updateNavGridButton(qNum);
  updateAnsweredCounter();
}

function handleMultipleChoiceClick(qNum, letter) {
  let cur = state.userAnswers[qNum];
  if (!Array.isArray(cur)) cur = [];

  if (cur.includes(letter)) {
    cur = cur.filter(l => l !== letter);
  } else {
    cur.push(letter);
  }

  state.userAnswers[qNum] = cur;
  displayCurrentQuestion();
  updateNavGridButton(qNum);
  updateAnsweredCounter();
}

function handleMatchingChange(qNum, stmtKey, category) {
  if (!state.userAnswers[qNum] || typeof state.userAnswers[qNum] !== 'object') {
    state.userAnswers[qNum] = {};
  }
  state.userAnswers[qNum][stmtKey] = category;
  updateNavGridButton(qNum);
  updateAnsweredCounter();
}

function updateNavGridButton(qNum) {
  const idx = qNum - 1;
  const updateBtn = (btn) => {
    if (!btn) return;
    btn.classList.remove('answered', 'flagged');
    if (state.flaggedQuestions.has(qNum)) {
      btn.classList.add('flagged');
    } else if (isQuestionAnswered(qNum)) {
      btn.classList.add('answered');
    }
  };

  updateBtn(DOM.examNavButtons.querySelector(`[data-q-index="${idx}"]`));
  if (DOM.mobileDrawerNavButtons) {
    updateBtn(DOM.mobileDrawerNavButtons.querySelector(`[data-q-index="${idx}"]`));
  }
}

function goToQuestion(index) {
  if (index < 0 || index >= state.activePackage.questions.length) return;
  state.currentQIndex = index;
  displayCurrentQuestion();
}

function setupExamControls() {
  DOM.btnPrevQ.addEventListener('click', () => {
    if (state.currentQIndex > 0) goToQuestion(state.currentQIndex - 1);
  });

  DOM.btnNextQ.addEventListener('click', () => {
    if (state.currentQIndex < state.activePackage.questions.length - 1) {
      goToQuestion(state.currentQIndex + 1);
    } else {
      openSubmitModal();
    }
  });

  const toggleFlagCurrent = () => {
    const qNum = state.activePackage.questions[state.currentQIndex].number;
    if (state.flaggedQuestions.has(qNum)) {
      state.flaggedQuestions.delete(qNum);
    } else {
      state.flaggedQuestions.add(qNum);
    }
    displayCurrentQuestion();
    updateNavGridButton(qNum);
  };

  DOM.btnFlagQ.addEventListener('click', toggleFlagCurrent);
  if (DOM.btnMobileFlag) DOM.btnMobileFlag.addEventListener('click', toggleFlagCurrent);

  if (DOM.btnMobilePrev) {
    DOM.btnMobilePrev.addEventListener('click', () => {
      if (state.currentQIndex > 0) goToQuestion(state.currentQIndex - 1);
    });
  }

  if (DOM.btnMobileNext) {
    DOM.btnMobileNext.addEventListener('click', () => {
      if (state.currentQIndex < state.activePackage.questions.length - 1) {
        goToQuestion(state.currentQIndex + 1);
      } else {
        openSubmitModal();
      }
    });
  }

  // Toggle Reading Passage Collapse / Expand
  if (DOM.btnTogglePassage) {
    DOM.btnTogglePassage.addEventListener('click', () => {
      state.passageCollapsed = !state.passageCollapsed;
      DOM.passagePanelContainer.classList.toggle('passage-collapsed', state.passageCollapsed);
      if (DOM.passageCollapseIcon) DOM.passageCollapseIcon.textContent = state.passageCollapsed ? '▼' : '▲';
      if (DOM.passageCollapseLabel) DOM.passageCollapseLabel.textContent = state.passageCollapsed ? 'Bentangkan Teks' : 'Ciutkan Teks';
    });
  }

  // Scroll to Text when tapping "Lihat Teks ↑"
  if (DOM.btnScrollToText) {
    DOM.btnScrollToText.addEventListener('click', () => {
      if (state.passageCollapsed) {
        state.passageCollapsed = false;
        DOM.passagePanelContainer.classList.remove('passage-collapsed');
        if (DOM.passageCollapseIcon) DOM.passageCollapseIcon.textContent = '▲';
        if (DOM.passageCollapseLabel) DOM.passageCollapseLabel.textContent = 'Ciutkan Teks';
      }
      DOM.passagePanelContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // Desktop Navigator Minimize / Expand
  if (DOM.btnToggleNavDesktop) {
    DOM.btnToggleNavDesktop.addEventListener('click', () => {
      state.desktopNavCollapsed = !state.desktopNavCollapsed;
      DOM.examWorkspaceContainer.classList.toggle('nav-collapsed', state.desktopNavCollapsed);
      if (DOM.desktopNavCollapseIcon) {
        DOM.desktopNavCollapseIcon.textContent = state.desktopNavCollapsed ? '❮' : '❯';
      }
    });
  }
  if (DOM.btnExpandNavDesktop) {
    DOM.btnExpandNavDesktop.addEventListener('click', () => {
      state.desktopNavCollapsed = false;
      DOM.examWorkspaceContainer.classList.remove('nav-collapsed');
      if (DOM.desktopNavCollapseIcon) DOM.desktopNavCollapseIcon.textContent = '❯';
    });
  }

  // Mobile Question Drawer Toggle (from bottom bar and inline header)
  const openQuestionDrawer = () => {
    DOM.examNavDrawerModal.classList.add('active');
  };
  if (DOM.btnMobileDrawerToggle) {
    DOM.btnMobileDrawerToggle.addEventListener('click', openQuestionDrawer);
  }
  if (DOM.btnOpenDrawerInline) {
    DOM.btnOpenDrawerInline.addEventListener('click', openQuestionDrawer);
  }
  if (DOM.btnCloseDrawer) {
    DOM.btnCloseDrawer.addEventListener('click', () => {
      DOM.examNavDrawerModal.classList.remove('active');
    });
  }

  // Mobile Bottom Bar Minimize / Restore
  if (DOM.btnMinimizeMobileBar) {
    DOM.btnMinimizeMobileBar.addEventListener('click', () => {
      state.mobileBarMinimized = true;
      DOM.examMobileBottomBar.classList.add('bar-minimized');
      DOM.btnRestoreMobileBar.classList.add('active');
      showToast('Navigasi bawah diciutkan. Ketuk tombol melayang untuk membuka kembali.', 'info');
    });
  }
  if (DOM.btnRestoreMobileBar) {
    DOM.btnRestoreMobileBar.addEventListener('click', () => {
      state.mobileBarMinimized = false;
      DOM.examMobileBottomBar.classList.remove('bar-minimized');
      DOM.btnRestoreMobileBar.classList.remove('active');
    });
  }

  document.getElementById('btn-quit-exam').addEventListener('click', () => {
    if (confirm('Keluar dari ujian ini? Jawaban belum dinilai dan sesi akan dibatalkan.')) {
      clearInterval(state.examTimerInterval);
      switchView('packages');
    }
  });

  document.getElementById('btn-open-submit-modal').addEventListener('click', openSubmitModal);

  document.getElementById('btn-modal-cancel').addEventListener('click', () => {
    DOM.submitModal.classList.remove('active');
  });

  document.getElementById('btn-modal-confirm-submit').addEventListener('click', () => {
    DOM.submitModal.classList.remove('active');
    submitExam();
  });

  // Font size +/-
  DOM.btnFontInc.addEventListener('click', () => {
    userSettings.fontSize = Math.min(1.4, userSettings.fontSize + 0.08);
    DOM.passageContentArea.style.fontSize = `${userSettings.fontSize}rem`;
    saveUserSettings();
  });

  DOM.btnFontDec.addEventListener('click', () => {
    userSettings.fontSize = Math.max(0.85, userSettings.fontSize - 0.08);
    DOM.passageContentArea.style.fontSize = `${userSettings.fontSize}rem`;
    saveUserSettings();
  });
}

function openSubmitModal() {
  if (!state.activePackage) return;
  const total = state.activePackage.questions.length;
  let answered = 0;
  for (let i = 1; i <= total; i++) {
    if (isQuestionAnswered(i)) answered++;
  }
  const unanswered = total - answered;

  let msg = `Kamu telah menjawab <strong>${answered} dari ${total} soal</strong>.`;
  if (unanswered > 0) {
    msg += `<br><span style="color: var(--accent-amber);">⚠️ Masih ada <strong>${unanswered} soal</strong> yang belum dijawab!</span>`;
  } else {
    msg += `<br><span style="color: var(--accent-emerald);">Semua soal telah dijawab lengkap!</span>`;
  }
  msg += `<br><br>Yakin ingin menyelesaikan ujian sekarang?`;

  DOM.modalSubmitSummary.innerHTML = msg;
  DOM.submitModal.classList.add('active');
}

async function submitExam() {
  clearInterval(state.examTimerInterval);

  try {
    showToast('Mengirim dan menilai jawaban...', 'info');

    let result = null;

    // Try posting to backend
    try {
      const res = await fetch(`/api/packages/${state.activePackage.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: state.userAnswers,
          time_spent: state.examTimeSpent
        })
      });
      if (res.ok) result = await res.json();
    } catch {
      // Fallback to client-side evaluation
    }

    // Client-side Grading Fallback (Offline / Vercel Static)
    if (!result) {
      result = gradeExamClientSide(state.activePackage, state.userAnswers, state.examTimeSpent);
    }

    // Save locally for offline tracking
    saveLocalAttempt({
      id: result.attempt_id || Date.now(),
      package_id: state.activePackage.id,
      package_name: state.activePackage.name,
      score: result.score,
      correct: result.correct,
      wrong: result.wrong,
      total: result.total,
      time_spent: state.examTimeSpent,
      answers: state.userAnswers,
      created_at: new Date().toISOString()
    });

    state.lastAttemptResult = result;
    renderResultView(result);
    switchView('result');
    showToast('Ujian selesai dievaluasi!', 'success');

  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

function gradeExamClientSide(pkg, answers, timeSpent) {
  const fullQuestions = pkg.full_questions || pkg.questions;
  let correct = 0;
  let wrong = 0;
  const results = [];

  for (const q of fullQuestions) {
    const userAns = answers[q.number];
    const key = q.answer_key;
    let isCorrect = false;

    if (!key) {
      results.push({ ...q, user_answer: userAns, is_correct: null });
      continue;
    }

    if (q.type === 'single') {
      const expected = Array.isArray(key) ? key[0] : key;
      isCorrect = userAns === expected;
    } else if (q.type === 'multiple') {
      if (Array.isArray(userAns) && Array.isArray(key)) {
        const s1 = [...userAns].sort();
        const s2 = [...key].sort();
        isCorrect = s1.length === s2.length && s1.every((v, i) => v === s2[i]);
      }
    } else if (q.type === 'matching') {
      if (userAns && typeof userAns === 'object' && typeof key === 'object') {
        const keys = Object.keys(key);
        isCorrect = keys.every(k => {
          const exp = key[k]?.category || key[k];
          return userAns[k] === exp;
        });
      }
    }

    if (isCorrect) correct++;
    else wrong++;

    results.push({
      number: q.number,
      type: q.type,
      text_number: q.text_number,
      question: q.question,
      options: q.options,
      user_answer: userAns,
      correct_answer: key,
      is_correct: isCorrect,
      explanation: q.explanation || ''
    });
  }

  const total = correct + wrong;
  const score = total > 0 ? Math.round((correct / total) * 100) : 0;

  return {
    attempt_id: Date.now(),
    score,
    correct,
    wrong,
    total,
    results
  };
}

// ===================================================================
// RESULT & REVIEW LOGIC
// ===================================================================
function renderResultView(result) {
  DOM.resultPackageName.textContent = state.activePackage.name;
  DOM.resultScoreValue.textContent = result.score;
  DOM.resultCorrectCount.textContent = result.correct;
  DOM.resultWrongCount.textContent = result.wrong;
  DOM.resultTotalCount.textContent = result.total;

  const m = Math.floor(state.examTimeSpent / 60);
  const s = state.examTimeSpent % 60;
  DOM.resultTimeSpent.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  const offset = 264 - (264 * result.score) / 100;
  DOM.resultScoreCircle.style.strokeDashoffset = offset;

  let badgeText = '💪 Perlu Latihan Lebih';
  let badgeBg = 'var(--accent-rose-subtle)';
  let badgeColor = '#fb7185';

  if (result.score >= 90) {
    badgeText = '🌟 Luar Biasa (Mastery)';
    badgeBg = 'var(--accent-emerald-subtle)';
    badgeColor = '#34d399';
  } else if (result.score >= 75) {
    badgeText = '👍 Sangat Bagus (Kompeten)';
    badgeBg = 'var(--accent-subtle)';
    badgeColor = '#38bdf8';
  } else if (result.score >= 60) {
    badgeText = '📈 Cukup Baik';
    badgeBg = 'var(--accent-amber-subtle)';
    badgeColor = '#fbbf24';
  }

  DOM.resultStatusBadge.textContent = badgeText;
  DOM.resultStatusBadge.style.background = badgeBg;
  DOM.resultStatusBadge.style.color = badgeColor;
}

function setupResultAndReviewControls() {
  document.getElementById('btn-view-detailed-review').addEventListener('click', () => {
    if (state.lastAttemptResult) {
      if (state.lastAttemptResult.results) {
        state.activeReviewData = {
          package_name: state.activePackage ? state.activePackage.name : 'Review Ujian',
          attempt: { package_id: state.activePackage ? state.activePackage.id : 1 },
          results: state.lastAttemptResult.results
        };
        renderReviewItems();
        switchView('review');
      } else if (state.lastAttemptResult.attempt_id) {
        openAttemptReview(state.lastAttemptResult.attempt_id);
      }
    }
  });

  document.getElementById('btn-retry-package').addEventListener('click', () => {
    if (state.activePackage) {
      startExam(state.activePackage.id);
    }
  });

  document.getElementById('btn-back-to-dash').addEventListener('click', () => switchView('dashboard'));
  document.getElementById('btn-review-back-dash').addEventListener('click', () => switchView('dashboard'));

  DOM.reviewFilterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      DOM.reviewFilterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.reviewFilter = btn.getAttribute('data-review-filter');
      renderReviewItems();
    });
  });
}

async function openAttemptReview(attemptId) {
  try {
    showToast('Memuat pembahasan soal...', 'info');

    let data = null;
    try {
      const res = await fetch(`/api/review/${attemptId}`);
      if (res.ok) data = await res.json();
    } catch {
      // Local fallback
    }

    if (!data) {
      const localAttempts = getLocalAttempts();
      const att = localAttempts.find(a => a.id === attemptId) || localAttempts[0];
      if (att && state.lastAttemptResult?.results) {
        data = {
          package_name: att.package_name,
          attempt: att,
          results: state.lastAttemptResult.results
        };
      }
    }

    if (!data) throw new Error('Data pembahasan tidak ditemukan');

    state.activeReviewData = data;
    state.reviewFilter = 'all';

    DOM.reviewTitleHeading.textContent = `Pembahasan: ${data.package_name}`;
    DOM.reviewFilterButtons.forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-review-filter') === 'all');
    });

    renderReviewItems();
    switchView('review');

  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

function renderReviewItems() {
  if (!state.activeReviewData) return;
  const results = state.activeReviewData.results || [];

  const filtered = results.filter(r => {
    if (state.reviewFilter === 'correct') return r.is_correct === true;
    if (state.reviewFilter === 'wrong') return r.is_correct === false;
    return true;
  });

  if (filtered.length === 0) {
    DOM.reviewItemsContainer.innerHTML = `
      <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
        Tidak ada soal untuk filter yang dipilih.
      </div>
    `;
    return;
  }

  DOM.reviewItemsContainer.innerHTML = filtered.map(r => {
    const isCorrect = r.is_correct;
    const cardClass = isCorrect ? 'correct' : 'wrong';
    const statusPill = isCorrect
      ? '<span class="score-pill high">✓ Benar</span>'
      : '<span class="score-pill low">✗ Salah</span>';

    let userAnsText = '<em>Tidak dijawab</em>';
    if (r.user_answer) {
      if (typeof r.user_answer === 'object') {
        userAnsText = JSON.stringify(r.user_answer, null, 1).replace(/[{}"]/g, '');
      } else if (Array.isArray(r.user_answer)) {
        userAnsText = r.user_answer.join(', ');
      } else {
        userAnsText = String(r.user_answer);
      }
    }

    let correctAnsText = '<em>Tidak tersedia</em>';
    if (r.correct_answer) {
      if (typeof r.correct_answer === 'object') {
        correctAnsText = JSON.stringify(r.correct_answer, null, 1).replace(/[{}"]/g, '');
      } else if (Array.isArray(r.correct_answer)) {
        correctAnsText = r.correct_answer.join(', ');
      } else {
        correctAnsText = String(r.correct_answer);
      }
    }

    return `
      <div class="review-item-card ${cardClass}">
        <div class="review-header">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <span style="font-weight: 700; color: #fff;">Soal #${r.number}</span>
            <span class="question-type-tag">${r.type}</span>
          </div>
          <div>${statusPill}</div>
        </div>

        <div style="font-size: 0.98rem; font-weight: 600; margin-bottom: 0.85rem; color: var(--text-main);">
          ${r.question || `(Soal Teks ${r.text_number})`}
        </div>

        <div class="review-answers-box">
          <div>
            <div class="answer-label" style="color: ${isCorrect ? 'var(--accent-emerald)' : 'var(--accent-rose)'};">
              Jawaban Kamu:
            </div>
            <div style="font-size: 0.92rem; font-weight: 700; color: #fff;">
              ${userAnsText}
            </div>
          </div>
          <div>
            <div class="answer-label" style="color: var(--accent-emerald);">
              Kunci Jawaban Resmi:
            </div>
            <div style="font-size: 0.92rem; font-weight: 700; color: var(--accent-emerald);">
              ${correctAnsText}
            </div>
          </div>
        </div>

        ${r.explanation ? `
          <div class="explanation-box">
            <div class="explanation-title">
              💡 Pembahasan & Analisis:
            </div>
            ${r.explanation}
          </div>
        ` : ''}

        <div style="margin-top: 0.85rem; display: flex; justify-content: flex-end;">
          <button class="btn btn-secondary btn-sm" onclick="saveBookmark(${state.activeReviewData.attempt ? state.activeReviewData.attempt.package_id : 1}, ${r.number})">
            🔖 Simpan ke Catatan
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// ===================================================================
// BOOKMARKS LOGIC
// ===================================================================
async function saveBookmark(packageId, qNum) {
  const note = prompt('Tambahkan catatan untuk soal ini (opsional):', '');
  if (note === null) return;

  saveLocalBookmark(packageId, qNum, note);

  // Sync to API if available
  try {
    fetch('/api/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ package_id: packageId, question_number: qNum, note: note || '' })
    }).catch(() => {});
  } catch {}

  showToast(`Soal #${qNum} disimpan ke Catatan!`, 'success');
}

async function loadBookmarks() {
  let bookmarks = null;
  try {
    const res = await fetch('/api/bookmarks');
    if (res.ok) bookmarks = await res.json();
  } catch {}

  if (!bookmarks) {
    bookmarks = getLocalBookmarks();
  }

  renderBookmarks(bookmarks);
}

function renderBookmarks(bookmarks) {
  if (bookmarks.length === 0) {
    DOM.bookmarksContainer.innerHTML = `
      <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
        <p style="font-size: 1rem; margin-bottom: 0.35rem;">Belum ada soal yang kamu tandai.</p>
        <p style="font-size: 0.85rem;">Tandai soal sulit saat melihat pembahasan untuk dipelajari kembali nanti.</p>
      </div>
    `;
    return;
  }

  DOM.bookmarksContainer.innerHTML = bookmarks.map(bm => {
    return `
      <div class="review-item-card" style="border-left: 3px solid var(--accent-amber);">
        <div class="review-header">
          <div style="font-weight: 700; color: #fff;">
            Paket #${bm.package_id} - Soal Nomor ${bm.question_number}
          </div>
          <button class="btn btn-danger btn-sm" onclick="deleteBookmark(${bm.package_id}, ${bm.question_number})">
            Hapus
          </button>
        </div>
        ${bm.note ? `
          <div style="margin-top: 0.4rem; font-size: 0.88rem; color: var(--text-secondary); background: var(--bg-app); padding: 0.65rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
            <strong>Catatan:</strong> ${bm.note}
          </div>
        ` : ''}
        <div style="margin-top: 0.85rem;">
          <button class="btn btn-primary btn-sm" onclick="startExam(${bm.package_id})">
            Buka Paket Ini
          </button>
        </div>
      </div>
    `;
  }).join('');
}

async function deleteBookmark(packageId, qNum) {
  if (!confirm(`Hapus soal #${qNum} dari daftar tersimpan?`)) return;

  deleteLocalBookmark(packageId, qNum);
  try {
    fetch(`/api/bookmarks/${packageId}/${qNum}`, { method: 'DELETE' }).catch(() => {});
  } catch {}

  showToast('Soal dihapus dari daftar tersimpan', 'info');
  loadBookmarks();
}

async function viewPackageHistory(packageId) {
  try {
    const res = await fetch(`/api/attempts/${packageId}`);
    if (res.ok) {
      const attempts = await res.json();
      if (attempts.length > 0) {
        openAttemptReview(attempts[0].id);
        return;
      }
    }
  } catch {}

  const localAttempts = getLocalAttempts().filter(a => a.package_id === packageId);
  if (localAttempts.length > 0) {
    openAttemptReview(localAttempts[0].id);
  } else {
    showToast('Belum ada riwayat pengerjaan untuk paket ini. Klik "Mulai Ujian" untuk mencoba!', 'info');
  }
}

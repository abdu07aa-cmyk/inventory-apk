/**
 * js/main.js
 * - Entry point aplikasi WarungKita PRO MAX
 * - Inisialisasi modul (products, cart, charts), binding UI global, routing ringan, dan event glue
 *
 * Prinsip:
 * - Minimal DOM-manipulation di sini; rendering detail didelegasikan ke modul.
 * - Menggunakan event-driven flow: modul memancarkan event global saat perlu.
 */

import productsModule from './modules/products.js';
import cartModule from './modules/cart.js';
import charts from './charts.js';
import state from './state.js';
import api from './api.js';
import utils from './utils.js';
import { APP_CONFIG } from './config.js';
import { initOffline } from './features/offline.js';

/* Helper: simple route switch by data-route attribute */
function showView(route) {
  // Hide all .view then show the one with id = view-<route>
  const views = document.querySelectorAll('.view');
  views.forEach(v => v.hidden = true);
  const active = document.querySelector(`#view-${route}`);
  if (active) {
    active.hidden = false;
    // Focus main content for accessibility
    active.querySelector('input, button, [tabindex]')?.focus();
  }

  // Toggle active link
  document.querySelectorAll('.nav-main a').forEach(a => {
    a.classList.toggle('active', a.dataset.route === route);
  });
}

/* Bind navigation links in sidebar */
function bindNavigation() {
  document.querySelectorAll('.nav-main a[data-route]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const route = a.dataset.route;
      showView(route);
      // Update history (optional)
      history.pushState({ route }, '', `#${route}`);
    });
  });

  // handle back/forward
  window.addEventListener('popstate', (ev) => {
    const route = (ev.state && ev.state.route) || location.hash.replace('#', '') || 'dashboard';
    showView(route);
  });
}

/* Theme toggle handling */
function initThemeToggle() {
  const btn = document.getElementById('toggle-theme');
  const body = document.body;
  // Apply saved theme from state
  const theme = state.getState().settings?.theme || APP_CONFIG.defaultTheme || 'light';
  body.setAttribute('data-theme', theme);

  // Update aria-pressed and icon state if needed
  if (btn) {
    btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    btn.addEventListener('click', () => {
      const current = body.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      body.setAttribute('data-theme', next);
      btn.setAttribute('aria-pressed', next === 'dark' ? 'true' : 'false');
      // Persist to state
      state.setState({ settings: { ...(state.getState().settings || {}), theme: next } });
      utils.toast(`Mode ${next === 'dark' ? 'gelap' : 'terang'} diaktifkan`, { type: 'info' });
    });
  }
}

/* Sidebar toggle for small screens */
function initSidebarToggle() {
  const openBtn = document.getElementById('open-sidebar');
  const appLayout = document.querySelector('.app-layout');
  if (!openBtn || !appLayout) return;
  openBtn.addEventListener('click', () => {
    appLayout.classList.toggle('sidebar-open');
  });
  // Close sidebar when clicking outside (mobile)
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.sidebar') && !e.target.closest('#open-sidebar')) {
      appLayout.classList.remove('sidebar-open');
    }
  });
}

/* Global search (simple) */
function initGlobalSearch() {
  const input = document.getElementById('global-search');
  if (!input) return;
  input.addEventListener('input', utils.debounce((e) => {
    const q = e.target.value;
    if (!q) return;
    // Navigate to products view and apply filter via dispatch to products module
    showView('products');
    // If there's a filter input in toolbar, set its value and trigger input event (so products module handles it)
    const toolbarInput = document.querySelector('#products-toolbar input[type="search"], #products-filter');
    if (toolbarInput) {
      toolbarInput.value = q;
      toolbarInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, 220));
}

/* Initialize sales chart and keep it in sync with transactions state */
let salesChartInstance = null;
async function initCharts() {
  const canvas = document.getElementById('chart-sales');
  if (!canvas) return;
  salesChartInstance = charts.initSalesChart(canvas);
  // Load transactions from API or state and update chart
  try {
    const txs = await api.list('transactions');
    // If returned, ensure state updated
    if (Array.isArray(txs)) {
      state.setState({ transactions: txs });
    }
  } catch (err) {
    // ignore — state might already have local transactions
    console.warn('Tidak bisa load transactions untuk chart, gunakan data lokal', err);
  }
  // initial update
  const series = charts.transactionsToSeries(state.getState().transactions || []);
  charts.updateSalesChart(series);

  // subscribe to state changes for transactions
  state.addEventListener('state:changed', (ev) => {
    const st = ev.detail;
    if (!st) return;
    const series2 = charts.transactionsToSeries(st.transactions || []);
    charts.updateSalesChart(series2);
  });
}

/* Bind misc UI items (current year in footer, profile actions) */
function bindMiscUI() {
  const y = document.getElementById('current-year');
  if (y) y.textContent = new Date().getFullYear();
  // Notifications button
  const btnNotif = document.getElementById('btn-notifications');
  if (btnNotif) btnNotif.addEventListener('click', () => {
    utils.toast('Belum ada notifikasi', { type: 'info' });
  });
}

/* Handle transaction created event (receipt, nav, etc) */
function bindTransactionEvents() {
  window.addEventListener('warungkita:transaction:created', (e) => {
    const payload = e.detail?.tx;
    utils.toast('Transaksi berhasil dibuat', { type: 'success' });
    // buka view transaksi
    showView('transactions');
    // (Placeholder) open receipt modal via custom event; modules/payment.js atau receipt module dapat listen
    window.dispatchEvent(new CustomEvent('warungkita:receipt:show', { detail: { tx: payload } }));
  });
}

/* App initialization */
async function initApp() {
  // Init UI bindings
  bindNavigation();
  initThemeToggle();
  initSidebarToggle();
  initGlobalSearch();
  bindMiscUI();

  // Initialize modules
  productsModule.initProducts({ listSelector: '#products-list', posSelector: '#pos-products', toolbarSelector: '#products-toolbar' });
  cartModule.initCart({ selector: '#pos-cart' });

  // Init charts
  await initCharts();

  // Bind transaction events
  bindTransactionEvents();

  // Init offline manager (sync)
  initOffline();

  // Apply route from URL hash if present
  const initialRoute = location.hash.replace('#', '') || 'dashboard';
  showView(initialRoute);
}

/* Wait DOMContentLoaded then init */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

/* Export for debugging/testing */
export default {
  initApp,
  showView
};

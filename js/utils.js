/**
 * js/utils.js
 * - Utility helpers umum untuk aplikasi WarungKita
 * - Termasuk: format uang, debounce, toast sederhana, download CSV/Excel, UUID, DOM helpers
 * - Ditulis dalam Bahasa Indonesia dan sebagai modul ES.
 */

import { APP_CONFIG, formatCurrency as cfgFormatCurrency } from './config.js';

/* Format uang: wrapper yang menggunakan config atau fallback */
export function formatCurrency(value, locale = APP_CONFIG.locale, currency = APP_CONFIG.currency) {
  // jika consumer ingin override, bisa memanggil sendiri
  try {
    if (typeof cfgFormatCurrency === 'function') {
      // cfgFormatCurrency menggunakan APP_CONFIG, tapi kita tetap defensif
      return cfgFormatCurrency(value);
    }
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
  } catch (e) {
    return `Rp ${Number(value).toLocaleString('id-ID')}`;
  }
}

/* Debounce & Throttle */
export function debounce(fn, wait = 200) {
  let t;
  return function debounced(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}
export function throttle(fn, wait = 200) {
  let last = 0;
  return function throttled(...args) {
    const now = Date.now();
    if (now - last >= wait) {
      last = now;
      fn.apply(this, args);
    }
  };
}

/* Simple UUID (v4-like) untuk id lokal */
export function uid(prefix = '') {
  return prefix + 'xxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/* DOM helper: create element dari HTML string */
export function createElementFromHTML(htmlString) {
  const template = document.createElement('template');
  htmlString = htmlString.trim();
  template.innerHTML = htmlString;
  return template.content.firstChild;
}

/* Simple toast system (non-blocking). Menggunakan #toast-root DOM node jika ada, else buatnya. */
let toastRoot = null;
function ensureToastRoot() {
  if (toastRoot) return toastRoot;
  toastRoot = document.getElementById('toast-root');
  if (!toastRoot) {
    toastRoot = document.createElement('div');
    toastRoot.id = 'toast-root';
    toastRoot.style.position = 'fixed';
    toastRoot.style.right = '16px';
    toastRoot.style.bottom = '16px';
    toastRoot.style.zIndex = String(1100);
    toastRoot.style.display = 'flex';
    toastRoot.style.flexDirection = 'column';
    toastRoot.style.gap = '8px';
    document.body.appendChild(toastRoot);
  }
  return toastRoot;
}
export function toast(message = '', { type = 'info', duration = 3000 } = {}) {
  const root = ensureToastRoot();
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.style.background = 'rgba(0,0,0,0.8)';
  el.style.color = 'white';
  el.style.padding = '8px 12px';
  el.style.borderRadius = '8px';
  el.style.boxShadow = '0 6px 18px rgba(0,0,0,0.2)';
  el.style.fontSize = '14px';
  el.style.maxWidth = '320px';
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity 200ms ease, transform 200ms ease';
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    setTimeout(() => el.remove(), 220);
  }, duration);
  return el;
}

/* CSV / Excel (basic) helpers */
function arrayToCsv(rows = [], delimiter = ',') {
  // rows: array of arrays or array of objects
  if (!rows || !rows.length) return '';
  const isObjects = typeof rows[0] === 'object' && !Array.isArray(rows[0]);
  let headers = [];
  let dataRows = [];
  if (isObjects) {
    headers = Object.keys(rows[0]);
    dataRows = rows.map(r => headers.map(h => escapeCsv(String(r[h] ?? ''))));
  } else {
    dataRows = rows.map(row => row.map(cell => escapeCsv(String(cell ?? ''))));
  }
  const headerLine = isObjects ? headers.join(delimiter) : '';
  const lines = [
    ...(headerLine ? [headerLine] : []),
    ...dataRows.map(r => r.join(delimiter))
  ];
  return lines.join('\r\n');
}
function escapeCsv(val) {
  if (val == null) return '';
  if (val.includes('"') || val.includes(',') || val.includes('\n') || val.includes('\r')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

/* Download file helper */
export function downloadFile(filename, content, mime = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 500);
}

/* Public: export CSV from array of objects */
export function exportCsv(filename = 'export.csv', rows = []) {
  const csv = arrayToCsv(rows, ',');
  downloadFile(filename, csv, 'text/csv;charset=utf-8;');
}

/* Lightweight "export to Excel" by generating CSV and using .xls extension (works in many clients) */
export function exportXlsLike(filename = 'export.xls', rows = []) {
  // Note: This is a heuristic and not a real xlsx. For true excel files use libraries like SheetJS.
  const csv = arrayToCsv(rows, '\t');
  downloadFile(filename, csv, 'application/vnd.ms-excel;charset=utf-8;');
}

/* Simple CSV import parser (very naive, for small files) */
export function parseCsv(text, delimiter = ',') {
  // NOTE: Ini parser minimal yang tidak menangani semua edge-case CSV (quoted newlines complex)
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(delimiter).map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const cols = line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = cols[i] ?? ''; });
    return obj;
  });
  return rows;
}

/* Small validators */
export function isNumeric(val) {
  return !Number.isNaN(Number(val));
}
export function isPhoneNumber(str) {
  // very basic check (Indonesia)
  if (!str) return false;
  const s = String(str).replace(/\s+/g, '');
  return /^(\+62|62|0)[0-9]{6,13}$/.test(s);
}
export function validateBarcode(code) {
  // Accept numeric or alphanumeric typical barcodes
  return /^[0-9A-Za-z\-_.]+$/.test(String(code));
}

/* Sleep helper */
export function sleep(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* Exports default utilities */
export default {
  formatCurrency,
  debounce,
  throttle,
  uid,
  createElementFromHTML,
  toast,
  exportCsv,
  exportXlsLike,
  parseCsv,
  isNumeric,
  isPhoneNumber,
  validateBarcode,
  sleep,
  downloadFile
};

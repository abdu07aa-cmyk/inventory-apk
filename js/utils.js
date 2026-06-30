/**
 * ================================================================
 * WARUNGKITA PRO MAX - UTILITY FUNCTIONS
 * ================================================================
 * Kumpulan fungsi helper yang digunakan di seluruh aplikasi.
 * ================================================================
 */

import { APP_CONFIG } from './config.js';

// ================================================================
// FORMATTING
// ================================================================

/**
 * Format angka ke mata uang Rupiah
 * @param {number} amount - Jumlah yang akan diformat
 * @param {boolean} withSymbol - Tampilkan simbol Rp
 * @returns {string} Format mata uang
 */
export function formatCurrency(amount, withSymbol = true) {
    const formatted = new Intl.NumberFormat(APP_CONFIG.locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount || 0);

    return withSymbol ? `Rp ${formatted}` : formatted;
}

/**
 * Format tanggal ke format lokal Indonesia
 * @param {string|Date} date - Tanggal yang akan diformat
 * @param {Object} options - Opsi format
 * @returns {string} Format tanggal
 */
export function formatDate(date, options = {}) {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '-';

    const defaultOptions = {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };

    return new Intl.DateTimeFormat(APP_CONFIG.locale, {
        ...defaultOptions,
        ...options
    }).format(d);
}

/**
 * Format tanggal pendek
 * @param {string|Date} date - Tanggal
 * @returns {string} Format tanggal pendek
 */
export function formatDateShort(date) {
    return formatDate(date, {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

/**
 * Format waktu
 * @param {string|Date} date - Tanggal
 * @returns {string} Format waktu
 */
export function formatTime(date) {
    return formatDate(date, {
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Format durasi dalam menit
 * @param {number} minutes - Jumlah menit
 * @returns {string} Format durasi
 */
export function formatDuration(minutes) {
    if (minutes < 60) return `${minutes} menit`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} jam ${mins > 0 ? mins + ' menit' : ''}`;
}

/**
 * Format nomor telepon
 * @param {string} phone - Nomor telepon
 * @returns {string} Format telepon
 */
export function formatPhone(phone) {
    if (!phone) return '-';
    return phone.replace(/(\d{4})(\d{4})(\d{4})/, '$1-$2-$3');
}

/**
 * Format barcode (tampilkan hanya beberapa digit pertama dan terakhir)
 * @param {string} barcode - Kode barcode
 * @returns {string} Format barcode
 */
export function formatBarcode(barcode) {
    if (!barcode) return '-';
    if (barcode.length <= 8) return barcode;
    return `${barcode.slice(0, 4)}...${barcode.slice(-4)}`;
}

// ================================================================
// GENERATORS
// ================================================================

/**
 * Generate ID unik
 * @param {string} prefix - Prefix ID (optional)
 * @returns {string} ID unik
 */
export function generateId(prefix = '') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    const id = `${timestamp}${random}`.toUpperCase();
    return prefix ? `${prefix}-${id}` : id;
}

/**
 * Generate barcode acak
 * @param {number} length - Panjang barcode
 * @returns {string} Barcode
 */
export function generateBarcode(length = 13) {
    let barcode = '';
    for (let i = 0; i < length; i++) {
        barcode += Math.floor(Math.random() * 10);
    }
    return barcode;
}

/**
 * Generate nomor invoice
 * @returns {string} Nomor invoice
 */
export function generateInvoiceNumber() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `INV-${year}${month}${day}-${random}`;
}

// ================================================================
// STORAGE
// ================================================================

/**
 * Simpan data ke localStorage
 * @param {string} key - Kunci penyimpanan
 * @param {*} data - Data yang akan disimpan
 */
export function saveToStorage(key, data) {
    try {
        const serialized = JSON.stringify(data);
        localStorage.setItem(key, serialized);
    } catch (error) {
        console.error(`Failed to save to localStorage (${key}):`, error);
    }
}

/**
 * Load data dari localStorage
 * @param {string} key - Kunci penyimpanan
 * @param {*} defaultValue - Nilai default jika data tidak ditemukan
 * @returns {*} Data yang dimuat
 */
export function loadFromStorage(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
        console.error(`Failed to load from localStorage (${key}):`, error);
        return defaultValue;
    }
}

/**
 * Hapus data dari localStorage
 * @param {string} key - Kunci penyimpanan
 */
export function removeFromStorage(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error(`Failed to remove from localStorage (${key}):`, error);
    }
}

// ================================================================
// VALIDATION
// ================================================================

/**
 * Validasi apakah string adalah email valid
 * @param {string} email - Email yang divalidasi
 * @returns {boolean} True jika valid
 */
export function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Validasi apakah string adalah nomor telepon valid (Indonesia)
 * @param {string} phone - Nomor telepon
 * @returns {boolean} True jika valid
 */
export function isValidPhone(phone) {
    const regex = /^(\+62|0)[0-9]{9,13}$/;
    return regex.test(phone.replace(/[\s-]/g, ''));
}

/**
 * Validasi apakah string adalah barcode valid
 * @param {string} barcode - Kode barcode
 * @returns {boolean} True jika valid
 */
export function isValidBarcode(barcode) {
    return /^[0-9]{8,20}$/.test(barcode);
}

/**
 * Validasi apakah nilai adalah angka positif
 * @param {number} value - Nilai yang divalidasi
 * @returns {boolean} True jika valid
 */
export function isPositiveNumber(value) {
    return typeof value === 'number' && value > 0 && isFinite(value);
}

// ================================================================
// STRING HELPERS
// ================================================================

/**
 * Memotong string dengan ellipsis
 * @param {string} str - String yang dipotong
 * @param {number} maxLength - Panjang maksimum
 * @returns {string} String yang dipotong
 */
export function truncate(str, maxLength = 30) {
    if (!str) return '';
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength) + '...';
}

/**
 * Capitalize first letter
 * @param {string} str - String
 * @returns {string} String dengan huruf pertama kapital
 */
export function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Title case (setiap kata kapital)
 * @param {string} str - String
 * @returns {string} String dalam title case
 */
export function titleCase(str) {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(word => capitalize(word)).join(' ');
}

/**
 * Slugify string untuk URL
 * @param {string} str - String
 * @returns {string} Slug
 */
export function slugify(str) {
    if (!str) return '';
    return str
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

// ================================================================
// NUMBER HELPERS
// ================================================================

/**
 * Round angka ke desimal tertentu
 * @param {number} num - Angka
 * @param {number} decimals - Jumlah desimal
 * @returns {number} Angka yang dibulatkan
 */
export function round(num, decimals = 0) {
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
}

/**
 * Clamp angka dalam rentang tertentu
 * @param {number} num - Angka
 * @param {number} min - Nilai minimum
 * @param {number} max - Nilai maksimum
 * @returns {number} Angka yang sudah di-clamp
 */
export function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
}

/**
 * Format persentase
 * @param {number} value - Nilai
 * @param {number} decimals - Jumlah desimal
 * @returns {string} Format persentase
 */
export function formatPercent(value, decimals = 1) {
    return `${round(value, decimals)}%`;
}

// ================================================================
// ARRAY HELPERS
// ================================================================

/**
 * Group array berdasarkan key
 * @param {Array} array - Array yang akan digroup
 * @param {string} key - Key untuk grouping
 * @returns {Object} Object dengan grouped data
 */
export function groupBy(array, key) {
    return array.reduce((result, item) => {
        const groupKey = item[key] || 'undefined';
        if (!result[groupKey]) {
            result[groupKey] = [];
        }
        result[groupKey].push(item);
        return result;
    }, {});
}

/**
 * Sum array berdasarkan key
 * @param {Array} array - Array
 * @param {string} key - Key untuk di-sum
 * @returns {number} Total sum
 */
export function sumBy(array, key) {
    return array.reduce((sum, item) => sum + (item[key] || 0), 0);
}

/**
 * Sort array dengan safety
 * @param {Array} array - Array yang akan di-sort
 * @param {string} key - Key untuk sorting
 * @param {boolean} ascending - Ascending/descending
 * @returns {Array} Array yang sudah di-sort
 */
export function sortBy(array, key, ascending = true) {
    return [...array].sort((a, b) => {
        const valA = a[key] || 0;
        const valB = b[key] || 0;
        if (valA < valB) return ascending ? -1 : 1;
        if (valA > valB) return ascending ? 1 : -1;
        return 0;
    });
}

// ================================================================
// DATE HELPERS
// ================================================================

/**
 * Dapatkan awal hari dari tanggal
 * @param {Date|string} date - Tanggal
 * @returns {Date} Awal hari
 */
export function startOfDay(date) {
    const d = typeof date === 'string' ? new Date(date) : date;
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Dapatkan akhir hari dari tanggal
 * @param {Date|string} date - Tanggal
 * @returns {Date} Akhir hari
 */
export function endOfDay(date) {
    const d = typeof date === 'string' ? new Date(date) : date;
    d.setHours(23, 59, 59, 999);
    return d;
}

/**
 * Hitung selisih hari antara dua tanggal
 * @param {Date} date1 - Tanggal pertama
 * @param {Date} date2 - Tanggal kedua
 * @returns {number} Selisih hari
 */
export function daysBetween(date1, date2) {
    const d1 = startOfDay(date1);
    const d2 = startOfDay(date2);
    const diff = d2 - d1;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Cek apakah tanggal adalah hari ini
 * @param {Date|string} date - Tanggal
 * @returns {boolean} True jika hari ini
 */
export function isToday(date) {
    const d = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    return startOfDay(d).getTime() === startOfDay(today).getTime();
}

// ================================================================
// COLOR HELPERS
// ================================================================

/**
 * Generate warna acak
 * @param {number} opacity - Opacity (0-1)
 * @returns {string} Warna RGBA
 */
export function randomColor(opacity = 1) {
    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Lighten atau darken warna hex
 * @param {string} hex - Warna hex
 * @param {number} amount - Jumlah (0-100)
 * @returns {string} Warna hex baru
 */
export function adjustColor(hex, amount) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);

    r = Math.max(0, Math.min(255, r + amount));
    g = Math.max(0, Math.min(255, g + amount));
    b = Math.max(0, Math.min(255, b + amount));

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ================================================================
// DOM HELPERS
// ================================================================

/**
 * Create element dengan class dan atribut
 * @param {string} tag - Tag HTML
 * @param {Object} options - Opsi (class, id, attributes, children)
 * @returns {HTMLElement} Element yang dibuat
 */
export function createElement(tag, options = {}) {
    const el = document.createElement(tag);

    if (options.class) {
        el.className = options.class;
    }

    if (options.id) {
        el.id = options.id;
    }

    if (options.attributes) {
        Object.entries(options.attributes).forEach(([key, value]) => {
            el.setAttribute(key, value);
        });
    }

    if (options.text) {
        el.textContent = options.text;
    }

    if (options.html) {
        el.innerHTML = options.html;
    }

    if (options.children) {
        options.children.forEach(child => {
            if (typeof child === 'string') {
                el.appendChild(document.createTextNode(child));
            } else {
                el.appendChild(child);
            }
        });
    }

    return el;
}

/**
 * Debounce function
 * @param {Function} fn - Function yang di-debounce
 * @param {number} delay - Delay dalam ms
 * @returns {Function} Debounced function
 */
export function debounce(fn, delay = 300) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
}

/**
 * Throttle function
 * @param {Function} fn - Function yang di-throttle
 * @param {number} limit - Limit dalam ms
 * @returns {Function} Throttled function
 */
export function throttle(fn, limit = 300) {
    let inThrottle = false;
    return function (...args) {
        if (!inThrottle) {
            fn.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ================================================================
// EXPORT
// ================================================================

export default {
    formatCurrency,
    formatDate,
    formatDateShort,
    formatTime,
    formatDuration,
    formatPhone,
    formatBarcode,
    generateId,
    generateBarcode,
    generateInvoiceNumber,
    saveToStorage,
    loadFromStorage,
    removeFromStorage,
    isValidEmail,
    isValidPhone,
    isValidBarcode,
    isPositiveNumber,
    truncate,
    capitalize,
    titleCase,
    slugify,
    round,
    clamp,
    formatPercent,
    groupBy,
    sumBy,
    sortBy,
    startOfDay,
    endOfDay,
    daysBetween,
    isToday,
    randomColor,
    adjustColor,
    createElement,
    debounce,
    throttle
};

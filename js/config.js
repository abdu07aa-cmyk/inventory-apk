/**
 * ================================================================
 * WARUNGKITA PRO MAX - KONFIGURASI
 * ================================================================
 * File ini berisi semua konfigurasi aplikasi termasuk:
 * - Supabase credentials
 * - Konstanta aplikasi
 * - Kode diskon
 * - Pengaturan default
 * ================================================================
 */

// ================================================================
// SUPABASE CONFIGURATION
// ================================================================

export const SUPABASE_CONFIG = {
    url: 'https://marelgsluzshkwxwcjod.supabase.co',
    key: '', // Akan diisi oleh user
    tables: {
        products: 'products',
        transactions: 'transactions',
        transactionItems: 'transaction_items',
        shifts: 'shifts',
        customers: 'customers'
    }
};

// ================================================================
// DISCOUNT CODES
// ================================================================

export const DISCOUNT_CODES = {
    'WARUNG10': { type: 'percentage', value: 10, description: 'Diskon 10%' },
    'HEMAT20': { type: 'percentage', value: 20, description: 'Diskon 20%' },
    'PROMO50': { type: 'percentage', value: 50, description: 'Diskon 50%' },
    'FREEONG': { type: 'fixed', value: 5000, description: 'Diskon Ongkir Rp 5.000' }
};

// ================================================================
// APP CONFIGURATION
// ================================================================

export const APP_CONFIG = {
    appName: 'WarungKita PRO MAX',
    appVersion: '2.0.0',
    currency: 'Rp',
    currencySymbol: 'Rp',
    locale: 'id-ID',
    timezone: 'Asia/Jakarta',

    // Tax configuration
    taxRate: 0.11, // 11%

    // Stock alert threshold
    lowStockThreshold: 5,

    // Pagination
    itemsPerPage: 20,

    // Print settings
    printSettings: {
        companyName: 'WarungKita',
        companyAddress: 'Jl. Contoh No. 123, Jakarta',
        companyPhone: '0812-3456-7890',
        footer: 'Terima kasih telah berbelanja!'
    },

    // Default categories
    categories: ['Makanan', 'Minuman', 'Snack', 'Rokok', 'Lainnya'],

    // Payment methods
    paymentMethods: ['Tunai', 'QRIS', 'Transfer', 'E-Wallet']
};

// ================================================================
// KEYBOARD SHORTCUTS
// ================================================================

export const KEYBOARD_SHORTCUTS = {
    'Ctrl+K': 'Focus global search',
    'Ctrl+N': 'New product',
    'Ctrl+D': 'Toggle dark mode',
    'F9': 'Process payment',
    'Escape': 'Clear cart / Close modals'
};

// ================================================================
// DEFAULT EMOJIS BY CATEGORY
// ================================================================

export const CATEGORY_EMOJIS = {
    'Makanan': '🍕',
    'Minuman': '🥤',
    'Snack': '🍿',
    'Rokok': '🚬',
    'Lainnya': '📦'
};

// ================================================================
// STORAGE KEYS
// ================================================================

export const STORAGE_KEYS = {
    theme: 'warungkita-theme',
    cart: 'warungkita-cart',
    holdCart: 'warungkita-hold-cart',
    products: 'warungkita-products',
    transactions: 'warungkita-transactions',
    shifts: 'warungkita-shifts',
    customers: 'warungkita-customers',
    settings: 'warungkita-settings',
    offlineQueue: 'warungkita-offline-queue'
};

// ================================================================
// API ENDPOINTS (Supabase REST)
// ================================================================

export function getApiEndpoint(table) {
    const { url } = SUPABASE_CONFIG;
    return `${url}/rest/v1/${table}`;
}

export function getApiHeaders(apiKey) {
    return {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    };
}

// ================================================================
// SAMPLE DATA (for development/testing)
// ================================================================

export const SAMPLE_PRODUCTS = [
    { name: 'Indomie Goreng', category: 'Makanan', price: 3500, stock: 100, emoji: '🍜', barcode: '8991001100001' },
    { name: 'Aqua 600ml', category: 'Minuman', price: 4000, stock: 50, emoji: '💧', barcode: '8991001100002' },
    { name: 'Chitato', category: 'Snack', price: 12000, stock: 30, emoji: '🥨', barcode: '8991001100003' },
    { name: 'Sampoerna Mild', category: 'Rokok', price: 25000, stock: 20, emoji: '🚬', barcode: '8991001100004' },
    { name: 'Teh Botol Sosro', category: 'Minuman', price: 5500, stock: 40, emoji: '🧃', barcode: '8991001100005' },
    { name: 'Oreo', category: 'Snack', price: 8500, stock: 25, emoji: '🍪', barcode: '8991001100006' }
];

// ================================================================
// EXPORT DEFAULT
// ================================================================

export default {
    SUPABASE_CONFIG,
    DISCOUNT_CODES,
    APP_CONFIG,
    KEYBOARD_SHORTCUTS,
    CATEGORY_EMOJIS,
    STORAGE_KEYS,
    getApiEndpoint,
    getApiHeaders,
    SAMPLE_PRODUCTS
};

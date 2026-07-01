/**
 * ============================================
 * WARUNGKITA PRO MAX - Configuration
 * ============================================
 * File ini berisi semua konfigurasi aplikasi:
 * - Supabase credentials
 * - Konstanta aplikasi
 * - Default values
 * - Discount codes
 */

const CONFIG = {
    // ========================================
    // SUPABASE CONFIGURATION
    // ========================================
    // ⚠️ ISI DENGAN CREDENTIALS ANDA
    supabase: {
        url: 'https://marelgsluzshkwxwcjod.supabase.co', // Ganti dengan URL project Anda
        apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmVsZ3NsdXpzaGt3eHdjam9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MDg3MzIsImV4cCI6MjA5ODI4NDczMn0.73CLxhbxhO28UplJU8C1-mtNawlsMegVsORXY7PPzlg', // Ganti dengan anon key Anda
        schema: 'public'
    },

    // ========================================
    // APP INFO
    // ========================================
    app: {
        name: 'WarungKita PRO MAX',
        version: '2.0.0',
        currency: 'IDR',
        currencySymbol: 'Rp',
        locale: 'id-ID',
        timezone: 'Asia/Jakarta'
    },

    // ========================================
    // DATABASE TABLES
    // ========================================
    tables: {
        products: 'products',
        customers: 'customers',
        shifts: 'shifts',
        transactions: 'transactions',
        transactionItems: 'transaction_items',
        stockHistory: 'stock_history'
    },

    // ========================================
    // CATEGORIES
    // ========================================
    categories: [
        { id: 'all', name: 'Semua', icon: 'fas fa-th', emoji: '📦' },
        { id: 'makanan', name: 'Makanan', icon: 'fas fa-utensils', emoji: '🍱' },
        { id: 'minuman', name: 'Minuman', icon: 'fas fa-glass-whiskey', emoji: '🥤' },
        { id: 'snack', name: 'Snack', icon: 'fas fa-cookie', emoji: '🍿' },
        { id: 'household', name: 'Rumah Tangga', icon: 'fas fa-home', emoji: '🏠' },
        { id: 'lainnya', name: 'Lainnya', icon: 'fas fa-box', emoji: '📦' }
    ],

    // ========================================
    // PAYMENT METHODS
    // ========================================
    paymentMethods: [
        { id: 'cash', name: 'Tunai', icon: 'fas fa-money-bill-wave', color: '#10b981' },
        { id: 'qris', name: 'QRIS', icon: 'fas fa-qrcode', color: '#3b82f6' },
        { id: 'transfer', name: 'Transfer', icon: 'fas fa-university', color: '#8b5cf6' },
        { id: 'ewallet', name: 'E-Wallet', icon: 'fas fa-wallet', color: '#f59e0b' }
    ],

    // ========================================
    // DISCOUNT CODES
    // ========================================
    discountCodes: {
        'WARUNG10': { type: 'percent', value: 10, minPurchase: 50000, description: 'Diskon 10% min. 50rb' },
        'HEMAT20': { type: 'percent', value: 20, minPurchase: 100000, description: 'Diskon 20% min. 100rb' },
        'PROMO50': { type: 'fixed', value: 50000, minPurchase: 200000, description: 'Potongan 50rb min. 200rb' },
        'NEWUSER': { type: 'percent', value: 15, minPurchase: 0, description: 'Diskon 15% pengguna baru' }
    },

    // ========================================
    // STOCK THRESHOLDS
    // ========================================
    stock: {
        lowStockThreshold: 10, // Alert jika stok <= 10
        criticalStockThreshold: 5, // Critical jika stok <= 5
        defaultMinStock: 5
    },

    // ========================================
    // UI SETTINGS
    // ========================================
    ui: {
        itemsPerPage: 20,
        animationDuration: 250,
        toastDuration: 3000,
        maxCartItems: 100,
        searchDebounce: 300
    },

    // ========================================
    // BANK INFO (untuk transfer)
    // ========================================
    bankInfo: {
        bankName: 'BCA',
        accountNumber: '1234567890',
        accountName: 'WarungKita',
        qrismMerchant: 'WARUNGKITA'
    },

    // ========================================
    // KEYBOARD SHORTCUTS
    // ========================================
    shortcuts: {
        search: 'ctrl+k',
        newProduct: 'ctrl+n',
        toggleTheme: 'ctrl+d',
        processPayment: 'f9',
        clearCart: 'esc',
        holdCart: 'ctrl+h'
    },

    // ========================================
    // LOCAL STORAGE KEYS
    // ========================================
    storageKeys: {
        cart: 'warungkita_cart',
        theme: 'warungkita_theme',
        currentShift: 'warungkita_shift',
        holdCarts: 'warungkita_hold_carts',
        offlineQueue: 'warungkita_offline_queue',
        lastSync: 'warungkita_last_sync',
        productsCache: 'warungkita_products_cache'
    }
};

// ============================================
// FREEZE CONFIG (prevent accidental changes)
// ============================================
Object.freeze(CONFIG);
Object.freeze(CONFIG.supabase);
Object.freeze(CONFIG.app);
Object.freeze(CONFIG.tables);
Object.freeze(CONFIG.categories);
Object.freeze(CONFIG.paymentMethods);
Object.freeze(CONFIG.discountCodes);
Object.freeze(CONFIG.stock);
Object.freeze(CONFIG.ui);
Object.freeze(CONFIG.bankInfo);
Object.freeze(CONFIG.shortcuts);
Object.freeze(CONFIG.storageKeys);

// ============================================
// VALIDATION
// ============================================
/**
 * Cek apakah Supabase sudah dikonfigurasi
 * @returns {boolean}
 */
function isSupabaseConfigured() {
    return CONFIG.supabase.apiKey !== 'PASTE_ANON_KEY_ANDA_DISINI' 
        && CONFIG.supabase.apiKey.length > 20;
}

// Log status konfigurasi saat load
console.log('%c🏪 WarungKita PRO MAX', 'color: #3b82f6; font-size: 20px; font-weight: bold;');
console.log(`%cVersion: ${CONFIG.app.version}`, 'color: #10b981;');
console.log(`%cSupabase: ${isSupabaseConfigured() ? '✅ Terhubung' : '⚠️ Belum dikonfigurasi'}`, 
    `color: ${isSupabaseConfigured() ? '#10b981' : '#f59e0b'};`);

/**
 * ================================================================
 * WARUNGKITA PRO MAX - STATE MANAGEMENT
 * ================================================================
 * Centralized state management untuk seluruh aplikasi.
 * Menggunakan pendekatan reactive state dengan observer pattern.
 * ================================================================
 */

import { STORAGE_KEYS, APP_CONFIG, DISCOUNT_CODES } from './config.js';
import { loadFromStorage, saveToStorage, generateId, formatCurrency } from './utils.js';

// ================================================================
// STATE DEFINITION
// ================================================================

const state = {
    // ==========================================================
    // Data Collections
    // ==========================================================

    /** @type {Array} Daftar semua produk */
    products: [],

    /** @type {Array} Daftar transaksi */
    transactions: [],

    /** @type {Array} Daftar customer */
    customers: [],

    /** @type {Array} Daftar shift */
    shifts: [],

    // ==========================================================
    // Cart State
    // ==========================================================

    /** @type {Array} Keranjang belanja */
    cart: [],

    /** @type {Object|null} Keranjang yang disimpan (hold) */
    holdCart: null,

    /** @type {number} Total keranjang */
    cartTotal: 0,

    /** @type {number} Subtotal keranjang */
    cartSubtotal: 0,

    /** @type {number} Diskon yang diterapkan */
    cartDiscount: 0,

    /** @type {number} Pajak */
    cartTax: 0,

    /** @type {string|null} Kode diskon yang digunakan */
    appliedDiscountCode: null,

    // ==========================================================
    // UI State
    // ==========================================================

    /** @type {string} Tema aktif (light/dark/system) */
    theme: 'light',

    /** @type {string} Halaman aktif */
    currentSection: 'dashboard',

    /** @type {string} ID shift aktif */
    activeShiftId: null,

    /** @type {boolean} Status online/offline */
    isOnline: true,

    /** @type {Array} Queue untuk offline sync */
    offlineQueue: [],

    /** @type {string} Barcode terakhir scan */
    lastScannedBarcode: null,

    // ==========================================================
    // Filter & Pagination
    // ==========================================================

    filters: {
        products: {
            search: '',
            category: 'all',
            stock: 'all'
        },
        transactions: {
            search: '',
            dateFrom: '',
            dateTo: '',
            paymentMethod: 'all'
        },
        customers: {
            search: ''
        }
    },

    pagination: {
        products: { page: 1, limit: APP_CONFIG.itemsPerPage },
        transactions: { page: 1, limit: APP_CONFIG.itemsPerPage },
        customers: { page: 1, limit: APP_CONFIG.itemsPerPage }
    },

    // ==========================================================
    // Charts
    // ==========================================================

    charts: {
        sales: null,
        topProducts: null
    }
};

// ================================================================
// OBSERVER PATTERN
// ================================================================

/** @type {Array} Daftar observer (callback) yang akan dipanggil saat state berubah */
const observers = [];

/**
 * Subscribe ke perubahan state
 * @param {Function} callback - Fungsi yang dipanggil saat state berubah
 * @returns {Function} Fungsi untuk unsubscribe
 */
export function subscribe(callback) {
    observers.push(callback);

    // Return unsubscribe function
    return () => {
        const index = observers.indexOf(callback);
        if (index > -1) {
            observers.splice(index, 1);
        }
    };
}

/**
 * Notify semua observer tentang perubahan state
 * @param {string} action - Nama aksi yang terjadi
 * @param {*} data - Data tambahan
 */
function notify(action, data = null) {
    observers.forEach(callback => {
        try {
            callback(state, action, data);
        } catch (error) {
            console.error('Error in state observer:', error);
        }
    });
}

// ================================================================
// STATE MUTATIONS
// ================================================================

/**
 * Set state dan notify observers
 * @param {Object} newState - State baru (partial)
 * @param {string} action - Nama aksi
 * @param {*} data - Data tambahan
 */
function setState(newState, action = 'update', data = null) {
    Object.assign(state, newState);
    notify(action, data);
}

// ================================================================
// PRODUCTS MUTATIONS
// ================================================================

/**
 * Load products ke state
 * @param {Array} products - Daftar produk
 */
export function loadProducts(products) {
    state.products = products;
    saveToStorage(STORAGE_KEYS.products, products);
    notify('products-loaded', { count: products.length });
}

/**
 * Tambah produk baru
 * @param {Object} product - Data produk
 * @returns {Object} Produk yang ditambahkan
 */
export function addProduct(product) {
    const newProduct = {
        id: generateId(),
        ...product,
        createdAt: new Date().toISOString()
    };

    state.products.push(newProduct);
    saveToStorage(STORAGE_KEYS.products, state.products);
    notify('product-added', newProduct);

    return newProduct;
}

/**
 * Update produk
 * @param {string} id - ID produk
 * @param {Object} updates - Data update
 * @returns {Object|null} Produk yang diupdate atau null jika tidak ditemukan
 */
export function updateProduct(id, updates) {
    const index = state.products.findIndex(p => p.id === id);
    if (index === -1) return null;

    state.products[index] = { ...state.products[index], ...updates };
    saveToStorage(STORAGE_KEYS.products, state.products);
    notify('product-updated', state.products[index]);

    return state.products[index];
}

/**
 * Hapus produk
 * @param {string} id - ID produk
 * @returns {boolean} True jika berhasil
 */
export function deleteProduct(id) {
    const index = state.products.findIndex(p => p.id === id);
    if (index === -1) return false;

    const deleted = state.products.splice(index, 1)[0];
    saveToStorage(STORAGE_KEYS.products, state.products);
    notify('product-deleted', deleted);

    return true;
}

/**
 * Update stok produk
 * @param {string} id - ID produk
 * @param {number} quantity - Jumlah perubahan (positif untuk tambah, negatif untuk kurangi)
 * @param {string} note - Catatan
 * @returns {Object|null} Produk yang diupdate
 */
export function updateStock(id, quantity, note = '') {
    const product = state.products.find(p => p.id === id);
    if (!product) return null;

    const oldStock = product.stock;
    const newStock = Math.max(0, oldStock + quantity);

    product.stock = newStock;
    product.lastStockUpdate = new Date().toISOString();

    saveToStorage(STORAGE_KEYS.products, state.products);
    notify('stock-updated', { product, oldStock, newStock, quantity, note });

    // Check low stock
    if (newStock <= APP_CONFIG.lowStockThreshold && newStock > 0) {
        notify('low-stock-warning', { product, stock: newStock });
    }

    if (newStock === 0) {
        notify('out-of-stock', { product });
    }

    return product;
}

// ================================================================
// CART MUTATIONS
// ================================================================

/**
 * Tambah item ke keranjang
 * @param {Object} product - Produk
 * @param {number} quantity - Jumlah
 * @returns {Object} Item keranjang
 */
export function addToCart(product, quantity = 1) {
    const existing = state.cart.find(item => item.productId === product.id);

    if (existing) {
        existing.quantity += quantity;
        existing.subtotal = existing.quantity * existing.price;
    } else {
        state.cart.push({
            id: generateId(),
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: quantity,
            subtotal: product.price * quantity,
            emoji: product.emoji || '📦',
            maxStock: product.stock
        });
    }

    recalculateCart();
    saveToStorage(STORAGE_KEYS.cart, state.cart);
    notify('cart-updated', { cart: state.cart, total: state.cartTotal });

    return state.cart;
}

/**
 * Hapus item dari keranjang
 * @param {string} id - ID item keranjang
 * @returns {boolean} True jika berhasil
 */
export function removeFromCart(id) {
    const index = state.cart.findIndex(item => item.id === id);
    if (index === -1) return false;

    state.cart.splice(index, 1);
    recalculateCart();
    saveToStorage(STORAGE_KEYS.cart, state.cart);
    notify('cart-updated', { cart: state.cart, total: state.cartTotal });

    return true;
}

/**
 * Update quantity item di keranjang
 * @param {string} id - ID item keranjang
 * @param {number} quantity - Jumlah baru
 * @returns {boolean} True jika berhasil
 */
export function updateCartItemQuantity(id, quantity) {
    const item = state.cart.find(i => i.id === id);
    if (!item) return false;

    if (quantity <= 0) {
        return removeFromCart(id);
    }

    // Check stock
    const product = state.products.find(p => p.id === item.productId);
    if (product && quantity > product.stock) {
        notify('cart-error', { message: `Stok tidak mencukupi. Tersedia: ${product.stock}` });
        return false;
    }

    item.quantity = quantity;
    item.subtotal = quantity * item.price;

    recalculateCart();
    saveToStorage(STORAGE_KEYS.cart, state.cart);
    notify('cart-updated', { cart: state.cart, total: state.cartTotal });

    return true;
}

/**
 * Kosongkan keranjang
 */
export function clearCart() {
    state.cart = [];
    state.cartTotal = 0;
    state.cartSubtotal = 0;
    state.cartDiscount = 0;
    state.cartTax = 0;
    state.appliedDiscountCode = null;

    saveToStorage(STORAGE_KEYS.cart, state.cart);
    notify('cart-cleared');
}

/**
 * Recalculate semua nilai keranjang
 */
function recalculateCart() {
    state.cartSubtotal = state.cart.reduce((sum, item) => sum + item.subtotal, 0);

    // Apply discount
    let discount = 0;
    if (state.appliedDiscountCode) {
        const discountInfo = DISCOUNT_CODES[state.appliedDiscountCode];
        if (discountInfo) {
            if (discountInfo.type === 'percentage') {
                discount = state.cartSubtotal * (discountInfo.value / 100);
            } else {
                discount = discountInfo.value;
            }
            discount = Math.min(discount, state.cartSubtotal);
        }
    }
    state.cartDiscount = discount;

    // Calculate tax (after discount)
    const taxableAmount = state.cartSubtotal - discount;
    state.cartTax = taxableAmount * APP_CONFIG.taxRate;

    // Total
    state.cartTotal = taxableAmount + state.cartTax;
}

// ================================================================
// CART HOLD (Simpan Keranjang)
// ================================================================

/**
 * Simpan keranjang sementara
 * @param {string} name - Nama penyimpanan
 * @returns {Object} Data yang disimpan
 */
export function holdCart(name = 'Draft') {
    if (state.cart.length === 0) {
        notify('cart-error', { message: 'Keranjang kosong, tidak bisa disimpan' });
        return null;
    }

    const holdData = {
        id: generateId(),
        name: name,
        cart: [...state.cart],
        subtotal: state.cartSubtotal,
        discount: state.cartDiscount,
        total: state.cartTotal,
        discountCode: state.appliedDiscountCode,
        createdAt: new Date().toISOString()
    };

    state.holdCart = holdData;
    saveToStorage(STORAGE_KEYS.holdCart, holdData);
    notify('cart-held', holdData);

    return holdData;
}

/**
 * Restore keranjang yang disimpan
 * @returns {Object|null} Data yang direstore
 */
export function restoreHoldCart() {
    if (!state.holdCart) return null;

    state.cart = [...state.holdCart.cart];
    state.appliedDiscountCode = state.holdCart.discountCode;
    recalculateCart();
    saveToStorage(STORAGE_KEYS.cart, state.cart);

    const restored = state.holdCart;
    state.holdCart = null;
    saveToStorage(STORAGE_KEYS.holdCart, null);

    notify('cart-restored', restored);
    return restored;
}

/**
 * Hapus keranjang yang disimpan
 */
export function clearHoldCart() {
    state.holdCart = null;
    saveToStorage(STORAGE_KEYS.holdCart, null);
    notify('hold-cleared');
}

// ================================================================
// TRANSACTIONS MUTATIONS
// ================================================================

/**
 * Tambah transaksi baru
 * @param {Object} data - Data transaksi
 * @returns {Object} Transaksi yang ditambahkan
 */
export function addTransaction(data) {
    const transaction = {
        id: `TRX-${Date.now()}`,
        ...data,
        createdAt: new Date().toISOString()
    };

    state.transactions.push(transaction);
    saveToStorage(STORAGE_KEYS.transactions, state.transactions);
    notify('transaction-added', transaction);

    return transaction;
}

/**
 * Update transaksi
 * @param {string} id - ID transaksi
 * @param {Object} updates - Data update
 * @returns {Object|null} Transaksi yang diupdate
 */
export function updateTransaction(id, updates) {
    const index = state.transactions.findIndex(t => t.id === id);
    if (index === -1) return null;

    state.transactions[index] = { ...state.transactions[index], ...updates };
    saveToStorage(STORAGE_KEYS.transactions, state.transactions);
    notify('transaction-updated', state.transactions[index]);

    return state.transactions[index];
}

// ================================================================
// CUSTOMER MUTATIONS
// ================================================================

/**
 * Tambah customer baru
 * @param {Object} data - Data customer
 * @returns {Object} Customer yang ditambahkan
 */
export function addCustomer(data) {
    const customer = {
        id: generateId(),
        ...data,
        points: data.points || 0,
        createdAt: new Date().toISOString()
    };

    state.customers.push(customer);
    saveToStorage(STORAGE_KEYS.customers, state.customers);
    notify('customer-added', customer);

    return customer;
}

/**
 * Update customer
 * @param {string} id - ID customer
 * @param {Object} updates - Data update
 * @returns {Object|null} Customer yang diupdate
 */
export function updateCustomer(id, updates) {
    const index = state.customers.findIndex(c => c.id === id);
    if (index === -1) return null;

    state.customers[index] = { ...state.customers[index], ...updates };
    saveToStorage(STORAGE_KEYS.customers, state.customers);
    notify('customer-updated', state.customers[index]);

    return state.customers[index];
}

/**
 * Tambah poin ke customer
 * @param {string} id - ID customer
 * @param {number} points - Jumlah poin
 * @returns {Object|null} Customer yang diupdate
 */
export function addCustomerPoints(id, points) {
    const customer = state.customers.find(c => c.id === id);
    if (!customer) return null;

    customer.points = (customer.points || 0) + points;
    saveToStorage(STORAGE_KEYS.customers, state.customers);
    notify('customer-points-added', { customer, points });

    return customer;
}

// ================================================================
// SHIFT MUTATIONS
// ================================================================

/**
 * Buka shift baru
 * @param {Object} data - Data shift
 * @returns {Object} Shift yang dibuat
 */
export function openShift(data) {
    // Tutup shift aktif jika ada
    if (state.activeShiftId) {
        closeShift(state.activeShiftId);
    }

    const shift = {
        id: `SHIFT-${Date.now()}`,
        ...data,
        status: 'open',
        openedAt: new Date().toISOString(),
        closedAt: null,
        finalCash: null
    };

    state.shifts.push(shift);
    state.activeShiftId = shift.id;
    saveToStorage(STORAGE_KEYS.shifts, state.shifts);
    notify('shift-opened', shift);

    return shift;
}

/**
 * Tutup shift
 * @param {string} id - ID shift
 * @param {number} finalCash - Saldo akhir
 * @returns {Object|null} Shift yang ditutup
 */
export function closeShift(id, finalCash = 0) {
    const index = state.shifts.findIndex(s => s.id === id);
    if (index === -1) return null;

    state.shifts[index].status = 'closed';
    state.shifts[index].closedAt = new Date().toISOString();
    state.shifts[index].finalCash = finalCash;

    if (state.activeShiftId === id) {
        state.activeShiftId = null;
    }

    saveToStorage(STORAGE_KEYS.shifts, state.shifts);
    notify('shift-closed', state.shifts[index]);

    return state.shifts[index];
}

// ================================================================
// APP STATE MUTATIONS
// ================================================================

/**
 * Set tema
 * @param {string} theme - light | dark | system
 */
export function setTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    saveToStorage(STORAGE_KEYS.theme, theme);
    notify('theme-changed', theme);
}

/**
 * Navigasi ke section
 * @param {string} section - Nama section
 */
export function navigateTo(section) {
    state.currentSection = section;
    notify('navigation-changed', section);
}

/**
 * Set status online/offline
 * @param {boolean} isOnline
 */
export function setOnlineStatus(isOnline) {
    state.isOnline = isOnline;
    notify('online-status-changed', isOnline);
}

// ================================================================
// INITIALIZATION
// ================================================================

/**
 * Load state dari storage
 */
export function loadState() {
    try {
        // Load data from storage
        state.products = loadFromStorage(STORAGE_KEYS.products) || [];
        state.transactions = loadFromStorage(STORAGE_KEYS.transactions) || [];
        state.customers = loadFromStorage(STORAGE_KEYS.customers) || [];
        state.shifts = loadFromStorage(STORAGE_KEYS.shifts) || [];
        state.cart = loadFromStorage(STORAGE_KEYS.cart) || [];
        state.holdCart = loadFromStorage(STORAGE_KEYS.holdCart) || null;

        // Load theme
        const theme = loadFromStorage(STORAGE_KEYS.theme) || 'light';
        state.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);

        // Find active shift
        const activeShift = state.shifts.find(s => s.status === 'open');
        state.activeShiftId = activeShift ? activeShift.id : null;

        // Recalculate cart
        recalculateCart();

        // Set online status
        state.isOnline = navigator.onLine;

        notify('state-loaded', { success: true });
    } catch (error) {
        console.error('Failed to load state:', error);
        notify('state-error', { error });
    }
}

// ================================================================
// EXPORT
// ================================================================

export { state };

export default {
    state,
    loadState,
    subscribe,

    // Products
    loadProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    updateStock,

    // Cart
    addToCart,
    removeFromCart,
    updateCartItemQuantity,
    clearCart,

    // Cart Hold
    holdCart,
    restoreHoldCart,
    clearHoldCart,

    // Transactions
    addTransaction,
    updateTransaction,

    // Customers
    addCustomer,
    updateCustomer,
    addCustomerPoints,

    // Shifts
    openShift,
    closeShift,

    // App
    setTheme,
    navigateTo,
    setOnlineStatus
};

/**
 * js/state.js
 * - Manajemen state terpusat untuk aplikasi (produk, cart, transaksi, users, dsb)
 * - Menyediakan subscribe/unsubscribe dan persistence ke localStorage
 * - Ditulis sebagai ES module; export default instance `state`
 *
 * Prinsip:
 * - State immutable-ish: gunakan setState untuk perubahan terpusat
 * - Autosave dengan debounce ke localStorage
 * - Hooks sederhana untuk sinkronisasi UI (pub/sub)
 */

import { APP_CONFIG } from './config.js';

const DEFAULT_STATE = {
  products: [],          // {id,name,category,price,stock,emoji,barcode,modal_price}
  cart: {
    items: [],           // {product_id, quantity, price}
    meta: {
      discountCode: null,
      customer_id: null,
      hold: false
    }
  },
  transactions: [],      // riwayat transaksi lokal (di-sync ke Supabase)
  shifts: [],            // shift management
  customers: [],
  currentUser: {
    id: null,
    name: 'Kasir',
    role: 'cashier'
  },
  settings: {
    theme: APP_CONFIG.defaultTheme,
    currency: APP_CONFIG.currency,
    locale: APP_CONFIG.locale
  },
  lastSyncAt: null
};

/* Simple debounce helper */
function debounce(fn, ms = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/* EventTarget-based pub/sub (browser-native) */
class StateStore extends EventTarget {
  constructor() {
    super();
    this._state = structuredClone(DEFAULT_STATE);
    this._storageKey = APP_CONFIG.storageKey || 'warungkita:state:v1';
    this._autosave = debounce(() => this.saveToLocal(), APP_CONFIG.autosaveInterval || 500);
    this.loadFromLocal(); // inisialisasi dari localStorage bila ada
  }

  /* Dapatkan salinan state (read-only) */
  getState() {
    return structuredClone(this._state);
  }

  /* Set state secara partial (merge), lalu panggil autosave dan notifikasi */
  setState(patch = {}) {
    this._state = deepMerge(this._state, patch);
    // Emit event 'state:changed' dengan salinan state
    this.dispatchEvent(new CustomEvent('state:changed', { detail: this.getState() }));
    this._autosave();
  }

  /* Subscribe untuk perubahan state: callback menerima newState */
  subscribe(callback) {
    const wrapper = (e) => callback(e.detail);
    this.addEventListener('state:changed', wrapper);
    // Return unsubscribe function
    return () => this.removeEventListener('state:changed', wrapper);
  }

  /* Save to localStorage (synchronous) */
  saveToLocal() {
    try {
      const payload = JSON.stringify(this._state);
      localStorage.setItem(this._storageKey, payload);
      // small event for persistence
      this.dispatchEvent(new CustomEvent('state:saved', { detail: { at: new Date().toISOString() } }));
    } catch (err) {
      console.error('Gagal menyimpan state ke localStorage', err);
    }
  }

  /* Load from localStorage (merge over default) */
  loadFromLocal() {
    try {
      const raw = localStorage.getItem(this._storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      // Merge but do not overwrite runtime-only fields unless present
      this._state = deepMerge(this._state, parsed);
      this.dispatchEvent(new CustomEvent('state:loaded', { detail: this.getState() }));
    } catch (err) {
      console.warn('Gagal memuat state dari localStorage, menggunakan default', err);
    }
  }

  /* Clear local state (useful for logout or reset) */
  clearLocal() {
    try {
      localStorage.removeItem(this._storageKey);
      this._state = structuredClone(DEFAULT_STATE);
      this.dispatchEvent(new CustomEvent('state:cleared', { detail: this.getState() }));
    } catch (err) {
      console.error('Gagal menghapus local state', err);
    }
  }
}

/* Utility: deep merge sederhana untuk objek POJO */
function deepMerge(target, source) {
  if (!isObject(target) || !isObject(source)) return source;
  const out = Array.isArray(target) ? [...target] : { ...target };
  for (const [k, v] of Object.entries(source)) {
    if (isObject(v)) {
      out[k] = deepMerge(target[k] ?? (Array.isArray(v) ? [] : {}), v);
    } else {
      out[k] = v;
    }
  }
  return out;
}
function isObject(val) {
  return val && typeof val === 'object' && !Array.isArray(val);
}

/* Export singleton instance */
const state = new StateStore();
export default state;

/* --- Helper API functions untuk operasi state umum ---
   Fungsi-fungsi kecil berguna untuk modules lain (products, cart, shifts)
   Tidak memodifikasi state langsung — gunakan state.setState */
export function findProductById(id) {
  return state.getState().products.find(p => String(p.id) === String(id)) || null;
}

export function addProduct(product) {
  const s = state.getState();
  const products = Array.isArray(s.products) ? [...s.products] : [];
  products.push(product);
  state.setState({ products });
}

export function updateProduct(id, patch) {
  const s = state.getState();
  const products = s.products.map(p => (String(p.id) === String(id) ? { ...p, ...patch } : p));
  state.setState({ products });
}

export function addToCart(item) {
  // item: { product_id, quantity, price }
  const s = state.getState();
  const items = [...s.cart.items];
  const idx = items.findIndex(it => String(it.product_id) === String(item.product_id));
  if (idx >= 0) {
    items[idx].quantity += item.quantity;
  } else {
    items.push({ ...item });
  }
  state.setState({ cart: { ...s.cart, items } });
}

export function removeFromCart(product_id) {
  const s = state.getState();
  const items = s.cart.items.filter(it => String(it.product_id) !== String(product_id));
  state.setState({ cart: { ...s.cart, items } });
}

export function clearCart() {
  const s = state.getState();
  state.setState({ cart: { items: [], meta: { discountCode: null, customer_id: null, hold: false } } });
}

/**
 * js/modules/products.js
 * - Modul untuk memuat, menampilkan, dan mengelola produk
 * - Tanggung jawab:
 *   - load produk dari API/state
 *   - render daftar produk (daftar utama & grid POS)
 *   - pencarian / filter sederhana
 *   - operasi CRUD ringan (melakukan create/update via api, update state)
 *
 * Exports:
 * - initProducts(opts) : inisialisasi dengan opsi { listSelector, posSelector, toolbarSelector }
 * - refreshProducts()   : reload & re-render produk
 *
 * Catatan:
 * - Modul ini berinteraksi dengan `api.js`, `state.js`, dan `utils.js`
 */

import api from '../api.js';
import state, { addProduct, updateProduct, findProductById } from '../state.js';
import utils from '../utils.js';
import { TABLES } from '../config.js';

let selectors = {
  listSelector: '#products-list',
  posSelector: '#pos-products',
  toolbarSelector: '#products-toolbar'
};

/* Render card single product (untuk daftar umum) */
function renderProductCard(product = {}) {
  const price = utils.formatCurrency(product.price || 0);
  const stock = product.stock ?? 0;
  const html = `
    <div class="product-card" data-id="${product.id}">
      <div class="product-emoji">${product.emoji ?? '📦'}</div>
      <div class="product-meta">
        <div class="product-name">${escapeHtml(product.name || '—')}</div>
        <div class="product-category">${escapeHtml(product.category || '')}</div>
        <div class="product-price">${price}</div>
        <div class="product-stock ${stock <= 5 ? 'low' : ''}">Stok: ${stock}</div>
      </div>
      <div class="product-actions">
        <button class="btn-sm btn-primary btn-add-pos" title="Tambah ke POS">+</button>
        <button class="btn-sm btn-ghost btn-edit" title="Edit produk"><i class="fa-solid fa-pen"></i></button>
      </div>
    </div>
  `;
  const el = utils.createElementFromHTML(html);
  // Hook tombol tambah ke POS
  el.querySelector('.btn-add-pos').addEventListener('click', () => {
    // dispatch CustomEvent global untuk modules/cart.js
    window.dispatchEvent(new CustomEvent('warungkita:add-to-cart', { detail: { product_id: product.id, quantity: 1, price: product.price } }));
    utils.toast(`Ditambahkan: ${product.name}`, { type: 'success', duration: 1200 });
  });
  // Edit button placeholder (UI modal nanti)
  el.querySelector('.btn-edit').addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('warungkita:edit-product', { detail: { id: product.id } }));
  });
  return el;
}

/* Render product grid for POS (bigger buttons) */
function renderPosButton(product = {}) {
  const price = utils.formatCurrency(product.price || 0);
  const html = `
    <button class="pos-product-btn" data-id="${product.id}" title="${escapeHtml(product.name || '')}">
      <div class="pos-emoji">${product.emoji ?? '📦'}</div>
      <div class="pos-name">${escapeHtml(product.name || '')}</div>
      <div class="pos-price">${price}</div>
    </button>
  `;
  const el = utils.createElementFromHTML(html);
  el.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('warungkita:add-to-cart', { detail: { product_id: product.id, quantity: 1, price: product.price } }));
  });
  return el;
}

/* Escape sederhana untuk text yang disisipkan ke HTML */
function escapeHtml(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/* Load products from API (or local state fallback handled in api.list) */
export async function loadProducts() {
  try {
    const rows = await api.list(TABLES.PRODUCTS);
    // Jika API mengembalikan object/array, set ke state
    if (Array.isArray(rows)) {
      state.setState({ products: rows });
    }
    return state.getState().products;
  } catch (err) {
    console.warn('Gagal load products dari API, gunakan state lokal', err);
    return state.getState().products || [];
  }
}

/* Render semua produk ke container listSelector dan posSelector */
export function renderProducts() {
  const s = state.getState();
  const products = s.products || [];
  // Daftar produk (table/list)
  const listRoot = document.querySelector(selectors.listSelector);
  if (listRoot) {
    listRoot.innerHTML = '';
    if (!products.length) {
      listRoot.innerHTML = `<div class="card empty">Belum ada produk.</div>`;
    } else {
      const wrapper = document.createElement('div');
      wrapper.className = 'products-grid';
      for (const p of products) {
        wrapper.appendChild(renderProductCard(p));
      }
      listRoot.appendChild(wrapper);
    }
  }
  // POS product buttons
  const posRoot = document.querySelector(selectors.posSelector);
  if (posRoot) {
    posRoot.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'pos-grid';
    for (const p of products) {
      grid.appendChild(renderPosButton(p));
    }
    posRoot.appendChild(grid);
  }
}

/* Search/filter helper */
export function filterProducts(query = '') {
  const q = String(query || '').toLowerCase().trim();
  const all = state.getState().products || [];
  if (!q) return all;
  return all.filter(p =>
    String(p.name || '').toLowerCase().includes(q) ||
    String(p.category || '').toLowerCase().includes(q) ||
    String(p.barcode || '').toLowerCase().includes(q)
  );
}

/* Create product (UI -> api -> state) */
export async function createProduct(payload) {
  // Basic validation
  if (!payload.name) throw new Error('Nama produk diperlukan');
  const created = await api.create(TABLES.PRODUCTS, payload);
  // Jika create via API mengembalikan array/obj, set state; else fallback
  if (Array.isArray(created) && created[0]) {
    addProduct(created[0]);
  } else if (created && created.id) {
    addProduct(created);
  } else {
    // fallback: create local
    addProduct({ id: payload.id ?? utils.uid('p-'), ...payload });
  }
  utils.toast('Produk dibuat', { type: 'success' });
  return created;
}

/* Update product (UI edit) */
export async function saveProduct(id, patch) {
  const updated = await api.update(TABLES.PRODUCTS, id, patch);
  // Update local state representation
  updateProduct(id, patch);
  utils.toast('Perubahan produk disimpan', { type: 'success' });
  return updated;
}

/* Inisialisasi module: set selectors, bind toolbar events, dan subscribe state */
export function initProducts({ listSelector = '#products-list', posSelector = '#pos-products', toolbarSelector = '#products-toolbar' } = {}) {
  selectors.listSelector = listSelector;
  selectors.posSelector = posSelector;
  selectors.toolbarSelector = toolbarSelector;

  // Initial load
  loadProducts().then(() => renderProducts());

  // Bind search in toolbar (if ada)
  const toolbar = document.querySelector(selectors.toolbarSelector);
  if (toolbar) {
    const input = toolbar.querySelector('input[type="search"], #products-filter');
    if (input) {
      input.addEventListener('input', utils.debounce((e) => {
        const q = e.target.value;
        const filtered = filterProducts(q);
        // render filtered only in list root
        const listRoot = document.querySelector(selectors.listSelector);
        if (!listRoot) return;
        listRoot.innerHTML = '';
        if (!filtered.length) {
          listRoot.innerHTML = `<div class="card empty">Tidak ada hasil untuk "${q}"</div>`;
        } else {
          const wrapper = document.createElement('div');
          wrapper.className = 'products-grid';
          for (const p of filtered) wrapper.appendChild(renderProductCard(p));
          listRoot.appendChild(wrapper);
        }
      }, 220));
    }
    // New product button (open modal handled elsewhere)
    const btnNew = toolbar.querySelector('#btn-new-product');
    if (btnNew) {
      btnNew.addEventListener('click', () => window.dispatchEvent(new CustomEvent('warungkita:new-product')));
    }
  }

  // Re-render ketika state berubah
  state.subscribe(() => {
    renderProducts();
  });
}

/* Refresh helper (force reload from API) */
export async function refreshProducts() {
  await loadProducts();
  renderProducts();
}

export default {
  initProducts,
  renderProducts,
  loadProducts,
  createProduct,
  saveProduct,
  filterProducts,
  refreshProducts
};

/**
 * ================================================================
 * WARUNGKITA PRO MAX - CART MODULE
 * ================================================================
 * Operasi keranjang: add, remove, update quantity, calculate totals.
 * ================================================================
 */

import { state, addToCart, removeFromCart, updateCartItemQuantity, clearCart, holdCart, restoreHoldCart } from '../state.js';
import { formatCurrency, showToast, truncate } from '../utils.js';
import { APP_CONFIG } from '../config.js';

// ================================================================
// RENDER CART
// ================================================================

/**
 * Render cart items
 */
export function renderCart() {
    const container = document.getElementById('cartItems');
    if (!container) return;

    const { cart, cartSubtotal, cartDiscount, cartTax, cartTotal } = state;

    if (cart.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-basket"></i>
                <p>Keranjang kosong</p>
                <span>Klik produk untuk menambahkan</span>
            </div>
        `;
        updateCartSummary();
        return;
    }

    container.innerHTML = cart.map(item => `
        <div class="cart-item" data-id="${item.id}">
            <div class="item-emoji">${item.emoji || '📦'}</div>
            <div class="item-info">
                <div class="item-name">${truncate(item.name, 25)}</div>
                <div class="item-price">${formatCurrency(item.price)}</div>
            </div>
            <div class="item-quantity">
                <button class="qty-btn qty-minus" data-id="${item.id}">-</button>
                <span class="qty-value">${item.quantity}</span>
                <button class="qty-btn qty-plus" data-id="${item.id}">+</button>
            </div>
            <div class="item-subtotal">${formatCurrency(item.subtotal)}</div>
            <button class="item-remove" data-id="${item.id}" title="Hapus">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');

    // Attach cart events
    attachCartEvents();
    updateCartSummary();
}

/**
 * Update cart summary
 */
export function updateCartSummary() {
    const { cartSubtotal, cartDiscount, cartTax, cartTotal } = state;

    document.getElementById('cartSubtotal').textContent = formatCurrency(cartSubtotal);
    document.getElementById('cartDiscount').textContent = `-${formatCurrency(cartDiscount)}`;
    document.getElementById('cartTax').textContent = formatCurrency(cartTax);
    document.getElementById('cartTotal').textContent = formatCurrency(cartTotal);
}

// ================================================================
// CART OPERATIONS
// ================================================================

/**
 * Add product to cart
 * @param {string} productId - Product ID
 * @param {number} quantity - Quantity
 */
export function addProductToCart(productId, quantity = 1) {
    const product = state.products.find(p => p.id === productId);
    if (!product) {
        showToast('Produk tidak ditemukan!', 'error');
        return;
    }

    if (product.stock <= 0) {
        showToast('Stok produk habis!', 'error');
        return;
    }

    // Check if already in cart
    const existing = state.cart.find(item => item.productId === productId);
    if (existing) {
        const newQty = existing.quantity + quantity;
        if (newQty > product.stock) {
            showToast(`Stok tidak mencukupi! Tersedia: ${product.stock}`, 'error');
            return;
        }
        updateCartItemQuantity(existing.id, newQty);
    } else {
        if (quantity > product.stock) {
            showToast(`Stok tidak mencukupi! Tersedia: ${product.stock}`, 'error');
            return;
        }
        addToCart(product, quantity);
    }

    renderCart();
    playAddSound();
}

/**
 * Remove item from cart
 * @param {string} itemId - Cart item ID
 */
export function removeCartItem(itemId) {
    removeFromCart(itemId);
    renderCart();
    playRemoveSound();
}

/**
 * Update cart item quantity
 * @param {string} itemId - Cart item ID
 * @param {number} newQuantity - New quantity
 */
export function updateCartItemQty(itemId, newQuantity) {
    updateCartItemQuantity(itemId, newQuantity);
    renderCart();
}

/**
 * Clear entire cart
 */
export function clearCartItems() {
    if (state.cart.length === 0) return;

    if (confirm('Kosongkan keranjang?')) {
        clearCart();
        renderCart();
        showToast('Keranjang dikosongkan', 'info');
    }
}

// ================================================================
// CART HOLD
// ================================================================

/**
 * Hold current cart
 */
export function holdCurrentCart() {
    if (state.cart.length === 0) {
        showToast('Keranjang kosong, tidak bisa disimpan', 'warning');
        return;
    }

    const name = prompt('Nama keranjang (opsional):', `Draft ${new Date().toLocaleDateString()}`);
    if (name === null) return; // Cancel

    holdCart(name || 'Draft');
    renderCart();
    showToast('Keranjang disimpan!', 'success');
}

/**
 * Restore held cart
 */
export function restoreHeldCart() {
    if (!state.holdCart) {
        showToast('Tidak ada keranjang yang disimpan', 'info');
        return;
    }

    if (state.cart.length > 0) {
        if (!confirm('Keranjang saat ini akan diganti. Lanjutkan?')) {
            return;
        }
    }

    restoreHoldCart();
    renderCart();
    showToast(`Keranjang "${state.holdCart?.name || 'Draft'}" dipulihkan`, 'success');
}

// ================================================================
// DISCOUNT
// ================================================================

import { DISCOUNT_CODES } from '../config.js';

/**
 * Apply discount code
 * @param {string} code - Discount code
 */
export function applyDiscount(code) {
    const discount = DISCOUNT_CODES[code.toUpperCase()];
    if (!discount) {
        showToast('Kode diskon tidak valid!', 'error');
        return false;
    }

    state.appliedDiscountCode = code.toUpperCase();
    // Recalculate cart
    const event = new CustomEvent('cart-updated');
    document.dispatchEvent(event);
    renderCart();
    showToast(`Diskon ${discount.description} diterapkan!`, 'success');
    return true;
}

/**
 * Remove discount
 */
export function removeDiscount() {
    state.appliedDiscountCode = null;
    const event = new CustomEvent('cart-updated');
    document.dispatchEvent(event);
    renderCart();
    showToast('Diskon dihapus', 'info');
}

// ================================================================
// SOUND EFFECTS
// ================================================================

/**
 * Play add to cart sound
 */
function playAddSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.frequency.value = 600;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.1;

        oscillator.start();
        setTimeout(() => {
            oscillator.frequency.value = 800;
            setTimeout(() => {
                oscillator.stop();
            }, 100);
        }, 100);
    } catch (e) {
        // Silent fail if audio not supported
    }
}

/**
 * Play remove from cart sound
 */
function playRemoveSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.frequency.value = 500;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.1;

        oscillator.start();
        setTimeout(() => {
            oscillator.frequency.value = 300;
            setTimeout(() => {
                oscillator.stop();
            }, 100);
        }, 100);
    } catch (e) {
        // Silent fail
    }
}

// ================================================================
// EVENT HANDLERS
// ================================================================

/**
 * Attach cart event listeners
 */
function attachCartEvents() {
    // Quantity minus
    document.querySelectorAll('.qty-minus').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const item = state.cart.find(i => i.id === id);
            if (item && item.quantity > 1) {
                updateCartItemQty(id, item.quantity - 1);
            } else if (item) {
                removeCartItem(id);
            }
        });
    });

    // Quantity plus
    document.querySelectorAll('.qty-plus').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const item = state.cart.find(i => i.id === id);
            if (item) {
                const product = state.products.find(p => p.id === item.productId);
                if (product && item.quantity < product.stock) {
                    updateCartItemQty(id, item.quantity + 1);
                } else {
                    showToast(`Stok maksimum: ${product?.stock || 0}`, 'warning');
                }
            }
        });
    });

    // Remove button
    document.querySelectorAll('.item-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            removeCartItem(id);
        });
    });
}

// ================================================================
// EXPORT
// ================================================================

export default {
    renderCart,
    updateCartSummary,
    addProductToCart,
    removeCartItem,
    updateCartItemQty,
    clearCartItems,
    holdCurrentCart,
    restoreHeldCart,
    applyDiscount,
    removeDiscount
};

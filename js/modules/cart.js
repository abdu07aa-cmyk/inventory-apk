/**
 * ============================================
 * CART MODULE
 * ============================================
 * Mengelola keranjang belanja:
 * - Tambah/hapus item
 * - Update quantity
 * - Hitung subtotal & total
 * - Render cart UI
 */

const CartModule = {
    // ========================================
    // INITIALIZATION
    // ========================================
    init() {
        console.log('%c🛒 CartModule initialized', 'color: #3b82f6;');
        this.setupEventListeners();
        this.render();
    },

    // ========================================
    // ADD TO CART
    // ========================================
    addToCart(product, quantity = 1) {
        if (!product || product.stock <= 0) {
            Utils.toast('Stok produk habis', 'warning');
            return;
        }

        const existing = AppState.cart.find(item => item.id === product.id);
        const newQty = (existing?.quantity || 0) + quantity;

        if (newQty > product.stock) {
            Utils.toast(`Stok tidak cukup (tersisa ${product.stock})`, 'warning');
            return;
        }

        AppState.addToCart(product, quantity);
        this.render();
        Utils.playSound('add');
    },

    // ========================================
    // UPDATE QUANTITY
    // ========================================
    updateQuantity(productId, newQuantity) {
        const product = AppState.products.find(p => p.id === productId);
        const cartItem = AppState.cart.find(i => i.id === productId);

        if (!cartItem) return;

        if (newQuantity <= 0) {
            this.removeItem(productId);
            return;
        }

        if (product && newQuantity > product.stock) {
            Utils.toast(`Stok tidak cukup (tersisa ${product.stock})`, 'warning');
            newQuantity = product.stock;
        }

        AppState.updateCartItem(productId, newQuantity);
        this.render();
    },

    // ========================================
    // REMOVE ITEM
    // ========================================
    removeItem(productId) {
        AppState.removeFromCart(productId);
        this.render();
        Utils.playSound('click');
    },

    // ========================================
    // CLEAR CART
    // ========================================
    clearCart() {
        if (AppState.cart.length === 0) return;

        AppState.clearCart();
        this.render();
        Utils.toast('Keranjang dikosongkan', 'info');
    },

    // ========================================
    // APPLY DISCOUNT
    // ========================================
    applyDiscount(code) {
        if (!code) {
            Utils.toast('Masukkan kode diskon', 'warning');
            return;
        }

        const result = AppState.applyDiscount(code);
        
        if (result.success) {
            Utils.toast(`Diskon ${code} diterapkan!`, 'success');
            Utils.playSound('success');
        } else {
            Utils.toast(result.message, 'error');
        }

        this.render();
    },

    // ========================================
    // RENDER CART UI
    // ========================================
    render() {
        const cartItems = document.getElementById('cartItems');
        if (!cartItems) return;

        // Empty state
        if (AppState.cart.length === 0) {
            cartItems.innerHTML = `
                <div class="cart-empty">
                    <i class="fas fa-shopping-basket"></i>
                    <p>Keranjang kosong</p>
                    <small>Pilih produk untuk memulai</small>
                </div>
            `;
        } else {
            cartItems.innerHTML = AppState.cart.map(item => `
                <div class="cart-item" data-item-id="${item.id}">
                    <div class="cart-item-emoji">${item.emoji || '📦'}</div>
                    <div class="cart-item-info">
                        <h4>${item.name}</h4>
                        <p class="cart-item-price">${Utils.formatCurrency(item.price)}</p>
                    </div>
                    <div class="cart-item-controls">
                        <button class="qty-btn minus" data-id="${item.id}">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="qty-value">${item.quantity}</span>
                        <button class="qty-btn plus" data-id="${item.id}">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <div class="cart-item-subtotal">
                        ${Utils.formatCurrency(item.price * item.quantity)}
                    </div>
                    <button class="cart-item-remove" data-id="${item.id}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('');

            // Add event listeners
            this.attachItemListeners();
        }

        // Update summary
        this.updateSummary();
    },

    // ========================================
    // UPDATE SUMMARY
    // ========================================
    updateSummary() {
        const subtotal = AppState.getCartSubtotal();
        const discount = AppState.discount.amount;
        const total = AppState.getCartTotal();

        const elSubtotal = document.getElementById('cartSubtotal');
        const elTotal = document.getElementById('cartTotal');
        const elDiscountAmount = document.getElementById('discountAmount');
        const elDiscountLabel = document.getElementById('discountLabel');
        const discountRow = document.querySelector('.discount-applied');

        if (elSubtotal) elSubtotal.textContent = Utils.formatCurrency(subtotal);
        if (elTotal) elTotal.textContent = Utils.formatCurrency(total);

        if (discount > 0 && discountRow) {
            discountRow.style.display = 'flex';
            if (elDiscountLabel) {
                elDiscountLabel.textContent = AppState.discount.type === 'percent'
                    ? `Diskon (${AppState.discount.code} -${AppState.discount.value}%)`
                    : `Diskon (${AppState.discount.code})`;
            }
            if (elDiscountAmount) elDiscountAmount.textContent = `- ${Utils.formatCurrency(discount)}`;
        } else if (discountRow) {
            discountRow.style.display = 'none';
        }
    },

    // ========================================
    // ATTACH ITEM LISTENERS
    // ========================================
    attachItemListeners() {
        // Quantity buttons
        document.querySelectorAll('.qty-btn.minus').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                const item = AppState.cart.find(i => i.id === id);
                if (item) this.updateQuantity(id, item.quantity - 1);
            });
        });

        document.querySelectorAll('.qty-btn.plus').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                const item = AppState.cart.find(i => i.id === id);
                if (item) this.updateQuantity(id, item.quantity + 1);
            });
        });

        // Remove buttons
        document.querySelectorAll('.cart-item-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                this.removeItem(id);
            });
        });
    },

    // ========================================
    // EVENT LISTENERS
    // ========================================
    setupEventListeners() {
        // Clear cart button
        const btnClear = document.getElementById('btnClearCart');
        if (btnClear) {
            btnClear.addEventListener('click', () => this.clearCart());
        }

        // Apply discount
        const btnApplyDiscount = document.getElementById('btnApplyDiscount');
        if (btnApplyDiscount) {
            btnApplyDiscount.addEventListener('click', () => {
                const code = document.getElementById('discountCode').value;
                this.applyDiscount(code);
            });
        }

        // Discount code enter key
        const discountInput = document.getElementById('discountCode');
        if (discountInput) {
            discountInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.applyDiscount(discountInput.value);
                }
            });
        }

        // Subscribe to cart changes
        AppState.subscribe('cart:changed', () => this.render());
    }
};

Object.freeze(CartModule);
console.log('%c✅ CartModule loaded', 'color: #10b981;');

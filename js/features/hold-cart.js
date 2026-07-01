/**
 * ============================================
 * HOLD CART MODULE
 * ============================================
 * Menyimpan keranjang sementara (hold/resume)
 */

const HoldCartModule = {
    heldCarts: [],

    init() {
        console.log('%c⏸️ HoldCartModule initialized', 'color: #3b82f6;');
        this.loadHeldCarts();
        this.setupEventListeners();
        this.updateBadge();
    },

    loadHeldCarts() {
        try {
            const raw = localStorage.getItem(CONFIG.storageKeys.holdCarts);
            this.heldCarts = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(this.heldCarts)) this.heldCarts = [];
        } catch (e) {
            console.warn('⚠️ Failed to load held carts:', e);
            this.heldCarts = [];
        }
    },

    saveHeldCarts() {
        try {
            localStorage.setItem(CONFIG.storageKeys.holdCarts, JSON.stringify(this.heldCarts));
        } catch (e) {
            console.error('❌ Save held carts failed:', e);
        }
    },

    holdCart(customerName = '') {
        if (AppState.cart.length === 0) {
            Utils.toast('Keranjang kosong, tidak bisa di-hold', 'warning');
            return;
        }

        const heldCart = {
            id: Date.now(),
            customerName: customerName || `Pelanggan ${this.heldCarts.length + 1}`,
            items: [...AppState.cart],
            discount: { ...AppState.discount },
            heldAt: new Date().toISOString()
        };

        this.heldCarts.push(heldCart);
        this.saveHeldCarts();
        
        // Clear current cart
        AppState.clearCart();
        
        this.updateBadge();
        Utils.toast(`⏸️ Keranjang di-hold: ${heldCart.customerName}`, 'success');
        Utils.playSound('click');
    },

    resumeCart(heldId) {
        const held = this.heldCarts.find(h => h.id === heldId);
        if (!held) return;

        if (AppState.cart.length > 0) {
            const confirm = window.confirm('Keranjang saat ini akan diganti. Lanjutkan?');
            if (!confirm) return;
        }

        // Restore cart
        AppState.setCart([...held.items]);
        AppState.discount = held.discount || { code: null, type: null, value: 0, amount: 0 };
        
        // Set customer name
        const customerInput = document.getElementById('customerName');
        if (customerInput) customerInput.value = held.customerName;

        // Remove from held
        this.heldCarts = this.heldCarts.filter(h => h.id !== heldId);
        this.saveHeldCarts();
        
        this.updateBadge();
        Utils.toast(`▶️ Keranjang dilanjutkan: ${held.customerName}`, 'success');
        
        // Switch to POS view
        if (typeof AppMain !== 'undefined') {
            AppMain.switchView('pos');
        }
    },

    deleteHeldCart(heldId) {
        const held = this.heldCarts.find(h => h.id === heldId);
        if (!held) return;

        if (!confirm(`Hapus keranjang tertahan "${held.customerName}"?`)) return;

        this.heldCarts = this.heldCarts.filter(h => h.id !== heldId);
        this.saveHeldCarts();
        this.updateBadge();
        this.renderHeldList();
        Utils.toast('Keranjang dihapus', 'info');
    },

    showHeldCarts() {
        if (this.heldCarts.length === 0) {
            Utils.toast('Tidak ada keranjang tertahan', 'info');
            return;
        }

        let html = '<h3>⏸️ Keranjang Tertahan</h3><div style="margin-top:1rem;">';
        this.heldCarts.forEach(held => {
            const total = held.items.reduce((s, i) => s + (i.price * i.quantity), 0);
            const itemCount = held.items.reduce((s, i) => s + i.quantity, 0);
            html += `
                <div style="padding:1rem;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:0.5rem;">
                    <strong>${held.customerName}</strong><br>
                    <small>${itemCount} items • ${Utils.formatCurrency(total)}</small><br>
                    <small style="color:#64748b;">${Utils.getRelativeTime(held.heldAt)}</small>
                    <div style="margin-top:0.5rem;">
                        <button onclick="HoldCartModule.resumeCart(${held.id})" style="padding:0.25rem 0.75rem;background:#3b82f6;color:white;border:none;border-radius:4px;cursor:pointer;">▶️ Lanjutkan</button>
                        <button onclick="HoldCartModule.deleteHeldCart(${held.id})" style="padding:0.25rem 0.75rem;background:#ef4444;color:white;border:none;border-radius:4px;cursor:pointer;margin-left:0.25rem;">🗑️ Hapus</button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        // Use simple alert for now
        const w = window.open('', '_blank', 'width=400,height=600');
        w.document.write(`<html><head><title>Keranjang Tertahan</title></head><body style="font-family:sans-serif;padding:1rem;">${html}</body></html>`);
    },

    renderHeldList() {
        // Placeholder for UI rendering
    },

    updateBadge() {
        const badges = document.querySelectorAll('.hold-badge, .hold-count');
        badges.forEach(badge => {
            badge.textContent = this.heldCarts.length;
            badge.style.display = this.heldCarts.length > 0 ? 'flex' : 'none';
        });
    },

    setupEventListeners() {
        const btnHold = document.getElementById('btnHoldCart');
        if (btnHold) {
            btnHold.addEventListener('click', () => {
                const customerName = document.getElementById('customerName')?.value || '';
                this.holdCart(customerName);
            });
        }
    }
};

Object.freeze(HoldCartModule);
console.log('%c✅ HoldCartModule loaded', 'color: #10b981;');

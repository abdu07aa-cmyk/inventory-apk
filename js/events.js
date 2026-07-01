/**
 * ============================================
 * WARUNGKITA PRO MAX - Global Events
 * ============================================
 * Menangani semua event listeners global:
 * - Theme toggle
 * - Modal close
 * - Online/Offline detection
 * - Cart badge sync
 * - Notifications
 */

const Events = {
    // ========================================
    // INITIALIZATION
    // ========================================
    init() {
        console.log('%c🎯 Events initialized', 'color: #3b82f6;');
        
        this.setupThemeToggle();
        this.setupModalHandlers();
        this.setupOnlineOffline();
        this.setupCartBadge();
        this.setupNotifications();
        this.setupBarcodeScanner();
    },

    // ========================================
    // THEME TOGGLE
    // ========================================
    setupThemeToggle() {
        const btnTheme = document.getElementById('btnThemeToggle');
        if (!btnTheme) return;

        // Update icon based on current theme
        this.updateThemeIcon();

        btnTheme.addEventListener('click', () => {
            AppState.toggleTheme();
            this.updateThemeIcon();
            Utils.playSound('click');
        });

        // Subscribe to theme changes
        AppState.subscribe('theme:changed', () => this.updateThemeIcon());
    },

    updateThemeIcon() {
        const btnTheme = document.getElementById('btnThemeToggle');
        if (!btnTheme) return;

        const icon = btnTheme.querySelector('i');
        if (!icon) return;

        if (AppState.theme === 'dark') {
            icon.className = 'fas fa-sun';
        } else {
            icon.className = 'fas fa-moon';
        }
    },

    // ========================================
    // MODAL HANDLERS
    // ========================================
    setupModalHandlers() {
        // Close modal on button click
        document.querySelectorAll('[data-close-modal]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        });

        // Close modal on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        });

        // Close modal on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                Utils.closeAllModals();
            }
        });
    },

    // ========================================
    // ONLINE/OFFLINE DETECTION
    // ========================================
    setupOnlineOffline() {
        const updateStatus = () => {
            const isOnline = navigator.onLine;
            AppState.setOnlineStatus(isOnline);
            
            const indicator = document.getElementById('onlineStatus');
            if (indicator) {
                indicator.className = `online-status ${isOnline ? 'online' : 'offline'}`;
                indicator.innerHTML = isOnline 
                    ? '<i class="fas fa-wifi"></i> Online'
                    : '<i class="fas fa-wifi-slash"></i> Offline';
            }

            if (!isOnline) {
                Utils.toast('📡 Anda offline. Data akan di-sync saat online.', 'warning');
            } else {
                Utils.toast('✅ Anda kembali online', 'success');
                // Trigger sync if offline module exists
                if (typeof OfflineModule !== 'undefined' && OfflineModule.syncQueue) {
                    OfflineModule.syncQueue();
                }
            }
        };

        window.addEventListener('online', updateStatus);
        window.addEventListener('offline', updateStatus);
        
        // Initial status
        updateStatus();
    },

    // ========================================
    // CART BADGE SYNC
    // ========================================
    setupCartBadge() {
        const syncCartBadge = () => {
            const totalItems = AppState.cart.reduce((sum, item) => sum + item.quantity, 0);
            
            // Update all cart badges (header, sidebar, etc)
            document.querySelectorAll('.cart-badge, .cart-count').forEach(badge => {
                badge.textContent = totalItems;
                badge.style.display = totalItems > 0 ? 'flex' : 'none';
            });
        };

        // Initial sync
        syncCartBadge();

        // Subscribe to cart changes
        AppState.subscribe('cart:changed', syncCartBadge);
    },

    // ========================================
    // NOTIFICATIONS
    // ========================================
    setupNotifications() {
        const btnNotifications = document.getElementById('btnNotifications');
        if (!btnNotifications) return;

        const updateNotificationBadge = () => {
            const lowStockCount = AppState.products.filter(
                p => p.stock <= CONFIG.stock.lowStockThreshold
            ).length;

            const badge = btnNotifications.querySelector('.badge');
            if (badge) {
                badge.textContent = lowStockCount;
                badge.style.display = lowStockCount > 0 ? 'flex' : 'none';
            }
        };

        // Initial update
        updateNotificationBadge();

        // Subscribe to product changes
        AppState.subscribe('products:changed', updateNotificationBadge);

        // Click handler
        btnNotifications.addEventListener('click', () => {
            this.showNotificationsPanel();
        });
    },

    showNotificationsPanel() {
        const lowStockProducts = AppState.products.filter(
            p => p.stock <= CONFIG.stock.lowStockThreshold
        );

        if (lowStockProducts.length === 0) {
            Utils.toast('✅ Tidak ada notifikasi baru', 'success');
            return;
        }

        const message = lowStockProducts.slice(0, 10).map(p => {
            const status = p.stock <= 0 ? '❌ Habis' : '⚠️ Menipis';
            return `${status} ${p.emoji} ${p.name}: ${p.stock} pcs`;
        }).join('\n');

        alert(`🔔 Notifikasi Stok (${lowStockProducts.length} produk)\n\n${message}`);
    },

    // ========================================
    // BARCODE SCANNER
    // ========================================
    setupBarcodeScanner() {
        const btnScan = document.getElementById('btnBarcodeScan');
        if (btnScan) {
            btnScan.addEventListener('click', () => {
                if (typeof BarcodeModule !== 'undefined' && BarcodeModule.startScanning) {
                    BarcodeModule.startScanning();
                } else {
                    Utils.toast('Fitur barcode scanner belum tersedia', 'info');
                }
            });
        }

        // Listen for barcode input (from scanner hardware)
        let barcodeBuffer = '';
        let lastKeyTime = 0;

        document.addEventListener('keypress', (e) => {
            // Ignore if typing in input
            if (e.target.matches('input, textarea, select')) return;

            const currentTime = Date.now();
            
            // Reset buffer if too slow (not a scanner)
            if (currentTime - lastKeyTime > 100) {
                barcodeBuffer = '';
            }
            
            lastKeyTime = currentTime;

            if (e.key === 'Enter' && barcodeBuffer.length >= 8) {
                // Looks like a barcode
                this.handleBarcodeScan(barcodeBuffer);
                barcodeBuffer = '';
            } else if (e.key.match(/[0-9]/)) {
                barcodeBuffer += e.key;
            }
        });
    },

    async handleBarcodeScan(barcode) {
        try {
            const product = await API.products.getByBarcode(barcode);
            
            if (product) {
                CartModule.addToCart(product);
                Utils.toast(`✅ ${product.name} ditambahkan`, 'success');
                Utils.playSound('add');
            } else {
                Utils.toast(`❌ Produk dengan barcode ${barcode} tidak ditemukan`, 'error');
                Utils.playSound('error');
            }
        } catch (error) {
            console.error('Barcode scan error:', error);
            Utils.toast('Gagal memproses barcode', 'error');
        }
    },

    // ========================================
    // EXPORT BUTTONS
    // ========================================
    setupExportButtons() {
        const btnExport = document.getElementById('btnExportTransactions');
        if (btnExport) {
            btnExport.addEventListener('click', async () => {
                try {
                    const transactions = await API.transactions.getAll({ limit: 1000 });
                    Utils.exportToCSV(transactions, `transaksi_${Date.now()}.csv`);
                } catch (error) {
                    Utils.toast('Gagal export data', 'error');
                }
            });
        }
    }
};

// Auto-init if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Events.init());
} else {
    // DOM already ready, init after a short delay to ensure modules are loaded
    setTimeout(() => Events.init(), 100);
}

console.log('%c✅ Events loaded', 'color: #10b981;');

/**
 * ============================================
 * WARUNGKITA PRO MAX - Main Application
 * ============================================
 * Entry point aplikasi
 * Menginisialisasi semua modules & features
 */

const AppMain = {
    // ========================================
    // INITIALIZATION
    // ========================================
    async init() {
        console.log('%c🏪 WarungKita PRO MAX - Starting...', 'color: #3b82f6; font-size: 16px; font-weight: bold;');
        
        try {
            // 1. Validate configuration
            if (!isSupabaseConfigured()) {
                Utils.toast('⚠️ Supabase belum dikonfigurasi. Edit js/config.js', 'warning', 5000);
            }

            // 2. Test Supabase connection
            const isConnected = await API.healthCheck();
            if (isConnected) {
                console.log('%c✅ Supabase connected', 'color: #10b981;');
            } else {
                console.warn('⚠️ Supabase connection failed, using offline mode');
                Utils.toast('Mode offline: Tidak dapat terhubung ke server', 'warning');
            }

            // 3. Initialize Auth
            if (typeof AuthModule !== 'undefined') {
                AuthModule.init();
            }

            // 4. Initialize Core Modules
            await this.initModules();

            // 5. Initialize Features
            this.initFeatures();

            // 6. Initialize Events
            if (typeof Events !== 'undefined') {
                Events.init();
            }

            // 7. Setup navigation
            this.setupNavigation();

            // 8. Hide loading screen
            this.hideLoadingScreen();

            // 9. Show welcome message
            this.showWelcome();

            console.log('%c✅ App initialized successfully', 'color: #10b981; font-size: 14px;');
        } catch (error) {
            console.error('❌ Fatal error during init:', error);
            Utils.toast('Gagal memuat aplikasi: ' + error.message, 'error', 5000);
            this.hideLoadingScreen();
        }
    },

    // ========================================
    // INITIALIZE MODULES
    // ========================================
    async initModules() {
        const modules = [
            { name: 'ProductsModule', module: ProductsModule },
            { name: 'CartModule', module: CartModule },
            { name: 'PaymentModule', module: PaymentModule },
            { name: 'StockModule', module: StockModule },
            { name: 'AIModule', module: AIModule },
            { name: 'ShiftModule', module: typeof ShiftModule !== 'undefined' ? ShiftModule : null },
            { name: 'NotificationsModule', module: typeof NotificationsModule !== 'undefined' ? NotificationsModule : null },
            { name: 'HoldCartModule', module: typeof HoldCartModule !== 'undefined' ? HoldCartModule : null }
        ];

        for (const { name, module } of modules) {
            if (module && typeof module.init === 'function') {
                try {
                    await module.init();
                    console.log(`✅ ${name} initialized`);
                } catch (error) {
                    console.error(`❌ ${name} failed:`, error);
                }
            }
        }
    },

    // ========================================
    // INITIALIZE FEATURES
    // ========================================
    initFeatures() {
        const features = [
            'BarcodeModule',
            'OfflineModule',
            'ExportModule',
            'ReturnsModule',
            'SplitPaymentModule'
        ];

        features.forEach(name => {
            const feature = window[name];
            if (feature && typeof feature.init === 'function') {
                try {
                    feature.init();
                    console.log(`✅ ${name} initialized`);
                } catch (error) {
                    console.warn(`⚠️ ${name} not available:`, error.message);
                }
            }
        });
    },

    // ========================================
    // NAVIGATION
    // ========================================
    setupNavigation() {
        // Nav items click
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.dataset.view;
                if (view) this.switchView(view);
            });
        });

        // Mobile menu toggle
        const btnMenuMobile = document.getElementById('btnMenuMobile');
        if (btnMenuMobile) {
            btnMenuMobile.addEventListener('click', () => {
                document.getElementById('sidebar').classList.toggle('active');
            });
        }

        // Sidebar toggle
        const btnToggleSidebar = document.getElementById('toggleSidebar');
        if (btnToggleSidebar) {
            btnToggleSidebar.addEventListener('click', () => {
                document.getElementById('sidebar').classList.toggle('collapsed');
            });
        }

        // Initial view
        this.switchView('dashboard');
    },

    switchView(viewName) {
        // Update state
        AppState.setView(viewName);

        // Update nav active state
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === viewName);
        });

        // Show/hide views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.toggle('active', view.id === `view-${viewName}`);
        });

        // Update page title
        const titles = {
            dashboard: 'Dashboard',
            pos: 'Kasir (POS)',
            products: 'Manajemen Produk',
            transactions: 'Riwayat Transaksi',
            stock: 'Manajemen Stok',
            customers: 'Pelanggan',
            reports: 'Laporan',
            shift: 'Shift Kasir'
        };
        
        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) {
            pageTitle.textContent = titles[viewName] || 'Dashboard';
        }

        // Close mobile sidebar
        const sidebar = document.getElementById('sidebar');
        if (sidebar && window.innerWidth <= 768) {
            sidebar.classList.remove('active');
        }

        // Trigger view-specific logic
        this.onViewChange(viewName);
    },

    onViewChange(viewName) {
        switch (viewName) {
            case 'dashboard':
                this.refreshDashboard();
                break;
            case 'transactions':
                this.loadTransactionsHistory();
                break;
            case 'customers':
                this.loadCustomers();
                break;
            case 'pos':
                ProductsModule.renderProductsGrid();
                break;
            case 'stock':
                StockModule.render();
                break;
        }
    },

    // ========================================
    // DASHBOARD
    // ========================================
    async refreshDashboard() {
        try {
            // Get today's transactions
            const todayTx = await API.transactions.getToday();
            
            // Calculate stats
            const totalTransactions = todayTx.length;
            const totalRevenue = todayTx.reduce((sum, t) => sum + (t.total_amount || 0), 0);
            const productsSold = todayTx.reduce((sum, t) => sum + (t.items_count || 0), 0);
            const lowStock = AppState.products.filter(p => p.stock <= CONFIG.stock.lowStockThreshold).length;

            // Update UI
            const elTx = document.getElementById('statTransactions');
            const elRev = document.getElementById('statRevenue');
            const elProd = document.getElementById('statProductsSold');
            const elLow = document.getElementById('statLowStock');

            if (elTx) elTx.textContent = totalTransactions;
            if (elRev) elRev.textContent = Utils.formatCurrency(totalRevenue);
            if (elProd) elProd.textContent = productsSold;
            if (elLow) elLow.textContent = lowStock;

            // Render recent transactions
            this.renderRecentTransactions(todayTx.slice(0, 5));

            // Render charts
            if (typeof ChartsModule !== 'undefined') {
                ChartsModule.renderSalesChart(todayTx);
                ChartsModule.renderTopProductsChart();
            }
        } catch (error) {
            console.error('Dashboard refresh error:', error);
        }
    },

    renderRecentTransactions(transactions) {
        const tbody = document.getElementById('recentTransactionsBody');
        if (!tbody) return;

        if (transactions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <i class="fas fa-receipt"></i>
                        <p>Belum ada transaksi hari ini</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = transactions.map(tx => {
            const methodBadge = {
                cash: '<span class="badge badge-success">Tunai</span>',
                qris: '<span class="badge badge-primary">QRIS</span>',
                transfer: '<span class="badge badge-info">Transfer</span>',
                ewallet: '<span class="badge badge-warning">E-Wallet</span>'
            };

            return `
                <tr>
                    <td><code>${tx.transaction_code}</code></td>
                    <td>${tx.customer_name || 'Umum'}</td>
                    <td><strong>${Utils.formatCurrency(tx.total_amount)}</strong></td>
                    <td>${methodBadge[tx.payment_method] || tx.payment_method}</td>
                    <td><span class="badge badge-success">${tx.payment_status}</span></td>
                    <td>${Utils.getRelativeTime(tx.created_at)}</td>
                </tr>
            `;
        }).join('');
    },

    // ========================================
    // TRANSACTIONS HISTORY
    // ========================================
    async loadTransactionsHistory() {
        const tbody = document.getElementById('transactionsTableBody');
        if (!tbody) return;

        try {
            const transactions = await API.transactions.getAll({ limit: 100 });
            
            if (transactions.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" class="empty-state">
                            <i class="fas fa-receipt"></i>
                            <p>Belum ada transaksi</p>
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = transactions.map(tx => `
                <tr>
                    <td><code>${tx.transaction_code}</code></td>
                    <td>${Utils.formatDateTime(tx.created_at)}</td>
                    <td>${tx.customer_name || 'Umum'}</td>
                    <td>${tx.items_count || '-'}</td>
                    <td><strong>${Utils.formatCurrency(tx.total_amount)}</strong></td>
                    <td>${tx.payment_method}</td>
                    <td><span class="badge badge-success">${tx.payment_status}</span></td>
                    <td>
                        <button class="btn-icon-small btn-view-receipt" data-id="${tx.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `).join('');

            // Attach listeners
            tbody.querySelectorAll('.btn-view-receipt').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = parseInt(e.target.closest('button').dataset.id);
                    await this.viewTransactionReceipt(id);
                });
            });
        } catch (error) {
            console.error('Load transactions error:', error);
            Utils.toast('Gagal memuat transaksi', 'error');
        }
    },

    async viewTransactionReceipt(transactionId) {
        try {
            const tx = await API.transactions.getById(transactionId);
            const items = await API.transactions.getItems(transactionId);
            
            if (!tx) {
                Utils.toast('Transaksi tidak ditemukan', 'error');
                return;
            }

            PaymentModule.transactionData = {
                ...tx,
                items: items,
                cash_received: tx.total_amount,
                change: 0
            };
            
            PaymentModule.showReceipt();
        } catch (error) {
            console.error('View receipt error:', error);
            Utils.toast('Gagal memuat struk', 'error');
        }
    },

    // ========================================
    // CUSTOMERS
    // ========================================
    async loadCustomers() {
        const tbody = document.getElementById('customersTableBody');
        if (!tbody) return;

        try {
            const customers = await API.customers.getAll();
            AppState.setCustomers(customers);

            if (customers.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="empty-state">
                            <i class="fas fa-users"></i>
                            <p>Belum ada pelanggan</p>
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = customers.map(c => `
                <tr>
                    <td><strong>${c.name}</strong></td>
                    <td>${c.phone || '-'}</td>
                    <td>${c.total_transactions || 0}</td>
                    <td>${Utils.formatCurrency(c.total_spent || 0)}</td>
                    <td><span class="badge badge-info">${c.points || 0} pts</span></td>
                    <td>
                        <button class="btn-icon-small"><i class="fas fa-edit"></i></button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Load customers error:', error);
        }
    },

    // ========================================
    // UI HELPERS
    // ========================================
    hideLoadingScreen() {
        const loading = document.getElementById('loadingScreen');
        const app = document.getElementById('app');
        
        if (loading) {
            loading.classList.add('fade-out');
            setTimeout(() => loading.remove(), 500);
        }
        
        if (app) {
            app.style.display = '';
        }
    },

    showWelcome() {
        setTimeout(() => {
            const userName = AuthModule.currentUser?.name || 'Admin';
            Utils.toast(`Selamat datang, ${userName}! 👋`, 'success');
        }, 1000);
    },

    // ========================================
    // KEYBOARD SHORTCUTS
    // ========================================
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ignore if typing in input
            if (e.target.matches('input, textarea, select')) return;

            // Ctrl+K: Focus search
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                document.getElementById('globalSearch')?.focus();
            }

            // Ctrl+N: New product
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                ProductsModule.openNewModal();
            }

            // Ctrl+D: Toggle theme
            if (e.ctrlKey && e.key === 'd') {
                e.preventDefault();
                AppState.toggleTheme();
            }

            // F9: Process payment
            if (e.key === 'F9') {
                e.preventDefault();
                PaymentModule.openPaymentModal();
            }

            // Escape: Clear cart / Close modals
            if (e.key === 'Escape') {
                if (document.querySelector('.modal.active')) {
                    Utils.closeAllModals();
                } else if (AppState.currentView === 'pos') {
                    CartModule.clearCart();
                }
            }
        });
    }
};

// ============================================
// BOOTSTRAP
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    AppMain.setupKeyboardShortcuts();
    AppMain.init();
});

console.log('%c✅ AppMain loaded', 'color: #10b981;');

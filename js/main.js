/**
 * WARUNGKITA PRO MAX - Main Application
 */

const AppMain = {
    async init() {
        console.log('%c🏪 WarungKita PRO MAX - Starting...', 'color: #3b82f6; font-size: 16px;');
        
        try {
            // 1. Test Supabase connection
            const isConnected = await API.healthCheck();
            console.log(`%c${isConnected ? '✅ Supabase connected' : '⚠️ Offline mode'}`, 
                `color: ${isConnected ? '#10b981' : '#f59e0b'};`);

            // 2. Initialize Auth
            if (typeof AuthModule !== 'undefined') AuthModule.init();

            // 3. Initialize Core Modules
            if (typeof ProductsModule !== 'undefined') await ProductsModule.init();
            if (typeof CartModule !== 'undefined') CartModule.init();
            if (typeof PaymentModule !== 'undefined') PaymentModule.init();
            if (typeof StockModule !== 'undefined') StockModule.init();
            if (typeof AIModule !== 'undefined') AIModule.init();

            // 4. Initialize Features (optional)
            ['ShiftModule', 'BarcodeModule', 'OfflineModule', 'ExportModule', 
             'HoldCartModule', 'NotificationsModule', 'ReturnsModule', 'SplitPaymentModule']
            .forEach(name => {
                const mod = window[name];
                if (mod && typeof mod.init === 'function') {
                    try { mod.init(); } catch(e) { console.warn(`${name} not ready`); }
                }
            });

            // 5. Initialize Events
            if (typeof Events !== 'undefined') Events.init();

            // 6. Setup navigation
            this.setupNavigation();

            // 7. Setup keyboard shortcuts
            this.setupKeyboardShortcuts();

            // 8. Hide loading, show app
            document.getElementById('loadingScreen')?.classList.add('fade-out');
            setTimeout(() => {
                const loading = document.getElementById('loadingScreen');
                if (loading) loading.style.display = 'none';
                document.getElementById('app').style.display = '';
            }, 500);

            // 9. Welcome
            setTimeout(() => {
                const name = AuthModule?.currentUser?.name || 'Admin';
                Utils.toast(`Selamat datang, ${name}! 👋`, 'success');
            }, 1000);

            console.log('%c✅ App ready!', 'color: #10b981; font-size: 14px;');
        } catch (error) {
            console.error('❌ Fatal init error:', error);
            Utils.toast('Gagal init: ' + error.message, 'error');
            document.getElementById('loadingScreen')?.classList.add('fade-out');
            document.getElementById('app').style.display = '';
        }
    },

    setupNavigation() {
        // Nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.dataset.view;
                if (view) this.switchView(view);
            });
        });

        // Mobile menu
        document.getElementById('btnMenuMobile')?.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('active');
        });

        // Sidebar toggle
        document.getElementById('toggleSidebar')?.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('collapsed');
        });

        // Default view
        this.switchView('dashboard');
    },

    switchView(viewName) {
        AppState.setView(viewName);

        // Active nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === viewName);
        });

        // Show view
        document.querySelectorAll('.view').forEach(view => {
            view.classList.toggle('active', view.id === `view-${viewName}`);
        });

        // Page title
        const titles = {
            dashboard: 'Dashboard', pos: 'Kasir (POS)', products: 'Manajemen Produk',
            transactions: 'Riwayat Transaksi', stock: 'Manajemen Stok',
            customers: 'Pelanggan', reports: 'Laporan', shift: 'Shift Kasir'
        };
        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) pageTitle.textContent = titles[viewName] || 'Dashboard';

        // Close mobile sidebar
        if (window.innerWidth <= 768) {
            document.getElementById('sidebar')?.classList.remove('active');
        }

        // View-specific logic
        if (viewName === 'dashboard') this.refreshDashboard();
        if (viewName === 'transactions') this.loadTransactions();
        if (viewName === 'customers') this.loadCustomers();
        if (viewName === 'pos') ProductsModule.renderProductsGrid();
        if (viewName === 'stock') StockModule.render();
    },

    async refreshDashboard() {
        try {
            const todayTx = await API.transactions.getToday();
            const totalRev = todayTx.reduce((s, t) => s + (t.total_amount || 0), 0);
            const lowStock = AppState.products.filter(p => p.stock <= CONFIG.stock.lowStockThreshold).length;

            const el = (id) => document.getElementById(id);
            if (el('statTransactions')) el('statTransactions').textContent = todayTx.length;
            if (el('statRevenue')) el('statRevenue').textContent = Utils.formatCurrency(totalRev);
            if (el('statLowStock')) el('statLowStock').textContent = lowStock;

            this.renderRecentTransactions(todayTx.slice(0, 5));
        } catch (e) { console.error('Dashboard error:', e); }
    },

    renderRecentTransactions(transactions) {
        const tbody = document.getElementById('recentTransactionsBody');
        if (!tbody) return;

        if (transactions.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:#94a3b8;">
                <i class="fas fa-receipt fa-2x"></i><p>Belum ada transaksi hari ini</p></td></tr>`;
            return;
        }

        tbody.innerHTML = transactions.map(tx => `
            <tr>
                <td><code>${tx.transaction_code || tx.id}</code></td>
                <td>${tx.customer_name || 'Umum'}</td>
                <td><strong>${Utils.formatCurrency(tx.total_amount)}</strong></td>
                <td><span class="badge badge-info">${tx.payment_method}</span></td>
                <td><span class="badge badge-success">${tx.payment_status}</span></td>
                <td>${Utils.getRelativeTime(tx.created_at)}</td>
            </tr>
        `).join('');
    },

    async loadTransactions() {
        const tbody = document.getElementById('transactionsTableBody');
        if (!tbody) return;
        try {
            const txs = await API.transactions.getAll({ limit: 100 });
            tbody.innerHTML = txs.length === 0 
                ? `<tr><td colspan="8" style="text-align:center;padding:2rem;">Belum ada transaksi</td></tr>`
                : txs.map(tx => `
                    <tr>
                        <td><code>${tx.transaction_code || tx.id}</code></td>
                        <td>${Utils.formatDateTime(tx.created_at)}</td>
                        <td>${tx.customer_name || 'Umum'}</td>
                        <td>-</td>
                        <td><strong>${Utils.formatCurrency(tx.total_amount)}</strong></td>
                        <td>${tx.payment_method}</td>
                        <td><span class="badge badge-success">${tx.payment_status}</span></td>
                        <td><button class="btn-icon-small"><i class="fas fa-eye"></i></button></td>
                    </tr>
                `).join('');
        } catch (e) { console.error(e); }
    },

    async loadCustomers() {
        const tbody = document.getElementById('customersTableBody');
        if (!tbody) return;
        try {
            const customers = await API.customers.getAll();
            AppState.setCustomers(customers);
            tbody.innerHTML = customers.length === 0
                ? `<tr><td colspan="6" style="text-align:center;padding:2rem;">Belum ada pelanggan</td></tr>`
                : customers.map(c => `
                    <tr>
                        <td><strong>${c.name}</strong></td>
                        <td>${c.phone || '-'}</td>
                        <td>${c.total_transactions || 0}</td>
                        <td>${Utils.formatCurrency(c.total_spent || 0)}</td>
                        <td><span class="badge badge-info">${c.points || 0} pts</span></td>
                        <td><button class="btn-icon-small"><i class="fas fa-edit"></i></button></td>
                    </tr>
                `).join('');
        } catch (e) { console.error(e); }
    },

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.target.matches('input, textarea, select')) return;
            
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                document.getElementById('globalSearch')?.focus();
            }
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                ProductsModule.openNewModal();
            }
            if (e.ctrlKey && e.key === 'd') {
                e.preventDefault();
                AppState.toggleTheme();
            }
            if (e.key === 'F9') {
                e.preventDefault();
                PaymentModule.openPaymentModal();
            }
            if (e.key === 'Escape') {
                if (document.querySelector('.modal.active')) Utils.closeAllModals();
                else if (AppState.currentView === 'pos') CartModule.clearCart();
            }
        });
    }
};

// Bootstrap
document.addEventListener('DOMContentLoaded', () => AppMain.init());
console.log('%c✅ AppMain loaded', 'color: #10b981;');

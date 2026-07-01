/**
 * WARUNGKITA PRO MAX - Main Application
 * Versi dengan error handling yang lebih baik
 */

const AppMain = {
    async init() {
        console.log('%c🏪 WarungKita PRO MAX - Starting...', 'color: #3b82f6; font-size: 16px; font-weight: bold;');
        
        try {
            // 1. Check Supabase config
            console.log('%c📋 Checking configuration...', 'color: #94a3b8;');
            const isConfigured = typeof CONFIG !== 'undefined' && 
                                 typeof CONFIG.supabase !== 'undefined' &&
                                 CONFIG.supabase.apiKey !== 'PASTE_ANON_KEY_ANDA_DISINI';
            
            if (!isConfigured) {
                console.warn('⚠️ Supabase belum dikonfigurasi');
                this.showConfigWarning();
            } else {
                console.log('✅ Configuration OK');
            }

            // 2. Test Supabase connection (dengan timeout)
            console.log('%c🔌 Testing Supabase connection...', 'color: #94a3b8;');
            let isConnected = false;
            try {
                const connectionTest = await Promise.race([
                    API.healthCheck(),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Timeout')), 5000)
                    )
                ]);
                isConnected = connectionTest;
                console.log(isConnected ? '✅ Supabase connected' : '❌ Supabase connection failed');
            } catch (e) {
                console.warn('⚠️ Supabase unreachable:', e.message);
                isConnected = false;
            }

            if (!isConnected) {
                console.warn('%c⚠️ Running in OFFLINE mode', 'color: #f59e0b; font-weight: bold;');
                this.showOfflineWarning();
            }

            // 3. Initialize modules (dengan try-catch per module)
            console.log('%c📦 Loading modules...', 'color: #94a3b8;');
            await this.initModulesSafely();

            // 4. Initialize features
            console.log('%c🔧 Loading features...', 'color: #94a3b8;');
            this.initFeaturesSafely();

            // 5. Initialize Events
            console.log('%c🎯 Loading events...', 'color: #94a3b8;');
            if (typeof Events !== 'undefined') {
                try {
                    Events.init();
                    console.log('%c✅ Events loaded', 'color: #10b981;');
                } catch (e) {
                    console.error('❌ Events failed:', e);
                }
            }

            // 6. Setup navigation
            console.log('%c🧭 Setting up navigation...', 'color: #94a3b8;');
            this.setupNavigation();

            // 7. Setup keyboard shortcuts
            this.setupKeyboardShortcuts();

            // 8. HIDE LOADING SCREEN (PENTING!)
            console.log('%c✨ Hiding loading screen...', 'color: #10b981;');
            this.hideLoadingScreen();

            // 9. Show welcome
            setTimeout(() => {
                const name = typeof AuthModule !== 'undefined' && AuthModule.currentUser 
                    ? AuthModule.currentUser.name 
                    : 'User';
                Utils.toast(`Selamat datang, ${name}! 👋`, 'success', 3000);
            }, 500);

            console.log('%c✅✅✅ APP READY! ✅✅✅', 'color: #10b981; font-size: 20px; font-weight: bold;');
            
        } catch (error) {
            console.error('%c❌ FATAL ERROR during init:', 'color: #ef4444; font-size: 16px;', error);
            
            // Tetap hide loading screen meskipun ada error
            this.hideLoadingScreen();
            
            // Show error to user
            setTimeout(() => {
                Utils.toast(`Error: ${error.message}`, 'error', 5000);
                alert(`Aplikasi gagal load:\n\n${error.message}\n\nLihat console untuk detail.`);
            }, 500);
        }
    },

    showConfigWarning() {
        console.warn('%c⚠️ Supabase configuration missing!', 'color: #f59e0b; font-weight: bold;');
        console.warn('Edit js/config.js dan isi:');
        console.warn('- supabase.url');
        console.warn('- supabase.apiKey');
    },

    showOfflineWarning() {
        console.warn('%c⚠️ Running in OFFLINE mode', 'color: #f59e0b; font-weight: bold;');
        console.warn('Beberapa fitur tidak akan berfungsi tanpa koneksi Supabase');
    },

    async initModulesSafely() {
        const modules = [
            { name: 'AuthModule', required: false },
            { name: 'ProductsModule', required: true },
            { name: 'CartModule', required: true },
            { name: 'PaymentModule', required: true },
            { name: 'StockModule', required: false },
            { name: 'AIModule', required: false }
        ];

        for (const mod of modules) {
            const moduleObj = window[mod.name];
            if (moduleObj && typeof moduleObj.init === 'function') {
                try {
                    console.log(`   Loading ${mod.name}...`);
                    await moduleObj.init();
                    console.log(`   ✅ ${mod.name} OK`);
                } catch (error) {
                    console.error(`   ❌ ${mod.name} failed:`, error.message);
                    if (mod.required) {
                        throw new Error(`Required module ${mod.name} failed to load`);
                    }
                }
            } else {
                console.warn(`   ⚠️ ${mod.name} not found`);
            }
        }
    },

    initFeaturesSafely() {
        const features = [
            'ShiftModule',
            'BarcodeModule', 
            'OfflineModule',
            'ExportModule',
            'HoldCartModule',
            'NotificationsModule',
            'ReturnsModule',
            'SplitPaymentModule'
        ];

        features.forEach(name => {
            const feature = window[name];
            if (feature && typeof feature.init === 'function') {
                try {
                    feature.init();
                    console.log(`   ✅ ${name} OK`);
                } catch (e) {
                    console.warn(`   ⚠️ ${name} failed:`, e.message);
                }
            }
        });
    },

    setupNavigation() {
        console.log('   Setting up navigation...');
        
        // Nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.dataset.view;
                if (view) this.switchView(view);
            });
        });

        // Mobile menu
        const btnMenu = document.getElementById('btnMenuMobile');
        if (btnMenu) {
            btnMenu.addEventListener('click', () => {
                document.getElementById('sidebar').classList.toggle('active');
            });
        }

        // Sidebar toggle
        const btnToggle = document.getElementById('toggleSidebar');
        if (btnToggle) {
            btnToggle.addEventListener('click', () => {
                document.getElementById('sidebar').classList.toggle('collapsed');
            });
        }

        // Default view
        this.switchView('dashboard');
        console.log('   ✅ Navigation ready');
    },

    switchView(viewName) {
        console.log(`   Switching to view: ${viewName}`);
        
        // Update state
        if (typeof AppState !== 'undefined') {
            AppState.setView(viewName);
        }

        // Update nav active
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === viewName);
        });

        // Show/hide views
        document.querySelectorAll('.view').forEach(view => {
            const isActive = view.id === `view-${viewName}`;
            view.classList.toggle('active', isActive);
            view.style.display = isActive ? 'block' : 'none';
        });

        // Update title
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
        
        const titleEl = document.getElementById('pageTitle');
        if (titleEl) {
            titleEl.textContent = titles[viewName] || 'Dashboard';
        }

        // Close mobile sidebar
        if (window.innerWidth <= 768) {
            document.getElementById('sidebar')?.classList.remove('active');
        }

        // View-specific logic
        this.onViewChange(viewName);
    },

    onViewChange(viewName) {
        switch (viewName) {
            case 'dashboard':
                if (typeof AppMain !== 'undefined') AppMain.refreshDashboard();
                break;
            case 'transactions':
                if (typeof AppMain !== 'undefined') AppMain.loadTransactions();
                break;
            case 'customers':
                if (typeof AppMain !== 'undefined') AppMain.loadCustomers();
                break;
            case 'pos':
                if (typeof ProductsModule !== 'undefined') ProductsModule.renderProductsGrid();
                break;
            case 'stock':
                if (typeof StockModule !== 'undefined') StockModule.render();
                break;
        }
    },

    async refreshDashboard() {
        try {
            const el = (id) => document.getElementById(id);
            
            // Dummy data jika Supabase gagal
            const todayTx = typeof API !== 'undefined' ? await API.transactions.getToday().catch(() => []) : [];
            const totalRev = todayTx.reduce((s, t) => s + (t.total_amount || 0), 0);
            const products = typeof AppState !== 'undefined' ? AppState.products : [];
            const lowStock = products.filter(p => p.stock <= 10).length;

            if (el('statTransactions')) el('statTransactions').textContent = todayTx.length || 0;
            if (el('statRevenue')) el('statRevenue').textContent = Utils?.formatCurrency(totalRev) || 'Rp 0';
            if (el('statProductsSold')) el('statProductsSold').textContent = '0';
            if (el('statLowStock')) el('statLowStock').textContent = lowStock;

            this.renderRecentTransactions(todayTx.slice(0, 5));
        } catch (e) {
            console.warn('Dashboard refresh failed:', e);
        }
    },

    renderRecentTransactions(transactions) {
        const tbody = document.getElementById('recentTransactionsBody');
        if (!tbody) return;

        if (!transactions || transactions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 2rem; color: #94a3b8;">
                        <i class="fas fa-receipt" style="font-size: 2rem; display: block; margin-bottom: 0.5rem;"></i>
                        Belum ada transaksi hari ini
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = transactions.map(tx => `
            <tr>
                <td><code>${tx.transaction_code || tx.id || '-'}</code></td>
                <td>${tx.customer_name || 'Umum'}</td>
                <td><strong>${Utils?.formatCurrency(tx.total_amount) || 'Rp 0'}</strong></td>
                <td><span class="badge badge-info">${tx.payment_method || '-'}</span></td>
                <td><span class="badge badge-success">${tx.payment_status || '-'}</span></td>
                <td>${Utils?.getRelativeTime(tx.created_at) || '-'}</td>
            </tr>
        `).join('');
    },

    async loadTransactions() {
        const tbody = document.getElementById('transactionsTableBody');
        if (!tbody) return;

        try {
            const txs = typeof API !== 'undefined' ? await API.transactions.getAll({ limit: 100 }).catch(() => []) : [];
            
            if (!txs || txs.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align: center; padding: 2rem;">
                            Belum ada transaksi
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = txs.map(tx => `
                <tr>
                    <td><code>${tx.transaction_code || tx.id}</code></td>
                    <td>${Utils?.formatDateTime(tx.created_at) || '-'}</td>
                    <td>${tx.customer_name || 'Umum'}</td>
                    <td>-</td>
                    <td><strong>${Utils?.formatCurrency(tx.total_amount) || 'Rp 0'}</strong></td>
                    <td>${tx.payment_method || '-'}</td>
                    <td><span class="badge badge-success">${tx.payment_status || '-'}</span></td>
                    <td><button class="btn-icon-small"><i class="fas fa-eye"></i></button></td>
                </tr>
            `).join('');
        } catch (e) {
            console.error('Load transactions failed:', e);
        }
    },

    async loadCustomers() {
        const tbody = document.getElementById('customersTableBody');
        if (!tbody) return;

        try {
            const customers = typeof API !== 'undefined' ? await API.customers.getAll().catch(() => []) : [];
            
            if (typeof AppState !== 'undefined') AppState.setCustomers(customers);

            tbody.innerHTML = customers.length === 0 
                ? `<tr><td colspan="6" style="text-align:center;padding:2rem;">Belum ada pelanggan</td></tr>`
                : customers.map(c => `
                    <tr>
                        <td><strong>${c.name}</strong></td>
                        <td>${c.phone || '-'}</td>
                        <td>${c.total_transactions || 0}</td>
                        <td>${Utils?.formatCurrency(c.total_spent || 0) || 'Rp 0'}</td>
                        <td><span class="badge badge-info">${c.points || 0} pts</span></td>
                        <td><button class="btn-icon-small"><i class="fas fa-edit"></i></button></td>
                    </tr>
                `).join('');
        } catch (e) {
            console.error('Load customers failed:', e);
        }
    },

    hideLoadingScreen() {
        console.log('   Hiding loading screen...');
        
        const loading = document.getElementById('loadingScreen');
        const app = document.getElementById('app');
        
        if (loading) {
            loading.classList.add('fade-out');
            setTimeout(() => {
                loading.style.display = 'none';
            }, 500);
        } else {
            console.warn('⚠️ loadingScreen element not found');
        }
        
        if (app) {
            app.style.display = 'block';
            app.style.opacity = '1';
        } else {
            console.warn('⚠️ app element not found');
        }
        
        console.log('   ✅ Loading screen hidden');
    },

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.target.matches('input, textarea, select')) return;
            
            // Ctrl+K: Search
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                document.getElementById('globalSearch')?.focus();
            }
            
            // Ctrl+N: New product
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                if (typeof ProductsModule !== 'undefined') ProductsModule.openNewModal();
            }
            
            // Ctrl+D: Toggle theme
            if (e.ctrlKey && e.key === 'd') {
                e.preventDefault();
                if (typeof AppState !== 'undefined') AppState.toggleTheme();
            }
            
            // F9: Payment
            if (e.key === 'F9') {
                e.preventDefault();
                if (typeof PaymentModule !== 'undefined') PaymentModule.openPaymentModal();
            }
            
            // Escape: Clear/close
            if (e.key === 'Escape') {
                if (document.querySelector('.modal.active')) {
                    if (typeof Utils !== 'undefined') Utils.closeAllModals();
                } else if (typeof AppState !== 'undefined' && AppState.currentView === 'pos') {
                    if (typeof CartModule !== 'undefined') CartModule.clearCart();
                }
            }
        });
    }
};

// Bootstrap when DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AppMain.init());
} else {
    AppMain.init();
}

console.log('%c✅ AppMain loaded', 'color: #10b981;');

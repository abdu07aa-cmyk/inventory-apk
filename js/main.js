const AppMain = {
    async init() {
        console.log('WarungKita PRO MAX - Starting...');
        
        try {
            let isConnected = false;
            try {
                isConnected = await Promise.race([
                    API.healthCheck(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
                ]);
            } catch (e) {
                isConnected = false;
            }
            
            console.log(isConnected ? 'Supabase connected' : 'Offline mode');

            this.initFeatures();
            this.setupNavigation();
            this.setupKeyboardShortcuts();
            this.hideLoadingScreen();

            setTimeout(() => {
                const name = AuthModule && AuthModule.currentUser 
                    ? AuthModule.currentUser.name 
                    : 'User';
                Utils.toast('Selamat datang, ' + name + '!', 'success', 3000);
            }, 500);

            console.log('APP READY!');
            
        } catch (error) {
            console.error('FATAL ERROR:', error);
            this.hideLoadingScreen();
            Utils.toast('Error: ' + error.message, 'error', 5000);
        }
    },

    initFeatures() {
        var features = [
            'ShiftModule',
            'BarcodeModule', 
            'OfflineModule',
            'ExportModule',
            'HoldCartModule',
            'NotificationsModule',
            'ReturnsModule',
            'SplitPaymentModule'
        ];

        features.forEach(function(name) {
            var feature = window[name];
            if (feature && typeof feature.init === 'function') {
                try {
                    feature.init();
                    console.log('  ' + name + ' initialized');
                } catch (e) {
                    console.warn(name + ' failed:', e.message);
                }
            }
        });
    },

    setupNavigation() {
        var navItems = document.querySelectorAll('.nav-item');
        for (var i = 0; i < navItems.length; i++) {
            navItems[i].addEventListener('click', (function(item) {
                return function(e) {
                    e.preventDefault();
                    var view = item.dataset.view;
                    if (view) AppMain.switchView(view);
                };
            })(navItems[i]));
        }

        var btnMenu = document.getElementById('btnMenuMobile');
        if (btnMenu) {
            btnMenu.addEventListener('click', function() {
                document.getElementById('sidebar').classList.toggle('active');
            });
        }

        var btnToggle = document.getElementById('toggleSidebar');
        if (btnToggle) {
            btnToggle.addEventListener('click', function() {
                document.getElementById('sidebar').classList.toggle('collapsed');
            });
        }

        this.switchView('dashboard');
        console.log('Navigation ready');
    },

    switchView: function(viewName) {
        var viewMap = {
            'kasir': 'pos',
            'produk': 'products',
            'transaksi': 'transactions',
            'stok': 'stock',
            'pelanggan': 'customers',
            'laporan': 'reports',
            'pengaturan': 'settings'
        };
        
        var normalizedView = viewMap[viewName] || viewName;
        
        if (typeof AppState !== 'undefined') {
            AppState.setView(normalizedView);
        }

        var navItems = document.querySelectorAll('.nav-item');
        for (var i = 0; i < navItems.length; i++) {
            var itemView = viewMap[navItems[i].dataset.view] || navItems[i].dataset.view;
            navItems[i].classList.toggle('active', itemView === normalizedView);
        }

        var views = document.querySelectorAll('.view');
        for (var i = 0; i < views.length; i++) {
            var isActive = views[i].id === 'view-' + viewName || views[i].id === 'view-' + normalizedView;
            views[i].classList.toggle('active', isActive);
            views[i].style.display = isActive ? 'block' : 'none';
        }

        var titles = {
            'dashboard': 'Dashboard',
            'pos': 'Kasir (POS)',
            'kasir': 'Kasir (POS)',
            'products': 'Manajemen Produk',
            'produk': 'Manajemen Produk',
            'transactions': 'Riwayat Transaksi',
            'transaksi': 'Riwayat Transaksi',
            'stock': 'Manajemen Stok',
            'stok': 'Manajemen Stok',
            'customers': 'Pelanggan',
            'pelanggan': 'Pelanggan',
            'reports': 'Laporan',
            'laporan': 'Laporan',
            'shift': 'Shift Kasir',
            'settings': 'Pengaturan',
            'pengaturan': 'Pengaturan'
        };
        
        var titleEl = document.getElementById('pageTitle');
        if (titleEl) {
            titleEl.textContent = titles[viewName] || titles[normalizedView] || 'Dashboard';
        }

        if (window.innerWidth <= 768) {
            var sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.remove('active');
        }

        this.onViewChange(normalizedView);
    },

    onViewChange: function(viewName) {
        switch (viewName) {
            case 'dashboard':
                this.refreshDashboard();
                break;
            case 'transactions':
                this.loadTransactions();
                break;
            case 'customers':
                this.loadCustomers();
                break;
            case 'pos':
                if (typeof ProductsModule !== 'undefined') ProductsModule.renderProductsGrid();
                break;
            case 'stock':
                if (typeof StockModule !== 'undefined') StockModule.render();
                break;
        }
    },

    refreshDashboard: async function() {
        try {
            var todayTx = [];
            if (typeof API !== 'undefined') {
                try {
                    todayTx = await API.transactions.getToday();
                } catch (e) {
                    todayTx = [];
                }
            }
            
            var totalRev = 0;
            for (var i = 0; i < todayTx.length; i++) {
                totalRev += todayTx[i].total_amount || 0;
            }
            
            var products = AppState ? AppState.products : [];
            var lowStock = 0;
            for (var i = 0; i < products.length; i++) {
                if (products[i].stock <= 10) lowStock++;
            }

            var elTx = document.getElementById('statTransactions');
            var elRev = document.getElementById('statRevenue');
            var elLow = document.getElementById('statLowStock');
            
            if (elTx) elTx.textContent = todayTx.length;
            if (elRev) elRev.textContent = Utils ? Utils.formatCurrency(totalRev) : 'Rp 0';
            if (elLow) elLow.textContent = lowStock;

            this.renderRecentTransactions(todayTx.slice(0, 5));
        } catch (e) {
            console.warn('Dashboard refresh failed:', e);
        }
    },

    renderRecentTransactions: function(transactions) {
        var tbody = document.getElementById('recentTransactionsBody');
        if (!tbody) return;

        if (!transactions || transactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:#94a3b8;">Belum ada transaksi hari ini</td></tr>';
            return;
        }

        var html = '';
        for (var i = 0; i < transactions.length; i++) {
            var tx = transactions[i];
            html += '<tr>';
            html += '<td><code>' + (tx.transaction_code || tx.id || '-') + '</code></td>';
            html += '<td>' + (tx.customer_name || 'Umum') + '</td>';
            html += '<td><strong>' + (Utils ? Utils.formatCurrency(tx.total_amount) : 'Rp 0') + '</strong></td>';
            html += '<td><span class="badge badge-info">' + (tx.payment_method || '-') + '</span></td>';
            html += '<td><span class="badge badge-success">' + (tx.payment_status || '-') + '</span></td>';
            html += '<td>' + (Utils ? Utils.getRelativeTime(tx.created_at) : '-') + '</td>';
            html += '</tr>';
        }
        tbody.innerHTML = html;
    },

    loadTransactions: async function() {
        var tbody = document.getElementById('transactionsTableBody');
        if (!tbody) return;

        try {
            var txs = [];
            if (typeof API !== 'undefined') {
                try {
                    txs = await API.transactions.getAll({ limit: 100 });
                } catch (e) {
                    txs = [];
                }
            }
            
            if (!txs || txs.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;">Belum ada transaksi</td></tr>';
                return;
            }

            var html = '';
            for (var i = 0; i < txs.length; i++) {
                var tx = txs[i];
                html += '<tr>';
                html += '<td><code>' + (tx.transaction_code || tx.id) + '</code></td>';
                html += '<td>' + (Utils ? Utils.formatDateTime(tx.created_at) : '-') + '</td>';
                html += '<td>' + (tx.customer_name || 'Umum') + '</td>';
                html += '<td>-</td>';
                html += '<td><strong>' + (Utils ? Utils.formatCurrency(tx.total_amount) : 'Rp 0') + '</strong></td>';
                html += '<td>' + (tx.payment_method || '-') + '</td>';
                html += '<td><span class="badge badge-success">' + (tx.payment_status || '-') + '</span></td>';
                html += '<td><button class="btn-icon-small"><i class="fas fa-eye"></i></button></td>';
                html += '</tr>';
            }
            tbody.innerHTML = html;
        } catch (e) {
            console.error('Load transactions failed:', e);
        }
    },

    loadCustomers: async function() {
        var tbody = document.getElementById('customersTableBody');
        if (!tbody) return;

        try {
            var customers = [];
            if (typeof API !== 'undefined') {
                try {
                    customers = await API.customers.getAll();
                } catch (e) {
                    customers = [];
                }
            }
            
            if (typeof AppState !== 'undefined') AppState.setCustomers(customers);

            if (customers.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;">Belum ada pelanggan</td></tr>';
                return;
            }

            var html = '';
            for (var i = 0; i < customers.length; i++) {
                var c = customers[i];
                html += '<tr>';
                html += '<td><strong>' + c.name + '</strong></td>';
                html += '<td>' + (c.phone || '-') + '</td>';
                html += '<td>' + (c.total_transactions || 0) + '</td>';
                html += '<td>' + (Utils ? Utils.formatCurrency(c.total_spent || 0) : 'Rp 0') + '</td>';
                html += '<td><span class="badge badge-info">' + (c.points || 0) + ' pts</span></td>';
                html += '<td><button class="btn-icon-small"><i class="fas fa-edit"></i></button></td>';
                html += '</tr>';
            }
            tbody.innerHTML = html;
        } catch (e) {
            console.error('Load customers failed:', e);
        }
    },

    hideLoadingScreen: function() {
        var loading = document.getElementById('loadingScreen');
        var app = document.getElementById('app');
        
        if (loading) {
            loading.classList.add('fade-out');
            setTimeout(function() {
                loading.style.display = 'none';
            }, 500);
        }
        
        if (app) {
            app.style.display = 'block';
            app.style.opacity = '1';
        }
        
        console.log('Loading screen hidden');
    },

    setupKeyboardShortcuts: function() {
        document.addEventListener('keydown', function(e) {
            if (e.target.matches('input, textarea, select')) return;
            
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                var search = document.getElementById('globalSearch');
                if (search) search.focus();
            }
            
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                if (typeof ProductsModule !== 'undefined') ProductsModule.openNewModal();
            }
            
            if (e.ctrlKey && e.key === 'd') {
                e.preventDefault();
                if (typeof AppState !== 'undefined') AppState.toggleTheme();
            }
            
            if (e.key === 'F9') {
                e.preventDefault();
                if (typeof PaymentModule !== 'undefined') PaymentModule.openPaymentModal();
            }
            
            if (e.key === 'Escape') {
                var modal = document.querySelector('.modal.active');
                if (modal) {
                    if (typeof Utils !== 'undefined') Utils.closeAllModals();
                } else if (typeof AppState !== 'undefined' && AppState.currentView === 'pos') {
                    if (typeof CartModule !== 'undefined') CartModule.clearCart();
                }
            }
        });
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        AppMain.init();
    });
} else {
    AppMain.init();
}

console.log('AppMain loaded');

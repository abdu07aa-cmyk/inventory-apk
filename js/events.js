/**
 * ================================================================
 * WARUNGKITA PRO MAX - EVENT HANDLERS
 * ================================================================
 * Semua event listeners terpusat di sini.
 * ================================================================
 */

import { state, subscribe, navigateTo, setTheme, clearCart } from './state.js';
import { showToast, debounce } from './utils.js';
import * as Products from './modules/products.js';
import * as Cart from './modules/cart.js';
import * as Payment from './modules/payment.js';
import * as Stock from './modules/stock.js';
import * as AI from './modules/ai.js';

// ================================================================
// NAVIGATION
// ================================================================

/**
 * Setup navigation event listeners
 */
export function setupNavigation() {
    // Sidebar navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            navigateToSection(section);
        });
    });

    // Mobile menu toggle
    const menuToggle = document.getElementById('mobileMenuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
        });
    }

    // Close sidebar on outside click (mobile)
    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('sidebar');
        const toggle = document.getElementById('mobileMenuToggle');
        if (window.innerWidth <= 768) {
            if (!sidebar.contains(e.target) && !toggle.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        }
    });
}

/**
 * Navigate to section
 * @param {string} section - Section name
 */
export function navigateToSection(section) {
    // Update URL hash
    window.location.hash = section;

    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.section === section);
    });

    // Update sections
    document.querySelectorAll('.page-section').forEach(sectionEl => {
        sectionEl.classList.toggle('active', sectionEl.id === section);
    });

    // Update state
    navigateTo(section);

    // Refresh content based on section
    switch (section) {
        case 'dashboard':
            refreshDashboard();
            break;
        case 'pos':
            Products.renderProductGrid();
            Cart.renderCart();
            break;
        case 'products':
            Products.renderProducts();
            break;
        case 'transactions':
            renderTransactions();
            break;
        case 'stock':
            Stock.renderLowStockAlerts();
            Stock.renderLowStockList();
            Stock.updateStockStats();
            break;
        case 'customers':
            renderCustomers();
            break;
        case 'shifts':
            renderShifts();
            break;
    }

    // Close mobile sidebar
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
    }
}

// ================================================================
// DASHBOARD
// ================================================================

/**
 * Refresh dashboard
 */
export function refreshDashboard() {
    updateDashboardStats();
    updateRecentTransactions();
    updateCharts();
}

/**
 * Update dashboard statistics
 */
function updateDashboardStats() {
    const today = new Date().toISOString().split('T')[0];
    const todayTransactions = state.transactions.filter(t =>
        t.createdAt && t.createdAt.startsWith(today)
    );

    const todayTotal = todayTransactions.reduce((sum, t) => sum + t.total_amount, 0);
    const totalTransactions = state.transactions.length;
    const totalProductsSold = state.transactions.reduce((sum, t) => {
        if (t.items) {
            return sum + t.items.reduce((s, item) => s + item.quantity, 0);
        }
        return sum;
    }, 0);

    document.getElementById('todaySales').textContent = formatCurrency(todayTotal);
    document.getElementById('totalTransactions').textContent = totalTransactions;
    document.getElementById('totalProductsSold').textContent = totalProductsSold;
    document.getElementById('activeCustomers').textContent = state.customers.length;
}

/**
 * Update recent transactions
 */
function updateRecentTransactions() {
    const tbody = document.getElementById('recentTransactions');
    const recent = state.transactions.slice(0, 10);

    if (recent.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">Belum ada transaksi</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = recent.map(t => `
        <tr>
            <td><code>${t.id}</code></td>
            <td>${t.customer_name || 'Umum'}</td>
            <td class="font-semibold">${formatCurrency(t.total_amount)}</td>
            <td><span class="badge badge-primary">${t.payment_method || 'Tunai'}</span></td>
            <td><span class="badge badge-success">${t.payment_status || 'Selesai'}</span></td>
            <td>${formatDate(t.createdAt)}</td>
        </tr>
    `).join('');
}

/**
 * Update charts
 */
function updateCharts() {
    // Import charts module dynamically
    import('./charts.js').then(({ updateSalesChart, updateTopProductsChart, generateSampleSalesData, generateSampleProductsData }) => {
        // Use real data if available, otherwise sample data
        const salesData = state.transactions.length > 0 
            ? state.transactions.map(t => ({
                date: t.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
                total: t.total_amount || 0
            }))
            : generateSampleSalesData(30);

        updateSalesChart(salesData, 30);

        // Top products data
        const productSales = {};
        state.transactions.forEach(t => {
            if (t.items) {
                t.items.forEach(item => {
                    const key = item.product_id || item.product_name;
                    if (!productSales[key]) {
                        productSales[key] = {
                            name: item.product_name,
                            quantity: 0
                        };
                    }
                    productSales[key].quantity += item.quantity;
                });
            }
        });

        const topProductsData = Object.values(productSales);
        updateTopProductsChart(topProductsData.length > 0 ? topProductsData : generateSampleProductsData(5));
    });
}

// ================================================================
// TRANSACTIONS
// ================================================================

/**
 * Render transactions table
 */
function renderTransactions() {
    const tbody = document.getElementById('transactionsTableBody');
    if (!tbody) return;

    const { transactions } = state;

    if (transactions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted" style="padding: var(--spacing-8);">
                    <i class="fas fa-receipt" style="font-size: 2rem; display: block; margin-bottom: var(--spacing-3);"></i>
                    <p>Belum ada transaksi</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = transactions.map(t => `
        <tr>
            <td><code>${t.id}</code></td>
            <td>${t.customer_name || 'Umum'}</td>
            <td class="font-semibold">${formatCurrency(t.total_amount)}</td>
            <td>${t.discount > 0 ? `-${formatCurrency(t.discount)}` : '-'}</td>
            <td><span class="badge badge-primary">${t.payment_method || 'Tunai'}</span></td>
            <td><span class="badge badge-success">${t.payment_status || 'Selesai'}</span></td>
            <td>${formatDate(t.createdAt)}</td>
            <td>
                <button class="btn btn-sm btn-outline view-transaction" data-id="${t.id}">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');

    // Attach view events
    tbody.querySelectorAll('.view-transaction').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const transaction = state.transactions.find(t => t.id === id);
            if (transaction) {
                Payment.showReceipt(transaction);
            }
        });
    });
}

// ================================================================
// CUSTOMERS
// ================================================================

/**
 * Render customers table
 */
function renderCustomers() {
    const tbody = document.getElementById('customersTableBody');
    if (!tbody) return;

    const { customers } = state;

    if (customers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted" style="padding: var(--spacing-8);">
                    <i class="fas fa-users" style="font-size: 2rem; display: block; margin-bottom: var(--spacing-3);"></i>
                    <p>Belum ada pelanggan</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = customers.map((c, index) => `
        <tr>
            <td>${index + 1}</td>
            <td class="font-medium">${c.name}</td>
            <td>${c.phone || '-'}</td>
            <td><span class="badge badge-warning">${c.points || 0} poin</span></td>
            <td>${formatDateShort(c.createdAt)}</td>
            <td>
                <div class="actions">
                    <button class="btn btn-sm btn-outline edit-customer" data-id="${c.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger delete-customer" data-id="${c.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ================================================================
// SHIFTS
// ================================================================

/**
 * Render shifts table
 */
function renderShifts() {
    const tbody = document.getElementById('shiftsTableBody');
    if (!tbody) return;

    const { shifts } = state;

    if (shifts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted" style="padding: var(--spacing-8);">
                    <i class="fas fa-clock" style="font-size: 2rem; display: block; margin-bottom: var(--spacing-3);"></i>
                    <p>Belum ada shift</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = shifts.map(s => `
        <tr>
            <td><code>${s.id}</code></td>
            <td>${s.cashier_name || 'Kasir'}</td>
            <td>${formatDate(s.openedAt)}</td>
            <td>${s.closedAt ? formatDate(s.closedAt) : '-'}</td>
            <td>
                <span class="badge ${s.status === 'open' ? 'badge-success' : 'badge-secondary'}">
                    ${s.status === 'open' ? 'Buka' : 'Tutup'}
                </span>
            </td>
            <td>${s.transaction_count || 0}</td>
            <td>
                <button class="btn btn-sm btn-outline view-shift" data-id="${s.id}">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// ================================================================
// KEYBOARD SHORTCUTS
// ================================================================

/**
 * Setup keyboard shortcuts
 */
export function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+K - Focus search
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            const search = document.getElementById('globalSearch');
            if (search) {
                search.focus();
                search.select();
            }
        }

        // Ctrl+N - New product
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            Products.openProductModal();
        }

        // Ctrl+D - Toggle theme
        if (e.ctrlKey && e.key === 'd') {
            e.preventDefault();
            toggleTheme();
        }

        // F9 - Process payment
        if (e.key === 'F9') {
            e.preventDefault();
            Payment.openPaymentModal();
        }

        // Escape - Close modals / Clear cart
        if (e.key === 'Escape') {
            const activeModals = document.querySelectorAll('.modal.active');
            if (activeModals.length > 0) {
                activeModals.forEach(modal => {
                    modal.classList.remove('active');
                });
            } else if (state.cart.length > 0) {
                clearCart();
                Cart.renderCart();
                showToast('Keranjang dikosongkan', 'info');
            }
        }
    });
}

/**
 * Toggle theme
 */
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
    showToast(`Mode ${next === 'dark' ? '🌙 Gelap' : '☀️ Terang'}`, 'info');
}

// ================================================================
// GLOBAL SEARCH
// ================================================================

/**
 * Setup global search
 */
export function setupGlobalSearch() {
    const search = document.getElementById('globalSearch');
    if (!search) return;

    const debouncedSearch = debounce(() => {
        const query = search.value.trim();
        if (!query) return;

        // Search in products
        const products = state.products.filter(p =>
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.barcode?.includes(query)
        );

        if (products.length > 0) {
            navigateToSection('products');
            state.filters.products.search = query;
            Products.renderProducts();
        } else {
            // Search in transactions
            const transactions = state.transactions.filter(t =>
                t.id.toLowerCase().includes(query.toLowerCase()) ||
                t.customer_name?.toLowerCase().includes(query.toLowerCase())
            );

            if (transactions.length > 0) {
                navigateToSection('transactions');
                // Render filtered transactions
                renderTransactions();
            } else {
                showToast(`Tidak ditemukan hasil untuk "${query}"`, 'info');
            }
        }

        search.value = '';
    }, 500);

    search.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            debouncedSearch();
        }
    });
}

// ================================================================
// MODAL EVENTS
// ================================================================

/**
 * Setup modal event listeners
 */
export function setupModalEvents() {
    // Close modal on overlay click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });

    // Close modal on close button
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
            }
        });
    });
}

// ================================================================
// PRODUCT EVENTS
// ================================================================

/**
 * Setup product event listeners
 */
export function setupProductEvents() {
    // Add product button
    document.getElementById('addProductBtn')?.addEventListener('click', () => {
        Products.openProductModal();
    });

    // Save product
    document.getElementById('saveProductBtn')?.addEventListener('click', () => {
        Products.handleProductForm();
    });

    // Generate barcode
    document.getElementById('generateBarcodeBtn')?.addEventListener('click', () => {
        const input = document.getElementById('productBarcode');
        if (input) {
            input.value = generateBarcode();
        }
    });

    // Import products
    document.getElementById('importProductsBtn')?.addEventListener('click', () => {
        showToast('Fitur import produk sedang dalam pengembangan', 'info');
    });

    // Export products
    document.getElementById('exportProductsBtn')?.addEventListener('click', () => {
        exportProducts();
    });
}

// ================================================================
// CART EVENTS
// ================================================================

/**
 * Setup cart event listeners
 */
export function setupCartEvents() {
    // Clear cart
    document.getElementById('clearCartBtn')?.addEventListener('click', () => {
        Cart.clearCartItems();
    });

    // Hold cart
    document.getElementById('holdCartBtn')?.addEventListener('click', () => {
        Cart.holdCurrentCart();
    });

    // Apply discount
    document.getElementById('applyDiscountBtn')?.addEventListener('click', () => {
        const input = document.getElementById('discountCode');
        if (input) {
            Cart.applyDiscount(input.value);
            input.value = '';
        }
    });

    // Payment button
    document.getElementById('paymentBtn')?.addEventListener('click', () => {
        Payment.openPaymentModal();
    });

    // Product selected from POS
    document.addEventListener('product-selected', (e) => {
        const { productId } = e.detail;
        Cart.addProductToCart(productId);
    });

    // Cart updated
    document.addEventListener('cart-updated', () => {
        Cart.renderCart();
    });

    // Cart cleared
    document.addEventListener('cart-cleared', () => {
        Cart.renderCart();
        // Close payment modal if open
        const paymentModal = document.getElementById('paymentModal');
        if (paymentModal) {
            paymentModal.classList.remove('active');
        }
    });
}

// ================================================================
// PAYMENT EVENTS
// ================================================================

/**
 * Setup payment event listeners
 */
export function setupPaymentEvents() {
    // Payment method selection
    document.querySelectorAll('.payment-method-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const method = btn.dataset.method;
            Payment.selectPaymentMethod(method);
        });
    });

    // Process payment
    document.getElementById('processPaymentBtn')?.addEventListener('click', () => {
        Payment.processPayment();
    });

    // Print receipt
    document.getElementById('printReceiptBtn')?.addEventListener('click', () => {
        Payment.printReceipt();
    });
}

// ================================================================
// STOCK EVENTS
// ================================================================

/**
 * Setup stock event listeners
 */
export function setupStockEvents() {
    // Stock in
    document.getElementById('stockInBtn')?.addEventListener('click', () => {
        Stock.openStockInModal();
    });

    // Stock out
    document.getElementById('stockOutBtn')?.addEventListener('click', () => {
        Stock.openStockOutModal();
    });

    // Stock in request from product list
    document.addEventListener('stock-in-request', (e) => {
        const { productId } = e.detail;
        Stock.openStockInModal(productId);
    });

    // Save stock
    document.getElementById('saveStockBtn')?.addEventListener('click', () => {
        Stock.handleStockForm();
    });
}

// ================================================================
// AI EVENTS
// ================================================================

/**
 * Setup AI event listeners
 */
export function setupAIEvents() {
    // AI Assistant button
    document.getElementById('aiAssistantBtn')?.addEventListener('click', () => {
        AI.openAIModal();
    });

    // AI send
    document.getElementById('aiSendBtn')?.addEventListener('click', () => {
        AI.sendAIMessage();
    });

    // AI input enter
    document.getElementById('aiInput')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            AI.sendAIMessage();
        }
    });

    // AI events from commands
    document.addEventListener('ai-open-product-modal', () => {
        Products.openProductModal();
        document.getElementById('aiModal')?.classList.remove('active');
    });

    document.addEventListener('ai-navigate', (e) => {
        const { section } = e.detail;
        navigateToSection(section);
        document.getElementById('aiModal')?.classList.remove('active');
    });
}

// ================================================================
// SHIFT EVENTS
// ================================================================

/**
 * Setup shift event listeners
 */
export function setupShiftEvents() {
    // Open shift
    document.getElementById('openShiftBtn')?.addEventListener('click', () => {
        openShiftModal();
    });

    // Close shift
    document.getElementById('closeShiftBtn')?.addEventListener('click', () => {
        closeShiftModal();
    });

    // Save shift
    document.getElementById('saveShiftBtn')?.addEventListener('click', () => {
        handleShiftForm();
    });
}

/**
 * Open shift modal
 */
function openShiftModal() {
    const modal = document.getElementById('shiftModal');
    const title = document.getElementById('shiftModalTitle');
    const form = document.getElementById('shiftForm');

    form.reset();
    title.textContent = 'Buka Shift';

    // Check if shift already open
    if (state.activeShiftId) {
        showToast('Shift sudah dibuka!', 'warning');
        return;
    }

    // Set default cashier name
    const cashierInput = document.getElementById('shiftCashierName');
    if (cashierInput && !cashierInput.value) {
        cashierInput.value = 'Kasir ' + new Date().toLocaleDateString();
    }

    modal.classList.add('active');
}

/**
 * Close shift modal
 */
function closeShiftModal() {
    const modal = document.getElementById('shiftModal');
    const title = document.getElementById('shiftModalTitle');

    if (!state.activeShiftId) {
        showToast('Tidak ada shift yang aktif!', 'warning');
        return;
    }

    const shift = state.shifts.find(s => s.id === state.activeShiftId);
    if (!shift) {
        showToast('Shift tidak ditemukan!', 'error');
        return;
    }

    title.textContent = 'Tutup Shift';

    // Calculate expected cash
    const todayTransactions = state.transactions.filter(t => {
        if (!t.createdAt) return false;
        return t.createdAt.startsWith(new Date().toISOString().split('T')[0]);
    });

    const totalSales = todayTransactions.reduce((sum, t) => sum + t.total_amount, 0);
    const expectedCash = (shift.initial_cash || 0) + totalSales;

    document.getElementById('shiftInitialCash').value = shift.initial_cash || 0;
    document.getElementById('shiftCashierName').value = shift.cashier_name || 'Kasir';

    // Show expected cash
    const note = document.getElementById('shiftNote');
    if (note) {
        note.placeholder = `Saldo akhir yang diharapkan: ${formatCurrency(expectedCash)}\nMasukkan saldo akhir...`;
    }

    // Add final cash input if not exists
    let finalCashGroup = document.querySelector('.final-cash-group');
    if (!finalCashGroup) {
        const form = document.getElementById('shiftForm');
        const html = `
            <div class="form-group final-cash-group">
                <label>Saldo Akhir *</label>
                <input type="number" id="shiftFinalCash" required min="0" step="1000" />
                <small class="form-help">Saldo akhir yang diharapkan: ${formatCurrency(expectedCash)}</small>
            </div>
        `;
        // Insert before the last form group
        const lastGroup = form.querySelector('.form-group:last-child');
        if (lastGroup) {
            lastGroup.insertAdjacentHTML('beforebegin', html);
        } else {
            form.insertAdjacentHTML('beforeend', html);
        }
    }

    modal.classList.add('active');
}

/**
 * Handle shift form
 */
function handleShiftForm() {
    const title = document.getElementById('shiftModalTitle').textContent;
    const isOpening = title === 'Buka Shift';

    const cashierName = document.getElementById('shiftCashierName').value.trim();
    const initialCash = parseInt(document.getElementById('shiftInitialCash').value) || 0;

    if (!cashierName) {
        showToast('Nama kasir harus diisi!', 'error');
        return;
    }

    if (isOpening) {
        // Open shift
        const shift = {
            cashier_name: cashierName,
            initial_cash: initialCash,
            status: 'open'
        };

        const result = openShift(shift);
        if (result) {
            showToast('Shift berhasil dibuka!', 'success');
            updateShiftUI();
        }
    } else {
        // Close shift
        const finalCash = parseInt(document.getElementById('shiftFinalCash')?.value) || 0;

        if (!finalCash) {
            showToast('Saldo akhir harus diisi!', 'error');
            return;
        }

        const result = closeShift(state.activeShiftId, finalCash);
        if (result) {
            showToast('Shift berhasil ditutup!', 'success');
            updateShiftUI();

            // Remove final cash input
            const finalGroup = document.querySelector('.final-cash-group');
            if (finalGroup) {
                finalGroup.remove();
            }
        }
    }

    document.getElementById('shiftModal').classList.remove('active');
    renderShifts();
}

// ================================================================
// THEME EVENTS
// ================================================================

/**
 * Setup theme event listeners
 */
export function setupThemeEvents() {
    // Theme toggle in sidebar
    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);

    // Theme settings
    document.getElementById('themeLightBtn')?.addEventListener('click', () => {
        setTheme('light');
        showToast('Mode ☀️ Terang', 'info');
    });

    document.getElementById('themeDarkBtn')?.addEventListener('click', () => {
        setTheme('dark');
        showToast('Mode 🌙 Gelap', 'info');
    });

    document.getElementById('themeSystemBtn')?.addEventListener('click', () => {
        setTheme('system');
        showToast('Mode 🔄 Sistem', 'info');
    });
}

// ================================================================
// SETTINGS EVENTS
// ================================================================

/**
 * Setup settings event listeners
 */
export function setupSettingsEvents() {
    // Sync data
    document.getElementById('syncDataBtn')?.addEventListener('click', async () => {
        try {
            showToast('Menyinkronkan data...', 'info');
            const { api } = await import('./api.js');
            const result = await api.syncAll();
            showToast('Sinkronisasi selesai!', 'success');
        } catch (error) {
            showToast('Gagal sinkronisasi: ' + error.message, 'error');
        }
    });

    // Backup data
    document.getElementById('backupDataBtn')?.addEventListener('click', () => {
        try {
            const data = {
                products: state.products,
                transactions: state.transactions,
                customers: state.customers,
                shifts: state.shifts,
                timestamp: new Date().toISOString()
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `warungkita-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('Backup berhasil dibuat!', 'success');
        } catch (error) {
            showToast('Gagal backup: ' + error.message, 'error');
        }
    });

    // Restore data
    document.getElementById('restoreDataBtn')?.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    // Restore data
                    if (data.products) loadProducts(data.products);
                    if (data.transactions) loadTransactions(data.transactions);
                    if (data.customers) loadCustomers(data.customers);
                    if (data.shifts) loadShifts(data.shifts);
                    showToast('Data berhasil direstore!', 'success');
                    window.location.reload();
                } catch (error) {
                    showToast('Gagal restore: ' + error.message, 'error');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    });

    // Test print
    document.getElementById('testPrintBtn')?.addEventListener('click', () => {
        const testContent = `
            <div class="print-content" style="max-width: 300px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px;">
                    <h3>WarungKita PRO MAX</h3>
                    <p style="font-size: 12px; color: #666;">Test Print</p>
                </div>
                <div style="padding: 10px 0;">
                    <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                        <span>Test Item 1</span>
                        <span>Rp 10.000</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                        <span>Test Item 2</span>
                        <span>Rp 15.000</span>
                    </div>
                </div>
                <div style="border-top: 2px dashed #000; padding-top: 10px;">
                    <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 16px;">
                        <span>TOTAL</span>
                        <span>Rp 25.000</span>
                    </div>
                </div>
                <div style="text-align: center; margin-top: 10px; padding-top: 10px; border-top: 2px dashed #000; font-size: 11px; color: #666;">
                    Test print - ${new Date().toLocaleString()}
                </div>
            </div>
        `;

        const printWindow = window.open('', '_blank', 'width=400,height=600');
        if (printWindow) {
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head><title>Test Print</title></head>
                <body style="font-family: 'Courier New', monospace; padding: 20px;">
                    ${testContent}
                    <script>
                        window.onload = function() {
                            window.print();
                            setTimeout(function() { window.close(); }, 1000);
                        };
                    <\/script>
                </body>
                </html>
            `);
            printWindow.document.close();
        } else {
            showToast('Mohon izinkan popup untuk print', 'warning');
        }
    });

    // Configure printer
    document.getElementById('configurePrinterBtn')?.addEventListener('click', () => {
        showToast('Fitur konfigurasi printer akan datang', 'info');
    });

    // Change password
    document.getElementById('changePasswordBtn')?.addEventListener('click', () => {
        showToast('Fitur ganti password akan datang', 'info');
    });

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        if (confirm('Yakin ingin logout?')) {
            showToast('Logout berhasil', 'info');
            // Clear session
            localStorage.clear();
            window.location.reload();
        }
    });
}

// ================================================================
// EXPORT
// ================================================================

export default {
    setupNavigation,
    setupKeyboardShortcuts,
    setupGlobalSearch,
    setupModalEvents,
    setupProductEvents,
    setupCartEvents,
    setupPaymentEvents,
    setupStockEvents,
    setupAIEvents,
    setupShiftEvents,
    setupThemeEvents,
    setupSettingsEvents,
    navigateToSection,
    refreshDashboard
};

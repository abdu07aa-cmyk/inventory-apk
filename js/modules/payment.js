/**
 * ============================================
 * PAYMENT MODULE
 * ============================================
 * Mengelola proses pembayaran:
 * - Multi-payment (cash, QRIS, transfer, e-wallet)
 * - Hitung kembalian
 * - Generate QRIS
 * - Proses transaksi ke Supabase
 * - Generate struk
 */

const PaymentModule = {
    currentMethod: 'cash',
    cashReceived: 0,
    transactionData: null,

    // ========================================
    // INITIALIZATION
    // ========================================
    init() {
        console.log('%c💳 PaymentModule initialized', 'color: #3b82f6;');
        this.setupEventListeners();
    },

    // ========================================
    // OPEN PAYMENT MODAL
    // ========================================
    openPaymentModal() {
        if (AppState.cart.length === 0) {
            Utils.toast('Keranjang masih kosong', 'warning');
            return;
        }

        if (!AppState.currentShift) {
            Utils.toast('Buka shift kasir terlebih dahulu', 'warning');
            return;
        }

        // Reset state
        this.currentMethod = 'cash';
        this.cashReceived = 0;
        
        // Update total display
        const total = AppState.getCartTotal();
        document.getElementById('paymentTotal').textContent = Utils.formatCurrency(total);
        
        // Reset cash input
        document.getElementById('cashReceived').value = '';
        document.getElementById('cashChange').textContent = Utils.formatCurrency(0);
        
        // Show cash section by default
        this.switchPaymentMethod('cash');
        
        Utils.openModal('paymentModal');
    },

    // ========================================
    // SWITCH PAYMENT METHOD
    // ========================================
    switchPaymentMethod(method) {
        this.currentMethod = method;
        
        // Update active button
        document.querySelectorAll('.payment-method').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.method === method);
        });
        
        // Show/hide sections
        const sections = ['cash', 'qris', 'transfer', 'ewallet'];
        sections.forEach(m => {
            const section = document.getElementById(`${m}PaymentSection`);
            if (section) section.style.display = m === method ? 'block' : 'none';
        });
        
        // Generate QRIS if needed
        if (method === 'qris') {
            this.generateQRIS();
        }
    },

    // ========================================
    // GENERATE QRIS
    // ========================================
    generateQRIS() {
        const qrisContainer = document.getElementById('qrisCode');
        if (!qrisContainer) return;
        
        qrisContainer.innerHTML = '';
        
        const total = AppState.getCartTotal();
        const qrData = {
            merchant: CONFIG.bankInfo.qrismMerchant,
            amount: total,
            timestamp: Date.now(),
            trxCode: Utils.generateTransactionCode()
        };
        
        try {
            new QRCode(qrisContainer, {
                text: JSON.stringify(qrData),
                width: 256,
                height: 256,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });
        } catch (error) {
            console.error('QRIS generation failed:', error);
            qrisContainer.innerHTML = '<p class="text-danger">Gagal generate QRIS</p>';
        }
    },

    // ========================================
    // CALCULATE CHANGE
    // ========================================
    calculateChange() {
        const total = AppState.getCartTotal();
        const received = this.cashReceived;
        const change = received - total;
        
        document.getElementById('cashChange').textContent = 
            Utils.formatCurrency(Math.max(0, change));
        
        // Color indicator
        const changeEl = document.getElementById('cashChange');
        if (change < 0) {
            changeEl.style.color = '#ef4444';
        } else if (change === 0) {
            changeEl.style.color = '#10b981';
        } else {
            changeEl.style.color = '#3b82f6';
        }
    },

    // ========================================
    // QUICK CASH
    // ========================================
    setQuickCash(amount) {
        const cashInput = document.getElementById('cashReceived');
        
        if (amount === 'exact') {
            this.cashReceived = AppState.getCartTotal();
        } else {
            this.cashReceived = parseInt(amount);
        }
        
        cashInput.value = this.cashReceived;
        this.calculateChange();
    },

    // ========================================
    // PROCESS PAYMENT
    // ========================================
    async processPayment() {
        const total = AppState.getCartTotal();
        const customerName = document.getElementById('customerName')?.value || 'Umum';

        // Validation for cash payment
        if (this.currentMethod === 'cash') {
            if (this.cashReceived < total) {
                Utils.toast('Uang yang diterima kurang', 'error');
                return;
            }
        }

        try {
            AppState.setLoading(true);
            
            // Prepare transaction data
            const transaction = {
                transaction_code: Utils.generateTransactionCode(),
                total_amount: total,
                discount_amount: AppState.discount.amount,
                payment_method: this.currentMethod,
                payment_status: 'paid',
                customer_name: customerName,
                shift_id: AppState.currentShift?.id,
                cashier_name: AppState.currentShift?.cashier_name || 'Admin'
            };

            // Prepare items
            const items = AppState.cart.map(item => ({
                product_id: item.id,
                product_name: item.name,
                quantity: item.quantity,
                price: item.price
            }));

            // Save to Supabase
            const newTransaction = await API.transactions.create(transaction, items);
            
            // Add to state
            AppState.addTransaction(newTransaction);
            
            // Update shift stats
            if (AppState.currentShift) {
                AppState.currentShift.total_transactions = 
                    (AppState.currentShift.total_transactions || 0) + 1;
                AppState.currentShift.total_sales = 
                    (AppState.currentShift.total_sales || 0) + total;
            }

            // Store for receipt
            this.transactionData = {
                ...newTransaction,
                items: items,
                customer_name: customerName,
                cash_received: this.currentMethod === 'cash' ? this.cashReceived : total,
                change: this.currentMethod === 'cash' ? this.cashReceived - total : 0
            };

            // Clear cart
            AppState.clearCart();
            if (document.getElementById('customerName')) {
                document.getElementById('customerName').value = '';
            }
            if (document.getElementById('discountCode')) {
                document.getElementById('discountCode').value = '';
            }

            Utils.closeModal('paymentModal');
            
            // Show receipt
            this.showReceipt();
            
            Utils.toast('Transaksi berhasil!', 'success');
            Utils.playSound('success');
            
            // Refresh products (stock updated)
            await ProductsModule.loadProducts();
            
        } catch (error) {
            console.error('❌ Payment error:', error);
            Utils.toast('Gagal memproses pembayaran: ' + error.message, 'error');
        } finally {
            AppState.setLoading(false);
        }
    },

    // ========================================
    // SHOW RECEIPT
    // ========================================
    showReceipt() {
        if (!this.transactionData) return;

        const tx = this.transactionData;
        const receiptContent = document.getElementById('receiptContent');
        
        if (!receiptContent) return;

        const itemsHtml = tx.items.map(item => `
            <div class="receipt-item">
                <span>${item.product_name}</span>
                <div>
                    <span>${item.quantity} x ${Utils.formatCurrency(item.price)}</span>
                    <strong>${Utils.formatCurrency(item.quantity * item.price)}</strong>
                </div>
            </div>
        `).join('');

        receiptContent.innerHTML = `
            <div class="receipt-header">
                <h2>🏪 WarungKita</h2>
                <p>Jl. Contoh No. 123, Jakarta</p>
                <p>Telp: 021-12345678</p>
            </div>
            <div class="receipt-info">
                <div><span>No:</span> <strong>${tx.transaction_code}</strong></div>
                <div><span>Tanggal:</span> <strong>${Utils.formatDateTime(tx.created_at)}</strong></div>
                <div><span>Kasir:</span> <strong>${tx.cashier_name}</strong></div>
                <div><span>Pelanggan:</span> <strong>${tx.customer_name}</strong></div>
            </div>
            <div class="receipt-divider"></div>
            <div class="receipt-items">
                ${itemsHtml}
            </div>
            <div class="receipt-divider"></div>
            <div class="receipt-summary">
                <div><span>Subtotal</span> <span>${Utils.formatCurrency(tx.total_amount + tx.discount_amount)}</span></div>
                ${tx.discount_amount > 0 ? `<div><span>Diskon</span> <span>- ${Utils.formatCurrency(tx.discount_amount)}</span></div>` : ''}
                <div class="total"><span>TOTAL</span> <strong>${Utils.formatCurrency(tx.total_amount)}</strong></div>
                <div><span>Bayar (${tx.payment_method})</span> <span>${Utils.formatCurrency(tx.cash_received)}</span></div>
                ${tx.change > 0 ? `<div><span>Kembalian</span> <span>${Utils.formatCurrency(tx.change)}</span></div>` : ''}
            </div>
            <div class="receipt-footer">
                <p>Terima kasih atas kunjungan Anda!</p>
                <p>Barang yang sudah dibeli tidak dapat ditukar/dikembalikan</p>
            </div>
        `;

        Utils.openModal('receiptModal');
    },

    // ========================================
    // PRINT RECEIPT
    // ========================================
    printReceipt() {
        window.print();
    },

    // ========================================
    // SHARE RECEIPT (WhatsApp)
    // ========================================
    shareReceipt() {
        if (!this.transactionData) return;
        
        const tx = this.transactionData;
        let message = `🏪 *WarungKita*\n`;
        message += `No: ${tx.transaction_code}\n`;
        message += `Tanggal: ${Utils.formatDateTime(tx.created_at)}\n\n`;
        message += `*Items:*\n`;
        
        tx.items.forEach(item => {
            message += `• ${item.product_name} ${item.quantity}x = ${Utils.formatCurrency(item.quantity * item.price)}\n`;
        });
        
        message += `\n*Total: ${Utils.formatCurrency(tx.total_amount)}*\n`;
        message += `Bayar: ${tx.payment_method.toUpperCase()}\n\n`;
        message += `Terima kasih! 🙏`;

        const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');
    },

    // ========================================
    // EVENT LISTENERS
    // ========================================
    setupEventListeners() {
        // Process payment button
        const btnProcess = document.getElementById('btnProcessPayment');
        if (btnProcess) {
            btnProcess.addEventListener('click', () => this.openPaymentModal());
        }

        // Payment method buttons
        document.querySelectorAll('.payment-method').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchPaymentMethod(btn.dataset.method);
            });
        });

        // Cash received input
        const cashInput = document.getElementById('cashReceived');
        if (cashInput) {
            cashInput.addEventListener('input', (e) => {
                this.cashReceived = parseInt(e.target.value) || 0;
                this.calculateChange();
            });
        }

        // Quick cash buttons
        document.querySelectorAll('.quick-cash-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setQuickCash(btn.dataset.amount);
            });
        });

        // Confirm payment
        const btnConfirm = document.getElementById('btnConfirmPayment');
        if (btnConfirm) {
            btnConfirm.addEventListener('click', () => this.processPayment());
        }

        // Print receipt
        const btnPrint = document.getElementById('btnPrintReceipt');
        if (btnPrint) {
            btnPrint.addEventListener('click', () => this.printReceipt());
        }

        // Share receipt
        const btnShare = document.getElementById('btnShareReceipt');
        if (btnShare) {
            btnShare.addEventListener('click', () => this.shareReceipt());
        }
    }
};

Object.freeze(PaymentModule);
console.log('%c✅ PaymentModule loaded', 'color: #10b981;');

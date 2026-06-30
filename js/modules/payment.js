/**
 * ================================================================
 * WARUNGKITA PRO MAX - PAYMENT MODULE
 * ================================================================
 * Proses pembayaran, QRIS, struk, dan integrasi pembayaran.
 * ================================================================
 */

import { state, addTransaction, updateStock, addCustomerPoints } from '../state.js';
import { formatCurrency, formatDate, generateInvoiceNumber, showToast } from '../utils.js';
import { APP_CONFIG } from '../config.js';

// ================================================================
// PAYMENT PROCESSING
// ================================================================

/**
 * Open payment modal
 */
export function openPaymentModal() {
    const cart = state.cart;
    if (cart.length === 0) {
        showToast('Keranjang kosong!', 'warning');
        return;
    }

    const modal = document.getElementById('paymentModal');
    const itemsContainer = document.getElementById('paymentItems');
    const subtotalEl = document.getElementById('paymentSubtotal');
    const discountEl = document.getElementById('paymentDiscount');
    const totalEl = document.getElementById('paymentTotal');

    // Render items
    itemsContainer.innerHTML = cart.map(item => `
        <div class="payment-item">
            <span>${item.emoji || '📦'} ${item.name} × ${item.quantity}</span>
            <span>${formatCurrency(item.subtotal)}</span>
        </div>
    `).join('');

    // Update totals
    subtotalEl.textContent = formatCurrency(state.cartSubtotal);
    discountEl.textContent = `-${formatCurrency(state.cartDiscount)}`;
    totalEl.textContent = formatCurrency(state.cartTotal);

    // Reset payment form
    document.getElementById('paymentAmount').value = state.cartTotal;
    document.getElementById('paymentCustomer').value = '';
    document.getElementById('paymentMethod').value = 'Tunai';

    // Hide QRIS container
    document.getElementById('qrisContainer').style.display = 'none';

    // Reset method buttons
    document.querySelectorAll('.payment-method-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    modal.classList.add('active');
}

/**
 * Close payment modal
 */
export function closePaymentModal() {
    const modal = document.getElementById('paymentModal');
    modal.classList.remove('active');
}

/**
 * Process payment
 */
export function processPayment() {
    const { cart, cartTotal, cartSubtotal, cartDiscount, cartTax, appliedDiscountCode } = state;

    if (cart.length === 0) {
        showToast('Keranjang kosong!', 'error');
        return;
    }

    // Get payment details
    const method = document.querySelector('.payment-method-btn.active')?.dataset.method || 'Tunai';
    const amount = parseInt(document.getElementById('paymentAmount').value);
    const customerName = document.getElementById('paymentCustomer').value.trim() || 'Umum';

    // Validate payment
    if (amount < cartTotal) {
        showToast('Jumlah bayar kurang dari total!', 'error');
        return;
    }

    // Process payment
    try {
        // Create transaction
        const transaction = {
            id: generateInvoiceNumber(),
            total_amount: cartTotal,
            subtotal: cartSubtotal,
            discount: cartDiscount,
            tax: cartTax,
            payment_method: method,
            payment_status: 'completed',
            customer_name: customerName,
            discount_code: appliedDiscountCode,
            items: cart.map(item => ({
                product_id: item.productId,
                product_name: item.name,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.subtotal
            }))
        };

        // Save transaction
        addTransaction(transaction);

        // Update stock
        cart.forEach(item => {
            updateStock(item.productId, -item.quantity, `Penjualan: ${transaction.id}`);
        });

        // Add customer points if not guest
        if (customerName !== 'Umum') {
            const points = Math.floor(cartTotal / 10000); // 1 point per 10k
            if (points > 0) {
                // Find or create customer
                let customer = state.customers.find(c => c.name === customerName);
                if (customer) {
                    addCustomerPoints(customer.id, points);
                }
                // If customer not found, we could create one
            }
        }

        // Show receipt
        showReceipt(transaction);

        // Clear cart
        state.cart = [];
        state.cartSubtotal = 0;
        state.cartDiscount = 0;
        state.cartTax = 0;
        state.cartTotal = 0;
        state.appliedDiscountCode = null;

        // Close payment modal
        closePaymentModal();

        // Update UI
        const event = new CustomEvent('cart-cleared');
        document.dispatchEvent(event);

        showToast('Pembayaran berhasil!', 'success');
        playPaymentSound();

    } catch (error) {
        console.error('Payment failed:', error);
        showToast('Pembayaran gagal: ' + error.message, 'error');
    }
}

// ================================================================
// QRIS PAYMENT
// ================================================================

/**
 * Generate QRIS for payment
 */
export function generateQRIS() {
    const total = state.cartTotal;
    const qrisContainer = document.getElementById('qrisContainer');
    const qrContainer = document.getElementById('qrcode');

    // Clear previous QR
    qrContainer.innerHTML = '';

    // Generate QRIS code (simulated)
    const qrisData = `QRIS|${APP_CONFIG.appName}|${total}|${Date.now()}`;

    if (typeof QRCode !== 'undefined') {
        new QRCode(qrContainer, {
            text: qrisData,
            width: 200,
            height: 200,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
    } else {
        // Fallback
        qrContainer.innerHTML = `
            <div style="padding: var(--spacing-4); background: white; border-radius: var(--border-radius-md);">
                <i class="fas fa-qrcode" style="font-size: 4rem; color: black;"></i>
                <p style="margin-top: var(--spacing-2); font-size: var(--font-size-sm);">QRIS ${formatCurrency(total)}</p>
            </div>
        `;
    }

    qrisContainer.style.display = 'block';
}

// ================================================================
// RECEIPT
// ================================================================

/**
 * Show receipt
 * @param {Object} transaction - Transaction data
 */
export function showReceipt(transaction) {
    const modal = document.getElementById('receiptModal');
    const container = document.getElementById('receiptContent');

    const receiptHTML = `
        <div class="receipt">
            <div class="receipt-header">
                <h3>${APP_CONFIG.printSettings.companyName}</h3>
                <p>${APP_CONFIG.printSettings.companyAddress}</p>
                <p>${APP_CONFIG.printSettings.companyPhone}</p>
                <hr>
                <p><small>${transaction.id}</small></p>
                <p><small>${formatDate(transaction.createdAt)}</small></p>
            </div>

            <div class="receipt-items">
                ${transaction.items.map(item => `
                    <div class="receipt-item">
                        <span class="item-name">${item.product_name}</span>
                        <span class="item-qty">×${item.quantity}</span>
                        <span class="item-price">${formatCurrency(item.subtotal)}</span>
                    </div>
                `).join('')}
            </div>

            <div class="receipt-totals">
                <div class="total-row">
                    <span>Subtotal</span>
                    <span>${formatCurrency(transaction.subtotal)}</span>
                </div>
                ${transaction.discount > 0 ? `
                    <div class="total-row">
                        <span>Diskon</span>
                        <span>-${formatCurrency(transaction.discount)}</span>
                    </div>
                ` : ''}
                ${transaction.tax > 0 ? `
                    <div class="total-row">
                        <span>Pajak (11%)</span>
                        <span>${formatCurrency(transaction.tax)}</span>
                    </div>
                ` : ''}
                <div class="total-row grand-total">
                    <span>TOTAL</span>
                    <span>${formatCurrency(transaction.total_amount)}</span>
                </div>
            </div>

            <div class="receipt-footer">
                <p>Metode: ${transaction.payment_method}</p>
                <p>Pelanggan: ${transaction.customer_name}</p>
                ${transaction.discount_code ? `<p>Kode: ${transaction.discount_code}</p>` : ''}
                <hr>
                <p>${APP_CONFIG.printSettings.footer}</p>
            </div>
        </div>
    `;

    container.innerHTML = receiptHTML;
    modal.classList.add('active');

    // Auto print
    setTimeout(() => {
        printReceipt();
    }, 500);
}

/**
 * Print receipt
 */
export function printReceipt() {
    const content = document.getElementById('receiptContent');
    if (!content) return;

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
        showToast('Mohon izinkan popup untuk print', 'warning');
        return;
    }

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Struk ${APP_CONFIG.appName}</title>
            <style>
                body {
                    font-family: 'Courier New', monospace;
                    margin: 0;
                    padding: 20px;
                    background: white;
                    color: black;
                }
                .receipt {
                    max-width: 300px;
                    margin: 0 auto;
                }
                .receipt-header {
                    text-align: center;
                    border-bottom: 2px dashed #000;
                    padding-bottom: 10px;
                    margin-bottom: 10px;
                }
                .receipt-header h3 {
                    margin: 0;
                    font-size: 18px;
                }
                .receipt-header p {
                    margin: 4px 0;
                    font-size: 12px;
                    color: #666;
                }
                .receipt-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 4px 0;
                    font-size: 12px;
                }
                .receipt-item .item-name {
                    flex: 1;
                }
                .receipt-item .item-qty {
                    margin: 0 8px;
                    color: #666;
                }
                .receipt-totals {
                    border-top: 2px dashed #000;
                    padding-top: 10px;
                    margin-top: 10px;
                }
                .total-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 4px 0;
                    font-size: 13px;
                }
                .total-row.grand-total {
                    font-size: 16px;
                    font-weight: bold;
                    border-top: 1px solid #000;
                    padding-top: 8px;
                    margin-top: 4px;
                }
                .receipt-footer {
                    text-align: center;
                    margin-top: 10px;
                    padding-top: 10px;
                    border-top: 2px dashed #000;
                    font-size: 11px;
                    color: #666;
                }
                hr {
                    border: none;
                    border-top: 1px dashed #ccc;
                    margin: 8px 0;
                }
                @media print {
                    body { padding: 0; }
                }
            </style>
        </head>
        <body>
            ${content.innerHTML}
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() {
                        window.close();
                    }, 1000);
                };
            <\/script>
        </body>
        </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
}

// ================================================================
// SOUND EFFECTS
// ================================================================

/**
 * Play payment success sound
 */
function playPaymentSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, index) => {
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.frequency.value = freq;
            oscillator.type = 'sine';
            gainNode.gain.value = 0.15;
            oscillator.start(audioCtx.currentTime + index * 0.15);
            oscillator.stop(audioCtx.currentTime + index * 0.15 + 0.2);
        });
    } catch (e) {
        // Silent fail
    }
}

// ================================================================
// PAYMENT METHOD SELECTION
// ================================================================

/**
 * Select payment method
 * @param {string} method - Payment method
 */
export function selectPaymentMethod(method) {
    document.querySelectorAll('.payment-method-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.method === method);
    });

    // Show QRIS if selected
    const qrisContainer = document.getElementById('qrisContainer');
    if (method === 'QRIS') {
        generateQRIS();
    } else {
        qrisContainer.style.display = 'none';
    }
}

// ================================================================
// EXPORT
// ================================================================

export default {
    openPaymentModal,
    closePaymentModal,
    processPayment,
    generateQRIS,
    showReceipt,
    printReceipt,
    selectPaymentMethod
};

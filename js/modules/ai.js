/**
 * ================================================================
 * WARUNGKITA PRO MAX - AI ASSISTANT
 * ================================================================
 * Asisten AI untuk membantu pengguna dengan berbagai perintah.
 * Saat ini berbasis keyword, akan di-upgrade ke LLM nantinya.
 * ================================================================
 */

import { state } from '../state.js';
import { formatCurrency, formatDate, showToast } from '../utils.js';
import { APP_CONFIG } from '../config.js';

// ================================================================
// AI COMMANDS
// ================================================================

const AI_COMMANDS = {
    // Product commands
    'tambah produk': {
        action: 'add_product',
        description: 'Buka form tambah produk'
    },
    'produk baru': {
        action: 'add_product',
        description: 'Buka form tambah produk'
    },
    'lihat produk': {
        action: 'view_products',
        description: 'Lihat daftar produk'
    },
    'daftar produk': {
        action: 'view_products',
        description: 'Lihat daftar produk'
    },

    // Sales commands
    'penjualan hari ini': {
        action: 'today_sales',
        description: 'Lihat penjualan hari ini'
    },
    'penjualan bulan ini': {
        action: 'month_sales',
        description: 'Lihat penjualan bulan ini'
    },
    'total penjualan': {
        action: 'total_sales',
        description: 'Lihat total penjualan'
    },

    // Stock commands
    'stok menipis': {
        action: 'low_stock',
        description: 'Lihat produk stok menipis'
    },
    'stok habis': {
        action: 'out_of_stock',
        description: 'Lihat produk stok habis'
    },
    'cek stok': {
        action: 'check_stock',
        description: 'Cek stok produk'
    },

    // Product recommendations
    'produk terlaris': {
        action: 'top_products',
        description: 'Lihat produk terlaris'
    },
    'rekomendasi produk': {
        action: 'recommend_products',
        description: 'Rekomendasi produk'
    },

    // Help
    'help': {
        action: 'help',
        description: 'Tampilkan bantuan'
    },
    'bantuan': {
        action: 'help',
        description: 'Tampilkan bantuan'
    },
    'perintah': {
        action: 'help',
        description: 'Tampilkan bantuan'
    },

    // Navigation
    'ke dashboard': {
        action: 'navigate_dashboard',
        description: 'Pergi ke dashboard'
    },
    'ke pos': {
        action: 'navigate_pos',
        description: 'Pergi ke POS'
    },
    'ke produk': {
        action: 'navigate_products',
        description: 'Pergi ke produk'
    },
    'ke transaksi': {
        action: 'navigate_transactions',
        description: 'Pergi ke transaksi'
    },

    // System
    'dark mode': {
        action: 'toggle_theme',
        description: 'Toggle dark mode'
    },
    'tema gelap': {
        action: 'toggle_theme',
        description: 'Toggle dark mode'
    },
    'refresh': {
        action: 'refresh',
        description: 'Refresh data'
    }
};

// ================================================================
// AI RESPONSES
// ================================================================

/**
 * Process AI command
 * @param {string} input - User input
 * @returns {Promise<string>} AI response
 */
export async function processAICommand(input) {
    const normalized = input.toLowerCase().trim();

    // Find matching command
    let matchedCommand = null;
    let matchedKey = '';

    for (const [key, command] of Object.entries(AI_COMMANDS)) {
        if (normalized.includes(key) || key.includes(normalized)) {
            matchedCommand = command;
            matchedKey = key;
            break;
        }
    }

    if (!matchedCommand) {
        return `Maaf, saya tidak mengerti perintah "${input}".\nKetik "help" untuk melihat daftar perintah yang tersedia.`;
    }

    // Execute command
    return await executeCommand(matchedCommand.action, input);
}

/**
 * Execute AI command
 * @param {string} action - Command action
 * @param {string} input - Original input
 * @returns {Promise<string>} Response
 */
async function executeCommand(action, input) {
    switch (action) {
        case 'add_product':
            openProductModal();
            return '✅ Membuka form tambah produk. Silakan isi data produk.';

        case 'view_products':
            navigateTo('products');
            return '📦 Menampilkan daftar produk.';

        case 'today_sales':
            return getTodaySales();

        case 'month_sales':
            return getMonthSales();

        case 'total_sales':
            return getTotalSales();

        case 'low_stock':
            return getLowStock();

        case 'out_of_stock':
            return getOutOfStock();

        case 'check_stock':
            return checkStock(input);

        case 'top_products':
            return getTopProducts();

        case 'recommend_products':
            return getRecommendations();

        case 'help':
            return getHelp();

        case 'navigate_dashboard':
            navigateTo('dashboard');
            return '📊 Pergi ke Dashboard.';

        case 'navigate_pos':
            navigateTo('pos');
            return '💰 Pergi ke Point of Sale.';

        case 'navigate_products':
            navigateTo('products');
            return '📦 Pergi ke Manajemen Produk.';

        case 'navigate_transactions':
            navigateTo('transactions');
            return '📋 Pergi ke Riwayat Transaksi.';

        case 'toggle_theme':
            toggleTheme();
            return `🌓 Tema berubah ke ${document.documentElement.getAttribute('data-theme')}.`;

        case 'refresh':
            window.location.reload();
            return '🔄 Merefresh halaman...';

        default:
            return '❌ Perintah tidak dikenali. Ketik "help" untuk bantuan.';
    }
}

// ================================================================
// COMMAND EXECUTORS
// ================================================================

/**
 * Get today's sales
 */
function getTodaySales() {
    const today = new Date().toISOString().split('T')[0];
    const todayTransactions = state.transactions.filter(t =>
        t.createdAt && t.createdAt.startsWith(today)
    );

    const total = todayTransactions.reduce((sum, t) => sum + t.total_amount, 0);
    const count = todayTransactions.length;

    return `📊 Penjualan Hari Ini:\nTotal: ${formatCurrency(total)}\nTransaksi: ${count} transaksi`;
}

/**
 * Get month's sales
 */
function getMonthSales() {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const monthTransactions = state.transactions.filter(t => {
        if (!t.createdAt) return false;
        const date = new Date(t.createdAt);
        return date.getMonth() === month && date.getFullYear() === year;
    });

    const total = monthTransactions.reduce((sum, t) => sum + t.total_amount, 0);
    const count = monthTransactions.length;

    return `📊 Penjualan Bulan Ini:\nTotal: ${formatCurrency(total)}\nTransaksi: ${count} transaksi`;
}

/**
 * Get total sales
 */
function getTotalSales() {
    const total = state.transactions.reduce((sum, t) => sum + t.total_amount, 0);
    const count = state.transactions.length;

    return `📊 Total Penjualan:\nTotal: ${formatCurrency(total)}\nTotal Transaksi: ${count}`;
}

/**
 * Get low stock products
 */
function getLowStock() {
    const lowStock = state.products.filter(p =>
        p.stock <= APP_CONFIG.lowStockThreshold && p.stock > 0
    );

    if (lowStock.length === 0) {
        return '✅ Semua produk memiliki stok yang cukup.';
    }

    const list = lowStock.map(p =>
        `• ${p.emoji || '📦'} ${p.name}: ${p.stock} tersisa`
    ).join('\n');

    return `⚠️ Produk Stok Menipis:\n${list}`;
}

/**
 * Get out of stock products
 */
function getOutOfStock() {
    const outOfStock = state.products.filter(p => p.stock === 0);

    if (outOfStock.length === 0) {
        return '✅ Tidak ada produk yang habis stok.';
    }

    const list = outOfStock.map(p =>
        `• ${p.emoji || '📦'} ${p.name}`
    ).join('\n');

    return `❌ Produk Habis Stok:\n${list}`;
}

/**
 * Check stock for specific product
 */
function checkStock(input) {
    const words = input.split(' ');
    const searchTerm = words.slice(1).join(' ').trim();

    if (!searchTerm) {
        return '🔍 Cari produk: "cek stok [nama produk]"';
    }

    const products = state.products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (products.length === 0) {
        return `❌ Tidak ditemukan produk "${searchTerm}"`;
    }

    if (products.length === 1) {
        const p = products[0];
        return `📦 ${p.emoji || '📦'} ${p.name}\nStok: ${p.stock} unit\nHarga: ${formatCurrency(p.price)}`;
    }

    const list = products.map(p =>
        `• ${p.emoji || '📦'} ${p.name}: ${p.stock} unit`
    ).join('\n');

    return `🔍 Ditemukan ${products.length} produk:\n${list}`;
}

/**
 * Get top products
 */
function getTopProducts() {
    // Calculate product sales from transactions
    const productSales = {};

    state.transactions.forEach(t => {
        if (t.items) {
            t.items.forEach(item => {
                const key = item.product_id || item.product_name;
                if (!productSales[key]) {
                    productSales[key] = {
                        name: item.product_name,
                        quantity: 0,
                        revenue: 0
                    };
                }
                productSales[key].quantity += item.quantity;
                productSales[key].revenue += item.subtotal || (item.price * item.quantity);
            });
        }
    });

    const sorted = Object.values(productSales)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

    if (sorted.length === 0) {
        return '📊 Belum ada data penjualan produk.';
    }

    const list = sorted.map((p, i) =>
        `${i + 1}. ${p.name} - ${p.quantity} terjual (${formatCurrency(p.revenue)})`
    ).join('\n');

    return `🏆 Produk Terlaris:\n${list}`;
}

/**
 * Get product recommendations
 */
function getRecommendations() {
    // Simple recommendation: suggest products with low stock to restock
    const lowStock = state.products.filter(p =>
        p.stock <= APP_CONFIG.lowStockThreshold
    );

    if (lowStock.length === 0) {
        return '✅ Semua produk memiliki stok cukup. Tidak ada rekomendasi khusus.';
    }

    const list = lowStock.map(p =>
        `• ${p.emoji || '📦'} ${p.name} - Segera restock (stok: ${p.stock})`
    ).join('\n');

    return `💡 Rekomendasi Restock:\n${list}`;
}

/**
 * Get help
 */
function getHelp() {
    const commands = Object.entries(AI_COMMANDS)
        .map(([key, cmd]) => `• "${key}" → ${cmd.description}`)
        .join('\n');

    return `🤖 AI Assistant - Daftar Perintah:\n\n${commands}`;
}

// ================================================================
// UI HELPERS
// ================================================================

/**
 * Open product modal (for AI)
 */
function openProductModal() {
    const event = new CustomEvent('ai-open-product-modal');
    document.dispatchEvent(event);
}

/**
 * Navigate to section (for AI)
 */
function navigateTo(section) {
    const event = new CustomEvent('ai-navigate', { detail: { section } });
    document.dispatchEvent(event);
}

/**
 * Toggle theme (for AI)
 */
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('warungkita-theme', next);
}

// ================================================================
// OPEN AI MODAL
// ================================================================

/**
 * Open AI Assistant modal
 */
export function openAIModal() {
    const modal = document.getElementById('aiModal');
    const chat = document.getElementById('aiChat');

    // Add welcome message if empty
    if (chat.children.length === 0) {
        chat.innerHTML = `
            <div class="ai-message ai-bot">
                <p>Halo! Saya asisten AI WarungKita PRO MAX.</p>
                <p style="margin-top: var(--spacing-2);">Ada yang bisa saya bantu? Coba ketik "help" untuk melihat perintah.</p>
            </div>
        `;
    }

    modal.classList.add('active');
    document.getElementById('aiInput').focus();
}

/**
 * Close AI Assistant modal
 */
export function closeAIModal() {
    const modal = document.getElementById('aiModal');
    modal.classList.remove('active');
}

/**
 * Send message to AI
 */
export async function sendAIMessage() {
    const input = document.getElementById('aiInput');
    const chat = document.getElementById('aiChat');
    const message = input.value.trim();

    if (!message) return;

    // Add user message
    chat.innerHTML += `
        <div class="ai-message ai-user">
            <p>${message}</p>
        </div>
    `;

    input.value = '';
    chat.scrollTop = chat.scrollHeight;

    // Show typing indicator
    const typingId = Date.now();
    chat.innerHTML += `
        <div class="ai-message ai-bot" id="typing-${typingId}">
            <p>⏳ Mengetik...</p>
        </div>
    `;
    chat.scrollTop = chat.scrollHeight;

    // Process command
    try {
        const response = await processAICommand(message);

        // Remove typing indicator
        document.getElementById(`typing-${typingId}`)?.remove();

        // Format response (split by newlines)
        const formatted = response.split('\n').map(line => {
            if (line.startsWith('•')) {
                return `<span style="display: block; padding-left: var(--spacing-4);">${line}</span>`;
            }
            if (line.includes(':')) {
                const [label, value] = line.split(':');
                return `<strong>${label}:</strong> ${value}`;
            }
            return line;
        }).join('<br>');

        chat.innerHTML += `
            <div class="ai-message ai-bot">
                <p>${formatted}</p>
            </div>
        `;
    } catch (error) {
        document.getElementById(`typing-${typingId}`)?.remove();
        chat.innerHTML += `
            <div class="ai-message ai-bot">
                <p>❌ Maaf, terjadi kesalahan: ${error.message}</p>
            </div>
        `;
    }

    chat.scrollTop = chat.scrollHeight;
}

// ================================================================
// EXPORT
// ================================================================

export default {
    processAICommand,
    openAIModal,
    closeAIModal,
    sendAIMessage
};

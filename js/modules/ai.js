/**
 * ============================================
 * AI MODULE
 * ============================================
 * AI Assistant berbasis keyword
 * Menjawab pertanyaan & menjalankan perintah
 */

const AIModule = {
    chatHistory: [],

    init() {
        console.log('%c🤖 AIModule initialized', 'color: #3b82f6;');
        this.setupEventListeners();
    },

    setupEventListeners() {
        const btnAI = document.getElementById('btnAI');
        if (btnAI) {
            btnAI.addEventListener('click', () => Utils.openModal('aiModal'));
        }

        const btnSend = document.getElementById('btnSendAI');
        if (btnSend) {
            btnSend.addEventListener('click', () => this.processInput());
        }

        const input = document.getElementById('aiInput');
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.processInput();
            });
        }
    },

    processInput() {
        const input = document.getElementById('aiInput');
        if (!input || !input.value.trim()) return;

        const message = input.value.trim();
        this.addMessage(message, 'user');
        input.value = '';

        // Process command
        const response = this.processCommand(message);
        
        setTimeout(() => {
            this.addMessage(response, 'ai');
        }, 500);
    },

    addMessage(text, sender) {
        const chat = document.getElementById('aiChat');
        if (!chat) return;

        const msg = document.createElement('div');
        msg.className = sender === 'user' ? 'user-message' : 'ai-message';
        
        if (sender === 'user') {
            msg.innerHTML = `
                <div class="user-text">${text}</div>
                <div class="user-avatar"><i class="fas fa-user"></i></div>
            `;
        } else {
            msg.innerHTML = `
                <div class="ai-avatar">🤖</div>
                <div class="ai-text">${text}</div>
            `;
        }

        chat.appendChild(msg);
        chat.scrollTop = chat.scrollHeight;
    },

    processCommand(message) {
        const msg = message.toLowerCase();

        // Greeting
        if (msg.match(/halo|hai|hello|hi/)) {
            return 'Halo! Ada yang bisa saya bantu? 🙌';
        }

        // Total penjualan
        if (msg.match(/total|pendapatan|penjualan hari/)) {
            const today = AppState.transactions.filter(t => {
                const d = new Date(t.created_at);
                const today = new Date();
                return d.toDateString() === today.toDateString();
            });
            const total = today.reduce((sum, t) => sum + (t.total_amount || 0), 0);
            return `📊 Penjualan hari ini: <strong>${Utils.formatCurrency(total)}</strong> dari <strong>${today.length}</strong> transaksi`;
        }

        // Stok menipis
        if (msg.match(/stok|menipis|habis/)) {
            const lowStock = AppState.products.filter(p => p.stock <= CONFIG.stock.lowStockThreshold);
            if (lowStock.length === 0) {
                return '✅ Semua stok aman! Tidak ada produk yang menipis.';
            }
            const list = lowStock.slice(0, 5).map(p => `• ${p.emoji} ${p.name}: ${p.stock} pcs`).join('<br>');
            return `⚠️ Ada <strong>${lowStock.length}</strong> produk stok menipis:<br>${list}`;
        }

        // Produk terlaris
        if (msg.match(/terlaris|best seller|paling laku/)) {
            return '🏆 Fitur produk terlaris akan segera hadir!';
        }

        // Bantuan
        if (msg.match(/bantu|help|bisa apa/)) {
            return `🤖 Saya bisa membantu:<br>
                • "Total penjualan hari ini"<br>
                • "Stok menipis"<br>
                • "Tambah produk [nama]"<br>
                • "Cari produk [nama]"<br>
                • "Buka shift"<br>
                • "Tutup shift"`;
        }

        // Buka shift
        if (msg.match(/buka shift|mulai shift/)) {
            if (AppState.currentShift) {
                return '⚠️ Shift sudah berjalan. Tutup shift terlebih dahulu.';
            }
            if (typeof ShiftModule !== 'undefined') {
                Utils.openModal('shiftModal');
                return 'Silakan isi form untuk membuka shift 📝';
            }
            return 'Module shift belum tersedia';
        }

        // Default
        return '🤔 Maaf, saya belum mengerti. Ketik "bantuan" untuk melihat apa yang bisa saya lakukan.';
    }
};

Object.freeze(AIModule);
console.log('%c✅ AIModule loaded', 'color: #10b981;');

/**
 * ============================================
 * WARUNGKITA PRO MAX - Utility Functions
 * ============================================
 * Kumpulan helper functions yang sering digunakan
 */

const Utils = {
    // ========================================
    // CURRENCY FORMATTER
    // ========================================
    formatCurrency(amount) {
        return new Intl.NumberFormat(CONFIG.app.locale, {
            style: 'currency',
            currency: CONFIG.app.currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    },

    formatNumber(number) {
        return new Intl.NumberFormat(CONFIG.app.locale).format(number);
    },

    // ========================================
    // DATE/TIME FORMATTER
    // ========================================
    formatDate(dateString) {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat(CONFIG.app.locale, {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).format(date);
    },

    formatTime(dateString) {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat(CONFIG.app.locale, {
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    },

    formatDateTime(dateString) {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat(CONFIG.app.locale, {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    },

    getRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Baru saja';
        if (diffMins < 60) return `${diffMins} menit lalu`;
        if (diffHours < 24) return `${diffHours} jam lalu`;
        if (diffDays < 7) return `${diffDays} hari lalu`;
        return this.formatDate(dateString);
    },

    // ========================================
    // TOAST NOTIFICATIONS
    // ========================================
    toast(message, type = 'info', duration = CONFIG.ui.toastDuration) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-times-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="${icons[type]}"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            toast.classList.add('toast-hide');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    // ========================================
    // SOUND EFFECTS (Web Audio API)
    // ========================================
    playSound(type = 'success') {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            const sounds = {
                success: { frequency: 800, duration: 0.1 },
                error: { frequency: 200, duration: 0.2 },
                click: { frequency: 600, duration: 0.05 },
                add: { frequency: 1000, duration: 0.08 }
            };

            const sound = sounds[type] || sounds.success;
            oscillator.frequency.value = sound.frequency;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + sound.duration);
        } catch (error) {
            console.warn('⚠️ Sound not supported:', error);
        }
    },

    // ========================================
    // DEBOUNCE & THROTTLE
    // ========================================
    debounce(func, wait = CONFIG.ui.searchDebounce) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    throttle(func, limit = 300) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // ========================================
    // MODAL HELPERS
    // ========================================
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    },

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    },

    closeAllModals() {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    },

    // ========================================
    // TRANSACTION CODE GENERATOR
    // ========================================
    generateTransactionCode() {
        const now = new Date();
        const date = now.toISOString().slice(0, 10).replace(/-/g, '');
        const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `TRX${date}${time}${random}`;
    },

    // ========================================
    // VALIDATION HELPERS
    // ========================================
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    isValidPhone(phone) {
        return /^(\+62|62|0)8[1-9][0-9]{7,11}$/.test(phone.replace(/\s/g, ''));
    },

    isNumber(value) {
        return !isNaN(parseFloat(value)) && isFinite(value);
    },

    // ========================================
    // DOM HELPERS
    // ========================================
    $(selector) {
        return document.querySelector(selector);
    },

    $$(selector) {
        return document.querySelectorAll(selector);
    },

    createElement(tag, className = '', innerHTML = '') {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (innerHTML) element.innerHTML = innerHTML;
        return element;
    },

    // ========================================
    // EXPORT HELPERS
    // ========================================
    exportToCSV(data, filename = 'export.csv') {
        if (!data || data.length === 0) {
            this.toast('Tidak ada data untuk di-export', 'warning');
            return;
        }

        const headers = Object.keys(data[0]);
        const csv = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => {
                    let cell = row[header];
                    if (cell === null || cell === undefined) cell = '';
                    cell = String(cell).replace(/"/g, '""');
                    if (cell.search(/("|,|\n)/g) >= 0) {
                        cell = `"${cell}"`;
                    }
                    return cell;
                }).join(',')
            )
        ].join('\n');

        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();

        this.toast('Data berhasil di-export', 'success');
    },

    // ========================================
    // CONFIRMATION DIALOG
    // ========================================
    confirm(message, title = 'Konfirmasi') {
        return new Promise((resolve) => {
            const result = window.confirm(`${title}\n\n${message}`);
            resolve(result);
        });
    },

    // ========================================
    // COPY TO CLIPBOARD
    // ========================================
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.toast('Berhasil disalin', 'success');
            return true;
        } catch (error) {
            console.error('❌ Copy failed:', error);
            this.toast('Gagal menyalin', 'error');
            return false;
        }
    }
};

// Freeze untuk mencegah modifikasi
Object.freeze(Utils);

console.log('%c✅ Utils module loaded', 'color: #10b981;');

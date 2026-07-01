/**
 * ============================================
 * AUTH MODULE
 * ============================================
 * Autentikasi user (versi sederhana)
 * Untuk sekarang pakai local auth
 * Nanti bisa di-upgrade ke Supabase Auth
 */

const AuthModule = {
    currentUser: null,

    init() {
        console.log('%c🔐 AuthModule initialized', 'color: #3b82f6;');
        
        // Load user from localStorage
        const savedUser = Utils.loadFromStorage?.('warungkita_user', null);
        if (savedUser) {
            this.currentUser = savedUser;
            this.updateUI();
        } else {
            // Default user
            this.currentUser = {
                id: 1,
                name: 'Admin',
                role: 'admin',
                email: 'admin@warungkita.com'
            };
            Utils.saveToStorage?.('warungkita_user', this.currentUser);
            this.updateUI();
        }

        this.setupEventListeners();
    },

    updateUI() {
        const userName = document.querySelector('.user-name');
        const userRole = document.querySelector('.user-role');
        
        if (userName && this.currentUser) {
            userName.textContent = this.currentUser.name;
        }
        if (userRole && this.currentUser) {
            userRole.textContent = this.currentUser.role;
        }
    },

    async login(email, password) {
        // Simple auth - nanti ganti dengan Supabase Auth
        if (email === 'admin@warungkita.com' && password === 'admin123') {
            this.currentUser = {
                id: 1,
                name: 'Admin',
                role: 'admin',
                email: email
            };
            Utils.saveToStorage?.('warungkita_user', this.currentUser);
            this.updateUI();
            return { success: true };
        }
        return { success: false, message: 'Email atau password salah' };
    },

    logout() {
        this.currentUser = null;
        localStorage.removeItem('warungkita_user');
        Utils.toast('Berhasil logout', 'info');
    },

    setupEventListeners() {
        const btnLogout = document.getElementById('btnLogout');
        if (btnLogout) {
            btnLogout.addEventListener('click', async () => {
                const confirmed = await Utils.confirm('Yakin ingin logout?', 'Logout');
                if (confirmed) this.logout();
            });
        }
    }
};

Object.freeze(AuthModule);
console.log('%c✅ AuthModule loaded', 'color: #10b981;');

/**
 * ============================================
 * WARUNGKITA PRO MAX - State Management
 * ============================================
 * Mengelola semua state aplikasi secara terpusat
 * Menggunakan pattern Observer untuk reactivity
 */

const AppState = {
    // ========================================
    // DATA STATE
    // ========================================
    products: [],
    cart: [],
    transactions: [],
    customers: [],
    currentShift: null,
    
    // ========================================
    // UI STATE
    // ========================================
    currentView: 'dashboard',
    currentCategory: 'all',
    searchQuery: '',
    theme: 'light',
    isLoading: false,
    isOnline: navigator.onLine,
    
    // ========================================
    // CART STATE
    // ========================================
    discount: {
        code: null,
        type: null,
        value: 0,
        amount: 0
    },
    
    // ========================================
    // SUBSCRIBERS (Observer pattern)
    // ========================================
    _subscribers: {},

    // ========================================
    // SUBSCRIBE - Register callback
    // ========================================
    subscribe(event, callback) {
        if (!this._subscribers[event]) {
            this._subscribers[event] = [];
        }
        this._subscribers[event].push(callback);
    },

    // ========================================
    // EMIT - Trigger event
    // ========================================
    emit(event, data) {
        if (this._subscribers[event]) {
            this._subscribers[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`❌ Subscriber error [${event}]:`, error);
                }
            });
        }
    },

    // ========================================
    // PRODUCTS
    // ========================================
    setProducts(products) {
        this.products = products;
        this.emit('products:changed', products);
    },

    addProduct(product) {
        this.products.push(product);
        this.emit('products:changed', this.products);
        this.emit('products:added', product);
    },

    updateProduct(id, updates) {
        const index = this.products.findIndex(p => p.id === id);
        if (index !== -1) {
            this.products[index] = { ...this.products[index], ...updates };
            this.emit('products:changed', this.products);
            this.emit('products:updated', this.products[index]);
        }
    },

    removeProduct(id) {
        this.products = this.products.filter(p => p.id !== id);
        this.emit('products:changed', this.products);
        this.emit('products:removed', id);
    },

    // ========================================
    // CART
    // ========================================
    setCart(cart) {
        this.cart = cart;
        this.saveToStorage(CONFIG.storageKeys.cart, cart);
        this.emit('cart:changed', cart);
    },

    addToCart(product, quantity = 1) {
        const existing = this.cart.find(item => item.id === product.id);
        
        if (existing) {
            existing.quantity += quantity;
        } else {
            this.cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                emoji: product.emoji,
                quantity: quantity
            });
        }
        
        this.saveToStorage(CONFIG.storageKeys.cart, this.cart);
        this.emit('cart:changed', this.cart);
        this.emit('cart:itemAdded', product);
    },

    updateCartItem(productId, quantity) {
        const item = this.cart.find(i => i.id === productId);
        if (item) {
            if (quantity <= 0) {
                this.removeFromCart(productId);
            } else {
                item.quantity = quantity;
                this.saveToStorage(CONFIG.storageKeys.cart, this.cart);
                this.emit('cart:changed', this.cart);
            }
        }
    },

    removeFromCart(productId) {
        this.cart = this.cart.filter(i => i.id !== productId);
        this.saveToStorage(CONFIG.storageKeys.cart, this.cart);
        this.emit('cart:changed', this.cart);
        this.emit('cart:itemRemoved', productId);
    },

    clearCart() {
        this.cart = [];
        this.discount = { code: null, type: null, value: 0, amount: 0 };
        this.saveToStorage(CONFIG.storageKeys.cart, []);
        this.emit('cart:changed', this.cart);
        this.emit('cart:cleared');
    },

    applyDiscount(code) {
        const discountConfig = CONFIG.discountCodes[code.toUpperCase()];
        if (!discountConfig) {
            return { success: false, message: 'Kode diskon tidak valid' };
        }

        const subtotal = this.getCartSubtotal();
        if (subtotal < discountConfig.minPurchase) {
            return { 
                success: false, 
                message: `Minimum pembelian ${Utils.formatCurrency(discountConfig.minPurchase)}` 
            };
        }

        let amount = 0;
        if (discountConfig.type === 'percent') {
            amount = (subtotal * discountConfig.value) / 100;
        } else {
            amount = discountConfig.value;
        }

        this.discount = {
            code: code.toUpperCase(),
            type: discountConfig.type,
            value: discountConfig.value,
            amount: amount
        };

        this.emit('cart:discountApplied', this.discount);
        return { success: true, amount };
    },

    getCartSubtotal() {
        return this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    },

    getCartTotal() {
        return this.getCartSubtotal() - this.discount.amount;
    },

    // ========================================
    // TRANSACTIONS
    // ========================================
    setTransactions(transactions) {
        this.transactions = transactions;
        this.emit('transactions:changed', transactions);
    },

    addTransaction(transaction) {
        this.transactions.unshift(transaction);
        this.emit('transactions:changed', this.transactions);
        this.emit('transactions:added', transaction);
    },

    // ========================================
    // CUSTOMERS
    // ========================================
    setCustomers(customers) {
        this.customers = customers;
        this.emit('customers:changed', customers);
    },

    // ========================================
    // SHIFT
    // ========================================
    setCurrentShift(shift) {
        this.currentShift = shift;
        if (shift) {
            this.saveToStorage(CONFIG.storageKeys.currentShift, shift);
        } else {
            localStorage.removeItem(CONFIG.storageKeys.currentShift);
        }
        this.emit('shift:changed', shift);
    },

    // ========================================
    // UI STATE
    // ========================================
    setView(view) {
        this.currentView = view;
        this.emit('view:changed', view);
    },

    setCategory(category) {
        this.currentCategory = category;
        this.emit('category:changed', category);
    },

    setSearchQuery(query) {
        this.searchQuery = query;
        this.emit('search:changed', query);
    },

    setTheme(theme) {
        this.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        this.saveToStorage(CONFIG.storageKeys.theme, theme);
        this.emit('theme:changed', theme);
    },

    toggleTheme() {
        const newTheme = this.theme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    },

    setLoading(isLoading) {
        this.isLoading = isLoading;
        this.emit('loading:changed', isLoading);
    },

    setOnlineStatus(isOnline) {
        this.isOnline = isOnline;
        this.emit('online:changed', isOnline);
    },

    // ========================================
    // LOCAL STORAGE HELPERS
    // ========================================
    saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error('❌ Error saving to localStorage:', error);
        }
    },

    loadFromStorage(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error('❌ Error loading from localStorage:', error);
            return defaultValue;
        }
    },

    // ========================================
    // INITIALIZATION
    // ========================================
    init() {
        // Load theme
        const savedTheme = this.loadFromStorage(CONFIG.storageKeys.theme, 'light');
        this.setTheme(savedTheme);

        // Load cart
        const savedCart = this.loadFromStorage(CONFIG.storageKeys.cart, []);
        this.cart = savedCart;

        // Load shift
        const savedShift = this.loadFromStorage(CONFIG.storageKeys.currentShift, null);
        this.currentShift = savedShift;

        // Listen for online/offline
        window.addEventListener('online', () => this.setOnlineStatus(true));
        window.addEventListener('offline', () => this.setOnlineStatus(false));

        console.log('%c✅ State module initialized', 'color: #10b981;');
    }
};

// Auto-init
AppState.init();

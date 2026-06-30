const CONFIG = {
    supabase: {
        url: 'https://marelgsluzshkwxwcjod.supabase.co',
        key: '', // eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmVsZ3NsdXpzaGt3eHdjam9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MDg3MzIsImV4cCI6MjA5ODI4NDczMn0.73CLxhbxhO28UplJU8C1-mtNawlsMegVsORXY7PPzlg
    },
    api: {
        products: '/rest/v1/products',
        transactions: '/rest/v1/transactions',
        transactionItems: '/rest/v1/transaction_items',
        shifts: '/rest/v1/shifts',
        customers: '/rest/v1/customers',
    },
    app: {
        name: 'WarungKita PRO MAX',
        version: '1.0.0',
        currency: 'IDR',
        currencySymbol: 'Rp',
        locale: 'id-ID',
    },
    defaults: {
        minStock: 10,
        lowStockThreshold: 20,
        defaultInitialCash: 500000,
        discountCodes: {
            'WARUNG10': { type: 'percentage', value: 10, description: 'Diskon 10%' },
            'HEMAT20': { type: 'percentage', value: 20, description: 'Diskon 20%' },
            'PROMO50': { type: 'fixed', value: 50000, description: 'Potongan Rp 50.000' },
        },
        paymentMethods: [
            { id: 'cash', name: 'Tunai', icon: 'fas fa-money-bill-wave' },
            { id: 'qris', name: 'QRIS', icon: 'fas fa-qrcode' },
            { id: 'transfer', name: 'Transfer', icon: 'fas fa-university' },
            { id: 'ewallet', name: 'E-Wallet', icon: 'fas fa-wallet' },
        ],
        categories: [
            { id: 'makanan', name: 'Makanan', icon: '🍔' },
            { id: 'minuman', name: 'Minuman', icon: '🥤' },
            { id: 'snack', name: 'Snack', icon: '🍿' },
            { id: 'household', name: 'Household', icon: '🧴' },
            { id: 'lainnya', name: 'Lainnya', icon: '📦' },
        ],
    },
    features: {
        enableOfflineMode: true,
        enableBarcodeScanner: true,
        enableAIAssistant: true,
    },
    ui: {
        toastDuration: 3000,
        defaultTheme: 'light',
    },
    sounds: {
        enabled: true,
        volume: 0.5,
    },
    storageKeys: {
        theme: 'warungkita_theme',
        products: 'warungkita_products',
        cart: 'warungkita_cart',
        transactions: 'warungkita_transactions',
        currentShift: 'warungkita_shift',
    },
};

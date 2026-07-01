/**
 * PRODUCTS MODULE
 * Mengelola tampilan dan interaksi produk
 */

const ProductsModule = {
    currentCategory: 'all',
    searchQuery: '',
    editingProductId: null,

    async init() {
        console.log('%c📦 ProductsModule initialized', 'color: #3b82f6;');
        await this.loadProducts();
        this.setupEventListeners();
        this.renderProductsGrid();
        this.renderProductsTable();
    },

    async loadProducts() {
        try {
            AppState.setLoading(true);
            const products = await API.products.getAll();
            AppState.setProducts(products);
            
            try {
                localStorage.setItem(
                    CONFIG.storageKeys.productsCache, 
                    JSON.stringify(products)
                );
            } catch(e) {
                console.warn('Cache save failed:', e);
            }
            
            console.log(`✅ Loaded ${products.length} products`);
        } catch (error) {
            console.error('❌ Failed to load products:', error);
            
            let cached = [];
            try {
                const raw = localStorage.getItem(CONFIG.storageKeys.productsCache);
                cached = raw ? JSON.parse(raw) : [];
                if (!Array.isArray(cached)) cached = [];
            } catch(e) {
                cached = [];
            }
            
            if (cached.length > 0) {
                AppState.setProducts(cached);
                Utils.toast('⚠️ Menggunakan data offline (cache)', 'warning');
            } else {
                const dummyProducts = [
                    { id: 1, name: 'Indomie Goreng', category: 'makanan', price: 3500, stock: 50, emoji: '🍜' },
                    { id: 2, name: 'Aqua 600ml', category: 'minuman', price: 4000, stock: 30, emoji: '💧' },
                    { id: 3, name: 'Teh Botol', category: 'minuman', price: 5000, stock: 20, emoji: '🍵' },
                    { id: 4, name: 'Chitato', category: 'snack', price: 10000, stock: 15, emoji: '🥔' },
                    { id: 5, name: 'Sabun Lifebuoy', category: 'household', price: 3000, stock: 40, emoji: '🧼' }
                ];
                AppState.setProducts(dummyProducts);
                Utils.toast('⚠️ Mode demo - Supabase belum terhubung', 'warning', 5000);
            }
        } finally {
            AppState.setLoading(false);
        }
    },

    renderProductsGrid() {
        const grid = document.getElementById('productsGrid');
        if (!grid) return;

        let products = AppState.products;

        if (this.currentCategory !== 'all') {
            products = products.filter(p => p.category === this.currentCategory);
        }

        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            products = products.filter(p => 
                p.name.toLowerCase().includes(query) ||
                (p.barcode && p.barcode.includes(query))
            );
        }

        if (products.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <p>Tidak ada produk ditemukan</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = products.map(product => {
            const stockClass = product.stock <= CONFIG.stock.lowStockThreshold ? 'low' : '';
            const outOfStock = product.stock <= 0;
            
            return `
                <div class="product-card" data-product-id="${product.id}">
                    <div class="product-emoji">${product.emoji || '📦'}</div>
                    <div class="product-info">
                        <h4 class="product-name">${product.name}</h4>
                        <p class="product-price">${Utils.formatCurrency(product.price)}</p>
                        <span class="product-stock ${stockClass}">
                            Stok: ${product.stock}
                        </span>
                    </div>
                    ${outOfStock ? '<div class="out-of-stock-badge">Habis</div>' : ''}
                </div>
            `;
        }).join('');

        grid.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', () => {
                const productId = parseInt(card.dataset.productId);
                const product = AppState.products.find(p => p.id === productId);
                
                if (product && product.stock > 0) {
                    CartModule.addToCart(product);
                    Utils.playSound('add');
                } else {
                    Utils.toast('Stok produk habis', 'warning');
                }
            });
        });
    },

    renderProductsTable() {
        const tbody = document.getElementById('productsTableBody');
        if (!tbody) return;

        if (AppState.products.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <i class="fas fa-box-open"></i>
                        <p>Belum ada produk</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = AppState.products.map(product => {
            let status, statusClass;
            
            if (product.stock <= 0) {
                status = 'Habis';
                statusClass = 'badge-danger';
            } else if (product.stock <= CONFIG.stock.lowStockThreshold) {
                status = 'Menipis';
                statusClass = 'badge-warning';
            } else {
                status = 'Tersedia';
                statusClass = 'badge-success';
            }

            return `
                <tr data-product-id="${product.id}">
                    <td>
                        <div class="product-cell">
                            <span class="product-emoji">${product.emoji || '📦'}</span>
                            <div>
                                <strong>${product.name}</strong>
                                ${product.barcode ? `<small class="text-muted">Barcode: ${product.barcode}</small>` : ''}
                            </div>
                        </div>
                    </td>
                    <td><span class="badge badge-info">${product.category}</span></td>
                    <td><strong>${Utils.formatCurrency(product.price)}</strong></td>
                    <td>${product.stock}</td>
                    <td><span class="badge ${statusClass}">${status}</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon-small btn-edit" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon-small btn-delete" title="Hapus">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.closest('tr').dataset.productId);
                this.openEditModal(id);
            });
        });

        tbody.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.closest('tr').dataset.productId);
                this.deleteProduct(id);
            });
        });
    },

    setCategory(category) {
        this.currentCategory = category;
        this.renderProductsGrid();
        
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });
    },

    setSearch(query) {
        this.searchQuery = query;
        this.renderProductsGrid();
    },

    openNewModal() {
        this.editingProductId = null;
        const title = document.getElementById('productModalTitle');
        if (title) title.textContent = 'Tambah Produk Baru';
        
        const form = document.getElementById('productForm');
        if (form) form.reset();
        
        const idInput = document.getElementById('productId');
        if (idInput) idInput.value = '';
        
        Utils.openModal('productModal');
    },

    openEditModal(productId) {
        const product = AppState.products.find(p => p.id === productId);
        if (!product) return;

        this.editingProductId = productId;
        const title = document.getElementById('productModalTitle');
        if (title) title.textContent = 'Edit Produk';
        
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productCategory').value = product.category;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productModalPrice').value = product.modal_price || 0;
        document.getElementById('productStock').value = product.stock;
        document.getElementById('productBarcode').value = product.barcode || '';
        document.getElementById('productEmoji').value = product.emoji || '';
        
        Utils.openModal('productModal');
    },

    async saveProduct(formData) {
        try {
            AppState.setLoading(true);
            
            const productData = {
                name: formData.name,
                category: formData.category,
                price: parseInt(formData.price),
                modal_price: parseInt(formData.modalPrice) || 0,
                stock: parseInt(formData.stock),
                barcode: formData.barcode || null,
                emoji: formData.emoji || '📦'
            };

            if (this.editingProductId) {
                await API.products.update(this.editingProductId, productData);
                AppState.updateProduct(this.editingProductId, productData);
                Utils.toast('Produk berhasil diupdate', 'success');
            } else {
                const newProduct = await API.products.create(productData);
                AppState.addProduct(newProduct);
                Utils.toast('Produk berhasil ditambahkan', 'success');
            }

            Utils.closeModal('productModal');
            this.renderProductsGrid();
            this.renderProductsTable();
            Utils.playSound('success');
        } catch (error) {
            console.error('❌ Save product error:', error);
            Utils.toast('Gagal menyimpan produk: ' + error.message, 'error');
        } finally {
            AppState.setLoading(false);
        }
    },

    async deleteProduct(productId) {
        const product = AppState.products.find(p => p.id === productId);
        if (!product) return;

        const confirmed = await Utils.confirm(
            `Yakin ingin menghapus produk "${product.name}"?`,
            'Hapus Produk'
        );

        if (!confirmed) return;

        try {
            await API.products.delete(productId);
            AppState.removeProduct(productId);
            this.renderProductsGrid();
            this.renderProductsTable();
            Utils.toast('Produk berhasil dihapus', 'success');
            Utils.playSound('success');
        } catch (error) {
            console.error('❌ Delete product error:', error);
            Utils.toast('Gagal menghapus produk', 'error');
        }
    },

    setupEventListeners() {
        const btnNew = document.getElementById('btnNewProduct');
        if (btnNew) {
            btnNew.addEventListener('click', () => this.openNewModal());
        }

        const form = document.getElementById('productForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = {
                    name: document.getElementById('productName').value,
                    category: document.getElementById('productCategory').value,
                    price: document.getElementById('productPrice').value,
                    modalPrice: document.getElementById('productModalPrice').value,
                    stock: document.getElementById('productStock').value,
                    barcode: document.getElementById('productBarcode').value,
                    emoji: document.getElementById('productEmoji').value
                };
                this.saveProduct(formData);
            });
        }

        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setCategory(btn.dataset.category);
            });
        });

        const posSearch = document.getElementById('posSearch');
        if (posSearch) {
            posSearch.addEventListener('input', Utils.debounce((e) => {
                this.setSearch(e.target.value);
            }, 300));
        }

        const globalSearch = document.getElementById('globalSearch');
        if (globalSearch) {
            globalSearch.addEventListener('input', Utils.debounce((e) => {
                this.setSearch(e.target.value);
                if (e.target.value && AppState.currentView !== 'pos') {
                    if (typeof AppMain !== 'undefined') {
                        AppMain.switchView('pos');
                    }
                }
            }, 300));
        }

        AppState.subscribe('products:changed', () => {
            this.renderProductsGrid();
            this.renderProductsTable();
        });
    }
};

Object.freeze(ProductsModule);
console.log('%c✅ ProductsModule loaded', 'color: #10b981;');

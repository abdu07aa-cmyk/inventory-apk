/**
 * ================================================================
 * WARUNGKITA PRO MAX - SUPABASE API WRAPPER
 * ================================================================
 * Wrapper untuk interaksi dengan Supabase REST API.
 * Mendukung CRUD operations dengan fallback ke localStorage.
 * ================================================================
 */

import { SUPABASE_CONFIG, getApiEndpoint, getApiHeaders } from './config.js';
import { loadFromStorage, saveToStorage, generateId } from './utils.js';
import { state } from './state.js';

// ================================================================
// API CLIENT
// ================================================================

class ApiClient {
    constructor() {
        this.url = SUPABASE_CONFIG.url;
        this.key = SUPABASE_CONFIG.key;
        this.tables = SUPABASE_CONFIG.tables;
        this.isConnected = false;
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    /**
     * Set API key
     * @param {string} key - Supabase API key
     */
    setApiKey(key) {
        this.key = key;
        this.isConnected = !!key;
    }

    /**
     * Check connection status
     * @returns {Promise<boolean>} Status koneksi
     */
    async checkConnection() {
        try {
            const response = await fetch(`${this.url}/rest/v1/`, {
                headers: this.getHeaders(),
                method: 'HEAD'
            });
            this.isConnected = response.ok;
            return this.isConnected;
        } catch (error) {
            this.isConnected = false;
            return false;
        }
    }

    /**
     * Get headers for API request
     * @returns {Object} Headers
     */
    getHeaders() {
        return getApiHeaders(this.key);
    }

    /**
     * Handle API response
     * @param {Response} response - Fetch response
     * @returns {Promise<any>} Parsed response
     */
    async handleResponse(response) {
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        // Check if response has content
        const contentLength = response.headers.get('content-length');
        if (contentLength === '0') {
            return null;
        }

        return response.json();
    }

    /**
     * Execute API request with retry
     * @param {string} method - HTTP method
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Request options
     * @returns {Promise<any>} Response data
     */
    async request(method, endpoint, options = {}) {
        if (!this.key) {
            throw new Error('API key tidak tersedia. Silakan konfigurasi Supabase.');
        }

        const url = endpoint.startsWith('http') ? endpoint : `${this.url}${endpoint}`;
        const headers = this.getHeaders();

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    ...headers,
                    ...options.headers
                },
                body: options.body ? JSON.stringify(options.body) : undefined,
                ...options
            });

            return this.handleResponse(response);
        } catch (error) {
            console.error('API request failed:', error);

            // Retry logic
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.log(`Retrying... (${this.retryCount}/${this.maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, 1000 * this.retryCount));
                return this.request(method, endpoint, options);
            }

            this.retryCount = 0;
            throw error;
        }
    }

    // ================================================================
    // GENERIC CRUD OPERATIONS
    // ================================================================

    /**
     * Get all records from table
     * @param {string} table - Table name
     * @param {Object} filters - Query filters
     * @param {string} orderBy - Sort column
     * @param {string} order - asc/desc
     * @param {number} limit - Limit results
     * @returns {Promise<Array>} Records
     */
    async getAll(table, filters = {}, orderBy = 'created_at', order = 'desc', limit = null) {
        const endpoint = getApiEndpoint(table);
        const params = new URLSearchParams();

        // Add filters
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                params.append(key, `eq.${value}`);
            }
        });

        // Add order
        params.append('order', `${orderBy}.${order}`);

        // Add limit
        if (limit) {
            params.append('limit', limit);
        }

        const url = `${endpoint}?${params.toString()}`;
        return this.request('GET', url);
    }

    /**
     * Get single record by ID
     * @param {string} table - Table name
     * @param {string|number} id - Record ID
     * @returns {Promise<Object>} Record
     */
    async getById(table, id) {
        const endpoint = getApiEndpoint(table);
        const url = `${endpoint}?id=eq.${id}`;
        const result = await this.request('GET', url);
        return result?.[0] || null;
    }

    /**
     * Create new record
     * @param {string} table - Table name
     * @param {Object} data - Record data
     * @returns {Promise<Object>} Created record
     */
    async create(table, data) {
        const endpoint = getApiEndpoint(table);
        const result = await this.request('POST', endpoint, {
            body: data,
            headers: {
                'Prefer': 'return=representation'
            }
        });
        return result?.[0] || null;
    }

    /**
     * Update record by ID
     * @param {string} table - Table name
     * @param {string|number} id - Record ID
     * @param {Object} data - Update data
     * @returns {Promise<Object>} Updated record
     */
    async update(table, id, data) {
        const endpoint = getApiEndpoint(table);
        const url = `${endpoint}?id=eq.${id}`;
        const result = await this.request('PATCH', url, {
            body: data,
            headers: {
                'Prefer': 'return=representation'
            }
        });
        return result?.[0] || null;
    }

    /**
     * Delete record by ID
     * @param {string} table - Table name
     * @param {string|number} id - Record ID
     * @returns {Promise<boolean>} Success
     */
    async delete(table, id) {
        const endpoint = getApiEndpoint(table);
        const url = `${endpoint}?id=eq.${id}`;
        await this.request('DELETE', url);
        return true;
    }

    /**
     * Upsert record (insert or update)
     * @param {string} table - Table name
     * @param {Object} data - Record data
     * @param {string} conflictColumn - Column for conflict resolution
     * @returns {Promise<Object>} Upserted record
     */
    async upsert(table, data, conflictColumn = 'id') {
        const endpoint = getApiEndpoint(table);
        const result = await this.request('POST', endpoint, {
            body: data,
            headers: {
                'Prefer': `return=representation,resolution=merge-duplicates,on_conflict=${conflictColumn}`
            }
        });
        return result?.[0] || null;
    }

    // ================================================================
    // SPECIFIC TABLE OPERATIONS
    // ================================================================

    /**
     * Get all products
     * @returns {Promise<Array>} Products
     */
    async getProducts() {
        return this.getAll('products', {}, 'name', 'asc');
    }

    /**
     * Get product by ID
     * @param {string} id - Product ID
     * @returns {Promise<Object>} Product
     */
    async getProduct(id) {
        return this.getById('products', id);
    }

    /**
     * Create product
     * @param {Object} data - Product data
     * @returns {Promise<Object>} Created product
     */
    async createProduct(data) {
        return this.create('products', {
            ...data,
            created_at: new Date().toISOString()
        });
    }

    /**
     * Update product
     * @param {string} id - Product ID
     * @param {Object} data - Update data
     * @returns {Promise<Object>} Updated product
     */
    async updateProduct(id, data) {
        return this.update('products', id, {
            ...data,
            updated_at: new Date().toISOString()
        });
    }

    /**
     * Delete product
     * @param {string} id - Product ID
     * @returns {Promise<boolean>} Success
     */
    async deleteProduct(id) {
        return this.delete('products', id);
    }

    /**
     * Update product stock
     * @param {string} id - Product ID
     * @param {number} quantity - New quantity
     * @returns {Promise<Object>} Updated product
     */
    async updateStock(id, quantity) {
        return this.update('products', id, {
            stock: quantity,
            last_stock_update: new Date().toISOString()
        });
    }

    // ================================================================
    // TRANSACTIONS
    // ================================================================

    /**
     * Get all transactions
     * @param {Object} filters - Filters
     * @returns {Promise<Array>} Transactions
     */
    async getTransactions(filters = {}) {
        return this.getAll('transactions', filters, 'created_at', 'desc');
    }

    /**
     * Get transaction by ID
     * @param {string} id - Transaction ID
     * @returns {Promise<Object>} Transaction
     */
    async getTransaction(id) {
        return this.getById('transactions', id);
    }

    /**
     * Create transaction with items
     * @param {Object} transaction - Transaction data
     * @param {Array} items - Transaction items
     * @returns {Promise<Object>} Created transaction
     */
    async createTransaction(transaction, items) {
        const result = await this.create('transactions', {
            ...transaction,
            created_at: new Date().toISOString()
        });

        if (result && items && items.length > 0) {
            const itemsWithTransaction = items.map(item => ({
                ...item,
                transaction_id: result.id
            }));
            await this.createTransactionItems(itemsWithTransaction);
        }

        return result;
    }

    /**
     * Create transaction items
     * @param {Array} items - Transaction items
     * @returns {Promise<Array>} Created items
     */
    async createTransactionItems(items) {
        const endpoint = getApiEndpoint('transaction_items');
        const result = await this.request('POST', endpoint, {
            body: items,
            headers: {
                'Prefer': 'return=representation'
            }
        });
        return result || [];
    }

    // ================================================================
    // CUSTOMERS
    // ================================================================

    /**
     * Get all customers
     * @param {Object} filters - Filters
     * @returns {Promise<Array>} Customers
     */
    async getCustomers(filters = {}) {
        return this.getAll('customers', filters, 'created_at', 'desc');
    }

    /**
     * Create customer
     * @param {Object} data - Customer data
     * @returns {Promise<Object>} Created customer
     */
    async createCustomer(data) {
        return this.create('customers', {
            ...data,
            created_at: new Date().toISOString()
        });
    }

    /**
     * Update customer points
     * @param {string} id - Customer ID
     * @param {number} points - New points
     * @returns {Promise<Object>} Updated customer
     */
    async updateCustomerPoints(id, points) {
        return this.update('customers', id, {
            points,
            updated_at: new Date().toISOString()
        });
    }

    // ================================================================
    // SHIFTS
    // ================================================================

    /**
     * Get all shifts
     * @param {Object} filters - Filters
     * @returns {Promise<Array>} Shifts
     */
    async getShifts(filters = {}) {
        return this.getAll('shifts', filters, 'opened_at', 'desc');
    }

    /**
     * Create shift
     * @param {Object} data - Shift data
     * @returns {Promise<Object>} Created shift
     */
    async createShift(data) {
        return this.create('shifts', {
            ...data,
            opened_at: new Date().toISOString()
        });
    }

    /**
     * Close shift
     * @param {string} id - Shift ID
     * @param {number} finalCash - Final cash
     * @returns {Promise<Object>} Updated shift
     */
    async closeShift(id, finalCash) {
        return this.update('shifts', id, {
            status: 'closed',
            closed_at: new Date().toISOString(),
            final_cash: finalCash
        });
    }

    // ================================================================
    // SYNC & OFFLINE
    // ================================================================

    /**
     * Sync local data with Supabase
     * @param {string} table - Table name
     * @param {Array} localData - Local data
     * @param {string} idField - ID field name
     * @returns {Promise<Object>} Sync result
     */
    async syncTable(table, localData, idField = 'id') {
        try {
            // Get remote data
            const remoteData = await this.getAll(table);

            // Create map for remote data
            const remoteMap = {};
            remoteData.forEach(item => {
                remoteMap[item[idField]] = item;
            });

            // Create map for local data
            const localMap = {};
            const newItems = [];
            const updateItems = [];

            localData.forEach(item => {
                if (item[idField] && remoteMap[item[idField]]) {
                    // Check if update needed
                    const remote = remoteMap[item[idField]];
                    if (JSON.stringify(item) !== JSON.stringify(remote)) {
                        updateItems.push(item);
                    }
                } else if (item[idField]) {
                    // Existing local but not in remote
                    newItems.push(item);
                }
            });

            // Upsert new/updated items
            const results = [];
            for (const item of [...newItems, ...updateItems]) {
                const result = await this.upsert(table, item, idField);
                results.push(result);
            }

            return {
                success: true,
                inserted: newItems.length,
                updated: updateItems.length,
                results
            };
        } catch (error) {
            console.error('Sync failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Sync all tables
     * @returns {Promise<Object>} Sync results
     */
    async syncAll() {
        const results = {};
        const tables = ['products', 'transactions', 'customers', 'shifts'];

        for (const table of tables) {
            const localData = loadFromStorage(`warungkita-${table}`, []);
            if (localData.length > 0) {
                results[table] = await this.syncTable(table, localData);
            }
        }

        return results;
    }
}

// ================================================================
// EXPORT
// ================================================================

export const api = new ApiClient();

export default api;

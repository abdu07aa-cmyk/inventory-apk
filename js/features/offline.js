/**
 * ================================================================
 * WARUNGKITA PRO MAX - OFFLINE MODE
 * ================================================================
 * Offline-first support dengan localStorage dan sync queue.
 * ================================================================
 */

import { state, setOnlineStatus } from '../state.js';
import { saveToStorage, loadFromStorage, generateId, showToast } from '../utils.js';
import { api } from '../api.js';
import { STORAGE_KEYS } from '../config.js';

// ================================================================
// OFFLINE QUEUE
// ================================================================

const QUEUE_KEY = 'warungkita-offline-queue';

/**
 * Get offline queue
 * @returns {Array} Queue items
 */
function getQueue() {
    return loadFromStorage(QUEUE_KEY, []);
}

/**
 * Save queue to storage
 * @param {Array} queue - Queue items
 */
function saveQueue(queue) {
    saveToStorage(QUEUE_KEY, queue);
}

/**
 * Add operation to queue
 * @param {string} operation - Operation type
 * @param {string} table - Table name
 * @param {Object} data - Operation data
 * @param {string} id - Record ID (optional)
 */
export function queueOperation(operation, table, data, id = null) {
    const queue = getQueue();
    queue.push({
        id: generateId('Q'),
        operation,
        table,
        data,
        recordId: id,
        timestamp: new Date().toISOString(),
        retries: 0
    });
    saveQueue(queue);
    console.log(`📦 Queued operation: ${operation} on ${table}`);
}

/**
 * Process queued operations
 * @returns {Promise<Object>} Processing result
 */
export async function processQueue() {
    const queue = getQueue();
    
    if (queue.length === 0) {
        return { success: true, processed: 0 };
    }

    if (!navigator.onLine) {
        return { success: false, error: 'Offline', processed: 0 };
    }

    console.log(`🔄 Processing ${queue.length} queued operations...`);
    
    const results = {
        success: [],
        failed: []
    };

    for (const item of queue) {
        try {
            let result;
            
            switch (item.operation) {
                case 'create':
                    result = await api.create(item.table, item.data);
                    break;
                case 'update':
                    result = await api.update(item.table, item.recordId, item.data);
                    break;
                case 'delete':
                    result = await api.delete(item.table, item.recordId);
                    break;
                case 'upsert':
                    result = await api.upsert(item.table, item.data);
                    break;
                default:
                    throw new Error(`Unknown operation: ${item.operation}`);
            }
            
            results.success.push(item.id);
            console.log(`✅ Processed: ${item.operation} on ${item.table}`);
            
        } catch (error) {
            item.retries++;
            if (item.retries < 3) {
                // Keep in queue for retry
                results.failed.push(item.id);
                console.log(`⚠️ Retry ${item.retries}: ${item.operation} on ${item.table}`);
            } else {
                // Remove after max retries
                results.failed.push(item.id);
                console.error(`❌ Failed after ${item.retries} retries:`, error);
            }
        }
    }

    // Update queue (remove processed items)
    const newQueue = queue.filter(item => 
        results.failed.includes(item.id) && item.retries < 3
    );
    saveQueue(newQueue);

    // Show notification
    if (results.success.length > 0) {
        showToast(`✅ ${results.success.length} operasi berhasil disinkronkan`, 'success');
    }
    if (results.failed.length > 0) {
        showToast(`⚠️ ${results.failed.length} operasi gagal, akan dicoba ulang`, 'warning');
    }

    return {
        success: results.failed.length === 0,
        processed: results.success.length,
        failed: results.failed.length
    };
}

// ================================================================
// OFFLINE STORAGE
// ================================================================

/**
 * Save data to offline storage
 * @param {string} key - Storage key
 * @param {*} data - Data to save
 */
export function saveOffline(key, data) {
    try {
        localStorage.setItem(`offline-${key}`, JSON.stringify(data));
    } catch (error) {
        console.error('Failed to save offline data:', error);
    }
}

/**
 * Load data from offline storage
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value
 * @returns {*} Loaded data
 */
export function loadOffline(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(`offline-${key}`);
        return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
        console.error('Failed to load offline data:', error);
        return defaultValue;
    }
}

/**
 * Clear offline storage
 * @param {string} key - Storage key (optional)
 */
export function clearOffline(key = null) {
    if (key) {
        localStorage.removeItem(`offline-${key}`);
    } else {
        // Clear all offline data
        const keys = Object.keys(localStorage);
        keys.forEach(k => {
            if (k.startsWith('offline-')) {
                localStorage.removeItem(k);
            }
        });
    }
}

// ================================================================
// SYNC HANDLERS
// ================================================================

/**
 * Sync local data with server
 * @param {string} table - Table name
 * @param {Array} localData - Local data
 * @returns {Promise<Object>} Sync result
 */
export async function syncTable(table, localData) {
    try {
        if (!navigator.onLine) {
            throw new Error('Offline');
        }

        // Get remote data
        const remoteData = await api.getAll(table);
        
        // Compare and sync
        const localMap = {};
        const remoteMap = {};
        
        localData.forEach(item => {
            localMap[item.id] = item;
        });
        
        remoteData.forEach(item => {
            remoteMap[item.id] = item;
        });

        const toCreate = [];
        const toUpdate = [];
        const toDelete = [];

        // Find items to create or update
        localData.forEach(item => {
            if (!remoteMap[item.id]) {
                toCreate.push(item);
            } else if (JSON.stringify(item) !== JSON.stringify(remoteMap[item.id])) {
                toUpdate.push(item);
            }
        });

        // Find items to delete
        remoteData.forEach(item => {
            if (!localMap[item.id]) {
                toDelete.push(item.id);
            }
        });

        // Execute sync
        const results = [];

        // Create
        for (const item of toCreate) {
            const result = await api.create(table, item);
            results.push({ operation: 'create', item: result });
        }

        // Update
        for (const item of toUpdate) {
            const result = await api.update(table, item.id, item);
            results.push({ operation: 'update', item: result });
        }

        // Delete
        for (const id of toDelete) {
            await api.delete(table, id);
            results.push({ operation: 'delete', id });
        }

        return {
            success: true,
            created: toCreate.length,
            updated: toUpdate.length,
            deleted: toDelete.length,
            results
        };

    } catch (error) {
        console.error(`Sync failed for ${table}:`, error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Full sync all tables
 * @returns {Promise<Object>} Sync results
 */
export async function fullSync() {
    if (!navigator.onLine) {
        showToast('Tidak ada koneksi internet', 'error');
        return { success: false, error: 'Offline' };
    }

    showToast('🔄 Menyinkronkan data...', 'info');

    const tables = ['products', 'transactions', 'customers', 'shifts'];
    const results = {};

    for (const table of tables) {
        const localData = loadFromStorage(`warungkita-${table}`, []);
        if (localData.length > 0) {
            results[table] = await syncTable(table, localData);
        } else {
            results[table] = { success: true, created: 0, updated: 0, deleted: 0 };
        }
    }

    // Process queue
    const queueResult = await processQueue();

    showToast('✅ Sinkronisasi selesai!', 'success');
    
    return {
        success: true,
        tables: results,
        queue: queueResult
    };
}

// ================================================================
// OFFLINE DETECTION
// ================================================================

/**
 * Setup offline detection and auto-sync
 */
export function setupOfflineDetection() {
    // Online event
    window.addEventListener('online', async () => {
        setOnlineStatus(true);
        showToast('🟢 Kembali online, menyinkronkan data...', 'success');
        
        // Auto sync
        await fullSync();
        
        // Update UI
        const event = new CustomEvent('online-status-changed', { detail: true });
        document.dispatchEvent(event);
    });

    // Offline event
    window.addEventListener('offline', () => {
        setOnlineStatus(false);
        showToast('🔴 Koneksi terputus. Bekerja offline.', 'warning');
        
        const event = new CustomEvent('online-status-changed', { detail: false });
        document.dispatchEvent(event);
    });

    // Check initial status
    if (!navigator.onLine) {
        setOnlineStatus(false);
        showToast('🔴 Mode offline', 'warning');
    }
}

// ================================================================
// CACHE MANAGEMENT
// ================================================================

/**
 * Cache data for offline use
 * @param {string} key - Cache key
 * @param {*} data - Data to cache
 * @param {number} expiry - Expiry in minutes (optional)
 */
export function cacheData(key, data, expiry = null) {
    const cache = {
        data,
        timestamp: Date.now()
    };
    
    if (expiry) {
        cache.expiry = expiry;
    }
    
    saveOffline(`cache-${key}`, cache);
}

/**
 * Get cached data
 * @param {string} key - Cache key
 * @param {number} maxAge - Max age in minutes (optional)
 * @returns {*} Cached data or null
 */
export function getCache(key, maxAge = null) {
    const cache = loadOffline(`cache-${key}`);
    
    if (!cache) return null;
    
    if (maxAge) {
        const age = (Date.now() - cache.timestamp) / (1000 * 60);
        if (age > maxAge) {
            return null;
        }
    }
    
    return cache.data;
}

/**
 * Clear cache
 * @param {string} key - Cache key (optional)
 */
export function clearCache(key = null) {
    if (key) {
        localStorage.removeItem(`offline-cache-${key}`);
    } else {
        const keys = Object.keys(localStorage);
        keys.forEach(k => {
            if (k.startsWith('offline-cache-')) {
                localStorage.removeItem(k);
            }
        });
    }
}

// ================================================================
// EXPORT
// ================================================================

export default {
    queueOperation,
    processQueue,
    saveOffline,
    loadOffline,
    clearOffline,
    syncTable,
    fullSync,
    setupOfflineDetection,
    cacheData,
    getCache,
    clearCache
};

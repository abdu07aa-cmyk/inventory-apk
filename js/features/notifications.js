/**
 * ================================================================
 * WARUNGKITA PRO MAX - NOTIFICATIONS
 * ================================================================
 * Proaktif notifikasi untuk stok menipis, transaksi, dll.
 * ================================================================
 */

import { state, subscribe } from '../state.js';
import { showToast, formatCurrency } from '../utils.js';
import { APP_CONFIG } from '../config.js';

// ================================================================
// NOTIFICATION TYPES
// ================================================================

const NOTIFICATION_TYPES = {
    LOW_STOCK: 'low-stock',
    OUT_OF_STOCK: 'out-of-stock',
    TRANSACTION_COMPLETED: 'transaction-completed',
    SHIFT_OPENED: 'shift-opened',
    SHIFT_CLOSED: 'shift-closed',
    SYNC_COMPLETED: 'sync-completed',
    SYSTEM: 'system'
};

// ================================================================
// NOTIFICATION HANDLERS
// ================================================================

/**
 * Initialize notification system
 */
export function initNotifications() {
    // Subscribe to state changes
    subscribe((newState, action, data) => {
        handleStateChange(action, data);
    });

    // Check for low stock on load
    setTimeout(() => {
        checkLowStock();
    }, 2000);

    // Check every 5 minutes
    setInterval(() => {
        checkLowStock();
    }, 5 * 60 * 1000);

    // Update notification badge
    updateNotificationBadge();
}

/**
 * Handle state changes for notifications
 */
function handleStateChange(action, data) {
    switch (action) {
        case 'low-stock-warning':
            sendLowStockNotification(data.product);
            break;
            
        case 'out-of-stock':
            sendOutOfStockNotification(data.product);
            break;
            
        case 'transaction-added':
            sendTransactionNotification(data);
            break;
            
        case 'shift-opened':
            sendShiftNotification(data, 'opened');
            break;
            
        case 'shift-closed':
            sendShiftNotification(data, 'closed');
            break;
            
        case 'sync-completed':
            sendSyncNotification(data);
            break;
    }
}

// ================================================================
// CHECK LOW STOCK
// ================================================================

/**
 * Check all products for low stock
 */
function checkLowStock() {
    const lowStockProducts = state.products.filter(p => 
        p.stock <= APP_CONFIG.lowStockThreshold && p.stock > 0
    );

    const outOfStockProducts = state.products.filter(p => p.stock === 0);

    // Send notifications for low stock
    lowStockProducts.forEach(product => {
        sendLowStockNotification(product);
    });

    // Send notifications for out of stock
    outOfStockProducts.forEach(product => {
        sendOutOfStockNotification(product);
    });

    // Update notification badge
    updateNotificationBadge();
}

// ================================================================
// SEND NOTIFICATIONS
// ================================================================

/**
 * Send low stock notification
 * @param {Object} product - Product object
 */
function sendLowStockNotification(product) {
    const message = `⚠️ Stok ${product.name} menipis! Tersisa ${product.stock} unit.`;
    
    // Show toast
    showToast(message, 'warning');
    
    // Add to notification center
    addNotification({
        type: NOTIFICATION_TYPES.LOW_STOCK,
        title: 'Stok Menipis',
        message: message,
        data: product,
        timestamp: new Date().toISOString()
    });
}

/**
 * Send out of stock notification
 * @param {Object} product - Product object
 */
function sendOutOfStockNotification(product) {
    const message = `❌ ${product.name} sudah habis stok! Segera restock.`;
    
    // Show toast
    showToast(message, 'error');
    
    // Add to notification center
    addNotification({
        type: NOTIFICATION_TYPES.OUT_OF_STOCK,
        title: 'Stok Habis',
        message: message,
        data: product,
        timestamp: new Date().toISOString()
    });
}

/**
 * Send transaction notification
 * @param {Object} transaction - Transaction object
 */
function sendTransactionNotification(transaction) {
    const message = `✅ Transaksi ${transaction.id} selesai. Total: ${formatCurrency(transaction.total_amount)}`;
    
    // Show toast
    showToast(message, 'success');
    
    // Add to notification center
    addNotification({
        type: NOTIFICATION_TYPES.TRANSACTION_COMPLETED,
        title: 'Transaksi Selesai',
        message: message,
        data: transaction,
        timestamp: new Date().toISOString()
    });
}

/**
 * Send shift notification
 * @param {Object} shift - Shift object
 * @param {string} action - 'opened' or 'closed'
 */
function sendShiftNotification(shift, action) {
    const actionText = action === 'opened' ? 'dibuka' : 'ditutup';
    const message = `⏰ Shift ${shift.id} ${actionText} oleh ${shift.cashier_name}`;
    
    // Show toast
    showToast(message, 'info');
    
    // Add to notification center
    addNotification({
        type: action === 'opened' ? NOTIFICATION_TYPES.SHIFT_OPENED : NOTIFICATION_TYPES.SHIFT_CLOSED,
        title: `Shift ${action === 'opened' ? 'Dibuka' : 'Ditutup'}`,
        message: message,
        data: shift,
        timestamp: new Date().toISOString()
    });
}

/**
 * Send sync notification
 * @param {Object} result - Sync result
 */
function sendSyncNotification(result) {
    const message = `🔄 Sinkronisasi selesai. ${result.processed || 0} data diproses.`;
    
    // Show toast
    showToast(message, 'success');
    
    // Add to notification center
    addNotification({
        type: NOTIFICATION_TYPES.SYNC_COMPLETED,
        title: 'Sinkronisasi Selesai',
        message: message,
        data: result,
        timestamp: new Date().toISOString()
    });
}

// ================================================================
// NOTIFICATION STORE
// ================================================================

const NOTIFICATION_KEY = 'warungkita-notifications';
const MAX_NOTIFICATIONS = 50;

/**
 * Get all notifications
 * @returns {Array} Notifications
 */
export function getNotifications() {
    try {
        const data = localStorage.getItem(NOTIFICATION_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

/**
 * Add notification to store
 * @param {Object} notification - Notification object
 */
function addNotification(notification) {
    const notifications = getNotifications();
    notifications.unshift(notification);
    
    // Limit notifications
    if (notifications.length > MAX_NOTIFICATIONS) {
        notifications.length = MAX_NOTIFICATIONS;
    }
    
    localStorage.setItem(NOTIFICATION_KEY, JSON.stringify(notifications));
    updateNotificationBadge();
}

/**
 * Clear all notifications
 */
export function clearNotifications() {
    localStorage.removeItem(NOTIFICATION_KEY);
    updateNotificationBadge();
}

/**
 * Mark notification as read
 * @param {string} index - Notification index
 */
export function markAsRead(index) {
    const notifications = getNotifications();
    if (notifications[index]) {
        notifications[index].read = true;
        localStorage.setItem(NOTIFICATION_KEY, JSON.stringify(notifications));
        updateNotificationBadge();
    }
}

/**
 * Mark all notifications as read
 */
export function markAllAsRead() {
    const notifications = getNotifications();
    notifications.forEach(n => n.read = true);
    localStorage.setItem(NOTIFICATION_KEY, JSON.stringify(notifications));
    updateNotificationBadge();
}

// ================================================================
// NOTIFICATION BADGE
// ================================================================

/**
 * Update notification badge
 */
function updateNotificationBadge() {
    const notifications = getNotifications();
    const unread = notifications.filter(n => !n.read).length;
    
    const badge = document.getElementById('notificationCount');
    if (badge) {
        badge.textContent = unread;
        badge.style.display = unread > 0 ? 'flex' : 'none';
    }
}

/**
 * Setup notification badge click
 */
export function setupNotificationClick() {
    const badge = document.getElementById('notificationCount');
    if (badge) {
        badge.addEventListener('click', () => {
            showNotificationPanel();
        });
    }
}

// ================================================================
// NOTIFICATION PANEL
// ================================================================

/**
 * Show notification panel
 */
function showNotificationPanel() {
    const notifications = getNotifications();
    
    if (notifications.length === 0) {
        showToast('Tidak ada notifikasi', 'info');
        return;
    }

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2><i class="fas fa-bell"></i> Notifikasi</h2>
                <div style="display: flex; gap: var(--spacing-2);">
                    <button class="btn btn-sm btn-outline" onclick="window.markAllNotificationsRead()">
                        Tandai Semua
                    </button>
                    <button class="modal-close">&times;</button>
                </div>
            </div>
            <div class="modal-body" style="max-height: 400px; overflow-y: auto;">
                ${notifications.map((n, index) => `
                    <div class="notification-item" style="
                        padding: var(--spacing-3);
                        border-bottom: 1px solid var(--border-color);
                        ${n.read ? 'opacity: 0.6;' : ''}
                    ">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div>
                                <div style="font-weight: var(--font-weight-semibold);">
                                    ${n.title}
                                    ${!n.read ? '<span class="badge badge-primary" style="font-size: 8px;">NEW</span>' : ''}
                                </div>
                                <div style="font-size: var(--font-size-sm); color: var(--text-secondary); margin-top: var(--spacing-1);">
                                    ${n.message}
                                </div>
                                <div style="font-size: var(--font-size-xs); color: var(--text-muted); margin-top: var(--spacing-1);">
                                    ${new Date(n.timestamp).toLocaleString()}
                                </div>
                            </div>
                            <button class="btn btn-sm btn-ghost" onclick="window.markNotificationRead(${index})">
                                <i class="fas fa-check"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="modal-footer">
                <button class="btn btn-danger" onclick="window.clearAllNotifications()">
                    <i class="fas fa-trash"></i> Hapus Semua
                </button>
                <button class="btn btn-outline modal-close">Tutup</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Expose functions to window for onclick handlers
    window.markNotificationRead = (index) => {
        markAsRead(index);
        showNotificationPanel(); // Refresh
    };

    window.markAllNotificationsRead = () => {
        markAllAsRead();
        showNotificationPanel(); // Refresh
    };

    window.clearAllNotifications = () => {
        if (confirm('Hapus semua notifikasi?')) {
            clearNotifications();
            showNotificationPanel(); // Refresh
        }
    };

    // Close modal
    modal.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            modal.remove();
            delete window.markNotificationRead;
            delete window.markAllNotificationsRead;
            delete window.clearAllNotifications;
        });
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
            delete window.markNotificationRead;
            delete window.markAllNotificationsRead;
            delete window.clearAllNotifications;
        }
    });
}

// ================================================================
// EXPORT
// ================================================================

export default {
    initNotifications,
    getNotifications,
    clearNotifications,
    markAsRead,
    markAllAsRead,
    setupNotificationClick,
    NOTIFICATION_TYPES
};

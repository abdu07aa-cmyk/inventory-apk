/**
 * ================================================================
 * WARUNGKITA PRO MAX - AUTH MODULE
 * ================================================================
 * Manajemen autentikasi dan multi-user (future implementation).
 * ================================================================
 */

import { api } from '../api.js';
import { showToast } from '../utils.js';

// ================================================================
// AUTH STATE
// ================================================================

const authState = {
    user: null,
    isAuthenticated: false,
    role: 'guest', // guest, cashier, admin, owner
    token: null
};

// ================================================================
// USER MANAGEMENT
// ================================================================

/**
 * Login user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} Login result
 */
export async function login(email, password) {
    try {
        // This is a placeholder for Supabase Auth
        // Will be implemented with Supabase Auth in future
        
        // For now, simple demo login
        if (email === 'admin@warungkita.com' && password === 'admin123') {
            authState.user = {
                id: 'admin-1',
                name: 'Admin',
                email: email,
                role: 'admin'
            };
            authState.isAuthenticated = true;
            authState.role = 'admin';
            
            showToast('Login berhasil! Selamat datang Admin', 'success');
            return { success: true, user: authState.user };
        }
        
        if (email === 'kasir@warungkita.com' && password === 'kasir123') {
            authState.user = {
                id: 'kasir-1',
                name: 'Kasir',
                email: email,
                role: 'cashier'
            };
            authState.isAuthenticated = true;
            authState.role = 'cashier';
            
            showToast('Login berhasil! Selamat datang Kasir', 'success');
            return { success: true, user: authState.user };
        }
        
        showToast('Email atau password salah!', 'error');
        return { success: false, error: 'Invalid credentials' };
        
    } catch (error) {
        console.error('Login failed:', error);
        showToast('Login gagal: ' + error.message, 'error');
        return { success: false, error: error.message };
    }
}

/**
 * Logout user
 */
export function logout() {
    authState.user = null;
    authState.isAuthenticated = false;
    authState.role = 'guest';
    authState.token = null;
    
    localStorage.removeItem('auth-token');
    showToast('Logout berhasil', 'info');
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if authenticated
 */
export function isAuthenticated() {
    return authState.isAuthenticated;
}

/**
 * Get current user
 * @returns {Object|null} Current user
 */
export function getCurrentUser() {
    return authState.user;
}

/**
 * Get user role
 * @returns {string} User role
 */
export function getUserRole() {
    return authState.role;
}

/**
 * Check if user has permission
 * @param {string} requiredRole - Required role
 * @returns {boolean} True if has permission
 */
export function hasPermission(requiredRole) {
    const roleLevel = {
        'guest': 0,
        'cashier': 1,
        'admin': 2,
        'owner': 3
    };
    
    return roleLevel[authState.role] >= roleLevel[requiredRole];
}

/**
 * Register new user
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Registration result
 */
export async function register(userData) {
    try {
        // Placeholder for registration
        // Will be implemented with Supabase Auth
        
        showToast('Fitur registrasi akan segera hadir', 'info');
        return { success: false, error: 'Not implemented yet' };
        
    } catch (error) {
        console.error('Registration failed:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// PERMISSION CHECKS
// ================================================================

/**
 * Check if user can manage products
 * @returns {boolean}
 */
export function canManageProducts() {
    return hasPermission('cashier');
}

/**
 * Check if user can manage transactions
 * @returns {boolean}
 */
export function canManageTransactions() {
    return hasPermission('cashier');
}

/**
 * Check if user can manage users
 * @returns {boolean}
 */
export function canManageUsers() {
    return hasPermission('admin');
}

/**
 * Check if user can view reports
 * @returns {boolean}
 */
export function canViewReports() {
    return hasPermission('cashier');
}

/**
 * Check if user can manage settings
 * @returns {boolean}
 */
export function canManageSettings() {
    return hasPermission('admin');
}

// ================================================================
// EXPORT
// ================================================================

export default {
    login,
    logout,
    isAuthenticated,
    getCurrentUser,
    getUserRole,
    hasPermission,
    canManageProducts,
    canManageTransactions,
    canManageUsers,
    canViewReports,
    canManageSettings,
    authState
};

/**
 * ================================================================
 * WARUNGKITA PRO MAX - CHARTS
 * ================================================================
 * Inisialisasi dan manajemen Chart.js charts.
 * ================================================================
 */

import { state } from './state.js';
import { formatCurrency, randomColor } from './utils.js';

// ================================================================
// CHART CONFIGURATION
// ================================================================

const CHART_COLORS = {
    primary: '#3b82f6',
    success: '#22c55e',
    danger: '#ef4444',
    warning: '#f59e0b',
    purple: '#8b5cf6',
    orange: '#f97316',
    cyan: '#06b6d4',
    pink: '#ec4899',
    indigo: '#6366f1'
};

const CHART_COLORS_LIST = Object.values(CHART_COLORS);

// ================================================================
// GET CHART CONTEXT
// ================================================================

/**
 * Get chart canvas context
 * @param {string} id - Canvas element ID
 * @returns {CanvasRenderingContext2D|null} Canvas context
 */
function getChartContext(id) {
    const canvas = document.getElementById(id);
    if (!canvas) return null;
    return canvas.getContext('2d');
}

// ================================================================
// SALES CHART
// ================================================================

/**
 * Create sales trend chart
 * @param {Array} data - Sales data
 * @param {number} days - Number of days
 * @returns {Chart|null} Chart instance
 */
export function createSalesChart(data = [], days = 30) {
    const ctx = getChartContext('salesChart');
    if (!ctx) return null;

    // Generate labels
    const labels = [];
    const salesData = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const label = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        labels.push(label);

        // Find data for this date
        const dateStr = date.toISOString().split('T')[0];
        const dayData = data.filter(d => d.date === dateStr);
        const total = dayData.reduce((sum, d) => sum + d.total, 0);
        salesData.push(total);
    }

    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Penjualan',
                data: salesData,
                borderColor: CHART_COLORS.primary,
                backgroundColor: `${CHART_COLORS.primary}20`,
                fill: true,
                tension: 0.4,
                pointRadius: 2,
                pointBackgroundColor: CHART_COLORS.primary,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return formatCurrency(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value, false);
                        }
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });

    // Store chart reference
    state.charts.sales = chart;
    return chart;
}

// ================================================================
// TOP PRODUCTS CHART
// ================================================================

/**
 * Create top products chart
 * @param {Array} data - Product sales data
 * @returns {Chart|null} Chart instance
 */
export function createTopProductsChart(data = []) {
    const ctx = getChartContext('topProductsChart');
    if (!ctx) return null;

    // Sort by quantity sold and take top 5
    const sorted = [...data]
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

    const labels = sorted.map(item => item.name);
    const quantities = sorted.map(item => item.quantity);
    const colors = sorted.map((_, i) => CHART_COLORS_LIST[i % CHART_COLORS_LIST.length]);

    const chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: quantities,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: 'white'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 12,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        font: {
                            size: 11
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: ${context.parsed} (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '60%'
        }
    });

    // Store chart reference
    state.charts.topProducts = chart;
    return chart;
}

// ================================================================
// UPDATE CHARTS
// ================================================================

/**
 * Update sales chart with new data
 * @param {Array} data - Sales data
 * @param {number} days - Number of days
 */
export function updateSalesChart(data = [], days = 30) {
    if (state.charts.sales) {
        state.charts.sales.destroy();
        state.charts.sales = null;
    }
    return createSalesChart(data, days);
}

/**
 * Update top products chart with new data
 * @param {Array} data - Product sales data
 */
export function updateTopProductsChart(data = []) {
    if (state.charts.topProducts) {
        state.charts.topProducts.destroy();
        state.charts.topProducts = null;
    }
    return createTopProductsChart(data);
}

// ================================================================
// DESTROY CHARTS
// ================================================================

/**
 * Destroy all charts
 */
export function destroyCharts() {
    if (state.charts.sales) {
        state.charts.sales.destroy();
        state.charts.sales = null;
    }
    if (state.charts.topProducts) {
        state.charts.topProducts.destroy();
        state.charts.topProducts = null;
    }
}

// ================================================================
// GENERATE SAMPLE DATA
// ================================================================

/**
 * Generate sample sales data for testing
 * @param {number} days - Number of days
 * @returns {Array} Sample sales data
 */
export function generateSampleSalesData(days = 30) {
    const data = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        // Random sales between 100,000 and 5,000,000
        const total = Math.floor(Math.random() * 4900000) + 100000;

        data.push({
            date: dateStr,
            total: total,
            count: Math.floor(Math.random() * 10) + 1
        });
    }

    return data;
}

/**
 * Generate sample top products data
 * @param {number} count - Number of products
 * @returns {Array} Sample product data
 */
export function generateSampleProductsData(count = 5) {
    const products = [
        'Indomie Goreng', 'Aqua 600ml', 'Chitato', 'Teh Botol',
        'Oreo', 'Roma Kelapa', 'Good Day', 'Mie Sedap',
        'Pocari Sweat', 'Silver Queen'
    ];

    const data = [];
    for (let i = 0; i < Math.min(count, products.length); i++) {
        data.push({
            name: products[i],
            quantity: Math.floor(Math.random() * 100) + 10,
            revenue: Math.floor(Math.random() * 5000000) + 500000
        });
    }

    return data.sort((a, b) => b.quantity - a.quantity);
}

// ================================================================
// EXPORT
// ================================================================

export default {
    createSalesChart,
    createTopProductsChart,
    updateSalesChart,
    updateTopProductsChart,
    destroyCharts,
    generateSampleSalesData,
    generateSampleProductsData,
    CHART_COLORS
};

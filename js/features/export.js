/**
 * ================================================================
 * WARUNGKITA PRO MAX - EXPORT FEATURE
 * ================================================================
 * Export data ke CSV, Excel, dan PDF.
 * ================================================================
 */

import { state } from '../state.js';
import { formatCurrency, formatDate, showToast } from '../utils.js';

// ================================================================
// EXPORT TO CSV
// ================================================================

/**
 * Export data to CSV
 * @param {Array} data - Data to export
 * @param {string} filename - File name
 * @param {Array} headers - Column headers
 * @param {Array} fields - Field names
 */
export function exportToCSV(data, filename = 'data-export', headers = [], fields = []) {
    try {
        if (!data || data.length === 0) {
            showToast('Tidak ada data untuk diexport', 'warning');
            return;
        }

        // Use provided headers or generate from fields
        const headerRow = headers.length > 0 ? headers : fields.map(f => f.charAt(0).toUpperCase() + f.slice(1));
        const fieldKeys = fields.length > 0 ? fields : Object.keys(data[0]);

        // Create CSV content
        let csv = headerRow.join(',') + '\n';

        data.forEach(row => {
            const rowData = fieldKeys.map(key => {
                let value = row[key];
                if (typeof value === 'number' && key.includes('price') || key.includes('amount') || key.includes('total')) {
                    value = formatCurrency(value, false);
                }
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    value = `"${value.replace(/"/g, '""')}"`;
                }
                return value || '';
            });
            csv += rowData.join(',') + '\n';
        });

        // Download file
        downloadFile(csv, `${filename}.csv`, 'text/csv');
        showToast(`Data berhasil diexport ke ${filename}.csv`, 'success');

    } catch (error) {
        console.error('Export CSV failed:', error);
        showToast('Gagal export CSV: ' + error.message, 'error');
    }
}

// ================================================================
// EXPORT TO EXCEL (XLSX)
// ================================================================

/**
 * Export data to Excel (XLSX format - simple HTML table)
 * @param {Array} data - Data to export
 * @param {string} filename - File name
 * @param {Array} headers - Column headers
 */
export function exportToExcel(data, filename = 'data-export', headers = []) {
    try {
        if (!data || data.length === 0) {
            showToast('Tidak ada data untuk diexport', 'warning');
            return;
        }

        const fieldKeys = Object.keys(data[0]);
        const headerRow = headers.length > 0 ? headers : fieldKeys.map(f => f.charAt(0).toUpperCase() + f.slice(1));

        // Create HTML table for Excel
        let html = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" 
                  xmlns:x="urn:schemas-microsoft-com:office:excel" 
                  xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="UTF-8">
                <!--[if gte mso 9]>
                <xml>
                    <x:ExcelWorkbook>
                        <x:ExcelWorksheets>
                            <x:ExcelWorksheet>
                                <x:Name>Sheet1</x:Name>
                                <x:WorksheetOptions>
                                    <x:DisplayGridlines/>
                                </x:WorksheetOptions>
                            </x:ExcelWorksheet>
                        </x:ExcelWorksheets>
                    </x:ExcelWorkbook>
                </xml>
                <![endif]-->
                <style>
                    table {
                        border-collapse: collapse;
                        width: 100%;
                        font-family: Arial, sans-serif;
                        font-size: 12px;
                    }
                    th {
                        background-color: #3b82f6;
                        color: white;
                        font-weight: bold;
                        padding: 8px;
                        border: 1px solid #ccc;
                    }
                    td {
                        padding: 6px 8px;
                        border: 1px solid #ccc;
                    }
                    tr:nth-child(even) {
                        background-color: #f9fafb;
                    }
                    .total {
                        font-weight: bold;
                    }
                </style>
            </head>
            <body>
                <table>
                    <thead>
                        <tr>${headerRow.map(h => `<th>${h}</th>`).join('')}</tr>
                    </thead>
                    <tbody>
        `;

        data.forEach(row => {
            html += '<tr>';
            fieldKeys.forEach(key => {
                let value = row[key];
                if (typeof value === 'number' && (key.includes('price') || key.includes('amount') || key.includes('total'))) {
                    value = formatCurrency(value, false);
                }
                html += `<td>${value || ''}</td>`;
            });
            html += '</tr>';
        });

        html += `
                    </tbody>
                </table>
            </body>
            </html>
        `;

        // Download file
        downloadFile(html, `${filename}.xls`, 'application/vnd.ms-excel');
        showToast(`Data berhasil diexport ke ${filename}.xls`, 'success');

    } catch (error) {
        console.error('Export Excel failed:', error);
        showToast('Gagal export Excel: ' + error.message, 'error');
    }
}

// ================================================================
// EXPORT TO PDF
// ================================================================

/**
 * Export data to PDF using window.print()
 * @param {string} content - HTML content for PDF
 * @param {string} title - PDF title
 */
export function exportToPDF(content, title = 'Laporan') {
    try {
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) {
            showToast('Mohon izinkan popup untuk export PDF', 'warning');
            return;
        }

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${title}</title>
                <meta charset="UTF-8">
                <style>
                    body {
                        font-family: 'Inter', Arial, sans-serif;
                        padding: 40px;
                        color: #333;
                        max-width: 1000px;
                        margin: 0 auto;
                    }
                    .header {
                        text-align: center;
                        border-bottom: 2px solid #3b82f6;
                        padding-bottom: 20px;
                        margin-bottom: 30px;
                    }
                    .header h1 {
                        color: #3b82f6;
                        margin: 0;
                        font-size: 24px;
                    }
                    .header p {
                        color: #666;
                        margin: 5px 0 0 0;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 20px 0;
                    }
                    th {
                        background: #3b82f6;
                        color: white;
                        padding: 10px;
                        text-align: left;
                    }
                    td {
                        padding: 8px 10px;
                        border-bottom: 1px solid #e5e7eb;
                    }
                    tr:hover {
                        background: #f9fafb;
                    }
                    .total {
                        font-weight: bold;
                        font-size: 16px;
                        border-top: 2px solid #3b82f6;
                        padding-top: 10px;
                        margin-top: 10px;
                    }
                    .footer {
                        text-align: center;
                        color: #999;
                        font-size: 12px;
                        margin-top: 40px;
                        padding-top: 20px;
                        border-top: 1px solid #e5e7eb;
                    }
                    @media print {
                        body { padding: 20px; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${title}</h1>
                    <p>${APP_CONFIG.printSettings.companyName}</p>
                    <p>${formatDate(new Date())}</p>
                </div>
                ${content}
                <div class="footer">
                    <p>${APP_CONFIG.printSettings.companyName} - ${APP_CONFIG.printSettings.footer}</p>
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function() {
                            window.close();
                        }, 2000);
                    };
                <\/script>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        showToast('PDF berhasil dibuat', 'success');

    } catch (error) {
        console.error('Export PDF failed:', error);
        showToast('Gagal export PDF: ' + error.message, 'error');
    }
}

// ================================================================
// EXPORT SPECIFIC DATA
// ================================================================

/**
 * Export products data
 */
export function exportProducts() {
    const products = state.products.map(p => ({
        'Nama': p.name,
        'Kategori': p.category || 'Lainnya',
        'Harga': formatCurrency(p.price, false),
        'Stok': p.stock,
        'Barcode': p.barcode || '-'
    }));

    const headers = ['Nama', 'Kategori', 'Harga', 'Stok', 'Barcode'];
    const fields = ['Nama', 'Kategori', 'Harga', 'Stok', 'Barcode'];

    exportToCSV(products, 'products-export', headers, fields);
}

/**
 * Export transactions data
 */
export function exportTransactions() {
    const transactions = state.transactions.map(t => ({
        'ID': t.id,
        'Pelanggan': t.customer_name || 'Umum',
        'Total': formatCurrency(t.total_amount, false),
        'Diskon': formatCurrency(t.discount || 0, false),
        'Metode': t.payment_method || 'Tunai',
        'Status': t.payment_status || 'Selesai',
        'Waktu': formatDate(t.createdAt)
    }));

    const headers = ['ID', 'Pelanggan', 'Total', 'Diskon', 'Metode', 'Status', 'Waktu'];
    const fields = ['ID', 'Pelanggan', 'Total', 'Diskon', 'Metode', 'Status', 'Waktu'];

    exportToCSV(transactions, 'transactions-export', headers, fields);
}

/**
 * Export customers data
 */
export function exportCustomers() {
    const customers = state.customers.map(c => ({
        'Nama': c.name,
        'Telepon': c.phone || '-',
        'Poin': c.points || 0,
        'Bergabung': formatDate(c.createdAt)
    }));

    const headers = ['Nama', 'Telepon', 'Poin', 'Bergabung'];
    const fields = ['Nama', 'Telepon', 'Poin', 'Bergabung'];

    exportToCSV(customers, 'customers-export', headers, fields);
}

/**
 * Export dashboard report
 */
export function exportDashboardReport() {
    const today = new Date().toISOString().split('T')[0];
    const todayTransactions = state.transactions.filter(t => 
        t.createdAt && t.createdAt.startsWith(today)
    );

    let content = `
        <h2>Ringkasan Dashboard</h2>
        <table>
            <tr><td><strong>Tanggal</strong></td><td>${formatDate(new Date())}</td></tr>
            <tr><td><strong>Total Penjualan</strong></td><td>${formatCurrency(todayTransactions.reduce((sum, t) => sum + t.total_amount, 0))}</td></tr>
            <tr><td><strong>Total Transaksi</strong></td><td>${state.transactions.length}</td></tr>
            <tr><td><strong>Total Pelanggan</strong></td><td>${state.customers.length}</td></tr>
            <tr><td><strong>Total Produk</strong></td><td>${state.products.length}</td></tr>
        </table>

        <h3>Transaksi Terbaru</h3>
        <table>
            <thead>
                <tr><th>ID</th><th>Pelanggan</th><th>Total</th><th>Waktu</th></tr>
            </thead>
            <tbody>
                ${state.transactions.slice(0, 10).map(t => `
                    <tr>
                        <td>${t.id}</td>
                        <td>${t.customer_name || 'Umum'}</td>
                        <td>${formatCurrency(t.total_amount)}</td>
                        <td>${formatDate(t.createdAt)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    exportToPDF(content, 'Dashboard Report');
}

// ================================================================
// UTILITY FUNCTIONS
// ================================================================

/**
 * Download file from string content
 * @param {string} content - File content
 * @param {string} filename - File name
 * @param {string} mimeType - MIME type
 */
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ================================================================
// EXPORT
// ================================================================

export default {
    exportToCSV,
    exportToExcel,
    exportToPDF,
    exportProducts,
    exportTransactions,
    exportCustomers,
    exportDashboardReport
};

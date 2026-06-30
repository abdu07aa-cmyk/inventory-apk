/**
 * js/api.js
 * - Wrapper ringan untuk Supabase REST API (fetch-based)
 * - Menyediakan fungsi CRUD untuk tabel utama + mekanisme fallback / retry sederhana
 * - Semua fungsi menggunakan header dari config.APP_CONFIG.supabaseHeaders()
 *
 * Catatan keamanan:
 * - SUPABASE_KEY tidak boleh di-commit ke VCS. Jika tidak diisi, fungsi akan mencoba fallback ke local state.
 * - Fungsi ini tidak melakukan paging otomatis. Untuk daftar besar, tambahkan query params yg sesuai.
 */

import { ENDPOINTS, APP_CONFIG, SUPABASE_KEY, TABLES } from './config.js';
import state from './state.js';

/* Helper: build query string untuk Supabase REST (simple) */
/* Contoh penggunaan: buildQs({ select: '*', id: 'eq.1', order: 'created_at.desc' }) */
function buildQs(params = {}) {
  const parts = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

/* Low-level fetch dengan headers Supabase dan error handling dasar */
async function supabaseFetch(url, opts = {}) {
  const headers = {
    ...opts.headers,
    ...APP_CONFIG.supabaseHeaders(SUPABASE_KEY)
  };

  const cfg = {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal
  };

  try {
    const res = await fetch(url, cfg);
    // Supabase returns 204 for no content on delete etc.
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} - ${text}`);
    }
    // Try parse JSON if content exists
    if (res.status === 204) return null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await res.json();
    } else {
      return await res.text();
    }
  } catch (err) {
    // Bubble up error to caller for fallback handling
    throw err;
  }
}

/* Public API functions */

/* Generic CRUD helpers */
export async function list(tableName, params = {}) {
  // Jika tidak ada API key, fallback ke local state
  if (!SUPABASE_KEY) {
    const s = state.getState();
    return s[mapTableToStateKey(tableName)] ?? [];
  }
  const endpoint = ENDPOINTS[tableName] || `${ENDPOINTS[tableName]}`;
  const qs = buildQs(params);
  const url = `${endpoint}${qs}`;
  return supabaseFetch(url, { method: 'GET' });
}

export async function getById(tableName, id) {
  if (!SUPABASE_KEY) {
    const s = state.getState();
    const arr = s[mapTableToStateKey(tableName)] ?? [];
    return arr.find(item => String(item.id) === String(id)) || null;
  }
  const endpoint = ENDPOINTS[tableName];
  // Supabase REST: filter by id using id=eq.<id> or use primary key endpoint (if configured)
  const qs = buildQs({ id: `eq.${id}` , select: '*' });
  const url = `${endpoint}${qs}`;
  const res = await supabaseFetch(url, { method: 'GET' });
  return Array.isArray(res) ? res[0] ?? null : res;
}

export async function create(tableName, payload) {
  if (!SUPABASE_KEY) {
    // Simpan lokal dan tandai untuk sync
    const s = state.getState();
    const key = mapTableToStateKey(tableName);
    const arr = Array.isArray(s[key]) ? [...s[key]] : [];
    // buat id sementara jika belum ada
    const id = payload.id ?? `local-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    const item = { ...payload, id, _local: true, _created_at: new Date().toISOString() };
    arr.push(item);
    state.setState({ [key]: arr });
    // jika tabel transaksi, tambahkan ke transaksi lokal pending sync
    if (tableName === TABLES.TRANSACTIONS) {
      const txs = state.getState().transactions || [];
      txs.push({ ...item, pending: true });
      state.setState({ transactions: txs });
    }
    return item;
  }
  const endpoint = ENDPOINTS[tableName];
  const url = `${endpoint}`;
  // Supabase: POST untuk insert (returning all rows can be controlled with Prefer header)
  const res = await supabaseFetch(url, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: payload
  });
  return res;
}

export async function update(tableName, id, patch) {
  if (!SUPABASE_KEY) {
    const s = state.getState();
    const key = mapTableToStateKey(tableName);
    const arr = (s[key] || []).map(item => (String(item.id) === String(id) ? { ...item, ...patch } : item));
    state.setState({ [key]: arr });
    return arr.find(i => String(i.id) === String(id)) || null;
  }
  const endpoint = ENDPOINTS[tableName];
  // Supabase REST: PATCH with id=eq.<id>
  const qs = buildQs({ id: `eq.${id}` });
  const url = `${endpoint}${qs}`;
  const res = await supabaseFetch(url, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: patch
  });
  return res;
}

export async function remove(tableName, id) {
  if (!SUPABASE_KEY) {
    const s = state.getState();
    const key = mapTableToStateKey(tableName);
    const arr = (s[key] || []).filter(item => String(item.id) !== String(id));
    state.setState({ [key]: arr });
    return true;
  }
  const endpoint = ENDPOINTS[tableName];
  const qs = buildQs({ id: `eq.${id}` });
  const url = `${endpoint}${qs}`;
  await supabaseFetch(url, { method: 'DELETE' });
  return true;
}

/* Map nama tabel Supabase -> key di local state */
function mapTableToStateKey(tableName) {
  switch (tableName) {
    case TABLES.PRODUCTS: return 'products';
    case TABLES.TRANSACTIONS: return 'transactions';
    case TABLES.TRANSACTION_ITEMS: return 'transaction_items';
    case TABLES.SHIFTS: return 'shifts';
    case TABLES.CUSTOMERS: return 'customers';
    default: return tableName;
  }
}

/* Synchronization helpers (very simple):
   - syncPendingTransactions: kirim transaksi lokal yang pending (pending=true atau _local flag)
   - Fungsi ini dipanggil periodik atau saat koneksi kembali.
*/
export async function syncPendingTransactions() {
  if (!SUPABASE_KEY) {
    // Tidak ada server, nothing to sync
    return { ok: false, message: 'No SUPABASE_KEY configured' };
  }
  const s = state.getState();
  const pending = (s.transactions || []).filter(t => t.pending || t._local);
  const results = [];
  for (const tx of pending) {
    try {
      // kirim transaksi (as object). Supabase side should accept nested transaction_items separately;
      // disarankan: insert transaction -> get id -> insert transaction_items with transaction_id
      const txPayload = { ...tx };
      // remove local-only markers
      delete txPayload.pending;
      delete txPayload._local;
      // Create transaction
      const created = await create(TABLES.TRANSACTIONS, txPayload);
      // Jika ada transaction_items, kirim juga (as separate rows)
      if (tx.transaction_items && Array.isArray(tx.transaction_items)) {
        for (const item of tx.transaction_items) {
          const itemPayload = { ...item, transaction_id: created.id || created[0]?.id || null };
          await create(TABLES.TRANSACTION_ITEMS, itemPayload);
        }
      }
      // tandai local record sebagai synced (hapus pending)
      // replace local transaction with created result
      const newTxs = (state.getState().transactions || []).map(t => {
        if (String(t.id) === String(tx.id)) {
          return { ...(Array.isArray(created) ? created[0] : created) };
        }
        return t;
      });
      state.setState({ transactions: newTxs });
      results.push({ txId: tx.id, status: 'synced' });
    } catch (err) {
      console.warn('Gagal sync transaksi', tx.id, err);
      results.push({ txId: tx.id, status: 'failed', error: String(err) });
    }
  }
  state.setState({ lastSyncAt: new Date().toISOString() });
  return results;
}

/* Export low-level fetch for advanced use */
export { supabaseFetch };

/* Default export: convenience grouped API */
export default {
  list,
  getById,
  create,
  update,
  remove,
  syncPendingTransactions
};

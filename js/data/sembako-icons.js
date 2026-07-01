// ==========================================
// DATA IKON SEMBAKO (SVG Line Art)
// ==========================================
const SEMBAKO_ICONS = [
  { id: 'beras', name: 'Beras', svg: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8c0-2 2-4 4-4h8c2 0 4 2 4 4v12c0 2-2 4-4 4H8c-2 0-4-2-4-4V8z"/><path d="M8 10l2 2-2 2"/><path d="M12 10l2 2-2 2"/><path d="M16 10l2 2-2 2"/></svg>' },
  { id: 'minyak', name: 'Minyak Goreng', svg: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h10v3c0 2-2 4-2 6v7c0 2-1 3-3 3s-3-1-3-3v-7c0-2-2-4-2-6V4z"/><path d="M9 14h6"/><path d="M9 17h6"/></svg>' },
  { id: 'minyak-telon', name: 'Minyak Telon', svg: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8v4c0 3-2 5-2 8v4c0 2-1 3-2 3s-2-1-2-3v-4c0-3-2-5-2-8V4z"/><path d="M10 10h4"/><circle cx="12" cy="15" r="1.5"/></svg>' },
  { id: 'gula', name: 'Gula', svg: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="12" height="16" rx="1"/><path d="M6 8h12"/><path d="M9 12h6"/><path d="M9 16h6"/></svg>' },
  { id: 'sabun-cair', name: 'Sabun Cuci', svg: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8v4c0 2 2 4 2 8v4c0 2-1 3-3 3H9c-2 0-3-1-3-3v-4c0-4 2-6 2-8V4z"/><path d="M10 12h4"/><circle cx="12" cy="16" r="2"/></svg>' },
  { id: 'sabun-batang', name: 'Sabun Mandi', svg: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="8" rx="3"/><rect x="7" y="10" width="10" height="4" rx="1"/></svg>' },
  { id: 'telur', name: 'Telur', svg: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h16v4c0 4-2 6-4 6H8c-2 0-4-2-4-6v-4z"/><path d="M8 6c0-2 1-3 2-3s2 1 2 3"/><path d="M12 6c0-2 1-3 2-3s2 1 2 3"/><path d="M16 6c0-2 1-3 2-3s2 1 2 3"/></svg>' },
  { id: 'mie', name: 'Mie Instan', svg: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 6h14v12c0 2-1 3-3 3H8c-2 0-3-1-3-3V6z"/><path d="M8 10h8"/><path d="M8 14h8"/><path d="M10 6V4h4v2"/></svg>' },
  { id: 'deodoran', name: 'Deodoran', svg: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h8v12c0 3-1 4-2 4h-4c-1 0-2-1-2-4V6z"/><path d="M8 10h8"/><path d="M10 16h4"/></svg>' },
  { id: 'pewangi', name: 'Pewangi', svg: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 6h10v6c0 4 2 6 2 8v2c0 1-1 2-2 2H7c-1 0-2-1-2-2v-2c0-2 2-4 2-8V6z"/><path d="M10 12h4"/><circle cx="12" cy="17" r="2"/></svg>' },
  { id: 'kopi', name: 'Kopi', svg: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 10h12v6c0 3-2 5-5 5H9c-3 0-5-2-5-5v-6z"/><path d="M17 12h2c2 0 3 1 3 3s-1 3-3 3h-2"/><path d="M9 6c0-2 1-3 2-3"/><path d="M12 6c0-2 1-3 2-3"/></svg>' },
  { id: 'snack', name: 'Snack', svg: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h12l2 4v12c0 2-1 3-3 3H7c-2 0-3-1-3-3V8l2-4z"/><path d="M9 12c0-1 1-2 2-2s2 1 2 2-1 2-2 2-2-1-2-2z"/><path d="M13 14c0-1 1-2 2-2s2 1 2 2-1 2-2 2-2-1-2-2z"/></svg>' },
  { id: 'teh', name: 'Teh Kotak', svg: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h12v16c0 2-1 3-3 3H9c-2 0-3-1-3-3V4z"/><path d="M6 4l-2-2h16l-2 2"/><path d="M9 10c0 2 2 4 3 6 1-2 3-4 3-6"/></svg>' },
  { id: 'susu', name: 'Susu', svg: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h10v16c0 2-1 3-3 3H10c-2 0-3-1-3-3V4z"/><path d="M7 4l-2-3h14l-2 3"/><path d="M9 10h6"/><path d="M9 14h6"/></svg>' },
  { id: 'bumbu', name: 'Bumbu', svg: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8v16c0 2-1 3-2 3h-4c-1 0-2-1-2-3V4z"/><path d="M8 8h8"/><rect x="9" y="11" width="6" height="6" rx="1"/></svg>' },
  { id: 'air', name: 'Air Mineral', svg: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8v3c0 2 2 4 2 8v5c0 2-1 3-3 3H9c-2 0-3-1-3-3v-5c0-4 2-6 2-8V4z"/><path d="M9 12h6"/><path d="M9 15h6"/></svg>' },
  { id: 'kaleng', name: 'Makanan Kaleng', svg: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 2 3 3 7 3s7-1 7-3V6"/><ellipse cx="12" cy="18" rx="7" ry="3"/><path d="M8 10h8"/><path d="M8 14h8"/></svg>' },
  { id: 'obat', name: 'Obat', svg: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8c0-2 2-4 4-4h8c2 0 4 2 4 4v8c0 2-2 4-4 4H8c-2 0-4-2-4-4V8z"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>' }
];

// ==========================================
// FUNGSI RENDER & LOGIKA PEMILIHAN IKON
// ==========================================
function renderIconSelector(containerId, hiddenInputId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Render grid ikon
  container.innerHTML = SEMBAKO_ICONS.map(icon => `
    <div class="icon-option" data-icon-id="${icon.id}" title="${icon.name}">
      ${icon.svg}
      <span>${icon.name}</span>
    </div>
  `).join('');

  // Tambahkan event listener untuk setiap ikon
  const options = container.querySelectorAll('.icon-option');
  options.forEach(opt => {
    opt.addEventListener('click', () => {
      // Hapus class selected dari semua opsi
      options.forEach(o => o.classList.remove('is-selected'));
      // Tambahkan class selected ke yang diklik
      opt.classList.add('is-selected');
      // Simpan ID ikon ke hidden input
      const hiddenInput = document.getElementById(hiddenInputId);
      if (hiddenInput) {
        hiddenInput.value = opt.dataset.iconId;
      }
    });
  });
}

// Fungsi untuk mendapatkan SVG string berdasarkan ID (digunakan saat render produk)
function getIconSvgById(iconId) {
  const icon = SEMBAKO_ICONS.find(i => i.id === iconId);
  return icon ? icon.svg : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>'; // Fallback icon
}

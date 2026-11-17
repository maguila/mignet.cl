/**
 * Taxis Futrono - Mobile Rate Lookup Application
 * Author: Antigravity AI
 */

let appData = {
  info: {},
  destinos: []
};

let currentFilter = {
  searchQuery: '',
  category: 'Todos',
  sortBy: 'relevance'
};

let favorites = new Set(JSON.parse(localStorage.getItem('taxis_futrono_favs') || '[]'));

// Helper to remove accents for diacritic-insensitive search
function normalizeText(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Format Chilean CLP currency
function formatCurrency(amount) {
  return '$' + amount.toLocaleString('es-CL');
}

// Highlight partial matches
function highlightText(text, query) {
  if (!query || query.trim() === '') return text;
  const normalizedText = normalizeText(text);
  const normalizedQuery = normalizeText(query.trim());
  
  const matchIndex = normalizedText.indexOf(normalizedQuery);
  if (matchIndex === -1) return text;
  
  const start = text.slice(0, matchIndex);
  const match = text.slice(matchIndex, matchIndex + normalizedQuery.length);
  const end = text.slice(matchIndex + normalizedQuery.length);
  
  return `${start}<mark class="highlight">${match}</mark>${end}`;
}

// Load JSON data
async function loadTarifas() {
  try {
    const response = await fetch('data/tarifas_los_andes_2026.json?version=2026_los_andes');
    if (!response.ok) throw new Error('Error al cargar datos');
    appData = await response.json();
    initApp();
  } catch (err) {
    console.error('Error fetching json, fallback to embedded data:', err);
    renderErrorState();
  }
}

function initApp() {
  // Update header / info
  document.getElementById('totalCount').textContent = appData.destinos.length;
  updateFavCount();

  if (appData.info) {
    const minEl = document.getElementById('infoMinRate');
    if (minEl && appData.info.tarifa_minima) minEl.textContent = formatCurrency(appData.info.tarifa_minima);
    
    const nightEl = document.getElementById('infoNightRate');
    if (nightEl && appData.info.tarifa_nocturna) nightEl.textContent = formatCurrency(appData.info.tarifa_nocturna);

    const delivEl = document.getElementById('infoDeliveryRate');
    if (delivEl && appData.info.servicio_encargo_adicional) delivEl.textContent = '+' + formatCurrency(appData.info.servicio_encargo_adicional) + ' (Adicional)';

    const noteEl = document.getElementById('infoSalidasNote');
    if (noteEl && appData.info.nota_salida) noteEl.textContent = appData.info.nota_salida;
  }

  // Setup Event Listeners
  setupEventListeners();

  // Initial Render
  renderDestinations();
}

function updateFavCount() {
  const countEl = document.getElementById('favCount');
  if (countEl) countEl.textContent = favorites.size;
}

function setupEventListeners() {
  // Search input
  const searchInput = document.getElementById('searchInput');
  const clearBtn = document.getElementById('clearSearchBtn');

  const categoryChips = document.querySelectorAll('.cat-chip');

  function selectCategory(catName) {
    currentFilter.category = catName;
    categoryChips.forEach(c => c.classList.toggle('active', c.dataset.category === catName));
  }

  searchInput.addEventListener('input', (e) => {
    currentFilter.searchQuery = e.target.value;
    clearBtn.classList.toggle('hidden', e.target.value.length === 0);
    if (e.target.value.trim().length > 0 && currentFilter.category !== 'Todos') {
      selectCategory('Todos');
    }
    renderDestinations();
  });

  // Blur search input on Enter to close mobile virtual keyboard
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.keyCode === 13) {
      e.preventDefault();
      searchInput.blur();
    }
  });

  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    currentFilter.searchQuery = '';
    clearBtn.classList.add('hidden');
    searchInput.focus();
    renderDestinations();
  });

  // Quick Chips
  document.querySelectorAll('.quick-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.dataset.query;
      searchInput.value = q;
      currentFilter.searchQuery = q;
      clearBtn.classList.remove('hidden');
      if (currentFilter.category !== 'Todos') {
        selectCategory('Todos');
      }
      renderDestinations();
    });
  });



  // Category chips
  categoryChips.forEach(chip => {
    chip.addEventListener('click', () => {
      selectCategory(chip.dataset.category);
      renderDestinations();
    });
  });

  // Drag-to-scroll for categories wrapper on desktop/mobile
  const catWrapper = document.querySelector('.categories-wrapper');
  if (catWrapper) {
    let isDown = false;
    let startX, scrollLeft;
    catWrapper.addEventListener('mousedown', (e) => {
      isDown = true;
      startX = e.pageX - catWrapper.offsetLeft;
      scrollLeft = catWrapper.scrollLeft;
    });
    catWrapper.addEventListener('mouseleave', () => { isDown = false; });
    catWrapper.addEventListener('mouseup', () => { isDown = false; });
    catWrapper.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - catWrapper.offsetLeft;
      const walk = (x - startX) * 2;
      catWrapper.scrollLeft = scrollLeft - walk;
    });
  }

  // Sort selector
  const sortSelect = document.getElementById('sortSelect');
  sortSelect.addEventListener('change', (e) => {
    currentFilter.sortBy = e.target.value;
    renderDestinations();
  });

  // Reset search button
  document.getElementById('resetSearchBtn').addEventListener('click', () => {
    searchInput.value = '';
    currentFilter.searchQuery = '';
    currentFilter.category = 'Todos';
    clearBtn.classList.add('hidden');
    categoryChips.forEach(c => c.classList.toggle('active', c.dataset.category === 'Todos'));
    renderDestinations();
  });

  // Theme Toggle
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    themeToggleBtn.innerHTML = isLight ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    localStorage.setItem('taxis_futrono_theme', isLight ? 'light' : 'dark');
  });

  // Load saved theme
  if (localStorage.getItem('taxis_futrono_theme') === 'light') {
    document.body.classList.add('light-theme');
    themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
  }

  // Modals & Nav
  setupModals();
}

function getFilteredDestinations() {
  const queryNorm = normalizeText(currentFilter.searchQuery.trim());
  const isFavCategory = currentFilter.category === 'Favoritos';

  return appData.destinos.filter(dest => {
    // Category check
    if (isFavCategory) {
      if (!favorites.has(dest.id)) return false;
    } else if (currentFilter.category !== 'Todos' && dest.categoria !== currentFilter.category) {
      return false;
    }

    // Partial search match
    if (queryNorm === '') return true;

    const nameNorm = normalizeText(dest.nombre);
    const catNorm = normalizeText(dest.categoria);

    // Search in name or category
    return nameNorm.includes(queryNorm) || catNorm.includes(queryNorm);
  }).sort((a, b) => {
    if (currentFilter.sortBy === 'price-asc') {
      return a.precio - b.precio;
    } else if (currentFilter.sortBy === 'price-desc') {
      return b.precio - a.precio;
    } else if (currentFilter.sortBy === 'name-asc') {
      return a.nombre.localeCompare(b.nombre);
    } else {
      // Default: relevance (exact start match gets priority)
      if (queryNorm !== '') {
        const aStarts = normalizeText(a.nombre).startsWith(queryNorm);
        const bStarts = normalizeText(b.nombre).startsWith(queryNorm);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
      }
      return a.id - b.id;
    }
  });
}

function renderDestinations() {
  const container = document.getElementById('destinationsList');
  const emptyState = document.getElementById('emptyState');
  const resultsCount = document.getElementById('resultsCount');

  const filtered = getFilteredDestinations();

  resultsCount.textContent = `Mostrando ${filtered.length} de ${appData.destinos.length} destinos`;

  if (filtered.length === 0) {
    container.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  container.innerHTML = filtered.map(dest => {
    const isFav = favorites.has(dest.id);
    const highlightedTitle = highlightText(dest.nombre, currentFilter.searchQuery);

    return `
      <div class="card" data-id="${dest.id}">
        <div class="card-top">
          <div class="card-title-group">
            <span class="card-category">${dest.categoria}</span>
            <h2 class="card-title">${highlightedTitle}</h2>
          </div>
          <button class="fav-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite(${dest.id})" title="Favorito" aria-label="Guardar en favoritos">
            <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-star"></i>
          </button>
        </div>
        
        <div class="card-bottom">
          <div class="price-box">
            <span class="price-amount">${formatCurrency(dest.precio)}</span>
            <span class="price-detail">Tarifa base diurna</span>
          </div>

          <div class="card-actions">
            <button class="action-btn" onclick="copyQuote('${dest.nombre.replace(/'/g, "\\'")}', ${dest.precio})" title="Copiar cotización">
              <i class="fa-regular fa-copy"></i> Copiar
            </button>
            <button class="action-btn whatsapp-btn" onclick="shareWhatsApp('${dest.nombre.replace(/'/g, "\\'")}', ${dest.precio})" title="Consultar por WhatsApp">
              <i class="fa-brands fa-whatsapp"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function toggleFavorite(id) {
  if (favorites.has(id)) {
    favorites.delete(id);
    showToast('Eliminado de favoritos');
  } else {
    favorites.add(id);
    showToast('Guardado en favoritos ⭐');
  }
  localStorage.setItem('taxis_futrono_favs', JSON.stringify([...favorites]));
  updateFavCount();
  renderDestinations();
}

function copyQuote(nombre, precio) {
  const text = `🚖 *Taxis Futrono*\nDestino: ${nombre}\nValor Estimado: ${formatCurrency(precio)}`;
  
  navigator.clipboard.writeText(text).then(() => {
    showToast('¡Cotización copiada al portapapeles!');
  }).catch(() => {
    showToast('Cotización: ' + text);
  });
}

function shareWhatsApp(nombre, precio) {
  const text = encodeURIComponent(`Hola, quisiera consultar servicio de taxi hacia ${nombre} (${formatCurrency(precio)}).`);
  window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');
  toastMsg.textContent = msg;
  toast.classList.remove('hidden');

  setTimeout(() => {
    toast.classList.add('hidden');
  }, 2500);
}

function setupModals() {
  const kmModal = document.getElementById('kmModal');
  const infoModal = document.getElementById('infoModal');

  const navSearchBtn = document.getElementById('navSearchBtn');
  const navKmCalcBtn = document.getElementById('navKmCalcBtn');
  const navInfoBtn = document.getElementById('navInfoBtn');

  // Modal open triggers
  navKmCalcBtn.addEventListener('click', () => {
    setActiveNav(navKmCalcBtn);
    kmModal.classList.remove('hidden');
  });

  navInfoBtn.addEventListener('click', () => {
    setActiveNav(navInfoBtn);
    infoModal.classList.remove('hidden');
  });

  navSearchBtn.addEventListener('click', () => {
    setActiveNav(navSearchBtn);
    kmModal.classList.add('hidden');
    infoModal.classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Modal close buttons
  document.querySelectorAll('.close-modal-btn, .modal-backdrop').forEach(btn => {
    btn.addEventListener('click', () => {
      kmModal.classList.add('hidden');
      infoModal.classList.add('hidden');
      setActiveNav(navSearchBtn);
    });
  });

  // Km Calculator logic
  const kmInput = document.getElementById('kmInput');
  const kmRateInput = document.getElementById('kmRateInput');
  const timeSelect = document.getElementById('tariffTimeSelect');
  const kmTotalEl = document.getElementById('kmCalcTotal');

  function calculateKmPrice() {
    const km = parseFloat(kmInput.value) || 0;
    const ratePerKm = parseFloat(kmRateInput.value) || (timeSelect.value === 'nocturno' ? (appData.info.valor_km_nocturno || 900) : (appData.info.valor_km_diurno || 750));
    const minRate = appData.info.tarifa_minima || 2000;
    const total = Math.max(minRate, Math.round(km * ratePerKm));

    kmTotalEl.textContent = formatCurrency(total);
  }

  kmInput.addEventListener('input', calculateKmPrice);
  kmRateInput.addEventListener('input', calculateKmPrice);

  timeSelect.addEventListener('change', () => {
    const defaultRate = timeSelect.value === 'nocturno' 
      ? (appData.info.valor_km_nocturno || 900) 
      : (appData.info.valor_km_diurno || 750);
    kmRateInput.value = defaultRate;
    calculateKmPrice();
  });
}

function setActiveNav(button) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  button.classList.add('active');
}

function renderErrorState() {
  document.getElementById('destinationsList').innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #ef4444;">
      <i class="fa-solid fa-triangle-exclamation" style="font-size: 3rem; margin-bottom: 12px;"></i>
      <p>Error al cargar el archivo de tarifas. Por favor reintente.</p>
    </div>
  `;
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', loadTarifas);

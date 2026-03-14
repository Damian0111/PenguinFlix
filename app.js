 
// ==========================================
// 1. KONFIGURACJA I STAN APLIKACJI
// ==========================================
const API_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const POSTER_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 300%22%3E%3Crect width=%22200%22 height=%22300%22 fill=%22%23202227%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%238e9297%22 font-size=%2218%22 font-family=%22sans-serif%22%3EBrak okładki%3C/text%3E%3C/svg%3E";

let hapticsEnabled = localStorage.getItem('hapticsEnabled') !== 'false';
let API_KEY = localStorage.getItem('tmdbApiKey') || '';
let data = { moviesToWatch: [], moviesWatched: [], seriesToWatch: [], seriesWatched: [] };
let fullSearchResults = [];
let sortableInstance = null;

let viewState = {
    activeMainTab: 'movies', moviesSubTab: 'toWatch', seriesSubTab: 'toWatch', globalViewMode: 'list',
    moviesToWatch: { sortBy: 'custom_asc', filterByGenre: 'all', filterByCustomTag: 'all', filterByVod: 'all', filterFavoritesOnly: false, localSearch: '', displayLimit: 30 },
    moviesWatched: { sortBy: 'dateAdded_desc', filterByGenre: 'all', filterByCustomTag: 'all', filterByVod: 'all', filterFavoritesOnly: false, localSearch: '', displayLimit: 30 },
    seriesToWatch: { sortBy: 'custom_asc', filterByGenre: 'all', filterByCustomTag: 'all', filterByVod: 'all', filterFavoritesOnly: false, localSearch: '', displayLimit: 30 },
    seriesWatched: { sortBy: 'dateAdded_desc', filterByGenre: 'all', filterByCustomTag: 'all', filterByVod: 'all', filterFavoritesOnly: false, localSearch: '', displayLimit: 30 },
};

// Słownik ikon do odchudzenia DOM
const ICONS = {
    quickTrack: `<svg viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>`,
    person: `<svg class="placeholder-svg" viewBox="0 0 24 24"><path d="M12,19.2C9.5,19.2 7.29,17.92 6,16C6.03,14 10,12.9 12,12.9C14,12.9 17.97,14 18,16C16.71,17.92 14.5,19.2 12,19.2M12,5A3,3 0 0,1 15,8A3,3 0 0,1 12,11A3,3 0 0,1 9,8A3,3 0 0,1 12,5M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z" /></svg>`,
    list: `<svg viewBox="0 0 24 24"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>`,
    grid: `<svg viewBox="0 0 24 24"><path d="M4 11h5V5H4v6zm0 7h5v-6H4v6zm6 0h5v-6h-5v6zm6 0h5v-6h-5v6zm-6-7h5V5h-5v6zm6-6v6h5V5h-5z"/></svg>`,
    star: `<svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`,
    delete: `<svg viewBox="0 0 24 24"><path d="M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19M8,9H16V19H8V9M15.5,4L14.5,3H9.5L8.5,4H5V6H19V4H15.5Z"/></svg>`,
    close: `<svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
};

// ==========================================
// 2. BAZA DANYCH (IndexedDB)
// ==========================================
const db = {
    _db: null, _dbName: 'PenguinFlixDB', _storeName: 'appState', _cacheStore: 'apiCache',
    async open() {
        if (this._db) return this._db;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this._dbName, 2);
            request.onupgradeneeded = (event) => {
                const database = event.target.result;
                if (!database.objectStoreNames.contains(this._storeName)) database.createObjectStore(this._storeName);
                if (!database.objectStoreNames.contains(this._cacheStore)) database.createObjectStore(this._cacheStore);
            };
            request.onsuccess = (event) => { this._db = event.target.result; resolve(this._db); };
            request.onerror = (event) => reject(event.target.error);
        });
    },
    async set(key, value) {
        const database = await this.open();
        return new Promise((resolve, reject) => {
            const tx = database.transaction(this._storeName, 'readwrite');
            tx.objectStore(this._storeName).put(value, key);
            tx.oncomplete = () => resolve(true); tx.onerror = () => reject(tx.error);
        });
    },
    async get(key) {
        const database = await this.open();
        return new Promise((resolve, reject) => {
            const tx = database.transaction(this._storeName, 'readonly');
            const req = tx.objectStore(this._storeName).get(key);
            req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
        });
    },
    async setCache(key, value) {
        const database = await this.open();
        return new Promise(resolve => {
            const tx = database.transaction(this._cacheStore, 'readwrite');
            tx.objectStore(this._cacheStore).put({ value, timestamp: Date.now() }, key);
            tx.oncomplete = () => resolve(true); tx.onerror = () => resolve(false);
        });
    },
    async getCache(key, maxAgeDays = 7) {
        const database = await this.open();
        return new Promise(resolve => {
            const tx = database.transaction(this._cacheStore, 'readonly');
            const req = tx.objectStore(this._cacheStore).get(key);
            req.onsuccess = () => {
                if (req.result) {
                    const age = Date.now() - req.result.timestamp;
                    if (age < maxAgeDays * 24 * 60 * 60 * 1000) resolve(req.result.value);
                    else resolve(null);
                } else resolve(null);
            };
            req.onerror = () => resolve(null);
        });
    }
};

// ==========================================
// 3. FUNKCJE NARZĘDZIOWE (Utils)
// ==========================================
const escapeHTML = (str) => {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag]));
};

const debounce = (func, delay) => {
    let t; return (...a) => { clearTimeout(t); t = setTimeout(() => func(...a), delay); };
};

function triggerHaptic(type = 'light') {
    if (!hapticsEnabled || !navigator.vibrate) return;
    try {
        if (type === 'light') navigator.vibrate(15);
        else if (type === 'medium') navigator.vibrate(30);
        else if (type === 'heavy') navigator.vibrate(50);
        else if (type === 'success') navigator.vibrate([20, 50, 30]);
        else if (type === 'error') navigator.vibrate([50, 50, 50]);
    } catch(e) {}
}

const applyTheme = () => {
    const storedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = storedTheme || (systemPrefersDark ? 'dark' : 'light');
    document.body.dataset.theme = theme;
    document.getElementById('color-scheme-meta').setAttribute('content', theme);
    document.getElementById('theme-color-meta').setAttribute('content', theme === 'dark' ? '#101114' : '#f0f2f5');
};

const toggleTheme = () => {
    const newTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    document.body.dataset.theme = newTheme;
    localStorage.setItem('theme', newTheme);
    document.getElementById('color-scheme-meta').setAttribute('content', newTheme);
    document.getElementById('theme-color-meta').setAttribute('content', newTheme === 'dark' ? '#101114' : '#f0f2f5');
};

// ==========================================
// 4. API WRAPPER (Fetch)
// ==========================================
// DODANO: Parametr `signal` na końcu
async function fetchFromTMDB(endpoint, params = {}, signal = null) {
    const url = new URL(`${API_BASE_URL}${endpoint}`);
    url.searchParams.append('api_key', API_KEY);
    if (params.language !== false) url.searchParams.append('language', params.language || 'pl-PL');
    
    Object.keys(params).forEach(key => {
        if (key !== 'language') url.searchParams.append(key, params[key]);
    });

    try {
        // DODANO: Przekazanie opcji signal do fetch
        const options = signal ? { signal } : {};
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(response.status);
        return await response.json();
    } catch (error) {
        // Ignorujemy błędy, jeśli zapytanie zostało celowo przerwane przez AbortController
        if (error.name === 'AbortError') return 'ABORTED';
        return null;
    }
}

// ==========================================
// 5. INICJALIZACJA I EVENTY
// ==========================================
document.addEventListener('DOMContentLoaded', init);

async function init() {
    if (API_KEY) {
        showMainContent();
        await loadData();
        applyTheme();
        switchMainTab(viewState.activeMainTab || 'movies');
        refreshStaleSeries();
    } else { showConfig(); }
    setupEventListeners();
}

function setupEventListeners() {
    document.addEventListener('click', (e) => {
        const interactiveElement = e.target.closest('button, .icon-button, .nav-item, .seg-btn, .ptab-btn, .discover-pill, .settings-item, .list-item, .grid-item, .discover-item, .search-item, .cast-member, .recommendation-item, .season-summary, input[type="checkbox"], input[type="radio"], input[type="text"], input[type="search"], input[type="url"], input[type="number"], label, .star, .custom-tag, .remove-tag, .existing-tag-wrap, .existing-tag-btn');
        if (interactiveElement && !interactiveElement.disabled && interactiveElement.id !== 'fab-randomize') triggerHaptic('light');
    }, { capture: true });

    const hapticsCb = document.getElementById('haptics-checkbox');
    if (hapticsCb) {
        hapticsCb.checked = hapticsEnabled;
        hapticsCb.addEventListener('change', (e) => {
            hapticsEnabled = e.target.checked;
            localStorage.setItem('hapticsEnabled', hapticsEnabled);
            if (hapticsEnabled) triggerHaptic('success');
        });
    }

    document.querySelector('.bottom-nav').addEventListener('click', (e) => {
        const navItem = e.target.closest('.nav-item');
        if (navItem && !navItem.classList.contains('active')) switchMainTab(navItem.dataset.maintab);
    });

    document.querySelector('.segmented-control').addEventListener('click', (e) => {
        const btn = e.target.closest('.seg-btn');
        if (btn && !btn.classList.contains('active')) switchSubTab(btn.dataset.subtab);
    });

    document.querySelectorAll('.ptab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetBtn = e.target.closest('.ptab-btn');
            if (targetBtn && !targetBtn.classList.contains('active')) switchProfileTab(targetBtn.dataset.ptab);
        });
    });

    document.getElementById('btn-theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('btn-custom-add').addEventListener('click', openCustomAddModal);
    document.getElementById('btn-backup').addEventListener('click', backupData);
    document.getElementById('restoreInput').addEventListener('change', restoreData);
    document.getElementById('btn-info').addEventListener('click', showInfoModal);

    const searchInput = document.getElementById('searchInput');
       let searchAbortController = null; // Globalny kontroler zapytań wyszukiwarki

    const debouncedMainSearch = debounce(async (query) => {
        const searchResultsContainer = document.getElementById('searchResults');
        
        // ZABICIE POPRZEDNIEGO ZAPYTANIA: Jeśli użytkownik wpisze nową literę, przerywamy stary pobór danych
        if (searchAbortController) searchAbortController.abort();

        if (!query) { searchResultsContainer.style.display = 'none'; fullSearchResults = []; return; }
        searchResultsContainer.style.display = 'block';
        searchResultsContainer.innerHTML = `<div class="placeholder" style="padding:20px; text-align:center;">Wyszukiwanie...</div>`;

        let searchTerm = query; let year = null; const yearMatch = query.match(/\b(\d{4})\b$/);
        if (yearMatch) { year = yearMatch[1]; searchTerm = query.replace(/\b\d{4}\b$/, '').trim(); }

        // Tworzymy nowy kontroler dla tego konkretnego zapytania
        searchAbortController = new AbortController();
        const signal = searchAbortController.signal;

        try {
            let finalResults = [];
            if (year && searchTerm) {
                // Przekazujemy signal do fetchFromTMDB
                const mRes = await fetchFromTMDB('/search/movie', {query: searchTerm, year: year, include_adult: false}, signal);
                const sRes = await fetchFromTMDB('/search/tv', {query: searchTerm, first_air_date_year: year, include_adult: false}, signal);
                
                if (mRes === 'ABORTED' || sRes === 'ABORTED') return; // Ciche wyjście, zapytanie przerwane

                if(mRes) mRes.results.forEach(i => i.media_type = 'movie');
                if(sRes) sRes.results.forEach(i => i.media_type = 'tv');
                finalResults = [...(mRes?.results||[]), ...(sRes?.results||[])].sort((a, b) => b.popularity - a.popularity);
            } else {
                const resData = await fetchFromTMDB('/search/multi', {query: searchTerm, include_adult: false}, signal);
                if (resData === 'ABORTED') return; // Ciche wyjście
                finalResults = resData ? resData.results : [];
            }
            fullSearchResults = finalResults; displaySearchResults(fullSearchResults);
        } catch (error) { 
            if (error.name !== 'AbortError') {
                searchResultsContainer.innerHTML = `<div class="placeholder" style="padding:20px;text-align:center;color:var(--primary-color);">Błąd sieci.</div>`; 
            }
        }
    }, 300); // Zmniejszyłem opóźnienie z 400 do 300, bo dzięki AbortController możemy reagować szybciej!

    searchInput.addEventListener('input', (e) => debouncedMainSearch(e.target.value.trim()));
    searchInput.addEventListener('focus', () => { if(searchInput.value) document.getElementById('searchResults').style.display = 'block'; });
    document.addEventListener('click', (e) => { if (!e.target.closest('.search-wrapper') && !e.target.closest('#searchResults')) document.getElementById('searchResults').style.display = 'none'; });

    // Globalny handler dla debounce list lokalnych
    const handleLocalSearchDebounced = debounce((e) => {
        const listId = getActiveListId(); if(!listId) return;
        viewState[listId].localSearch = e.target.value;
        e.target.nextElementSibling.style.display = e.target.value ? 'flex' : 'none';
        renderList(data[listId], listId);
    }, 250);

    document.querySelectorAll('.localSearchInput').forEach(input => input.addEventListener('input', handleLocalSearchDebounced));
    document.querySelectorAll('.clearLocalSearch').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const listId = getActiveListId(); if(!listId) return;
            viewState[listId].localSearch = '';
            const input = e.target.previousElementSibling; input.value = ''; e.target.style.display = 'none';
            renderList(data[listId], listId); input.focus();
        });
    });

    document.getElementById('searchResults').addEventListener('click', (e) => {
        const quickAdd = e.target.closest('.add-item'); const item = e.target.closest('.search-item');
        if (quickAdd) handleQuickAddItem(quickAdd);
        else if (item && !item.classList.contains('show-all-results-btn')) { if (item.dataset.id && item.dataset.type) openPreviewModal(item.dataset.id, item.dataset.type); }
    });

    document.querySelectorAll('.list-toolbar').forEach(toolbar => {
        toolbar.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (btn) {
                const action = btn.dataset.action;
                if (action === 'open-sort-options') openSortModal();
                else if (action === 'open-filter-options') openFilterModal();
                else if (action === 'toggle-view') { viewState.globalViewMode = viewState.globalViewMode === 'grid' ? 'list' : 'grid'; saveData(); switchMainTab(viewState.activeMainTab); }
            }
        });
    });

    // Obsługa Swipe Gestures
    let touchstartX = 0; let touchstartY = 0; let touchendX = 0; let touchendY = 0;
    const mainContent = document.getElementById('mainContent');
    const handleSwipeGesture = () => {
        const deltaX = touchendX - touchstartX; const deltaY = touchendY - touchstartY;
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 60) {
            if (viewState.activeMainTab === 'movies' || viewState.activeMainTab === 'series') {
                const currentSubTab = viewState.activeMainTab === 'movies' ? viewState.moviesSubTab : viewState.seriesSubTab;
                if (deltaX < 0 && currentSubTab === 'toWatch') switchSubTab('watched');
                else if (deltaX > 0 && currentSubTab === 'watched') switchSubTab('toWatch');
            } else if (viewState.activeMainTab === 'profile') {
                const activeBtn = document.querySelector('.ptab-btn.active');
                const currentPtab = activeBtn ? activeBtn.dataset.ptab : 'stats';
                if (deltaX < 0 && currentPtab === 'stats') switchProfileTab('settings');
                else if (deltaX > 0 && currentPtab === 'settings') switchProfileTab('stats');
            }
        }
    };
    mainContent.addEventListener('touchstart', e => { if (e.target.closest('.sortable-chosen') || e.target.closest('.discover-categories-wrapper')) return; touchstartX = e.changedTouches[0].screenX; touchstartY = e.changedTouches[0].screenY; }, { passive: true });
    mainContent.addEventListener('touchmove', e => { if (e.target.closest('.modal-overlay')) return; const deltaY = e.changedTouches[0].screenY - touchstartY; if (window.scrollY === 0 && deltaY > 0) { e.preventDefault(); } }, { passive: false });
    mainContent.addEventListener('touchend', e => { if (e.target.closest('.sortable-chosen') || e.target.closest('.discover-categories-wrapper')) return; touchendX = e.changedTouches[0].screenX; touchendY = e.changedTouches[0].screenY; handleSwipeGesture(); }, { passive: true });

    document.getElementById('tab-movies').addEventListener('click', handleListItemClick);
    document.getElementById('tab-series').addEventListener('click', handleListItemClick);

    const handlePillClick = (e) => {
        const pill = e.target.closest('.discover-pill');
        if (pill && !pill.classList.contains('active')) {
            document.querySelectorAll('.discover-pill').forEach(p => p.classList.remove('active')); pill.classList.add('active');
            if (pill.dataset.genre) loadDiscoverTab(pill.dataset.genre, true); else loadDiscoverTab(pill.dataset.endpoint, false);
        }
    };
    document.getElementById('discover-categories').addEventListener('click', handlePillClick);
    document.getElementById('discover-genres').addEventListener('click', handlePillClick);

    document.getElementById('fab-randomize').addEventListener('click', async (e) => {
        const btn = e.currentTarget; if(btn.disabled) return;
        triggerHaptic('medium'); btn.disabled = true; btn.classList.add('rolling');
        try {
            const randomPage = Math.floor(Math.random() * 20) + 1; const type = Math.random() > 0.5 ? 'movie' : 'tv';
            const res = await fetchFromTMDB(`/${type}/popular`, {page: randomPage});
            if (res && res.results) {
                const validItems = res.results.filter(i => i.poster_path);
                if (validItems.length > 0) openPreviewModal(validItems[Math.floor(Math.random() * validItems.length)].id, type);
                else showCustomAlert('Błąd', 'Nic nie znaleziono.', 'error');
            }
        } finally { setTimeout(() => { btn.classList.remove('rolling'); btn.disabled = false; }, 600); }
    });

   
}

// ==========================================
// 6. NAWIGACJA I LOGIKA RENDEROWANIA LIST
// ==========================================
function getActiveListId() {
    if (viewState.activeMainTab === 'movies') return viewState.moviesSubTab === 'toWatch' ? 'moviesToWatch' : 'moviesWatched';
    else if (viewState.activeMainTab === 'series') return viewState.seriesSubTab === 'toWatch' ? 'seriesToWatch' : 'seriesWatched';
    return null;
}

function switchMainTab(tabId) {
    viewState.activeMainTab = tabId;
    document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.maintab === tabId));
    document.querySelectorAll('.main-tab-content').forEach(container => container.classList.toggle('active', container.id === `tab-${tabId}`));

    const subHeader = document.getElementById('sub-header');
    const mainHeader = document.getElementById('fixed-header');
    const fab = document.getElementById('fab-randomize');

    if (fab) { if (tabId === 'discover') fab.classList.add('visible'); else fab.classList.remove('visible'); }

    if (tabId === 'discover' || tabId === 'profile') {
        mainHeader.style.transform = `translateY(-100%)`;
        document.body.classList.add('header-hidden');
    } else {
        mainHeader.style.transform = `translateY(0)`;
        document.body.classList.remove('header-hidden');
    }

    if (tabId === 'movies' || tabId === 'series') {
        subHeader.style.display = 'flex';
        const subTab = tabId === 'movies' ? viewState.moviesSubTab : viewState.seriesSubTab;
        document.querySelectorAll('.segmented-control .seg-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.subtab === subTab));
        const listId = getActiveListId();
        const parentTab = document.getElementById(`tab-${tabId}`);
        if (parentTab) {
            parentTab.querySelectorAll('.list-container').forEach(c => c.classList.remove('active'));
            const targetContainer = document.getElementById(`${listId}ListContainer`);
            if (targetContainer) targetContainer.classList.add('active');
        }
        updateToolbarUI(tabId); renderList(data[listId] || [], listId);
        document.body.style.paddingTop = `calc(var(--header-height) + var(--sub-header-height) + var(--safe-top))`;
    } else {
        subHeader.style.display = 'none';
        if (tabId === 'discover') {
            const activePill = document.querySelector('.discover-pill.active');
            loadDiscoverTab(activePill ? (activePill.dataset.genre || activePill.dataset.endpoint) : 'trending', activePill ? !!activePill.dataset.genre : false);
        }
        if (tabId === 'profile') renderProfileStats();
    }
    saveData();
}

function switchSubTab(subTabId) {
    if (viewState.activeMainTab === 'movies') viewState.moviesSubTab = subTabId;
    else if (viewState.activeMainTab === 'series') viewState.seriesSubTab = subTabId;
    document.querySelectorAll('.segmented-control .seg-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.subtab === subTabId));
    const listId = getActiveListId();
    const parentTab = document.getElementById(`tab-${viewState.activeMainTab}`);
    parentTab.querySelectorAll('.list-container').forEach(c => c.classList.remove('active'));
    document.getElementById(`${listId}ListContainer`).classList.add('active');
    updateToolbarUI(viewState.activeMainTab); renderList(data[listId] || [], listId); saveData();
}

function switchProfileTab(tabId) {
    document.querySelectorAll('.ptab-btn').forEach(b => b.classList.toggle('active', b.dataset.ptab === tabId));
    document.querySelectorAll('.profile-sub-section').forEach(s => s.classList.toggle('active', s.id === `ptab-${tabId}`));
}

function updateToolbarUI(mainTabId) {
    const listId = getActiveListId(); if (!listId) return;
    const state = viewState[listId]; const parentTab = document.getElementById(`tab-${mainTabId}`);
    const localSearchInput = parentTab.querySelector('.localSearchInput'); const clearLocalSearch = parentTab.querySelector('.clearLocalSearch');
    localSearchInput.value = state.localSearch || ''; clearLocalSearch.style.display = state.localSearch ? 'flex' : 'none';
    const isCustomSortActive = state.sortBy === 'custom_asc'; let sortOptionsActive = state.sortBy !== 'dateAdded_desc';
    if (isCustomSortActive && (listId === 'moviesToWatch' || listId === 'seriesToWatch')) { sortOptionsActive = false; }
    const filterOptionsActive = (state.filterByGenre !== 'all' || state.filterFavoritesOnly || (state.filterByCustomTag && state.filterByCustomTag !== 'all') || (state.filterByVod && state.filterByVod !== 'all'));
    parentTab.querySelector('.btn-sort').classList.toggle('active', sortOptionsActive);
    parentTab.querySelector('.btn-filter').classList.toggle('active', filterOptionsActive);
    parentTab.querySelector('.btn-view-toggle').innerHTML = viewState.globalViewMode === 'grid' ? ICONS.list : ICONS.grid;
}

let listIntersectionObserver = null; // Zmienna trzymająca naszego obserwatora scrolla

function renderList(originalItems, listId, preserveLimit = false) {
    const container = document.getElementById(`${listId}ListContainer`); if (!container) return;
    const state = viewState[listId];
    if (!preserveLimit) state.displayLimit = 30;
    let itemsToRender = [...(originalItems || [])];

    // ... (Filtrowanie i Sortowanie zostaje takie same jak było) ...
    if (state.localSearch) { const query = state.localSearch.toLowerCase(); itemsToRender = itemsToRender.filter(item => (item.title && item.title.toLowerCase().includes(query)) || (item.overview && item.overview.toLowerCase().includes(query))); }
    if (state.filterFavoritesOnly) itemsToRender = itemsToRender.filter(item => item.isFavorite);
    if (state.filterByGenre !== 'all') itemsToRender = itemsToRender.filter(item => item.genres && item.genres.includes(state.filterByGenre));
    if (state.filterByCustomTag && state.filterByCustomTag !== 'all') itemsToRender = itemsToRender.filter(item => (item.customTags || []).includes(state.filterByCustomTag));
    if (state.filterByVod && state.filterByVod !== 'all') { const targetVod = state.filterByVod.toLowerCase(); itemsToRender = itemsToRender.filter(item => item.vod && item.vod.some(v => v.toLowerCase().includes(targetVod))); }

    const [sortBy, direction] = state.sortBy.split('_');
    if (sortBy === 'custom') { itemsToRender.sort((a, b) => (a.customOrder || 0) - (b.customOrder || 0)); }
    else { itemsToRender.sort((a, b) => { let valA, valB; switch (sortBy) { case 'title': valA = a.title || ''; valB = b.title || ''; return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA); case 'year': case 'rating': case 'dateAdded': valA = a[sortBy] || 0; valB = b[sortBy] || 0; return direction === 'asc' ? valA - valB : valB - valA; default: return 0; } }); }

    const limit = state.displayLimit || 30;
    const pagedItems = itemsToRender.slice(0, limit);

    const listHTML = pagedItems.map(item => {
        const isWatched = listId.includes('Watched'); const isToWatchList = listId.includes('ToWatch');
        let isUnreleased = false; let unreleasedBadgeList = ''; let unreleasedBadgeGrid = '';
        const safeTitle = escapeHTML(item.title); const safeOverview = escapeHTML(item.overview);
        const listPosterSrc = item.poster ? item.poster.replace('w500', 'w300') : POSTER_PLACEHOLDER;

        if (isToWatchList) {
            if (!item.releaseDate || item.releaseDate === '') {
                isUnreleased = true; unreleasedBadgeList = `<div class="unreleased-badge" style="background-color: color-mix(in srgb, var(--info-color) 15%, transparent); border-left-color: var(--info-color); color: var(--info-color);">Brak daty premiery</div>`; unreleasedBadgeGrid = `<div class="grid-unreleased" style="background: rgba(59, 130, 246, 0.9);">🕒 Zapowiedź</div>`;
            } else {
                const today = new Date(); today.setHours(0, 0, 0, 0); const releaseDate = new Date(item.releaseDate);
                if (releaseDate > today) { isUnreleased = true; const formattedDate = releaseDate.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }); unreleasedBadgeList = `<div class="unreleased-badge" style="background-color: color-mix(in srgb, var(--info-color) 15%, transparent); border-left-color: var(--info-color); color: var(--info-color);">Premiera: ${formattedDate}</div>`; unreleasedBadgeGrid = `<div class="grid-unreleased" style="background: rgba(59, 130, 246, 0.9);">🕒 Wkrótce</div>`; }
            }
        }

        // DODANO: class="fade-image" onload="this.classList.add('loaded')"
        if (viewState.globalViewMode === 'grid') {
            let favoriteBadge = item.isFavorite ? `<div class="grid-badge-favorite">${ICONS.star}</div>` : '';
            let infoBadge = ''; let quickTrackBtnGrid = ''; let nextAirDateHTMLGrid = '';
            if (isWatched && item.rating > 0) { infoBadge = `<div class="grid-badge-info">★ ${item.rating}</div>`; }
            else if (listId === 'seriesToWatch' && item.progress && item.numberOfEpisodes > 0) {
                const watchedCount = Object.values(item.progress).reduce((acc, eps) => acc + eps.length, 0);
                if (watchedCount > 0) { const pct = Math.round((watchedCount/item.numberOfEpisodes)*100); infoBadge = `<div class="grid-badge-info">${pct}%</div>`; }
                const nextEpInfo = getNextEpisodeInfo(item);
                if (nextEpInfo && !isUnreleased) quickTrackBtnGrid = `<button class="quick-track-btn-grid" data-action="quick-track">${ICONS.quickTrack} <span>${nextEpInfo.string}</span></button>`;
                else if (!nextEpInfo && !isSeriesFinished(item) && !isUnreleased) nextAirDateHTMLGrid = `<div class="grid-unreleased" style="background: rgba(59, 130, 246, 0.9);">🕒 Wkrótce</div>`;
            }
            let deleteBadge = `<button class="grid-badge-delete delete-btn" title="Usuń">${ICONS.delete}</button>`;
            return `<li class="grid-item ${isUnreleased ? 'unreleased' : ''}" data-id="${item.id}" data-type="${item.type}"><div class="grid-title-fallback">${safeTitle}</div><img class="fade-image" src="${listPosterSrc}" alt="${safeTitle}" loading="lazy" onload="this.classList.add('loaded')" onerror="this.style.opacity=0;">${favoriteBadge}${infoBadge}${unreleasedBadgeGrid}${quickTrackBtnGrid}${nextAirDateHTMLGrid}${deleteBadge}</li>`;
        } else {
            let extraInfo = '';
            if (isWatched && item.rating) { extraInfo = generateStarRatingDisplay(item.rating); }
            else if (listId === 'seriesToWatch' && item.progress && item.numberOfEpisodes > 0) {
                const watchedCount = Object.values(item.progress).reduce((acc, eps) => acc + eps.length, 0); const progressPercent = (watchedCount / item.numberOfEpisodes) * 100;
                const nextEpInfo = getNextEpisodeInfo(item); let nextEpHTML = '';
                if (nextEpInfo) { nextEpHTML = `<button class="quick-track-btn" data-action="quick-track">${ICONS.quickTrack} Obejrzano ${nextEpInfo.string}</button>`; }
                else if (!nextEpInfo && !isSeriesFinished(item) && !isUnreleased) {
                    const airStr = item.nextEpisodeToAir ? getNextAirDateString(item.nextEpisodeToAir) : null;
                    if (airStr) nextEpHTML = `<div style="font-size:0.8rem; font-weight:bold; color:var(--info-color); margin-top:4px; margin-bottom:4px;">Premiera: ${airStr}</div>`;
                    else nextEpHTML = `<div style="font-size:0.8rem; font-weight:bold; color:var(--info-color); margin-top:4px; margin-bottom:4px;">Na bieżąco! Czekamy na datę premiery.</div>`;
                }
                extraInfo = `<div class="progress-container">${nextEpHTML}<div class="progress-text" style="${nextEpHTML ? 'margin-top: 8px;' : ''}">Obejrzano: ${watchedCount} / ${item.numberOfEpisodes}</div><div class="progress-bar"><div class="progress-bar-inner" style="width: ${progressPercent}%;"></div></div></div>`;
            }
            return `<li class="list-item ${isUnreleased ? 'unreleased' : ''}" data-id="${item.id}" data-type="${item.type}"><img class="fade-image" src="${listPosterSrc}" alt="Okładka" onload="this.classList.add('loaded')" onerror="this.onerror=null; this.src='${POSTER_PLACEHOLDER}';"><div class="info"><strong>${safeTitle}</strong><span class="meta">${item.year}</span>${unreleasedBadgeList}<p class="overview">${safeOverview}</p>${extraInfo}</div><div class="item-actions"><button class="icon-button delete-btn" title="Usuń">${ICONS.delete}</button></div></li>`;
        }
    }).join('');

    let ul = container.querySelector('ul');
    if (!ul) { ul = document.createElement('ul'); container.appendChild(ul); }
    ul.className = viewState.globalViewMode === 'grid' ? 'grid-view-container' : 'list-view-container';
    ul.innerHTML = itemsToRender.length > 0 ? listHTML : `<div class="empty-state-simple">Brak pozycji do wyświetlenia.</div>`;

    // USUWANIE STAREGO PRZYCISKU POKAŻ WIĘCEJ
    let oldSentinel = container.querySelector('.infinite-scroll-sentinel');
    if (oldSentinel) oldSentinel.remove();
    
    // Odpinamy starego obserwatora (by zapobiec wyciekom pamięci)
    if (listIntersectionObserver) listIntersectionObserver.disconnect();

    // NOWOŚĆ: INFINITE SCROLL
    if (itemsToRender.length > limit) {
        let sentinel = document.createElement('div');
        sentinel.className = 'infinite-scroll-sentinel';
        // Niewidzialny blok na dole listy o wysokości 20px
        sentinel.style.cssText = 'height: 20px; width: 100%; margin-top: 10px;';
        container.appendChild(sentinel);

        // Ustawiamy obserwatora: Jeśli krawędź ekranu zbliży się do sentinel'a na 300px, załaduj kolejne elementy
        listIntersectionObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                viewState[listId].displayLimit += 30;
                renderList(data[listId], listId, true);
            }
        }, { rootMargin: "300px" });
        
        listIntersectionObserver.observe(sentinel);
    }

    if (sortableInstance) { sortableInstance.destroy(); sortableInstance = null; }
    const isCustomSortActive = state.sortBy === 'custom_asc';
    const isCustomSortableList = listId === 'moviesToWatch' || listId === 'seriesToWatch';
    if (isCustomSortableList && isCustomSortActive && !state.localSearch) { initializeSortable(listId, ul, viewState.globalViewMode); }
}

function initializeSortable(listId, listEl, viewMode) {
    if (!listEl || listEl.children.length < 2) return;
    sortableInstance = new Sortable(listEl, {
        animation: 150, delay: 200, delayOnTouchOnly: true,
        handle: viewMode === 'grid' ? '.grid-item' : '.list-item',
        ghostClass: 'sortable-ghost', chosenClass: 'sortable-chosen',
        onEnd: async (evt) => {
            const oldList = data[listId];
            oldList.sort((a, b) => (a.customOrder || 0) - (b.customOrder || 0));
            const newDOMOrderInfo = Array.from(evt.target.children).map(li => ({ id: li.dataset.id, type: li.dataset.type }));
            const visibleItemsReordered = newDOMOrderInfo.map(info => oldList.find(i => String(i.id) === String(info.id) && i.type === info.type)).filter(Boolean);
            const invisibleItems = oldList.filter(item => !newDOMOrderInfo.some(info => String(item.id) === String(info.id) && item.type === info.type));
            const newList = [...visibleItemsReordered, ...invisibleItems];
            newList.forEach((item, index) => { item.customOrder = index; });
            data[listId] = newList;
            await saveData();
        }
    });
}

function handleListItemClick(e) {
    const itemElement = e.target.closest('.list-item') || e.target.closest('.grid-item');
    if (!itemElement || e.target.closest('.sortable-chosen')) return;
    const id = itemElement.dataset.id; const type = itemElement.dataset.type;
    const deleteBtn = e.target.closest('.delete-btn'); const quickTrackBtn = e.target.closest('[data-action="quick-track"]');

    if (deleteBtn) {
        e.stopPropagation(); const { listName, item } = getListAndItem(id, type);
        showCustomConfirm('Usunąć?', `Czy na pewno chcesz usunąć "${escapeHTML(item.title)}"?`).then(confirmed => {
            if (confirmed && listName) {
                if (itemElement) itemElement.remove();
                data[listName] = data[listName].filter(i => !(String(i.id) === String(id) && i.type == type));
                saveData().then(() => { renderList(data[listName], listName, true); showCustomAlert('Usunięto', `"${escapeHTML(item.title)}" usunięto z biblioteki.`, 'success'); });
            }
        });
    } else if (quickTrackBtn) {
        e.stopPropagation(); handleQuickTrack(id);
    } else {
        openDetailsModal(id, type);
    }
}

async function handleQuickTrack(id) {
    const listName = 'seriesToWatch'; const item = data[listName].find(i => String(i.id) === String(id));
    if (!item) return;
    const next = getNextEpisodeInfo(item); if (!next) return;
    if (!item.progress[next.season]) item.progress[next.season] = [];
    item.progress[next.season].push(next.episode);
    await saveData(); showCustomAlert('Obejrzano', `Odcinek ${next.string} oznaczony.`, 'success');

    const totalWatched = Object.values(item.progress).reduce((acc, arr) => acc + arr.length, 0);
    if (totalWatched >= item.numberOfEpisodes && !item.nextEpisodeToAir && isSeriesFinished(item)) {
        renderList(data[listName], listName, true);
        setTimeout(async () => {
            if(await showCustomConfirm('Gratulacje! 🎉', `Obejrzałeś cały serial "${escapeHTML(item.title)}". Przenieść do Obejrzanych?`)) await handleMoveItem(item.id, 'tv');
        }, 400);
    } else { renderList(data[listName], listName, true); }
}

async function handleMoveItem(id, type) {
    const fList = `${type === 'movie' ? 'movies' : 'series'}ToWatch`; const tList = `${type === 'movie' ? 'movies' : 'series'}Watched`;
    const iIdx = data[fList].findIndex(i => String(i.id) === String(id) && i.type == type);
    if (iIdx > -1) {
        const [item] = data[fList].splice(iIdx, 1);
        item.rating = null; item.review = ""; delete item.progress; delete item.seasons; delete item.customOrder;
        item.watchDates = [Date.now()];
        data[tList].unshift(item); await saveData(); switchSubTab('watched');
        showCustomAlert('Obejrzane!', `"${escapeHTML(item.title)}" oznaczono jako obejrzane.`, 'success');
    }
}

async function handleQuickAddItem(button) {
    button.disabled = true; const { id, type, list } = button.dataset;
    if (!(await addItemToList(id, type, list))) button.disabled = false;
}

async function addItemToList(id, type, list) {
    const existing = Object.values(data).flat().find(i => String(i.id) === String(id) && i.type === type);
    if (existing) { showCustomAlert('Już na liście', `Tytuł jest już w bibliotece.`, 'info'); return false; }

    const details = await getItemDetails(id, type);
    if (!details) { showCustomAlert('Błąd', 'Nie udało się pobrać danych.', 'error'); return false; }

    if (list === 'watched') {
        if (type === 'tv' && !isSeriesFinished(details)) { showCustomAlert('Uwaga', `Serial wciąż trwa. Dodaj do "Do obejrzenia".`, 'info'); return false; }
        if (type === 'movie' && details.releaseDate) { const td = new Date(); td.setHours(0,0,0,0); const rd = new Date(details.releaseDate); rd.setHours(0,0,0,0); if (rd > td) { showCustomAlert('Uwaga', `Film nie miał premiery.`, 'info'); return false; } }
    }

    details.dateAdded = Date.now();
    details.customTags = [];
    const targetList = `${type === 'movie' ? 'movies' : 'series'}${list === 'toWatch' ? 'ToWatch' : 'Watched'}`;

    if (list === 'toWatch' && (targetList === 'moviesToWatch' || targetList === 'seriesToWatch')) {
        const maxOrd = data[targetList].length > 0 ? Math.max(...data[targetList].map(i => i.customOrder || 0)) : -1;
        details.customOrder = maxOrd + 1;
    }
    if (list === 'watched') { details.rating = null; details.review = ""; details.watchDates = [Date.now()]; }

    data[targetList].unshift(details); await saveData();
    switchMainTab(type === 'movie' ? 'movies' : 'series'); switchSubTab(list);
    document.getElementById('searchInput').value = ''; document.getElementById('searchResults').style.display = 'none';
    showCustomAlert('Sukces!', `"${escapeHTML(details.title)}" dodano do listy.`, 'success'); return true;
}

// ==========================================
// 7. ZAKŁADKA ODKRYWAJ I STATYSTYKI
// ==========================================
async function loadDiscoverTab(endpoint = 'trending', isGenre = false) {
    const gridContainer = document.getElementById('main-discover-grid');
    gridContainer.innerHTML = `<div style="text-align:center; padding: 40px 0; color:var(--text-secondary); width:100%; grid-column: 1 / -1;">Ładowanie...</div>`;
    let res, typeOver = null;

    try {
        if (isGenre) { res = await fetchFromTMDB('/discover/movie', {sort_by: 'popularity.desc', with_genres: endpoint, page: 1}); typeOver = 'movie'; }
        else {
            switch(endpoint) {
                case 'movies_popular': res = await fetchFromTMDB('/movie/popular', {region:'PL'}); typeOver = 'movie'; break;
                case 'series_popular': res = await fetchFromTMDB('/tv/popular'); typeOver = 'tv'; break;
                case 'in_theaters': res = await fetchFromTMDB('/movie/now_playing', {region:'PL'}); typeOver = 'movie'; break;
                case 'top_rated': res = await fetchFromTMDB('/movie/top_rated', {region:'PL'}); typeOver = 'movie'; break;
                default: res = await fetchFromTMDB('/trending/all/week'); break;
            }
        }
        if (res) {
            let results = res.results.filter(i => i.poster_path).slice(0, 18);
            if(typeOver) results.forEach(i => i.media_type = typeOver); else results = results.filter(i => i.media_type === 'movie' || i.media_type === 'tv');
            renderDiscoverGridHTML(results, gridContainer);
        } else { gridContainer.innerHTML = `<div style="text-align:center; color:var(--primary-color); width:100%; grid-column: 1 / -1; padding: 40px 0;">Błąd pobierania danych.</div>`; }
    } catch { gridContainer.innerHTML = `<div style="text-align:center; color:var(--primary-color); width:100%; grid-column: 1 / -1; padding: 40px 0;">Sprawdź połączenie sieciowe.</div>`; }
}

function renderDiscoverGridHTML(results, gridContainer) {
    if (!results || results.length === 0) { gridContainer.innerHTML = `<div style="text-align:center; color:var(--text-secondary); width:100%; grid-column: 1 / -1;">Brak wyników.</div>`; return; }
    gridContainer.innerHTML = results.map((item, index) => {
        const posterSrc = item.poster_path ? IMAGE_BASE_URL.replace('w500', 'w300') + item.poster_path : POSTER_PLACEHOLDER;
        const isAlreadyAdded = Object.values(data).flat().some(i => String(i.id) === String(item.id));
        const badgeHTML = isAlreadyAdded ? `<div class="discover-badge-unreleased" style="background:var(--success-color);">W kolekcji</div>` : '';
        return `<div class="discover-item" data-id="${item.id}" data-type="${item.media_type}" title="${escapeHTML(item.title || item.name)}" style="animation: fadeIn 0.4s ease-out ${(index % 18) * 0.03}s both;"><div class="discover-poster-wrapper"><img src="${posterSrc}" alt="okładka" loading="lazy" onerror="this.src='${POSTER_PLACEHOLDER}';">${badgeHTML}</div><div class="discover-item-title">${escapeHTML(item.title || item.name)}</div></div>`;
    }).join('');
    gridContainer.onclick = (e) => { const item = e.target.closest('.discover-item'); if (item) openPreviewModal(item.dataset.id, item.dataset.type); };
}

function renderProfileStats() {
    const c = document.getElementById('profile-stats-container');
    let tMovies = data.moviesWatched.length; let tSeries = data.seriesWatched.length;
    let runtime = 0; let gCounts = {}; let sumRat = 0; let ratCount = 0;
    let dist = { 1:0, 2:0, 3:0, 4:0, 5:0 }; let decades = {};
    let tCol = data.moviesToWatch.length + tMovies + data.seriesToWatch.length + tSeries; let tComp = tMovies + tSeries;

    data.moviesWatched.forEach(m => {
        if (m.runtime) runtime += m.runtime;
        if (m.rating > 0) { sumRat += m.rating; ratCount++; let b = Math.ceil(m.rating); if(b>0 && b<=5) dist[b]++; }
        if (m.year) { let d = Math.floor(parseInt(m.year)/10)*10; decades[d] = (decades[d] || 0) + 1; }
        if (m.genres) m.genres.forEach(g => { gCounts[g] = (gCounts[g] || 0) + 1; });
    });

    [...data.seriesWatched, ...data.seriesToWatch].forEach(s => {
        if (s.rating > 0) { sumRat += s.rating; ratCount++; let b = Math.ceil(s.rating); if(b>0 && b<=5) dist[b]++; }
        if (data.seriesWatched.includes(s) && s.year) { let d = Math.floor(parseInt(s.year)/10)*10; decades[d] = (decades[d] || 0) + 1; }
    });
    data.seriesWatched.forEach(s => { if(s.genres) s.genres.forEach(g => { gCounts[g] = (gCounts[g] || 0) + 1; }); });

    let timeStr = '0h';
    if (runtime > 0) { const hrs = Math.floor(runtime / 60); const days = Math.floor(hrs / 24); if (days > 0) timeStr = `<span class="highlight">${days}d</span> ${hrs % 24}h`; else timeStr = `<span class="highlight">${hrs}h</span>`; }

    let topDec = "Brak"; let maxDec = 0;
    for (const [dec, count] of Object.entries(decades)) { if(count > maxDec) { maxDec = count; topDec = dec + "s"; } }

    let compRate = tCol > 0 ? Math.round((tComp / tCol) * 100) : 0;
    const avgRat = ratCount > 0 ? (sumRat / ratCount).toFixed(1) : '-';
    const topG = Object.entries(gCounts).sort((a,b) => b[1] - a[1]).slice(0, 3);
    const topGHTML = topG.length > 0 ? `<div class="top-genres-list">${topG.map(g => `<span class="profile-genre-tag"><strong style="color: var(--primary-color);">${g[1]}</strong> ${escapeHTML(g[0])}</span>`).join('')}</div>` : '<div style="font-size:0.8rem; color:var(--text-secondary); margin-top:8px;">Brak danych</div>';

    let maxRat = Math.max(...Object.values(dist)); if(maxRat === 0) maxRat = 1;
    let chart = `<div class="rating-bars">`;
    for(let i=1; i<=5; i++) { let hPct = (dist[i] / maxRat) * 100; chart += `<div class="chart-col"><div class="chart-tooltip">${dist[i]} ocen</div><div class="chart-bar" style="height: ${hPct}%;"></div></div>`; }
    chart += `</div><div class="chart-labels"><span class="chart-label">★</span><span class="chart-label">★★</span><span class="chart-label">★★★</span><span class="chart-label">★★★★</span><span class="chart-label">★★★★★</span></div>`;

    c.innerHTML = `<div class="stat-card"><svg class="icon-bg" viewBox="0 0 24 24"><path d="M19.8 3.2L12 11 4.2 3.2 3.5 4l7.8 7.8-7.8 7.8.7.7 7.8-7.8 7.8 7.8.7-.7-7.8-7.8L19.8 4z"/></svg><div class="label">Filmy</div><div class="value">${tMovies}</div></div><div class="stat-card"><svg class="icon-bg" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line></svg><div class="label">Czas (Filmy)</div><div class="value">${timeStr}</div></div><div class="stat-card"><svg class="icon-bg" viewBox="0 0 24 24"><path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zm-10-7h9v6h-9z"/></svg><div class="label">Seriale</div><div class="value">${tSeries}</div></div><div class="stat-card"><svg class="icon-bg" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg><div class="label">Śr. Ocen</div><div class="value">${avgRat}</div></div><div class="stat-card"><div class="label">Ulubiona Epoka</div><div class="value">${topDec}</div></div><div class="stat-card"><div class="label">Ukończono</div><div class="value">${compRate}<span style="font-size:1rem; color:var(--text-secondary)">%</span></div></div><div class="stat-card full-width"><div class="label">Ulubione Gatunki</div>${topGHTML}</div><div class="stat-card full-width"><div class="label" style="margin-bottom:0;">Rozkład ocen</div><div class="rating-chart-wrap">${chart}</div></div>`;
}

// ==========================================
// 8. LOGIKA POBIERANIA SZCZEGÓŁÓW API
// ==========================================
async function getItemDetails(id, type) {
    const d = await fetchFromTMDB(`/${type}/${id}`, { append_to_response: 'images,watch/providers,release_dates', include_image_language: 'pl,en,null' });
    if (!d) return null;

    let vodList = [];
    if (d['watch/providers']?.results?.PL) {
        const pl = d['watch/providers'].results.PL;
        let provs = [...(pl.flatrate || []), ...(pl.free || []), ...(pl.ads || [])];
        vodList = [...new Set(provs.map(p => p.provider_name))];
    }

    let finalReleaseDate = d.release_date || d.first_air_date || null;
    if (type === 'movie' && d.release_dates && d.release_dates.results) {
        const plRelease = d.release_dates.results.find(r => r.iso_3166_1 === 'PL');
        const usRelease = d.release_dates.results.find(r => r.iso_3166_1 === 'US');
        if (plRelease && plRelease.release_dates && plRelease.release_dates.length > 0) {
            const plTheatrical = plRelease.release_dates.find(rd => rd.type === 3);
            finalReleaseDate = plTheatrical ? plTheatrical.release_date.substring(0, 10) : plRelease.release_dates[0].release_date.substring(0, 10);
        }
        else if (usRelease && usRelease.release_dates && usRelease.release_dates.length > 0) {
            const usTheatrical = usRelease.release_dates.find(rd => rd.type === 3);
            finalReleaseDate = usTheatrical ? usTheatrical.release_date.substring(0, 10) : usRelease.release_dates[0].release_date.substring(0, 10);
        }
    }

const item = { 
    id: d.id, 
    title: d.title || d.name, 
    poster: d.poster_path ? IMAGE_BASE_URL + d.poster_path : null, 
    backdrop: d.backdrop_path ? IMAGE_BASE_URL.replace('w500', 'w780') + d.backdrop_path : null, 
    type: type, 
    year: (finalReleaseDate || '').substring(0, 4), 
    releaseDate: finalReleaseDate, 
    overview: d.overview, 
    genres: d.genres ? d.genres.map(g => g.name) : [], 
    isFavorite: false, 
    customTags: [], 
    vod: vodList,
    tmdbRating: d.vote_average ? parseFloat(d.vote_average).toFixed(1) : null // <--- NOWE
};
    if (type === 'tv') {
        item.status = d.status;
        item.nextEpisodeToAir = d.next_episode_to_air ? { date: d.next_episode_to_air.air_date, season: d.next_episode_to_air.season_number, episode: d.next_episode_to_air.episode_number } : null;
        const realSeasons = d.seasons ? d.seasons.filter(s => s.season_number > 0) : [];
        item.seasons = realSeasons; item.numberOfSeasons = realSeasons.length; item.numberOfEpisodes = realSeasons.reduce((acc, s) => acc + s.episode_count, 0); item.progress = {};
    } else if (type === 'movie') { item.runtime = d.runtime || null; }
    return item;
}

async function getCredits(id, type) {
    if (String(id).startsWith('custom_')) return [];
    const cacheKey = `credits_${type}_${id}`;
    const cached = await db.getCache(cacheKey, 7); if (cached) return cached;
    const data = await fetchFromTMDB(`/${type}/${id}/credits`);
    if(!data) return [];
    const result = data.cast.slice(0, 15);
    await db.setCache(cacheKey, result); return result;
}

async function getWatchProviders(id, type) {
    if (String(id).startsWith('custom_')) return null;
    const cacheKey = `providers_${type}_${id}`;
    const cached = await db.getCache(cacheKey, 3); if (cached) return cached;
    const data = await fetchFromTMDB(`/${type}/${id}/watch/providers`);
    if (data?.results?.PL) {
        const pl = data.results.PL;
        let provs = [...(pl.flatrate || []), ...(pl.free || []), ...(pl.ads || [])];
        const uniq = Array.from(new Set(provs.map(p => p.provider_id))).map(id => provs.find(p => p.provider_id === id));
        if (uniq.length > 0) { await db.setCache(cacheKey, uniq); return uniq; }
    }
    return null;
}

async function getRecommendations(id, type) {
    if (String(id).startsWith('custom_')) return [];
    const cacheKey = `recs_${type}_${id}`;
    const cached = await db.getCache(cacheKey, 7); if (cached) return cached;
    let data = await fetchFromTMDB(`/${type}/${id}/recommendations`, {page: 1});
    let results = data?.results ? data.results.filter(i => i.poster_path) : [];
    if (results.length === 0) {
        data = await fetchFromTMDB(`/${type}/${id}/similar`, {page: 1});
        results = data?.results ? data.results.filter(i => i.poster_path) : [];
    }
    const finalRes = results.slice(0, 15);
    await db.setCache(cacheKey, finalRes); return finalRes;
}

async function getSeasonDetails(seriesId, seasonNumber) {
    const cacheKey = `season_${seriesId}_${seasonNumber}`;
    const cached = await db.getCache(cacheKey, 2); if (cached) return cached;
    const data = await fetchFromTMDB(`/tv/${seriesId}/season/${seasonNumber}`);
    if(!data) return null;
    await db.setCache(cacheKey, data); return data;
}

async function getActorDetails(actorId) {
    const cacheKey = `actor_${actorId}`;
    const cached = await db.getCache(cacheKey, 7); if (cached) return cached;
    let dt = await fetchFromTMDB(`/person/${actorId}`);
    if (!dt) return null;
    if (!dt.biography) { const en = await fetchFromTMDB(`/person/${actorId}`, {language: 'en-US'}); if(en) dt.biography = en.biography; }
    const cr = await fetchFromTMDB(`/person/${actorId}/combined_credits`);
    if (!cr) return null;
    const uC = cr.cast.filter((i, idx, s) => idx === s.findIndex(t => t.id === i.id));
    const kf = [...uC].filter(i => i.poster_path).sort((a, b) => b.vote_count - a.vote_count).slice(0, 10);
    const fg = [...uC].filter(i => i.release_date || i.first_air_date).sort((a, b) => new Date(b.release_date || b.first_air_date) - new Date(a.release_date || a.first_air_date));
    const result = { name: dt.name, biography: dt.biography, profile_path: dt.profile_path, known_for: kf, full_filmography: fg };
    await db.setCache(cacheKey, result); return result;
}

async function getTrailerKey(id, type) {
     const d = await fetchFromTMDB(`/${type}/${id}/videos`, { language: false });
    if (!d || !d.results || d.results.length === 0) return null;
    const tr = d.results.filter(v => v.site === 'YouTube');
    const oTr = tr.find(v => v.type === 'Trailer' && v.official); if (oTr) return oTr.key;
    const aTr = tr.find(v => v.type === 'Trailer'); if (aTr) return aTr.key;
    const tsr = tr.find(v => v.type === 'Teaser'); if (tsr) return tsr.key;
    return null;
}

// ==========================================
// 9. FUNKCJE POMOCNICZE WIDOKÓW
// ==========================================
function isSeriesFinished(item) { if (item.type !== 'tv') return true; return item.status === 'Ended' || item.status === 'Canceled'; }
function getAllUniqueTags() { const allItems = [...data.moviesToWatch, ...data.moviesWatched, ...data.seriesToWatch, ...data.seriesWatched]; return [...new Set(allItems.flatMap(item => item.customTags || []))].sort(); }
function renderCollapsibleText(text) { if (!text) return 'Brak informacji dla tego wpisu.'; const safeText = escapeHTML(text).replace(/\n/g, '<br>'); if (safeText.length > 280) { return `<div class="collapsible-text-container"><div class="overview-text collapsible-text">${safeText}</div><button type="button" class="read-more-btn" onclick="this.previousElementSibling.classList.toggle('expanded'); this.textContent = this.previousElementSibling.classList.contains('expanded') ? 'Zwiń' : 'Rozwiń';">Rozwiń</button></div>`; } return `<div class="overview-text">${safeText}</div>`; }
function getNextEpisodeInfo(item) { if (!item.seasons || item.seasons.length === 0) return null; if (!item.progress) item.progress = {}; const sortedSeasons = [...item.seasons].sort((a, b) => a.season_number - b.season_number); const today = new Date(); today.setHours(0,0,0,0); for (let s of sortedSeasons) { const sNum = s.season_number; if (sNum === 0) continue; const watched = item.progress[sNum] || []; let maxAvailableEp = s.episode_count; if (item.nextEpisodeToAir && item.nextEpisodeToAir.season === sNum) { const airDate = new Date(item.nextEpisodeToAir.date); if (airDate > today) maxAvailableEp = item.nextEpisodeToAir.episode - 1; } if (watched.length < maxAvailableEp) { for (let i = 1; i <= maxAvailableEp; i++) { if (!watched.includes(i)) return { season: sNum, episode: i, string: `S${String(sNum).padStart(2, '0')}E${String(i).padStart(2, '0')}` }; } } } return null; }
function getNextEpisodeStr(item) { const info = getNextEpisodeInfo(item); return info ? info.string : null; }
function getStatusBadge(status) { if (!status) return ''; switch(status) { case 'Returning Series': return '<span class="status-badge status-returning">🟢 W produkcji</span>'; case 'Ended': return '<span class="status-badge status-ended">🔴 Zakończony</span>'; case 'Canceled': return '<span class="status-badge status-canceled">⚫ Anulowany</span>'; case 'In Production': return '<span class="status-badge status-returning">🟡 Tworzenie</span>'; default: return `<span class="status-badge" style="color: #9ca3af; border: 1px solid rgba(156, 163, 175, 0.3);">${escapeHTML(status)}</span>`; } }
function getNextAirDateString(nextEpData) { if (!nextEpData || !nextEpData.date) return null; const airDate = new Date(nextEpData.date); const today = new Date(); today.setHours(0,0,0,0); const diffDays = Math.ceil((airDate - today) / (1000 * 60 * 60 * 24)); const epString = `S${String(nextEpData.season).padStart(2,'0')}E${String(nextEpData.episode).padStart(2,'0')}`; const dateString = airDate.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }); if (diffDays < 0) return null; if (diffDays === 0) return `${epString} dzisiaj!`; if (diffDays === 1) return `${epString} jutro!`; if (diffDays > 1 && diffDays <= 7) return `${epString} za ${diffDays} dni`; return `${epString}: ${dateString}`; }
const formatRuntime = (minutes) => { if (!minutes || minutes <= 0) return ''; const hours = Math.floor(minutes / 60); const remainingMinutes = minutes % 60; let formatted = []; if (hours > 0) formatted.push(`${hours}h`); if (remainingMinutes > 0) formatted.push(`${remainingMinutes}min`); return formatted.join(' '); };
const generateStarRatingDisplay = (rating) => { let starsHTML = ''; const starPath = "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"; for (let i = 1; i <= 5; i++) { if (rating >= i) { starsHTML += `<svg viewBox="0 0 24 24" fill="var(--warning-color)"><path d="${starPath}"/></svg>`; } else if (rating >= i - 0.5) { starsHTML += `<svg viewBox="0 0 24 24"><defs><linearGradient id="half_grad_${i}" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="50%" stop-color="var(--warning-color)"/><stop offset="50%" stop-color="var(--border-color)"/></linearGradient></defs><path d="${starPath}" fill="url(#half_grad_${i})"/></svg>`; } else { starsHTML += `<svg viewBox="0 0 24 24" fill="var(--border-color)"><path d="${starPath}"/></svg>`; } } return `<div class="star-rating-display">${starsHTML}</div>`; };
const getListAndItem = (id, type) => { for (const listName in data) { if(Array.isArray(data[listName])) { const item = data[listName].find(i => String(i.id) === String(id) && i.type === type); if (item) return { listName, item }; } } return { listName: null, item: null }; };
const showMainContent = () => { document.getElementById('configSection').style.display = 'none'; document.getElementById('mainContent').style.display = 'flex'; };

function setupSwipeToClose(modalElement, closeCallback) {
    const wrapper = modalElement.querySelector('.modern-modal-wrapper'); if (!wrapper) return;
    let startY = 0; let currentY = 0; let isDragging = false;
    wrapper.addEventListener('touchstart', (e) => { const scrollArea = wrapper.querySelector('.modern-modal-scroll'); if (scrollArea && scrollArea.contains(e.target) && scrollArea.scrollTop > 0) { isDragging = false; return; } startY = e.touches[0].clientY; isDragging = true; wrapper.style.transition = 'none'; }, { passive: true });
    wrapper.addEventListener('touchmove', (e) => { if (!isDragging) return; const deltaY = e.touches[0].clientY - startY; if (deltaY > 0) { e.preventDefault(); currentY = deltaY; wrapper.style.transform = `translateY(${currentY}px)`; } }, { passive: false });
    wrapper.addEventListener('touchend', () => { if (!isDragging) return; isDragging = false; wrapper.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'; if (currentY > 100) { wrapper.style.transform = `translateY(100%)`; setTimeout(closeCallback, 250); } else wrapper.style.transform = `translateY(0)`; currentY = 0; });
}

// ==========================================
// 10. WIDOKI MODALNE
// ==========================================
async function openSortModal() {
    const listId = getActiveListId(); const state = viewState[listId]; const isWatched = listId.includes('Watched');
    const isCustom = listId === 'moviesToWatch' || listId === 'seriesToWatch';
    const opts = [
        { value: 'dateAdded_desc', label: 'Najnowsze na liście', icon: '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>' },
        { value: 'dateAdded_asc', label: 'Najstarsze na liście', icon: '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 8 14"></polyline>' },
        { value: 'title_asc', label: 'Tytuł (A-Z)', icon: '<path d="M4 15l4 4 4-4M8 4v15M20 4h-8M20 8h-6M20 12h-4" />' },
        { value: 'title_desc', label: 'Tytuł (Z-A)', icon: '<path d="M4 9l4-4 4 4M8 20V5M20 4h-8M20 8h-6M20 12h-4" />' },
        { value: 'year_desc', label: 'Rok (najnowsze)', icon: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>' },
        { value: 'year_asc', label: 'Rok (najstarsze)', icon: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>' }
    ];
    if (isWatched) { opts.push({ value: 'rating_desc', label: 'Ocena (najwyższa)', icon: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>' }, { value: 'rating_asc', label: 'Ocena (najniższa)', icon: '<path d="M12 17.75l-6.17 3.12 1.18-7.03L2 9.1l7.15-.61L12 2l2.85 6.49 7.15.61-5.01 4.74 1.18 7.03z"></path>' }); }
    if (isCustom) opts.unshift({ value: 'custom_asc', label: 'Własna kolejność', icon: '<line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line>' });

    const optsHTML = opts.map(o => `<label class="modern-radio-row"><input type="radio" name="sort" value="${o.value}" ${state.sortBy === o.value ? 'checked' : ''}><svg class="icon" viewBox="0 0 24 24">${o.icon}</svg><span class="label-text">${o.label}</span><svg class="check-icon" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></label>`).join('');
    const modal = document.getElementById('detailsModalContainer');
    modal.innerHTML = `<div class="modal-overlay"><div class="modern-modal-wrapper control-modal-content"><div class="modal-drag-handle"></div><h3>Sortuj</h3><div class="control-modal-options">${optsHTML}</div><div class="control-modal-footer"><button class="reset-btn">Domyślne</button><button class="apply-btn">Zastosuj</button></div></div></div>`;
    setupSwipeToClose(modal.querySelector('.modal-overlay'), () => modal.innerHTML = '');
    modal.querySelector('.modal-overlay').onclick = e => { if (e.target.classList.contains('modal-overlay')) modal.innerHTML = ''; };
    modal.querySelector('.apply-btn').onclick = async () => { const sel = document.querySelector('input[name="sort"]:checked'); if (sel) state.sortBy = sel.value; await saveData(); updateToolbarUI(viewState.activeMainTab); renderList(data[listId], listId); modal.innerHTML = ''; };
    modal.querySelector('.reset-btn').onclick = async () => { state.sortBy = isCustom ? 'custom_asc' : 'dateAdded_desc'; await saveData(); updateToolbarUI(viewState.activeMainTab); renderList(data[listId], listId); modal.innerHTML = ''; };
}

async function openFilterModal() {
    const listId = getActiveListId(); const state = viewState[listId];
    if (state.filterByVod === undefined) state.filterByVod = 'all';

    const uniqueGenres = [...new Set((data[listId] || []).flatMap(item => item.genres || []))].sort();
    const uniqueTags = [...new Set((data[listId] || []).flatMap(item => item.customTags || []))].sort();
    const topVodProviders = ['Netflix', 'Max', 'Amazon Prime Video', 'Disney Plus', 'Apple TV Plus', 'SkyShowtime'];

    let filterOptionsHTML = `<label class="modern-toggle-row"><span>Tylko ulubione</span><div class="toggle-switch"><input type="checkbox" id="filter-favorites-checkbox" ${state.filterFavoritesOnly ? 'checked' : ''}><div class="slider"></div></div></label><div class="filter-section-title">Gdzie obejrzeć? (VOD)</div><div class="modern-chip-group" style="margin-bottom: 16px;"><label class="modern-chip"><input type="radio" name="vod-filter" value="all" ${state.filterByVod === 'all' ? 'checked' : ''}><span>Wszystkie</span></label>`;
    filterOptionsHTML += topVodProviders.map(v => `<label class="modern-chip"><input type="radio" name="vod-filter" value="${v}" ${state.filterByVod === v ? 'checked' : ''}><span>${v.replace(' Plus', '+').replace('Amazon ', '')}</span></label>`).join('');
    filterOptionsHTML += `</div><div style="font-size:0.75rem; color:var(--text-secondary); margin-top:-8px; margin-bottom:12px;">*Aby filtr zadziałał dla starych wpisów, otwórz najpierw ich szczegóły.</div><div class="filter-section-title">Gatunek</div><div class="modern-chip-group"><label class="modern-chip"><input type="radio" name="genre-filter" value="all" ${state.filterByGenre === 'all' ? 'checked' : ''}><span>Wszystkie</span></label>`;
    if (uniqueGenres.length > 0) filterOptionsHTML += uniqueGenres.map(g => `<label class="modern-chip"><input type="radio" name="genre-filter" value="${escapeHTML(g)}" ${state.filterByGenre === g ? 'checked' : ''}><span>${escapeHTML(g)}</span></label>`).join('');
    filterOptionsHTML += `</div>`;

    if (uniqueTags.length > 0) {
        filterOptionsHTML += `<div class="filter-section-title">Twój Tag</div><div class="modern-chip-group"><label class="modern-chip"><input type="radio" name="tag-filter" value="all" ${state.filterByCustomTag === 'all' ? 'checked' : ''}><span>Wszystkie</span></label>`;
        filterOptionsHTML += uniqueTags.map(t => `<label class="modern-chip"><input type="radio" name="tag-filter" value="${escapeHTML(t)}" ${state.filterByCustomTag === t ? 'checked' : ''}><span>${escapeHTML(t)}</span></label>`).join('');
        filterOptionsHTML += `</div>`;
    }

    const modalContainer = document.getElementById('detailsModalContainer');
    modalContainer.innerHTML = `<div class="modal-overlay"><div class="modern-modal-wrapper control-modal-content"><div class="modal-drag-handle"></div><h3>Filtruj</h3><div class="control-modal-options">${filterOptionsHTML}</div><div class="control-modal-footer"><button class="reset-btn">Wyczyść</button><button class="apply-btn">Zastosuj</button></div></div></div>`;
    modalContainer.querySelector('.modal-overlay').onclick = e => { if (e.target.classList.contains('modal-overlay')) modalContainer.innerHTML = ''; };
    setupSwipeToClose(modalContainer.querySelector('.modal-overlay'), () => modalContainer.innerHTML = '');

    modalContainer.querySelector('.apply-btn').onclick = async () => {
        state.filterFavoritesOnly = document.getElementById('filter-favorites-checkbox').checked;
        const selGenre = document.querySelector('input[name="genre-filter"]:checked'); if (selGenre) state.filterByGenre = selGenre.value;
        const selTag = document.querySelector('input[name="tag-filter"]:checked'); if(selTag) state.filterByCustomTag = selTag.value;
        const selVod = document.querySelector('input[name="vod-filter"]:checked'); if(selVod) state.filterByVod = selVod.value;
        await saveData(); updateToolbarUI(viewState.activeMainTab); renderList(data[listId], listId); modalContainer.innerHTML = '';
    };
    modalContainer.querySelector('.reset-btn').onclick = async () => {
        state.filterFavoritesOnly = false; state.filterByGenre = 'all'; state.filterByCustomTag = 'all'; state.filterByVod = 'all';
        await saveData(); updateToolbarUI(viewState.activeMainTab); renderList(data[listId], listId); modalContainer.innerHTML = '';
    };
}

const deleteTagGlobally = async (tagToDelete, item, onUpdate) => {
    if(await showCustomConfirm('Usuń tag', `Czy na pewno chcesz trwale usunąć tag "${tagToDelete}" z CAŁEGO konta?`)) {
        ['moviesToWatch', 'moviesWatched', 'seriesToWatch', 'seriesWatched'].forEach(listName => { data[listName].forEach(i => { if (i.customTags) i.customTags = i.customTags.filter(t => t !== tagToDelete); }); });
        await saveData(); if (item && item.customTags) item.customTags = item.customTags.filter(t => t !== tagToDelete);
        onUpdate(); const activeList = getActiveListId(); if(activeList) renderList(data[activeList], activeList, true);
    }
};

function openManageTagsModal(item, onUpdate) {
    const c = document.getElementById('customAlertContainer');
    const renderContent = () => {
        const appliedTags = item.customTags || []; const allTags = getAllUniqueTags(); const availableTags = allTags.filter(t => !appliedTags.includes(t));
        let availableHTML = availableTags.length > 0 ? `<div style="margin-top: 8px; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px; text-align: center;">Wybierz lub usuń z konta:</div><div class="existing-tags-group">` + availableTags.map(t => `<div class="existing-tag-wrap"><button class="existing-tag-btn" data-addtag="${escapeHTML(t)}"><svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:3;stroke-linecap:round;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> ${escapeHTML(t)}</button><button class="delete-global-tag-btn" data-deltag="${escapeHTML(t)}" title="Usuń z całego konta"><svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:currentColor;"><path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/></svg></button></div>`).join('') + `</div>` : '<div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 12px; text-align: center;">Brak innych tagów na koncie.</div>';
        c.innerHTML = `<div class="modern-alert-overlay" id="tagsModalOverlay" style="z-index: 5000;"><div class="modern-alert-card" style="padding: 24px; max-width: 400px; width: 90%;"><h2 style="margin-bottom:16px; font-size:1.2rem; color:var(--text-color);">Zarządzaj Tagami</h2>${availableHTML}<div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border-color);"><div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px; text-align: left;">Stwórz nowy:</div><div class="add-tag-wrapper" style="margin-top: 0;"><input type="text" id="new-tag-input" class="add-tag-input" placeholder="Wpisz nazwę..."><button id="add-tag-btn" class="add-tag-btn">Zapisz</button></div></div><div class="modern-alert-actions" style="margin-top: 24px;"><button class="modern-alert-btn secondary" id="close-tags-btn" style="width: 100%;">Gotowe</button></div></div></div>`;
        const overlay = c.querySelector('#tagsModalOverlay'); const closeBtn = c.querySelector('#close-tags-btn'); const addBtn = c.querySelector('#add-tag-btn'); const input = c.querySelector('#new-tag-input');
        setTimeout(() => input.focus(), 100);
        const close = () => { overlay.style.opacity = '0'; setTimeout(() => { c.innerHTML = ''; onUpdate(); }, 200); };
        closeBtn.onclick = close; overlay.onclick = (e) => { if(e.target === overlay) close(); };
        const addNewTag = async () => { const val = input.value.trim(); if(val && !(item.customTags || []).includes(val)) { if(!item.customTags) item.customTags = []; item.customTags.push(val); await saveData(); close(); } };
        addBtn.onclick = addNewTag; input.addEventListener('keyup', (e) => { if(e.key === 'Enter') addNewTag(); });
        c.querySelectorAll('.existing-tag-btn').forEach(btn => { btn.onclick = async (e) => { const t = e.currentTarget.dataset.addtag; if(!item.customTags) item.customTags = []; item.customTags.push(t); await saveData(); close(); }; });
        c.querySelectorAll('.delete-global-tag-btn').forEach(btn => { btn.onclick = (e) => { const t = e.currentTarget.dataset.deltag; deleteTagGlobally(t, item, renderContent); }; });
    };
    renderContent();
}

function showInfoModal() {
    const checkIcon = `<svg class="info-feature-icon" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    const infoHTML = `<div class="modal-overlay"><div class="modern-modal-wrapper"><div class="modal-drag-handle"></div><button class="modal-top-close-btn" title="Zamknij">${ICONS.close}</button><div class="modern-modal-scroll" style="padding: 32px 24px;"><h2 style="margin: 0 0 8px; display: flex; align-items: center; gap: 12px; font-size: 1.6rem;"><svg class="app-logo-icon" style="width:36px; height:36px;" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path d="M401.7,144.2C382.4,106.6,343.3,80,299.7,80c-48.5,0-88.7,35.5-96.8,81.4c-42.5,0-76.8,34.4-76.8,76.8 c0,35.1,22.4,64.8,53.2,73.8c-7.3,4.4-15.6,6.9-24.4,6.9c-32.1,0-58.1,26-58.1,58.1h29.1c0-16,13-29.1,29.1-29.1 s29.1,13,29.1,29.1h29.1h29.1h29.1c0-16,13-29.1,29.1-29.1s29.1,13,29.1,29.1h29.1c0-32.1-26-58.1-58.1-58.1 c-8.8,0-17.1,2.5-24.4-6.9c30.8-9,53.2-38.7,53.2-73.8C478.5,178.6,444.2,144.2,401.7,144.2z M241.6,220.3 c-12,0-21.8-9.8-21.8-21.8s9.8-21.8,21.8-21.8s21.8,9.8,21.8,21.8S253.6,220.3,241.6,220.3z M358.4,220.3 c-12,0-21.8-9.8-21.8-21.8s9.8-21.8,21.8-21.8s21.8,9.8,21.8,21.8S370.4,220.3,358.4,220.3z"/></svg><span>PenguinFlix</span></h2><p style="color: var(--text-secondary); margin-bottom: 24px; font-size: 1.05rem;">Twój osobisty dziennik filmów i seriali.</p><h3 style="text-align: left; margin-bottom: 16px; font-size: 1.1rem; color: var(--text-color);">Kluczowe Funkcje</h3><ul class="info-feature-list"><li class="info-feature-item">${checkIcon} <span>Oceny, recenzje, dodawanie własnych tagów i ręcznych wpisów.</span></li><li class="info-feature-item">${checkIcon} <span>Zaawansowane śledzenie odcinków (z datami premier.)</span></li><li class="info-feature-item">${checkIcon} <span>Odkrywanie trendów, trailerów i pełnej obsady.</span></li><li class="info-feature-item">${checkIcon} <span>Filtrowanie po VOD (Netflix, HBO, Disney+ itp.)</span></li><li class="info-feature-item">${checkIcon} <span>Historia ponownych seansów.</span></li><li class="info-feature-item">${checkIcon} <span>Działanie offline jako PWA.</span></li></ul><div class="important-note"><strong>Ważne:</strong> Wszystkie dane są przechowywane <strong>wyłącznie na Twoim urządzeniu</strong>. Nie są wysyłane na żaden serwer.<p>Aby uniknąć utraty danych,<strong> regularnie twórz kopię zapasową</strong> w ustawieniach Profilu.</p></div><p style="font-size: 0.8rem; color: var(--text-secondary);">Ta aplikacja korzysta z The Movie Database (TMDb).<br><img src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg" alt="TMDb Logo" class="tmdb-logo"></p></div></div></div>`;
    const c = document.getElementById('customAlertContainer'); c.innerHTML = infoHTML;
    const modal = c.querySelector('.modal-overlay'); const close = () => c.innerHTML = '';
    modal.addEventListener('click', e => { if (e.target === modal) close(); }); modal.querySelector('.modal-top-close-btn').addEventListener('click', close); setupSwipeToClose(modal, close);
}

function showConfig() {
    document.getElementById('mainContent').style.display = 'none';
    const c = document.getElementById('configSection'); c.style.display = 'block';
    c.innerHTML = `<div class="config-wrapper"><div class="config-card"><svg class="config-icon" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path d="M401.7,144.2C382.4,106.6,343.3,80,299.7,80c-48.5,0-88.7,35.5-96.8,81.4c-42.5,0-76.8,34.4-76.8,76.8 c0,35.1,22.4,64.8,53.2,73.8c-7.3,4.4-15.6,6.9-24.4,6.9c-32.1,0-58.1,26-58.1,58.1h29.1c0-16,13-29.1,29.1-29.1 s29.1,13,29.1,29.1h29.1h29.1h29.1c0-16,13-29.1,29.1-29.1s29.1,13,29.1,29.1h29.1c0-32.1-26-58.1-58.1-58.1 c-8.8,0-17.1,2.5-24.4-6.9c30.8-9,53.2-38.7,53.2-73.8C478.5,178.6,444.2,144.2,401.7,144.2z M241.6,220.3 c-12,0-21.8-9.8-21.8-21.8s9.8-21.8,21.8-21.8s21.8,9.8,21.8,21.8S253.6,220.3,241.6,220.3z M358.4,220.3 c-12,0-21.8-9.8-21.8-21.8s9.8-21.8,21.8-21.8s21.8,9.8,21.8,21.8S370.4,220.3,358.4,220.3z"/></svg><h2 class="config-title">Witaj w PenguinFlix</h2><p class="config-desc">Aby rozpocząć budowanie swojego osobistego dziennika, wklej poniżej swój darmowy klucz API (v3 auth) z The Movie Database.</p><div class="config-input-group"><input type="text" id="apiKeyInput" class="config-input" placeholder="Wklej klucz API..." autocomplete="off"><button id="saveApiKeyButton" class="config-btn">Rozpocznij</button></div></div></div>`;
    document.getElementById('saveApiKeyButton').addEventListener('click', () => {
        const key = document.getElementById('apiKeyInput').value.trim();
        if (key) { localStorage.setItem('tmdbApiKey', key); API_KEY = key; showCustomAlert('Witaj!', 'Aplikacja jest gotowa do działania.', 'success'); init(); }
        else { showCustomAlert('Błąd', 'Pole klucza API nie może być puste.', 'error'); }
    });
}

function showCustomAlert(title, message, type = 'info') {
    if (type === 'success') triggerHaptic('success'); else if (type === 'error') triggerHaptic('error'); else triggerHaptic('medium');
    const toastContainer = document.getElementById('toast-container'); const toast = document.createElement('div'); toast.className = `modern-toast ${type}`;
    const icons = { success: `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`, error: `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`, info: `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>` };
    toast.innerHTML = `<div class="toast-icon-wrap ${type}">${icons[type] || icons.info}</div><div class="toast-content"><span class="toast-title">${title}</span><span class="toast-msg">${message}</span></div><div class="toast-progress" style="color: ${type==='success'?'var(--success-color)':type==='error'?'var(--primary-color)':'#3b82f6'}"></div>`;
    toastContainer.appendChild(toast);
    const hideTimeout = setTimeout(() => { if(!toast.classList.contains('hiding')) { toast.classList.add('hiding'); toast.addEventListener('animationend', () => toast.remove()); } }, 3500);
    toast.addEventListener('click', () => { clearTimeout(hideTimeout); toast.classList.add('hiding'); toast.addEventListener('animationend', () => toast.remove()); });
}

function showCustomConfirm(title, message) {
    return new Promise((resolve) => {
        const c = document.getElementById('customAlertContainer');
        c.innerHTML = `<div class="modern-alert-overlay" id="modernAlertWrap"><div class="modern-alert-card"><div class="modern-alert-icon-wrap info"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></div><h2>${title}</h2><p>${message}</p><div class="modern-alert-actions"><button class="modern-alert-btn secondary alert-button-cancel">Anuluj</button><button class="modern-alert-btn primary alert-button-confirm">Potwierdź</button></div></div></div>`;
        const o = c.querySelector('.modern-alert-overlay');
        const cleanup = (res) => { o.style.opacity = '0'; setTimeout(() => { c.innerHTML = ''; resolve(res); }, 200); };
        c.querySelector('.alert-button-confirm').onclick = () => cleanup(true);
        c.querySelector('.alert-button-cancel').onclick = () => cleanup(false);
        o.onclick = (e) => { if(e.target === o) cleanup(false); };
    });
}

function displaySearchResults(results) {
    const container = document.getElementById('searchResults'); container.innerHTML = '';
    const filtered = results.filter(item => (item.media_type === 'movie' || item.media_type === 'tv') && item.poster_path);
    if (filtered.length === 0) { container.innerHTML = '<div class="placeholder" style="padding:20px; text-align:center;">Brak wyników.</div>'; return; }
    filtered.slice(0, 5).forEach(item => {
        const safeTitle = escapeHTML(item.title || item.name);
        const div = document.createElement('div'); div.className = 'search-item'; div.dataset.id = item.id; div.dataset.type = item.media_type;
        const posterSrc = item.poster_path ? IMAGE_BASE_URL.replace('w500', 'w200') + item.poster_path : POSTER_PLACEHOLDER;
        let isReleased = false; if (item.release_date || item.first_air_date) { const rd = new Date(item.release_date || item.first_air_date); const td = new Date(); td.setHours(0,0,0,0); isReleased = rd <= td; }
        const wBtn = isReleased ? `<button class="icon-button add-item" data-id="${item.id}" data-type="${item.media_type}" data-list="watched" title="Obejrzane"><svg viewBox="0 0 24 24"><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,16.5L6.5,12L7.91,10.59L11,13.67L16.09,8.59L17.5,10L11,16.5Z"/></svg></button>` : ``;
        div.innerHTML = `<img src="${posterSrc}" alt="Okładka" onerror="this.src='${POSTER_PLACEHOLDER}';"><div class="info"><strong>${safeTitle}</strong><span>${((item.release_date||item.first_air_date) || 'Brak daty').substring(0, 4)}</span></div><div class="actions"><button class="icon-button add-item" data-id="${item.id}" data-type="${item.media_type}" data-list="toWatch" title="Do obejrzenia"><svg viewBox="0 0 24 24"><path d="M17,3A2,2 0 0,1 19,5V21L12,18L5,21V5C5,3.89 5.9,3 7,3H17M11,14H9V12H11V14M15,14H13V12H15V14M11,10H9V8H11V10M15,10H13V8H15V10Z"/></svg></button>${wBtn}</div>`;
        container.appendChild(div);
    });
    if (filtered.length > 5) { const showAll = document.createElement('div'); showAll.className = 'search-item show-all-results-btn'; showAll.innerHTML = `<span>Pokaż wszystkie ${filtered.length} wyników</span>`; showAll.style.justifyContent = 'center'; showAll.style.fontWeight = '600'; container.appendChild(showAll); showAll.addEventListener('click', showAllResultsModal); }
}

function showAllResultsModal() {
    const query = escapeHTML(document.getElementById('searchInput').value); const modalContainer = document.getElementById('detailsModalContainer');
    const filtered = fullSearchResults.filter(item => (item.media_type === 'movie' || item.media_type === 'tv') && item.poster_path);
    const rHTML = filtered.map(item => {
        const safeTitle = escapeHTML(item.title || item.name); const posterSrc = item.poster_path ? IMAGE_BASE_URL.replace('w500', 'w200') + item.poster_path : POSTER_PLACEHOLDER;
        let isReleased = false; if (item.release_date || item.first_air_date) { const rd = new Date(item.release_date || item.first_air_date); const td = new Date(); td.setHours(0,0,0,0); isReleased = rd <= td; }
        const wBtn = isReleased ? `<button class="icon-button add-item" data-id="${item.id}" data-type="${item.media_type}" data-list="watched" title="Obejrzane"><svg viewBox="0 0 24 24"><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,16.5L6.5,12L7.91,10.59L11,13.67L16.09,8.59L17.5,10L11,16.5Z"/></svg></button>` : ``;
        return `<div class="search-item" data-id="${item.id}" data-type="${item.media_type}"><img src="${posterSrc}" onerror="this.src='${POSTER_PLACEHOLDER}';"><div class="info"><strong>${safeTitle}</strong><span>${((item.release_date||item.first_air_date) || 'Brak daty').substring(0, 4)}</span></div><div class="actions"><button class="icon-button add-item" data-id="${item.id}" data-type="${item.media_type}" data-list="toWatch"><svg viewBox="0 0 24 24"><path d="M17,3A2,2 0 0,1 19,5V21L12,18L5,21V5C5,3.89 5.9,3 7,3H17M11,14H9V12H11V14M15,14H13V12H15V14M11,10H9V8H11V10M15,10H13V8H15V10Z"/></svg></button>${wBtn}</div></div>`;
    }).join('');
    modalContainer.innerHTML = `<div class="modal-overlay"><div class="modern-modal-wrapper" style="max-width: 700px;"><div class="modal-drag-handle"></div><button class="modal-top-close-btn" title="Zamknij">${ICONS.close}</button><div style="padding: 24px 24px 16px; border-bottom: 1px solid var(--border-color); text-align: center;"><h2 style="margin: 0; font-size: 1.2rem;">Wyniki dla: "${query}"</h2></div><div class="modern-modal-scroll" style="padding: 0;"><div class="all-results-list">${rHTML}</div></div></div></div>`;
    document.getElementById('searchResults').style.display = 'none';
    const modal = modalContainer.querySelector('.modal-overlay'); const close = () => modalContainer.innerHTML = '';
    modal.addEventListener('click', e => { if (e.target === modal) close(); }); modal.querySelector('.modal-top-close-btn').addEventListener('click', close); setupSwipeToClose(modal, close);
    modal.querySelector('.all-results-list').addEventListener('click', (e) => { const addBtn = e.target.closest('.add-item'); const item = e.target.closest('.search-item'); if (addBtn) { handleQuickAddItem(addBtn); close(); } else if (item) { if (item.dataset.id) { openPreviewModal(item.dataset.id, item.dataset.type); close(); } } });
}

function getModalHeaderHTML(item, isAdded) {
    const bgImage = item.backdrop || item.poster || POSTER_PLACEHOLDER;
    const bgFilter = item.backdrop ? '' : 'filter: blur(20px) brightness(0.5); transform: scale(1.1);';
    let rTime = ''; if (item.type === 'movie' && item.runtime) rTime = ` • ${formatRuntime(item.runtime)}`;
    let sBadge = item.type === 'tv' ? getStatusBadge(item.status) : '';
    let addTagBtnHTML = isAdded ? `<button id="modal-manage-tags-btn" class="hero-fav-btn" title="Dodaj Tag"><svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg></button>` : '';

    return `<div class="modal-drag-handle"></div><button class="modal-top-close-btn" title="Zamknij">${ICONS.close}</button><div class="modal-hero-header"><div class="hero-bg-img" style="background-image: url('${bgImage}'); ${bgFilter}"></div><div class="hero-gradient"></div><div class="hero-content"><img src="${item.poster || POSTER_PLACEHOLDER}" class="hero-poster-mini" onerror="this.src='${POSTER_PLACEHOLDER}';"><div class="hero-text"><div class="hero-title-row"><h2 class="hero-title">${escapeHTML(item.title)}</h2><div class="hero-actions-container" style="display:flex; flex-direction:column; gap:8px; flex-shrink:0;"><div id="hero-fav-container"></div>${addTagBtnHTML}</div></div><div class="hero-meta">${item.year}${rTime}${sBadge}</div><div id="trailer-section-container"></div></div></div></div>`;
}

function renderProvidersHTML(providers) {
    if (!providers || providers.length === 0) return '';
    const lHTML = providers.map(p => `<img class="provider-logo" src="${IMAGE_BASE_URL.replace('w500','w92')}${p.logo_path}" alt="${escapeHTML(p.provider_name)}" title="${escapeHTML(p.provider_name)}">`).join('');
    return `<div class="providers-section"><h3>Gdzie obejrzeć?</h3><div class="providers-list">${lHTML}</div><span style="font-size:0.75rem; color:var(--text-secondary); display:block; margin-top:8px;">Dane o platformach dostarcza JustWatch</span></div>`;
}

function renderRecommendationsHTML(recs, type) {
    if (!recs || recs.length === 0) return '';
    const rHTML = recs.map(item => { const pSrc = IMAGE_BASE_URL.replace('w500', 'w200') + item.poster_path; return `<div class="recommendation-item" data-id="${item.id}" data-type="${type}"><img src="${pSrc}" alt="Okładka" loading="lazy" onerror="this.src='${POSTER_PLACEHOLDER}';"><strong>${escapeHTML(item.title || item.name)}</strong></div>`; }).join('');
    return `<div class="recommendations-section"><h3>Polecane tytuły</h3><div class="recommendations-scroller">${rHTML}</div></div>`;
}

async function openPreviewModal(id, type) {
    const dModal = document.getElementById('detailsModalContainer');
dModal.innerHTML = `<div class="modal-overlay"><div class="modern-modal-wrapper"><div class="skeleton-box skeleton-modal-header"></div><div class="skeleton-box skeleton-title"></div><div class="skeleton-box skeleton-text-line"></div><div class="skeleton-box skeleton-text-line"></div><div class="skeleton-box skeleton-text-line short"></div></div></div>`;
    const item = await getItemDetails(id, type);
    if (!item) { dModal.innerHTML = ''; showCustomAlert('Błąd', 'Brak danych.', 'error'); return; }

    const isAlreadyAdded = Object.values(data).flat().some(i => String(i.id) === String(id) && i.type === type);
    const localItem = Object.values(data).flat().find(i => String(i.id) === String(id) && i.type === type);
    if (localItem && localItem.customTags) item.customTags = localItem.customTags;

    let canWatch = true;
    if (item.type === 'tv' && !isSeriesFinished(item)) canWatch = false;
    else if (item.type === 'movie') { if (!item.releaseDate) canWatch = false; else { const t = new Date(); t.setHours(0,0,0,0); const rd = new Date(item.releaseDate); rd.setHours(0,0,0,0); if (rd > t) canWatch = false; } }

   
    let fHTML = isAlreadyAdded ? `<div class="modal-sticky-footer" style="justify-content: center;"><span style="display: flex; align-items: center; gap: 8px; font-weight: 600; color: var(--success-color);"><svg viewBox="0 0 24 24" style="width: 22px; height: 22px; fill: currentColor;"><path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z" /></svg> Tytuł w kolekcji</span></div>` : canWatch ? `<div class="modal-sticky-footer"><button id="previewAddToWatchedBtn" class="modal-btn secondary">Do Obejrzanych</button><button id="previewAddToWatchBtn" class="modal-btn primary">Do Obejrzenia</button></div>` : `<div class="modal-sticky-footer"><button id="previewAddToWatchBtn" class="modal-btn primary" style="width: 100%;">Dodaj do Obejrzenia</button></div>`;
    const tagsHTML = (item.customTags || []).map(t => `<span class="custom-tag">${escapeHTML(t)} <svg class="remove-tag" data-tag="${escapeHTML(t)}" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></span>`).join('');

    // NOWOŚĆ: Generowanie bloku z oceną
    let tmdbRatingHTML = item.tmdbRating && item.tmdbRating > 0 ? `
        <div class="tmdb-rating-wrapper">
            <svg class="tmdb-rating-star" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
            <div class="tmdb-rating-info">
                <div class="tmdb-rating-score">${item.tmdbRating} <span class="max-score">/ 10</span></div>
                <div class="tmdb-rating-label">Ocena TMDb</div>
            </div>
        </div>
    ` : '';
    dModal.innerHTML = `<div class="modal-overlay"><div class="modern-modal-wrapper">${getModalHeaderHTML(item, isAlreadyAdded)}<div class="modern-modal-scroll"><div class="modal-body-content">${tmdbRatingHTML}<div class="genres">${(item.genres || []).map(g => `<span class="genre-tag">${escapeHTML(g)}</span>`).join('')}${tagsHTML}</div><div><h3>Opis</h3>${renderCollapsibleText(item.overview)}</div><div id="providers-container"></div><div id="cast-container"></div><div id="recommendations-container"></div></div></div>${fHTML}</div></div>`;
    const modal = dModal.querySelector('.modal-overlay'); const close = () => { dModal.innerHTML = ''; };
    modal.addEventListener('click', async (e) => {
        if (e.target === modal) { close(); return; }
        const cast = e.target.closest('.cast-member[data-actor-id]'); if (cast) { openActorDetailsModal(cast.dataset.actorId); return; }
        const rec = e.target.closest('.recommendation-item'); if (rec) { openPreviewModal(rec.dataset.id, rec.dataset.type); return; }
        const removeIcon = e.target.closest('.remove-tag');
        if (removeIcon) {
            const tagToRemove = removeIcon.dataset.tag;
            if (localItem) { localItem.customTags = localItem.customTags.filter(t => t !== tagToRemove); await saveData(); }
            openPreviewModal(id, type); return;
        }
    });
    modal.querySelector('.modal-top-close-btn').addEventListener('click', close); setupSwipeToClose(modal, close);

    const mngBtn = modal.querySelector('#modal-manage-tags-btn');
    if(mngBtn) { mngBtn.addEventListener('click', () => { openManageTagsModal(item, () => { openPreviewModal(id, type); }); }); }

    getWatchProviders(id, type).then(p => { const c = document.getElementById('providers-container'); if (c && p) c.innerHTML = renderProvidersHTML(p); });
    getRecommendations(id, type).then(r => { const c = document.getElementById('recommendations-container'); if (c && r.length > 0) c.innerHTML = renderRecommendationsHTML(r, type); });
    getTrailerKey(id, type).then(tk => { if (tk) { const c = document.getElementById('trailer-section-container'); if (c) { c.innerHTML = `<button class="hero-trailer-btn"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> Zwiastun</button>`; c.querySelector('.hero-trailer-btn').onclick = () => openTrailerModal(tk); } } });
    getCredits(id, type).then(c => { const cc = document.getElementById('cast-container'); if (cc && c.length > 0) { const cH = c.map(m => `<div class="cast-member" data-actor-id="${m.id}"><img src="${IMAGE_BASE_URL.replace('w500', 'w200')}${m.profile_path}" loading="lazy" onerror="this.outerHTML = ICONS.person;"><strong>${escapeHTML(m.name)}</strong><span>${escapeHTML(m.character)}</span></div>`).join(''); cc.innerHTML = `<div class="cast-section" style="margin-top:0; padding-top:0; border:none;"><h3>Obsada</h3><div class="cast-scroller">${cH}</div></div>`; } });

    if (!isAlreadyAdded) {
        const wBtn = document.getElementById('previewAddToWatchBtn'); const wdBtn = document.getElementById('previewAddToWatchedBtn');
        if (wBtn) wBtn.onclick = async () => { if (await addItemToList(id, type, 'toWatch')) close(); };
        if (wdBtn) wdBtn.onclick = async () => { if (await addItemToList(id, type, 'watched')) close(); };
    }
}

async function openDetailsModal(id, type) {
    const { listName, item } = getListAndItem(id, type); if (!item) return;

      // DODANO: || item.tmdbRating === undefined
    if (!String(id).startsWith('custom_') && (!item.backdrop || item.vod === undefined || item.tmdbRating === undefined || (type === 'movie' && item.runtime === undefined) || (type === 'tv' && item.status === undefined))) {
        const fd = await getItemDetails(id, type);
        if (fd) {
            item.backdrop = fd.backdrop || item.backdrop; item.poster = fd.poster || item.poster; item.overview = fd.overview || item.overview; item.genres = fd.genres || item.genres; item.releaseDate = fd.releaseDate || item.releaseDate; item.vod = fd.vod || [];
            
            // DODANO: Zapisywanie dociągniętej oceny w bazie
            item.tmdbRating = fd.tmdbRating || item.tmdbRating; 

            if (type === 'tv') { item.status = fd.status !== undefined ? fd.status : item.status; item.nextEpisodeToAir = fd.nextEpisodeToAir !== undefined ? fd.nextEpisodeToAir : item.nextEpisodeToAir; item.seasons = fd.seasons || item.seasons; item.numberOfSeasons = fd.numberOfSeasons || item.numberOfSeasons; item.numberOfEpisodes = fd.numberOfEpisodes || item.numberOfEpisodes; if (!item.progress) item.progress = {}; } else if (type === 'movie') { item.runtime = fd.runtime || item.runtime; }
            await saveData();
        }
    }

    const isToWatch = listName === 'seriesToWatch'; const isWatched = listName.includes('Watched');
    const dModal = document.getElementById('detailsModalContainer');

    let fHTML = '';
    if (isWatched) { fHTML = `<div class="modal-sticky-footer"><button id="saveReviewBtn" class="modal-btn primary">Zapisz Ocenę</button></div>`; }
    else {
        let cw = true; let wMsg = '';
        if (item.type === 'tv' && !isSeriesFinished(item)) { cw = false; wMsg = 'Zakończ serial, aby przenieść do obejrzanych.'; }
        else if (item.type === 'movie') {
            if (!item.releaseDate) { cw = false; wMsg = `Brak daty premiery.`; }
            else { const t = new Date(); t.setHours(0,0,0,0); const rd = new Date(item.releaseDate); rd.setHours(0,0,0,0); if (rd > t) { cw = false; wMsg = `Premiera: ${rd.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}.`; } }
        }
        if (!cw) fHTML = `<div class="modal-sticky-footer" style="justify-content: center; text-align: center;"><span style="color: var(--info-color); font-size: 0.85rem; font-weight: 600; display:flex; align-items:center; gap:6px; flex-direction:column;"><svg viewBox="0 0 24 24" style="width:22px; height:22px; fill:currentColor;"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg> <span>${wMsg}</span></span></div>`;
        else fHTML = `<div class="modal-sticky-footer"><button id="moveToWatchedBtn" class="modal-btn primary">Oznacz jako Obejrzane</button></div>`;
    }

    let nxBanner = '';
    if (isToWatch) {
        const nextEp = getNextEpisodeStr(item);
        if (nextEp) nxBanner = `<div style="background: color-mix(in srgb, var(--primary-color) 15%, transparent); padding: 12px; border-radius: var(--radius-md); margin-bottom: 16px; border: 1px solid color-mix(in srgb, var(--primary-color) 30%, transparent); font-weight:bold; color: var(--text-color); display:flex; align-items:center; gap:8px;"><svg viewBox="0 0 24 24" style="width:20px; height:20px; fill:var(--primary-color)"><path d="M8 5v14l11-7z"/></svg> Następny do obejrzenia: <span style="color:var(--primary-color)">${nextEp}</span></div>`;
        else if (!isSeriesFinished(item)) {
            const aStr = item.nextEpisodeToAir ? getNextAirDateString(item.nextEpisodeToAir) : null;
            if(aStr) nxBanner = `<div style="background: color-mix(in srgb, var(--info-color) 15%, transparent); padding: 12px; border-radius: var(--radius-md); margin-bottom: 16px; border: 1px solid color-mix(in srgb, var(--info-color) 30%, transparent); font-weight:bold; color: var(--text-color); display:flex; align-items:center; gap:8px;"><svg viewBox="0 0 24 24" style="width:20px; height:20px; fill:var(--info-color)"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg> Jesteś na bieżąco! <span style="color:var(--info-color)">Premiera: ${aStr}</span></div>`;
            else nxBanner = `<div style="background: color-mix(in srgb, var(--text-secondary) 15%, transparent); padding: 12px; border-radius: var(--radius-md); margin-bottom: 16px; border: 1px solid color-mix(in srgb, var(--text-secondary) 30%, transparent); font-weight:bold; color: var(--text-color); display:flex; align-items:center; gap:8px;">⏳ Jesteś na bieżąco! Brak daty.</div>`;
        }
    }

    const tagsHTML = (item.customTags || []).map(t => `<span class="custom-tag">${escapeHTML(t)} <svg class="remove-tag" data-tag="${escapeHTML(t)}" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></span>`).join('');

        let rewatchHTML = '';
    if (isWatched) {
        if (!item.watchDates) item.watchDates = [item.dateAdded || Date.now()];
        const datesList = item.watchDates.map((ts, idx) => {
            const dateStr = new Date(ts).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
            return `<div class="rewatch-item"><span class="rewatch-item-date"><svg viewBox="0 0 24 24" style="width:20px; height:20px; fill:var(--info-color);"><path d="M12 20a8 8 0 0 0 8-8 8 8 0 0 0-8-8 8 8 0 0 0-8 8 8 8 0 0 0 8 8m0-18a10 10 0 0 1 10 10 10 10 0 0 1-10 10A10 10 0 0 1 2 12 10 10 0 0 1 12 2m.5 5v5.25l4.5 2.67-.75 1.23L11 13V7h1.5z"/></svg> ${dateStr}</span><button class="icon-button delete-rewatch-btn" data-idx="${idx}" title="Usuń ten seans">${ICONS.delete}</button></div>`;
        }).join('');
        rewatchHTML = `<div class="rewatch-section"><div class="rewatch-accordion-header"><h3 class="rewatch-accordion-title"><svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2.5;stroke-linecap:round;"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>Historia seansów<span class="rewatch-badge">${item.watchDates.length}</span></h3><svg class="rewatch-chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg></div><div class="rewatch-accordion-content"><div class="rewatch-list">${datesList}<button id="add-rewatch-btn" class="rewatch-add-btn"><svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>Obejrzano dzisiaj</button></div></div></div>`;
    }

    // NOWOŚĆ: Generowanie bloku z oceną
    let tmdbRatingHTML = item.tmdbRating && item.tmdbRating > 0 ? `
        <div class="tmdb-rating-wrapper">
            <svg class="tmdb-rating-star" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
            <div class="tmdb-rating-info">
                <div class="tmdb-rating-score">${item.tmdbRating} <span class="max-score">/ 10</span></div>
                <div class="tmdb-rating-label">Ocena TMDb</div>
            </div>
        </div>
    ` : '';
    dModal.innerHTML = `<div class="modal-overlay"><div class="modern-modal-wrapper">${getModalHeaderHTML(item, true)}<div class="modern-modal-scroll"><div class="modal-body-content">${nxBanner}${tmdbRatingHTML}<div class="genres">${(item.genres || []).map(g => `<span class="genre-tag">${escapeHTML(g)}</span>`).join('')}${tagsHTML}</div><div><h3>Opis</h3>${renderCollapsibleText(item.overview)}</div><div id="providers-container"></div><div id="seasons-container"></div><div id="cast-container"></div><div id="recommendations-container"></div>${rewatchHTML}${isWatched ? `<div class="review-card" style="margin-top: 24px;"><h3>Twoja ocena</h3><div class="star-rating-interactive"></div><div class="rating-controls"><button id="rating-decrement">-</button><span id="rating-display" class="rating-display"></span><button id="rating-increment">+</button></div><textarea id="reviewText" class="modern-textarea" placeholder="Napisz co myślisz..."></textarea></div>` : ''}</div></div>${fHTML}</div></div>`;


    const modal = dModal.querySelector('.modal-overlay');
    const mngBtn = modal.querySelector('#modal-manage-tags-btn');
    if(mngBtn) { mngBtn.addEventListener('click', () => { openManageTagsModal(item, () => { openDetailsModal(id, type); }); }); }

    if (isWatched) { const rTx = document.getElementById('reviewText'); if (rTx) rTx.value = item.review || ''; }
    const fC = modal.querySelector('#hero-fav-container');
    if (fC) {
        fC.innerHTML = `<button id="modal-favorite-btn" class="hero-fav-btn ${item.isFavorite ? 'active' : ''}">${ICONS.star}</button>`;
        fC.querySelector('#modal-favorite-btn').addEventListener('click', async (e) => { item.isFavorite = !item.isFavorite; e.currentTarget.classList.toggle('active', item.isFavorite); await saveData(); renderList(data[listName], listName, true); });
    }

    const close = () => { dModal.innerHTML = ''; renderList(data[listName], listName, true); };
    modal.addEventListener('click', async (e) => {
        if (e.target === modal) { close(); return; }
        const rewatchHeader = e.target.closest('.rewatch-accordion-header');
        if (rewatchHeader) { triggerHaptic('light'); rewatchHeader.parentElement.classList.toggle('expanded'); return; }
        const cast = e.target.closest('.cast-member[data-actor-id]'); if (cast) { openActorDetailsModal(cast.dataset.actorId); return; }
        const rec = e.target.closest('.recommendation-item'); if (rec) { openPreviewModal(rec.dataset.id, rec.dataset.type); return; }
        const removeIcon = e.target.closest('.remove-tag');
        if (removeIcon) { const tagToRemove = removeIcon.dataset.tag; item.customTags = item.customTags.filter(t => t !== tagToRemove); await saveData(); openDetailsModal(id, type); return; }
        const addRewatchBtn = e.target.closest('#add-rewatch-btn');
        if (addRewatchBtn) { triggerHaptic('success'); item.watchDates.push(Date.now()); await saveData(); openDetailsModal(id, type); showCustomAlert('Świetnie!', 'Dodano dzisiejszy seans do pamiętnika.', 'success'); return; }
        const delRewatchBtn = e.target.closest('.delete-rewatch-btn');
        if (delRewatchBtn) {
            if (item.watchDates.length <= 1) { showCustomAlert('Uwaga', 'Nie możesz usunąć jedynego seansu z wpisu.', 'info'); return; }
            const cf = await showCustomConfirm('Usunąć seans?', 'Czy na pewno chcesz usunąć tę datę z historii oglądania?');
            if (cf) { const idx = parseInt(delRewatchBtn.dataset.idx); item.watchDates.splice(idx, 1); await saveData(); openDetailsModal(id, type); } return;
        }
    });
    modal.querySelector('.modal-top-close-btn').addEventListener('click', close); setupSwipeToClose(modal, close);

    if (!String(item.id).startsWith('custom_')) {
        getWatchProviders(id, type).then(p => { const c = document.getElementById('providers-container'); if (c && p) c.innerHTML = renderProvidersHTML(p); });
        getRecommendations(id, type).then(r => { const c = document.getElementById('recommendations-container'); if (c && r.length > 0) c.innerHTML = renderRecommendationsHTML(r, type); });
        getTrailerKey(id, type).then(tk => { if (tk) { const c = document.getElementById('trailer-section-container'); if (c) { c.innerHTML = `<button class="hero-trailer-btn"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> Zwiastun</button>`; c.querySelector('.hero-trailer-btn').onclick = () => openTrailerModal(tk); } } });
    }
    getCredits(id, type).then(c => { const cc = document.getElementById('cast-container'); if (cc && c.length > 0) { const cH = c.map(m => `<div class="cast-member" data-actor-id="${m.id}"><img src="${IMAGE_BASE_URL.replace('w500', 'w200')}${m.profile_path}" loading="lazy" onerror="this.outerHTML = ICONS.person;"><strong>${escapeHTML(m.name)}</strong><span>${escapeHTML(m.character)}</span></div>`).join(''); cc.innerHTML = `<div class="cast-section" style="margin-top:0; padding-top:0; border:none;"><h3>Obsada</h3><div class="cast-scroller">${cH}</div></div>`; } });

    if (isToWatch) populateAndRenderSeriesSections(item, document.getElementById('seasons-container'));

    if (isWatched) {
        setupInteractiveStars(item);
        const sv = document.getElementById('saveReviewBtn');
        if (sv) sv.onclick = async () => { const rat = document.querySelector('.star-rating-interactive'); item.rating = rat ? parseFloat(rat.dataset.rating) : null; item.review = document.getElementById('reviewText').value; await saveData(); close(); showCustomAlert('Zapisano!', `Ocena zaktualizowana.`, 'success'); };
    } else {
        const mv = document.getElementById('moveToWatchedBtn');
        if (mv) mv.onclick = async () => { await handleMoveItem(id, type); close(); };
    }
}

function openTrailerModal(tk) {
    const tc = document.getElementById('trailerModalContainer'); const orig = window.location.protocol === 'file:' ? '' : `&origin=${window.location.origin}`;
    tc.innerHTML = `<div id="trailerModalOverlay"><div id="trailerModalContent"><button class="trailer-close-btn" title="Zamknij">${ICONS.close}</button><div class="video-wrapper"><iframe src="https://www.youtube-nocookie.com/embed/${tk}?autoplay=1&rel=0&modestbranding=1&playsinline=1${orig}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div></div></div>`;
    const o = tc.querySelector('#trailerModalOverlay');
    const cl = () => { const i = tc.querySelector('iframe'); if (i) i.src = ''; tc.innerHTML = ''; };
    o.addEventListener('click', e => { if (e.target === o || e.target.closest('.trailer-close-btn')) cl(); });
}

function populateAndRenderSeriesSections(item, container) {
    if (String(item.id).startsWith('custom_')) { container.innerHTML = `<div class="seasons-section" style="margin-top:0; padding-top:0; border:none;"><h3>Postęp oglądania</h3><p style="color: var(--text-secondary);">Brak wsparcia dla wpisów ręcznych.</p></div>`; return; }
    if (!item.seasons) {
        container.innerHTML = `<div class="seasons-section" style="margin-top:0; padding-top:0; border:none;"><h3>Postęp oglądania</h3><p class="loading-episodes">Aktualizowanie...</p></div>`;
        getItemDetails(item.id, item.type).then(async fd => {
            if (fd) { item.seasons = fd.seasons || item.seasons; item.numberOfSeasons = fd.numberOfSeasons || item.numberOfSeasons; item.numberOfEpisodes = fd.numberOfEpisodes || item.numberOfEpisodes; item.status = fd.status !== undefined ? fd.status : item.status; item.nextEpisodeToAir = fd.nextEpisodeToAir !== undefined ? fd.nextEpisodeToAir : item.nextEpisodeToAir; if (!item.progress) item.progress = {}; await saveData(); renderSeasonsProgress(item, container); }
            else container.innerHTML = `<div class="seasons-section"><h3>Postęp oglądania</h3><p style="color:var(--primary-color)">Błąd.</p></div>`;
        }); return;
    }
    renderSeasonsProgress(item, container);
}

function renderSeasonsProgress(item, container) {
    if (!item.seasons || item.seasons.length === 0) { container.innerHTML = `<div class="seasons-section" style="margin-top:0; padding-top:0; border:none;"><h3>Postęp oglądania</h3><p style="color: var(--text-secondary);">Brak sezonów.</p></div>`; return; }
    if (!item.progress) item.progress = {};
    const sHTML = item.seasons.map(s => `<div class="season-details" data-season-number="${s.season_number}"><div class="season-summary"><h4>${escapeHTML(s.name)}</h4><span class="season-progress">${item.progress[s.season_number]?.length || 0} / ${s.episode_count}</span></div><div class="episodes-list"><div class="loading-episodes">Ładowanie...</div></div></div>`).join('');
    container.innerHTML = `<div class="seasons-section" style="margin-top:0; padding-top:0; border:none;"><h3>Postęp oglądania</h3>${sHTML}</div>`;
    container.querySelectorAll('.season-summary').forEach(s => {
        s.addEventListener('click', async (e) => {
            const sDiv = e.currentTarget.parentElement; const epDiv = sDiv.querySelector('.episodes-list'); const sNum = sDiv.dataset.seasonNumber;
            if (epDiv.style.display === 'block') epDiv.style.display = 'none';
            else {
                epDiv.style.display = 'block';
                if (!epDiv.dataset.loaded) {
                    const sd = await getSeasonDetails(item.id, sNum);
                    if (sd && sd.episodes) { renderEpisodes(item, sd, epDiv); epDiv.dataset.loaded = 'true'; }
                    else epDiv.innerHTML = `<div class="loading-episodes" style="color: var(--primary-color)">Błąd.</div>`;
                }
            }
        });
    });
}

function renderEpisodes(item, seasonData, container) {
    const sNum = seasonData.season_number; if (!item.progress[sNum]) item.progress[sNum] = [];
    const td = new Date(); td.setHours(0,0,0,0);
    let blockFrom = 9999; if (item.nextEpisodeToAir && item.nextEpisodeToAir.season === sNum) { const ad = new Date(item.nextEpisodeToAir.date); if (ad > td) blockFrom = item.nextEpisodeToAir.episode; }

    const epHTML = seasonData.episodes.map(ep => {
        const isC = item.progress[sNum].includes(ep.episode_number); const uId = `s${sNum}-ep${ep.episode_number}`;
        const rt = ep.runtime ? `<span class="episode-runtime">${ep.runtime} min</span>` : '';
        let isFut = false; let fw = '';
        if (ep.episode_number >= blockFrom) { isFut = true; const ed = new Date(ep.air_date); fw = `<div style="font-size:0.75rem; color:var(--primary-color); margin-top:2px;">Premiera: ${ed > td ? ed.toLocaleDateString('pl-PL', {day:'numeric',month:'short'}) : 'wkrótce'}</div>`; }
        else if (ep.air_date) { const ed = new Date(ep.air_date); if(ed > td) { isFut = true; fw = `<div style="font-size:0.75rem; color:var(--primary-color); margin-top:2px;">Premiera: ${ed.toLocaleDateString('pl-PL', {day:'numeric',month:'short'})}</div>`; } }
        return `<div class="episode-item" style="${isFut ? 'opacity: 0.6; pointer-events: none;' : ''}"><div class="episode-info"><div class="episode-title-line"><div class="episode-title-group"><span class="episode-number">${ep.episode_number}.</span><span class="episode-title">${escapeHTML(ep.name)}</span></div>${rt}</div>${renderCollapsibleText(ep.overview)}${fw}</div><label class="episode-status-toggle" for="${uId}"><input type="checkbox" id="${uId}" data-episode-number="${ep.episode_number}" ${isC ? 'checked' : ''} ${isFut ? 'disabled' : ''}><svg class="icon icon-watched" viewBox="0 0 24 24"><path d="M12,4.5C7,4.5 2.73,7.61 1,12c1.73,4.39 6,7.5 11,7.5s9.27-3.11 11-7.5C21.27,7.61 17,4.5 12,4.5M12,17a5,5 0 1,1 0-10,5 5 0 0,1 0,10m0-8a3,3 0 1,0 0,6,3 3 0 0,0 0-6Z"/></svg><svg class="icon icon-unwatched" viewBox="0 0 24 24"><path d="M11.83,9.17C12.2,9.06 12.59,9 13,9a4,4 0 0,1 4,4c0,0.41-0.06,0.8-0.17,1.17L19.83,17.17C21.5,15.82 22.8,14 23.5,12C21.83,8.44 17.75,6 13,6c-1.55,0-3.04,0.33-4.38,0.9L11.83,9.17M13,4.5C18,4.5 22.27,7.61 24,12c-0.69,1.66-1.7,3.16-2.92,4.33L18.6,13.87C18.85,13.29 19,12.66 19,12a4,4 0 0,0-4-4c-0.66,0-1.29,0.15-1.87,0.4L10.6,5.92C11.39,4.72 12.56,4.5 13,4.5M3.27,4.27l1.59,1.59C3.15,7.45 1.83,9.53 1,12c1.83,3.56 5.75,6 10.5,6c1.76,0 3.44-0.44 5-1.18l2.18,2.18l1.41-1.41L4.68,2.86L3.27,4.27M7.53,9.8l1.55,1.55c-0.05,0.21-0.08,0.42-0.08,0.65a2.5,2.5 0 0,0 2.5,2.5c0.23,0 0.44-0.03 0.65-0.08l1.55,1.55C11.7,16.84 10.9,17 10,17a4.5,4.5 0 0,1-4.5-4.5c0-0.9,0.16-1.7,0.47-2.47Z"/></svg></label></div>`;
    }).join('');

    const avEps = seasonData.episodes.filter(ep => { const ed = ep.air_date ? new Date(ep.air_date) : null; return (!ed || ed <= td) && ep.episode_number < blockFrom; });
    const allW = item.progress[sNum].length >= avEps.length && avEps.length > 0;

    container.innerHTML = `<div class="season-actions"><button class="season-toggle-all-btn" data-action="toggle-all">${allW ? 'Odznacz obejrzane' : 'Zaznacz wydane'}</button></div>${epHTML}`;

    container.addEventListener('change', async e => {
        if (e.target.type === 'checkbox') {
            const epNum = parseInt(e.target.dataset.episodeNumber);
            if (e.target.checked) {
                let hasUnch = false; for(let i=1; i<epNum; i++) { if(!item.progress[sNum].includes(i)) hasUnch = true; }
                if(hasUnch) {
                    if(await showCustomConfirm('Zaznaczyć poprzednie?', 'Zaznaczyć też wszystkie poprzednie odcinki z tego sezonu?')) {
                        for(let i=1; i<=epNum; i++) if (!item.progress[sNum].includes(i)) item.progress[sNum].push(i);
                        container.querySelectorAll('input[type="checkbox"]').forEach(cb => { if(parseInt(cb.dataset.episodeNumber) <= epNum && !cb.disabled) cb.checked = true; });
                    } else if (!item.progress[sNum].includes(epNum)) item.progress[sNum].push(epNum);
                } else if (!item.progress[sNum].includes(epNum)) item.progress[sNum].push(epNum);
            } else item.progress[sNum] = item.progress[sNum].filter(ep => ep !== epNum);

            await saveData(); updateSeasonProgressUI(item, sNum); renderList(data['seriesToWatch'], 'seriesToWatch', true);
            const totW = Object.values(item.progress).reduce((acc, arr) => acc + arr.length, 0);
            if(totW >= item.numberOfEpisodes && !item.nextEpisodeToAir && isSeriesFinished(item)) { setTimeout(async () => { if(await showCustomConfirm('Gratulacje! 🎉', 'Obejrzałeś cały serial. Przenieść do obejrzanych?')) { await handleMoveItem(item.id, 'tv'); document.getElementById('detailsModalContainer').innerHTML = ''; } }, 400); }
        }
    });

    container.querySelector('.season-toggle-all-btn').addEventListener('click', async e => {
        if (allW) { item.progress[sNum] = []; container.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false); }
        else { item.progress[sNum] = avEps.map(ep => ep.episode_number); container.querySelectorAll('input[type="checkbox"]:not(:disabled)').forEach(cb => cb.checked = true); }
        await saveData(); updateSeasonProgressUI(item, sNum); e.target.textContent = allW ? 'Zaznacz wydane' : 'Odznacz obejrzane'; renderList(data['seriesToWatch'], 'seriesToWatch', true);
        if(!allW) { const totW = Object.values(item.progress).reduce((acc, arr) => acc + arr.length, 0); if(totW >= item.numberOfEpisodes && !item.nextEpisodeToAir && isSeriesFinished(item)) { setTimeout(async () => { if(await showCustomConfirm('Ukończono! 🎉', 'Przenieść do obejrzanych?')) { await handleMoveItem(item.id, 'tv'); document.getElementById('detailsModalContainer').innerHTML = ''; } }, 400); } }
    });
}

function updateSeasonProgressUI(item, sNum) { const sd = document.querySelector(`.season-details[data-season-number="${sNum}"]`); if (sd) { const p = sd.querySelector('.season-progress'); const tot = p.textContent.split('/')[1].trim(); p.textContent = `${item.progress[sNum]?.length || 0} / ${tot}`; } }

function openCustomAddModal() {
    const mHTML = `<div class="modal-overlay" id="customAddModal"><div class="modern-modal-wrapper" style="max-width: 450px;"><div class="modal-drag-handle"></div><button class="modal-top-close-btn" title="Zamknij">${ICONS.close}</button><div class="modern-modal-scroll" style="padding: 24px;"><h3 style="margin: 0 0 20px 0; font-size: 1.3rem; text-align: center;">Dodaj ręcznie</h3><form id="custom-add-form"><div class="custom-add-group"><label class="custom-add-label">Tytuł</label><input type="text" id="custom-title" class="custom-input" placeholder="Wpisz nazwę..." required></div><div class="custom-add-group"><label class="custom-add-label">Rok produkcji</label><input type="number" id="custom-year" class="custom-input" placeholder="Np. 2024"></div><div class="custom-add-group"><label class="custom-add-label">URL plakatu</label><input type="url" id="custom-poster" class="custom-input" placeholder="https://..."></div><div class="custom-add-group"><label class="custom-add-label">Typ nośnika</label><div class="modern-radio-group"><label class="modern-radio-label"><input type="radio" name="custom-type" value="movie" checked><span>Film</span></label><label class="modern-radio-label"><input type="radio" name="custom-type" value="tv"><span>Serial</span></label></div></div><div class="custom-add-group"><label class="custom-add-label">Lista</label><div class="modern-radio-group"><label class="modern-radio-label"><input type="radio" name="custom-list" value="toWatch" checked><span>Do obejrzenia</span></label><label class="modern-radio-label"><input type="radio" name="custom-list" value="watched"><span>Obejrzane</span></label></div></div><button type="submit" class="modal-btn primary" style="width:100%; margin-top: 10px;">Zapisz tytuł w bibliotece</button></form></div></div></div>`;
    const c = document.getElementById('detailsModalContainer'); c.innerHTML = mHTML;
    const modal = c.querySelector('.modal-overlay'); const f = c.querySelector('#custom-add-form'); const close = () => c.innerHTML = '';
    modal.addEventListener('click', e => { if (e.target === modal) close(); }); modal.querySelector('.modal-top-close-btn').addEventListener('click', close); setupSwipeToClose(modal, close);

    f.addEventListener('submit', async e => {
        e.preventDefault(); const t = escapeHTML(document.getElementById('custom-title').value.trim());
        if (!t) { showCustomAlert('Błąd', 'Tytuł jest wymagany.', 'error'); return; }
        const type = document.querySelector('input[name="custom-type"]:checked').value; const lst = document.querySelector('input[name="custom-list"]:checked').value;
        const tList = (type === 'movie' ? 'movies' : 'series') + (lst === 'toWatch' ? 'ToWatch' : 'Watched');
        const nIt = { id: `custom_${Date.now()}`, title: t, year: escapeHTML(document.getElementById('custom-year').value) || '', poster: escapeHTML(document.getElementById('custom-poster').value.trim()) || null, type: type, overview: 'Dodano ręcznie.', genres: [], isFavorite: false, customTags: [], dateAdded: Date.now(), releaseDate: null };
        if (lst === 'toWatch') { const mx = data[tList].length > 0 ? Math.max(...data[tList].map(i => i.customOrder || 0)) : -1; nIt.customOrder = mx + 1; } else { nIt.rating = null; nIt.review = ""; nIt.watchDates = [Date.now()]; }
        if (type === 'movie') nIt.runtime = null;
        data[tList].unshift(nIt); await saveData(); switchMainTab(type === 'movie' ? 'movies' : 'series'); switchSubTab(lst); close(); showCustomAlert('Gotowe', `Dodano.`, 'success');
    });
}

async function openActorDetailsModal(actorId) {
    const c = document.getElementById('actorModalContainer');
    c.innerHTML = `<div class="modal-overlay actor-modal-overlay"><div class="modern-modal-wrapper"><div style="display:flex; flex-direction:column; align-items:center; margin-top:30px;"><div class="skeleton-box" style="width:150px; height:150px; border-radius:50%; margin-bottom:20px;"></div><div class="skeleton-box skeleton-title" style="width:200px; margin:0 auto 20px;"></div><div class="skeleton-box skeleton-text-line"></div><div class="skeleton-box skeleton-text-line"></div><div class="skeleton-box skeleton-text-line short"></div></div></div></div>`;
    const ad = await getActorDetails(actorId);
    if (!ad) { c.innerHTML = `<div class="modal-overlay actor-modal-overlay"><div class="actor-modal-content" style="text-align:center; color: var(--primary-color);">Błąd pobierania danych.</div></div>`; setTimeout(() => c.innerHTML = '', 2000); return; }

    const sName = escapeHTML(ad.name);
    const kfHTML = ad.known_for.map(i => { const p = i.poster_path ? IMAGE_BASE_URL.replace('w500', 'w200') + i.poster_path : POSTER_PLACEHOLDER; const t = escapeHTML(i.title || i.name); return `<div class="known-for-item" data-id="${i.id}" data-type="${i.media_type}"><img src="${p}" alt="${t}" onerror="this.src='${POSTER_PLACEHOLDER}';"><strong>${t}</strong></div>`; }).join('');

    c.innerHTML = `<div class="modal-overlay actor-modal-overlay"><div class="modern-modal-wrapper" style="padding:0; border-radius:var(--radius-lg);"><div class="modal-drag-handle"></div><button class="modal-top-close-btn" title="Zamknij" style="top:12px; right:12px;">${ICONS.close}</button><div class="modern-modal-scroll" style="padding: 24px;"><div class="actor-header">${ad.profile_path ? `<img src="${IMAGE_BASE_URL}${ad.profile_path}" alt="${sName}">` : ICONS.person.replace('class="placeholder-svg"', 'class="placeholder-svg" style="width:150px; height:150px; border-radius:50%;"')}<h2>${sName}</h2></div><div class="actor-bio">${renderCollapsibleText(ad.biography)}</div>${kfHTML ? `<div class="known-for-section"><h3>Znany/a z</h3><div class="known-for-scroller">${kfHTML}</div></div>` : ''}${ad.full_filmography && ad.full_filmography.length > 0 ? `<div class="filmography-controls"><button id="toggle-filmography-btn" class="filmography-button">Pokaż pełną filmografię</button></div><div id="full-filmography-container" style="display: none;"></div>` : ''}</div></div></div>`;

    const fgBtn = document.getElementById('toggle-filmography-btn');
    if (fgBtn) {
        fgBtn.addEventListener('click', () => {
            const fc = document.getElementById('full-filmography-container');
            if (fc.style.display === 'block') { fc.style.display = 'none'; fgBtn.textContent = 'Pokaż pełną filmografię'; }
            else {
                if (fc.innerHTML === '') {
                     fc.innerHTML = ad.full_filmography.map(i => {
                        const yr = (i.release_date || i.first_air_date || '----').substring(0, 4); const pst = i.poster_path ? IMAGE_BASE_URL.replace('w500', 'w92') + i.poster_path : POSTER_PLACEHOLDER;
                        const isAdded = Object.values(data).flat().some(it => String(it.id) === String(i.id)); const t = escapeHTML(i.title || i.name);
                        const act = isAdded ? `<span class="already-added-info"><svg viewBox="0 0 24 24"><path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z" /></svg> Już na liście</span>` : `<button class="add-filmography-item-btn" data-id="${i.id}" data-type="${i.media_type}">Dodaj do obejrzenia</button>`;
                        return `<div class="filmography-item"><div class="filmography-item-header"><img src="${pst}" onerror="this.src='${POSTER_PLACEHOLDER}';"><div class="filmography-item-info"><strong>${t}</strong><span>${yr}</span><span class="character">jako: ${escapeHTML(i.character) || 'Brak informacji'}</span></div></div><div class="filmography-item-details">${renderCollapsibleText(i.overview)}<div class="filmography-actions" style="margin-top:10px;">${act}</div></div></div>`;
                     }).join('');
                }
                fc.style.display = 'block'; fgBtn.textContent = 'Ukryj filmografię';
            }
        });
    }

    const modal = c.querySelector('.modal-overlay'); const close = () => c.innerHTML = ''; setupSwipeToClose(modal, close);
    modal.addEventListener('click', e => {
        if (e.target === modal) close();
        const kfItem = e.target.closest('.known-for-item'); if (kfItem && kfItem.dataset.id && kfItem.dataset.type) { openPreviewModal(kfItem.dataset.id, kfItem.dataset.type); return; }
        const h = e.target.closest('.filmography-item-header'); if(h) { const d = h.nextElementSibling; if(d && d.classList.contains('filmography-item-details')) { d.style.display = d.style.display === 'block' ? 'none' : 'block'; } }
        const add = e.target.closest('.add-filmography-item-btn'); if(add) addItemFromFilmography(add);
    });
    modal.querySelector('.modal-top-close-btn').addEventListener('click', close);
}

async function addItemFromFilmography(btn) {
    btn.disabled = true; btn.textContent = 'Dodawanie...'; const { id, type } = btn.dataset;
    const det = await getItemDetails(id, type);
    if (!det) { btn.textContent = 'Błąd!'; showCustomAlert('Błąd', 'Brak danych.', 'error'); setTimeout(() => { btn.textContent = 'Dodaj do obejrzenia'; btn.disabled = false; }, 2000); return; }
    det.dateAdded = Date.now(); det.customTags = [];
    const tl = (type === 'movie' ? 'movies' : 'series') + 'ToWatch';
    const mx = data[tl].length > 0 ? Math.max(...data[tl].map(i => i.customOrder || 0)) : -1; det.customOrder = mx + 1;
    data[tl].unshift(det); await saveData();
    btn.parentElement.innerHTML = `<span class="already-added-info"><svg viewBox="0 0 24 24"><path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z" /></svg> Dodano!</span>`;
    showCustomAlert('Dodano', `"${escapeHTML(det.title)}" w planowanych.`, 'success');
}

function setupInteractiveStars(item) {
    const container = document.querySelector('.star-rating-interactive'); if(!container) return;
    const rd = document.getElementById('rating-display'); const decBtn = document.getElementById('rating-decrement'); const incBtn = document.getElementById('rating-increment');
    let cr = item.rating || 0; const sP = "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z";
    for(let i=1; i<=5; i++){ const s = document.createElement('div'); s.className = 'star'; s.innerHTML = `<svg class="star-background" viewBox="0 0 24 24"><path d="${sP}"/></svg><svg class="star-foreground" viewBox="0 0 24 24"><path d="${sP}"/></svg>`; container.appendChild(s); }
    const updUI = (rat) => { cr = rat; container.dataset.rating = cr; container.querySelectorAll('.star-foreground').forEach((st, idx) => { const sc = cr - idx; if (sc >= 1) st.style.clipPath = 'inset(0 0 0 0)'; else if (sc > 0) st.style.clipPath = `inset(0 ${100 - sc * 100}% 0 0)`; else st.style.clipPath = 'inset(0 100% 0 0)'; }); rd.textContent = `${cr.toFixed(1)} / 5.0`; decBtn.disabled = cr <= 0; incBtn.disabled = cr >= 5; };
    const calcEvt = (e) => { const r = container.getBoundingClientRect(); const mx = e.clientX - r.left; const rw = (mx / r.width) * 5; return Math.max(0, Math.min(5, Math.round(rw * 2) / 2)); };
    container.addEventListener('mousemove', e => updUI(calcEvt(e))); container.addEventListener('mouseleave', () => updUI(parseFloat(container.dataset.rating))); container.addEventListener('click', e => updUI(calcEvt(e)));
    decBtn.addEventListener('click', () => { let r = parseFloat(container.dataset.rating); if (r > 0) updUI(r - 0.5); }); incBtn.addEventListener('click', () => { let r = parseFloat(container.dataset.rating); if (r < 5) updUI(r + 0.5); });
    updUI(cr);
}

// ==========================================
// 11. ZARZĄDZANIE DANYMI I SYNCHRONIZACJA
// ==========================================
async function saveData() { try { await db.set('mainState', { data, viewState }); } catch { showCustomAlert('Błąd Krytyczny', 'Nie można zapisać danych.', 'error'); } }

async function loadData() {
    let saved = await db.get('mainState');
    if (saved) { data = saved.data || data; viewState = saved.viewState || viewState; }
    else {
        const old = localStorage.getItem('penguinFlixData_v2') || localStorage.getItem('penguinFlixData_v1') || localStorage.getItem('cineLogData_v12');
        if (old) { try { const p = JSON.parse(old); data = p.data || p || data; viewState = p.viewState || viewState; await saveData(); localStorage.removeItem('penguinFlixData_v2'); } catch {} }
    }
    migrateData(data);
}

function migrateData(dt) {
    Object.keys(dt).forEach(k => {
        if(Array.isArray(dt[k])) {
            dt[k].forEach(i => {
                if (i.dateAdded === undefined) i.dateAdded = Date.now() - Math.floor(Math.random()*100000);
                if (i.isFavorite === undefined) i.isFavorite = false;
                if (!i.customTags) i.customTags = [];
                if (i.poster && i.poster.startsWith('/')) i.poster = IMAGE_BASE_URL + i.poster;
            });
        }
    });
    ['moviesWatched', 'seriesWatched'].forEach(k => {
        if (dt[k]) { dt[k].forEach(i => { if (!i.watchDates) i.watchDates = [i.dateAdded || Date.now()]; }); }
    });
    ['moviesToWatch', 'seriesToWatch'].forEach(k => {
        if (dt[k] && dt[k].length > 0 && dt[k][0].customOrder === undefined) dt[k].forEach((i, idx) => { i.customOrder = idx; });
    });
    if (viewState.activeMainTab === undefined) viewState.activeMainTab = 'movies';
    if (viewState.moviesSubTab === undefined) viewState.moviesSubTab = 'toWatch';
    if (viewState.seriesSubTab === undefined) viewState.seriesSubTab = 'toWatch';
    if (viewState.globalViewMode === undefined) viewState.globalViewMode = 'list';
    ['moviesToWatch', 'moviesWatched', 'seriesToWatch', 'seriesWatched'].forEach(k => {
        if (viewState[k] && viewState[k].displayLimit === undefined) viewState[k].displayLimit = 30;
        if (viewState[k] && viewState[k].filterByCustomTag === undefined) viewState[k].filterByCustomTag = 'all';
        if (viewState[k] && viewState[k].filterByVod === undefined) viewState[k].filterByVod = 'all';
    });
}

function isDataEmpty() { return Object.values(data).every(list => !list || list.length === 0); }

function backupData() {
    if (isDataEmpty()) { showCustomAlert('Uwaga', 'Brak danych do eksportu.', 'info'); return; }
    const str = JSON.stringify({ data, viewState }, null, 2); const b = new Blob([str], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `penguinflix_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(a.href); showCustomAlert('Sukces', 'Pobrano kopie zapasową.', 'success');
}

async function restoreData(e) {
    const f = e.target.files[0]; if (!f) return;
    const cf = await showCustomConfirm('Przywracanie kopii', 'Ta operacja nadpisze obecne dane. Kontynuować?');
    if (!cf) { e.target.value = ''; return; }
    const r = new FileReader();
    r.onload = async (evt) => {
        try {
            const res = JSON.parse(evt.target.result);
            if (res.data && res.data.moviesToWatch !== undefined) {
                viewState = res.viewState || viewState;
                viewState.activeMainTab = 'movies'; viewState.moviesSubTab = 'toWatch';
                migrateData(res.data); data = res.data; await saveData();
                switchMainTab('movies'); switchSubTab('toWatch');
                showCustomAlert('Sukces!', `Przywrócono dane z pliku "${f.name}".`, 'success');
            } else throw new Error();
        } catch { showCustomAlert('Błąd', 'Zły format pliku.', 'error'); }
    };
    r.readAsText(f); e.target.value = '';
}

async function refreshStaleSeries() {
    const today = new Date(); today.setHours(0,0,0,0); let needsSave = false;
    const checkAndRefreshList = async (listName) => {
        if (!data[listName]) return;
        for (let i = 0; i < data[listName].length; i++) {
            const item = data[listName][i]; if (String(item.id).startsWith('custom_')) continue;
            let needsRefresh = false;
            if (item.nextEpisodeToAir) { const airDate = new Date(item.nextEpisodeToAir.date); if (airDate <= today) needsRefresh = true; }
            else if (item.status === 'Returning Series') { needsRefresh = true; }

            if (needsRefresh) {
                try {
                    const fd = await getItemDetails(item.id, 'tv');
                    if (fd) { item.status = fd.status; item.nextEpisodeToAir = fd.nextEpisodeToAir; item.seasons = fd.seasons; item.numberOfSeasons = fd.numberOfSeasons; item.numberOfEpisodes = fd.numberOfEpisodes; needsSave = true; }
                } catch(e) {}
                await new Promise(r => setTimeout(r, 400));
            }
        }
    };
    await checkAndRefreshList('seriesToWatch');
    if (needsSave) { await saveData(); const activeList = getActiveListId(); if (activeList === 'seriesToWatch') renderList(data[activeList], activeList, true); }
}

// Service Worker (PWA)
if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').then(() => console.log('SW ok')).catch(e => console.log('SW błąd', e)); }); }

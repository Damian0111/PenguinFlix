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

const ICONS = {
    quickTrack: `<svg viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>`,
    person: `<svg class="placeholder-svg" viewBox="0 0 24 24"><path d="M12,19.2C9.5,19.2 7.29,17.92 6,16C6.03,14 10,12.9 12,12.9C14,12.9 17.97,14 18,16C16.71,17.92 14.5,19.2 12,19.2M12,5A3,3 0 0,1 15,8A3,3 0 0,1 12,11A3,3 0 0,1 9,8A3,3 0 0,1 12,5M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z" /></svg>`,
    list: `<svg viewBox="0 0 24 24"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>`,
    grid: `<svg viewBox="0 0 24 24"><path d="M4 11h5V5H4v6zm0 7h5v-6H4v6zm6 0h5v-6h-5v6zm6 0h5v-6h-5v6zm-6-7h5V5h-5v6zm6-6v6h5V5h-5z"/></svg>`,
    star: `<svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`,
    delete: `<svg viewBox="0 0 24 24"><path d="M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19M8,9H16V19H8V9M15.5,4L14.5,3H9.5L8.5,4H5V6H19V4H15.5Z"/></svg>`,
    close: `<svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    share: `<svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>`,
    pin: `<svg viewBox="0 0 24 24"><path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z"/></svg>`,
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
    } catch (e) { }
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

const toggleAppDepthEffect = (isActive) => {
    if (isActive) {
        document.body.classList.add('modal-active');
    } else {
        setTimeout(() => {
            const isAnyModalOpen = document.getElementById('detailsModalContainer').innerHTML !== '' ||
                document.getElementById('actorModalContainer').innerHTML !== '';
            if (!isAnyModalOpen) {
                document.body.classList.remove('modal-active');
            }
        }, 50);
    }
};

// ==========================================
// 4. API WRAPPER (Fetch)
// ==========================================
async function fetchFromTMDB(endpoint, params = {}, signal = null) {
    const url = new URL(`${API_BASE_URL}${endpoint}`);
    url.searchParams.append('api_key', API_KEY);
    if (params.language !== false) url.searchParams.append('language', params.language || 'pl-PL');

    Object.keys(params).forEach(key => {
        if (key !== 'language') url.searchParams.append(key, params[key]);
    });

    try {
        const options = signal ? { signal } : {};
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(response.status);
        return await response.json();
    } catch (error) {
        if (error.name === 'AbortError') return 'ABORTED';
        return null;
    }
}

// ==========================================
// 5. INICJALIZACJA I SMART BACKUP
// ==========================================
document.addEventListener('DOMContentLoaded', init);

async function init() {
    if (API_KEY) {
        showMainContent();
        await loadData();
        applyTheme();
        switchMainTab(viewState.activeMainTab || 'movies');

        refreshStaleSeries(); // Odświeża daty seriali
        checkSmartBackup();

        // ZADANIA W TLE (Opóźnione o 2 sekundy, by ekran wczytał się płynnie)
        setTimeout(() => {
            if (typeof NotificationManager !== 'undefined') NotificationManager.runEngine();
            // Uruchamiamy cichego pracownika, który uzupełni stare filmy o czas trwania!
            if (typeof healMissingData !== 'undefined') healMissingData();
        }, 2000);

    } else { showConfig(); }
    setupEventListeners();
}
function checkSmartBackup() {
    const freqStr = localStorage.getItem('smartBackupFreq');
    const frequencyDays = freqStr === null ? 30 : parseInt(freqStr);

    if (frequencyDays === 0) return;

    const lastBackup = parseInt(localStorage.getItem('lastBackupDate') || '0');
    const lastChange = parseInt(localStorage.getItem('lastDataChangeDate') || '0');
    const totalItems = Object.values(data).flat().length;

    if (totalItems > 0 && lastChange > lastBackup) {
        const now = Date.now();
        const daysSinceBackup = lastBackup === 0 ? 999 : (now - lastBackup) / (1000 * 60 * 60 * 24);

        if (daysSinceBackup >= frequencyDays) {
            const c = document.getElementById('smart-backup-container');
            if (c) {
                c.innerHTML = `<div class="smart-backup-toast"><div><strong style="display:block;font-size:0.9rem;">Czas na backup!</strong><span style="font-size:0.8rem;opacity:0.9;">Masz niezapisane zmiany w kolekcji.</span></div><button id="quick-backup-btn">Eksportuj</button><button class="smart-backup-close">X</button></div>`;
                document.getElementById('quick-backup-btn').onclick = () => { backupData(); c.innerHTML = ''; };
                c.querySelector('.smart-backup-close').onclick = () => { c.innerHTML = ''; localStorage.setItem('lastBackupDate', Date.now()); };
            }
        }
    }
}

// ==========================================
// 6. EVENT LISTENERY (SWIPE, PTR, WYSZUKIWARKA)
// ==========================================
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

    // --- NATYWNY GEST WSTECZ ---
    window.addEventListener('popstate', (e) => {
        const trailer = document.getElementById('trailerModalContainer');
        const actor = document.getElementById('actorModalContainer');
        const details = document.getElementById('detailsModalContainer');

        if (trailer && trailer.innerHTML !== '') { trailer.innerHTML = ''; return; }
        if (actor && actor.innerHTML !== '') { actor.innerHTML = ''; toggleAppDepthEffect(false); return; }
        if (details && details.innerHTML !== '') { details.innerHTML = ''; toggleAppDepthEffect(false); return; }

        if (e.state) {
            if (e.state.mainTab && e.state.mainTab !== viewState.activeMainTab) {
                switchMainTab(e.state.mainTab, true);
            }
            if (e.state.subTab) {
                const currentSubTab = viewState.activeMainTab === 'movies' ? viewState.moviesSubTab : viewState.seriesSubTab;
                if (e.state.subTab !== currentSubTab) {
                    switchSubTab(e.state.subTab, true);
                }
            }
        }
    });

    // --- OBSŁUGA PRZYCISKU WRÓĆ NA GÓRĘ ---
    const scrollToTopBtn = document.getElementById('scrollToTopBtn');
    if (scrollToTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 400) scrollToTopBtn.classList.add('visible');
            else scrollToTopBtn.classList.remove('visible');
        }, { passive: true });

        scrollToTopBtn.addEventListener('click', () => {
            triggerHaptic('light');
            window.scrollTo({ top: 0, behavior: 'smooth' });
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
    document.getElementById('btn-backup-settings').addEventListener('click', openBackupSettingsModal);
    document.getElementById('restoreInput').addEventListener('change', restoreData);
    document.getElementById('btn-info').addEventListener('click', showInfoModal);

    // --- WYSZUKIWARKA ---
    const searchInput = document.getElementById('searchInput');
    const searchClearBtn = document.getElementById('searchClearBtn');
    let searchAbortController = null;

    const debouncedMainSearch = debounce(async (query) => {
        const searchResultsContainer = document.getElementById('searchResults');
        if (searchAbortController) searchAbortController.abort();

        if (!query) { searchResultsContainer.style.display = 'none'; fullSearchResults = []; return; }
        searchResultsContainer.style.display = 'block';
        searchResultsContainer.innerHTML = `<div class="placeholder" style="padding:20px; text-align:center;">Wyszukiwanie...</div>`;

        let searchTerm = query; let year = null; const yearMatch = query.match(/\b(\d{4})\b$/);
        if (yearMatch) { year = yearMatch[1]; searchTerm = query.replace(/\b\d{4}\b$/, '').trim(); }

        searchAbortController = new AbortController();
        const signal = searchAbortController.signal;

        try {
            let finalResults = [];
            if (year && searchTerm) {
                const mRes = await fetchFromTMDB('/search/movie', { query: searchTerm, year: year, include_adult: false }, signal);
                const sRes = await fetchFromTMDB('/search/tv', { query: searchTerm, first_air_date_year: year, include_adult: false }, signal);
                if (mRes === 'ABORTED' || sRes === 'ABORTED') return;
                if (mRes) mRes.results.forEach(i => i.media_type = 'movie');
                if (sRes) sRes.results.forEach(i => i.media_type = 'tv');
                finalResults = [...(mRes?.results || []), ...(sRes?.results || [])].sort((a, b) => b.popularity - a.popularity);
            } else {
                const resData = await fetchFromTMDB('/search/multi', { query: searchTerm, include_adult: false }, signal);
                if (resData === 'ABORTED') return;
                finalResults = resData ? resData.results : [];
            }
            fullSearchResults = finalResults; displaySearchResults(fullSearchResults);
        } catch (error) {
            if (error.name !== 'AbortError') searchResultsContainer.innerHTML = `<div class="placeholder" style="padding:20px;text-align:center;color:var(--primary-color);">Błąd sieci.</div>`;
        }
    }, 300);

    searchInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (searchClearBtn) searchClearBtn.style.display = val.length > 0 ? 'flex' : 'none';
        debouncedMainSearch(val);
    });

    if (searchClearBtn) {
        searchClearBtn.addEventListener('click', () => {
            searchInput.value = '';
            searchClearBtn.style.display = 'none';
            document.getElementById('searchResults').style.display = 'none';
            if (searchAbortController) searchAbortController.abort();
        });
    }
    searchInput.addEventListener('focus', () => { if (searchInput.value) document.getElementById('searchResults').style.display = 'block'; });

    // --- LOKALNA WYSZUKIWARKA ---
    const handleLocalSearchDebounced = debounce((e) => {
        const listId = getActiveListId(); if (!listId) return;
        viewState[listId].localSearch = e.target.value;
        e.target.nextElementSibling.style.display = e.target.value ? 'flex' : 'none';
        renderList(data[listId], listId);
    }, 250);
    document.querySelectorAll('.localSearchInput').forEach(input => input.addEventListener('input', handleLocalSearchDebounced));

    document.querySelectorAll('.clearLocalSearch').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const listId = getActiveListId(); if (!listId) return;
            viewState[listId].localSearch = '';
            const button = e.currentTarget;
            const input = button.previousElementSibling;
            input.value = '';
            button.style.display = 'none';
            renderList(data[listId], listId);
            input.focus();
        });
    });

    document.getElementById('searchResults').addEventListener('click', (e) => {
        const quickAdd = e.target.closest('.add-item'); const item = e.target.closest('.search-item');
        if (quickAdd) { e.stopPropagation(); handleQuickAddItem(quickAdd); }
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

    // --- GESTY SWIPE & PULL TO REFRESH ---
    let touchstartX = 0; let touchstartY = 0; let touchendX = 0; let touchendY = 0;
    let ptrCurrentY = 0; let isPulling = false;
    const mainContent = document.getElementById('mainContent');
    const ptrContainer = document.getElementById('ptr-container');
    const ptrSpinner = document.getElementById('ptr-spinner');

    const handleSwipeGesture = () => {
        const deltaX = touchendX - touchstartX; const deltaY = touchendY - touchstartY;
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 60) {
            if (viewState.activeMainTab === 'movies' || viewState.activeMainTab === 'series') {
                const currentSubTab = viewState.activeMainTab === 'movies' ? viewState.moviesSubTab : viewState.seriesSubTab;
                if (deltaX < 0 && currentSubTab === 'toWatch') { triggerHaptic('light'); switchSubTab('watched'); }
                else if (deltaX > 0 && currentSubTab === 'watched') { triggerHaptic('light'); switchSubTab('toWatch'); }
            } else if (viewState.activeMainTab === 'profile') {
                const activeBtn = document.querySelector('.ptab-btn.active'); const currentPtab = activeBtn ? activeBtn.dataset.ptab : 'stats';
                if (deltaX < 0 && currentPtab === 'stats') { triggerHaptic('light'); switchProfileTab('settings'); }
                else if (deltaX > 0 && currentPtab === 'settings') { triggerHaptic('light'); switchProfileTab('stats'); }
            }
        }
    };

    mainContent.addEventListener('touchstart', e => {
        if (e.target.closest('.sortable-chosen') || e.target.closest('.discover-categories-wrapper')) return;
        touchstartX = e.touches[0].clientX; touchstartY = e.touches[0].clientY;
        if (window.scrollY === 0) isPulling = true;
    }, { passive: true });

    mainContent.addEventListener('touchmove', e => {
        if (e.target.closest('.modal-overlay')) return;
        const deltaY = e.touches[0].clientY - touchstartY;
        if (isPulling && deltaY > 0 && window.scrollY === 0) {
            e.preventDefault(); ptrCurrentY = deltaY;
            if (ptrContainer) {
                ptrContainer.style.transform = `translateY(${Math.min(ptrCurrentY - 50, 80)}px)`;
                if (ptrCurrentY > 60 && ptrSpinner) ptrSpinner.style.transform = `rotate(${ptrCurrentY * 2}deg)`;
            }
        }
    }, { passive: false });

    mainContent.addEventListener('touchend', async e => {
        if (e.target.closest('.sortable-chosen') || e.target.closest('.discover-categories-wrapper')) return;
        touchendX = e.changedTouches[0].clientX; touchendY = e.changedTouches[0].clientY;
        handleSwipeGesture();
        if (isPulling) {
            isPulling = false;
            if (ptrCurrentY > 100 && ptrContainer) {
                ptrContainer.classList.add('refreshing'); triggerHaptic('medium');
                if (viewState.activeMainTab === 'discover') {
                    const activePill = document.querySelector('.discover-pill.active');
                    await loadDiscoverTab(activePill ? (activePill.dataset.genre || activePill.dataset.endpoint) : 'trending', activePill ? !!activePill.dataset.genre : false);
                } else if (viewState.activeMainTab === 'movies' || viewState.activeMainTab === 'series') {
                    const listId = getActiveListId(); if (listId === 'seriesToWatch') await refreshStaleSeries();
                    renderList(data[listId], listId, true);
                }
                setTimeout(() => { ptrContainer.classList.remove('refreshing'); ptrContainer.style.transform = ''; }, 600);
            } else if (ptrContainer) { ptrContainer.style.transform = ''; }
            ptrCurrentY = 0;
        }
    }, { passive: true });

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
        const btn = e.currentTarget; if (btn.disabled) return;
        triggerHaptic('medium'); btn.disabled = true; btn.classList.add('rolling');
        try {
            const randomPage = Math.floor(Math.random() * 20) + 1; const type = Math.random() > 0.5 ? 'movie' : 'tv';
            const res = await fetchFromTMDB(`/${type}/popular`, { page: randomPage });
            if (res && res.results) {
                const validItems = res.results.filter(i => i.poster_path);
                if (validItems.length > 0) openPreviewModal(validItems[Math.floor(Math.random() * validItems.length)].id, type);
                else showCustomAlert('Błąd', 'Nic nie znaleziono.', 'error');
            }
        } finally { setTimeout(() => { btn.classList.remove('rolling'); btn.disabled = false; }, 600); }
    });
}

// ==========================================
// 7. NAWIGACJA I RENDEROWANIE LIST
// ==========================================
function getActiveListId() {
    if (viewState.activeMainTab === 'movies') return viewState.moviesSubTab === 'toWatch' ? 'moviesToWatch' : 'moviesWatched';
    else if (viewState.activeMainTab === 'series') return viewState.seriesSubTab === 'toWatch' ? 'seriesToWatch' : 'seriesWatched';
    return null;
}

function switchMainTab(tabId, isGoingBack = false) {
    if (!isGoingBack) { history.pushState({ mainTab: tabId, subTab: (tabId === 'movies' ? viewState.moviesSubTab : viewState.seriesSubTab) }, ''); }

    viewState.activeMainTab = tabId;
    document.body.setAttribute('data-active-tab', tabId);

    document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.maintab === tabId));
    document.querySelectorAll('.main-tab-content').forEach(container => container.classList.toggle('active', container.id === `tab-${tabId}`));

    const subHeader = document.getElementById('sub-header');
    const mainHeader = document.getElementById('fixed-header');
    const fab = document.getElementById('fab-randomize');

    if (fab) { if (tabId === 'discover') fab.classList.add('visible'); else fab.classList.remove('visible'); }

    if (tabId === 'discover' || tabId === 'profile') {
        mainHeader.style.transform = `translateY(-100%)`; document.body.classList.add('header-hidden');
    } else {
        mainHeader.style.transform = `translateY(0)`; document.body.classList.remove('header-hidden');
    }

    if (tabId === 'movies' || tabId === 'series') {
        subHeader.style.display = 'flex';
        const subTab = tabId === 'movies' ? viewState.moviesSubTab : viewState.seriesSubTab;
        document.querySelectorAll('.segmented-control .seg-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.subtab === subTab));
        const listId = getActiveListId(); const parentTab = document.getElementById(`tab-${tabId}`);
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

function switchSubTab(subTabId, isGoingBack = false) {
    if (!isGoingBack) { history.pushState({ mainTab: viewState.activeMainTab, subTab: subTabId }, ''); }

    if (viewState.activeMainTab === 'movies') viewState.moviesSubTab = subTabId;
    else if (viewState.activeMainTab === 'series') viewState.seriesSubTab = subTabId;

    document.querySelectorAll('.segmented-control .seg-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.subtab === subTabId));
    const listId = getActiveListId(); const parentTab = document.getElementById(`tab-${viewState.activeMainTab}`);
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

let listIntersectionObserver = null;

function renderList(originalItems, listId, preserveLimit = false) {
    const container = document.getElementById(`${listId}ListContainer`); if (!container) return;
    const state = viewState[listId];
    if (!preserveLimit) state.displayLimit = 30;
    let itemsToRender = [...(originalItems || [])];
    // To wklejasz do renderList(), przed innymi if'ami (jak localSearch itd.)
    if (state.maxRuntime && state.maxRuntime < 240 && listId.includes('movies')) {
        itemsToRender = itemsToRender.filter(item => item.runtime && item.runtime <= state.maxRuntime);
    }

    if (state.localSearch) { const query = state.localSearch.toLowerCase(); itemsToRender = itemsToRender.filter(item => (item.title && item.title.toLowerCase().includes(query)) || (item.overview && item.overview.toLowerCase().includes(query))); }
    if (state.filterFavoritesOnly) itemsToRender = itemsToRender.filter(item => item.isFavorite);
    if (state.filterByGenre !== 'all') itemsToRender = itemsToRender.filter(item => item.genres && item.genres.includes(state.filterByGenre));
    if (state.filterByCustomTag && state.filterByCustomTag !== 'all') itemsToRender = itemsToRender.filter(item => (item.customTags || []).includes(state.filterByCustomTag));
    if (state.filterByVod && state.filterByVod !== 'all') { const targetVod = state.filterByVod.toLowerCase(); itemsToRender = itemsToRender.filter(item => item.vod && item.vod.some(v => v.toLowerCase().includes(targetVod))); }

    const [sortBy, direction] = state.sortBy.split('_');

    itemsToRender.sort((a, b) => {
        if (!state.localSearch) {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
        }
        let valA, valB;
        switch (sortBy) {
            case 'title': valA = a.title || ''; valB = b.title || ''; return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            case 'year': case 'rating': case 'dateAdded': valA = a[sortBy] || 0; valB = b[sortBy] || 0; return direction === 'asc' ? valA - valB : valB - valA;
            default: return 0;
        }
    });

    const limit = state.displayLimit || 30;
    const pagedItems = itemsToRender.slice(0, limit);

    const listHTML = pagedItems.map(item => {
        const isWatched = listId.includes('Watched'); const isToWatchList = listId.includes('ToWatch');
        let isUnreleased = false; let unreleasedBadgeList = ''; let unreleasedBadgeGrid = '';
        const safeTitle = escapeHTML(item.title); const safeOverview = escapeHTML(item.overview);
        // OPTYMALIZACJA RAM/TRANSFERU: Dla siatki pobieramy 185px, dla listy pobieramy 92px. Są błyskawiczne!
        const posterSize = viewState.globalViewMode === 'grid' ? 'w185' : 'w92';
        const listPosterSrc = item.poster ? item.poster.replace('w500', posterSize) : POSTER_PLACEHOLDER;
        const pinClass = item.isPinned ? 'is-pinned' : '';
        const pinGridHTML = item.isPinned ? `<div class="grid-badge-pin">${ICONS.pin}</div>` : '';
        const pinListHTML = item.isPinned ? `<span class="list-badge-pin">${ICONS.pin} Przypięty</span>` : '';

        if (isToWatchList) {
            if (!item.releaseDate || item.releaseDate === '') {
                isUnreleased = true; unreleasedBadgeList = `<div class="unreleased-badge" style="background-color: color-mix(in srgb, var(--info-color) 15%, transparent); border-left-color: var(--info-color); color: var(--info-color);">Brak daty premiery</div>`; unreleasedBadgeGrid = `<div class="grid-unreleased" style="background: rgba(59, 130, 246, 0.9);">🕒 Zapowiedź</div>`;
            } else {
                const today = new Date(); today.setHours(0, 0, 0, 0); const releaseDate = new Date(item.releaseDate);
                if (releaseDate > today) { isUnreleased = true; const formattedDate = releaseDate.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }); unreleasedBadgeList = `<div class="unreleased-badge" style="background-color: color-mix(in srgb, var(--info-color) 15%, transparent); border-left-color: var(--info-color); color: var(--info-color);">Premiera: ${formattedDate}</div>`; unreleasedBadgeGrid = `<div class="grid-unreleased" style="background: rgba(59, 130, 246, 0.9);">🕒 Wkrótce</div>`; }
            }
        }

        if (viewState.globalViewMode === 'grid') {
            let favoriteBadge = item.isFavorite ? `<div class="grid-badge-favorite">${ICONS.star}</div>` : '';
            let infoBadge = ''; let quickTrackBtnGrid = ''; let nextAirDateHTMLGrid = '';
            if (isWatched && item.rating > 0) { infoBadge = `<div class="grid-badge-info">★ ${item.rating}</div>`; }
            else if (listId === 'seriesToWatch' && item.progress && item.numberOfEpisodes > 0) {
                const watchedCount = Object.values(item.progress).reduce((acc, eps) => acc + eps.length, 0);
                if (watchedCount > 0) { const pct = Math.round((watchedCount / item.numberOfEpisodes) * 100); infoBadge = `<div class="grid-badge-info">${pct}%</div>`; }
                const nextEpInfo = getNextEpisodeInfo(item);
                if (nextEpInfo && !isUnreleased) quickTrackBtnGrid = `<button class="quick-track-btn-grid" data-action="quick-track">${ICONS.quickTrack} <span>${nextEpInfo.string}</span></button>`;
                else if (!nextEpInfo && !isSeriesFinished(item) && !isUnreleased) nextAirDateHTMLGrid = `<div class="grid-unreleased" style="background: rgba(59, 130, 246, 0.9);">🕒 Wkrótce</div>`;
            }
            let deleteBadge = `<button class="grid-badge-delete delete-btn" title="Usuń">${ICONS.delete}</button>`;
            return `<li class="grid-item ${pinClass} ${isUnreleased ? 'unreleased' : ''}" data-id="${item.id}" data-type="${item.type}"><div class="grid-title-fallback">${safeTitle}</div><img class="fade-image" src="${listPosterSrc}" alt="${safeTitle}" loading="lazy" onload="this.classList.add('loaded')" onerror="this.style.opacity=0;">${pinGridHTML}${favoriteBadge}${infoBadge}${unreleasedBadgeGrid}${quickTrackBtnGrid}${nextAirDateHTMLGrid}${deleteBadge}</li>`;
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
            return `<li class="list-item ${pinClass} ${isUnreleased ? 'unreleased' : ''}" data-id="${item.id}" data-type="${item.type}"><img class="fade-image" src="${listPosterSrc}" alt="Okładka" onload="this.classList.add('loaded')" onerror="this.onerror=null; this.src='${POSTER_PLACEHOLDER}';"><div class="info"><strong>${safeTitle}</strong><span class="meta">${item.year}${pinListHTML}</span>${unreleasedBadgeList}<p class="overview">${safeOverview}</p>${extraInfo}</div><div class="item-actions"><button class="icon-button delete-btn" title="Usuń">${ICONS.delete}</button></div></li>`;
        }
    }).join('');

    let ul = container.querySelector('ul');
    if (!ul) { ul = document.createElement('ul'); container.appendChild(ul); }
    ul.className = viewState.globalViewMode === 'grid' ? 'grid-view-container' : 'list-view-container';
    ul.innerHTML = itemsToRender.length > 0 ? listHTML : `<div class="empty-state-simple">Brak pozycji do wyświetlenia.</div>`;

    let oldSentinel = container.querySelector('.infinite-scroll-sentinel');
    if (oldSentinel) oldSentinel.remove();
    if (listIntersectionObserver) listIntersectionObserver.disconnect();

    if (itemsToRender.length > limit) {
        let sentinel = document.createElement('div');
        sentinel.className = 'infinite-scroll-sentinel';
        sentinel.style.cssText = 'height: 20px; width: 100%; margin-top: 10px;';
        container.appendChild(sentinel);
        listIntersectionObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) { viewState[listId].displayLimit += 20; renderList(data[listId], listId, true); }
        }, { rootMargin: "150px" });
        listIntersectionObserver.observe(sentinel);
    }
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
            if (await showCustomConfirm('Gratulacje! 🎉', `Obejrzałeś cały serial "${escapeHTML(item.title)}". Przenieść do Obejrzanych?`)) await handleMoveItem(item.id, 'tv');
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
    if (Object.values(data).flat().some(i => String(i.id) === String(id) && i.type === type)) {
        showCustomAlert('Już na liście', `Tytuł jest już w bibliotece.`, 'info');
        return false;
    }

    const fullDetails = await getItemDetails(id, type);
    if (!fullDetails) { showCustomAlert('Błąd', 'Nie udało się pobrać danych.', 'error'); return false; }

    if (Object.values(data).flat().some(i => String(i.id) === String(id) && i.type === type)) return false;

    if (list === 'watched') {
        if (type === 'tv' && !isSeriesFinished(fullDetails)) { showCustomAlert('Uwaga', `Serial wciąż trwa. Dodaj do "Do obejrzenia".`, 'info'); return false; }
        if (type === 'movie' && fullDetails.releaseDate) { const td = new Date(); td.setHours(0, 0, 0, 0); const rd = new Date(fullDetails.releaseDate); rd.setHours(0, 0, 0, 0); if (rd > td) { showCustomAlert('Uwaga', `Film nie miał premiery.`, 'info'); return false; } }
    }

    // KOMPRESJA: Tworzymy "lekki" obiekt tylko do wyświetlania na liście. 
    // Odcinamy ciężkie dane: backdrop, vod, pełny overview (zostawiamy max 120 znaków dla widoku listy)
    const liteItem = {
        id: fullDetails.id,
        title: fullDetails.title,
        type: fullDetails.type,
        poster: fullDetails.poster,
        year: fullDetails.year,
        releaseDate: fullDetails.releaseDate,
        genres: fullDetails.genres ? fullDetails.genres.slice(0, 3) : [],
        overview: fullDetails.overview ? fullDetails.overview.substring(0, 120) + '...' : '',
        isFavorite: false,
        customTags: [],
        dateAdded: Date.now()
    };

    if (type === 'movie') {
        liteItem.runtime = fullDetails.runtime || 0; // NOWOŚĆ: Zapisujemy czas trwania!
    } else if (type === 'tv') {
        liteItem.status = fullDetails.status;
        liteItem.nextEpisodeToAir = fullDetails.nextEpisodeToAir;
        liteItem.seasons = fullDetails.seasons;
        liteItem.numberOfEpisodes = fullDetails.numberOfEpisodes;
        liteItem.progress = {};
    }
    const targetList = `${type === 'movie' ? 'movies' : 'series'}${list === 'toWatch' ? 'ToWatch' : 'Watched'}`;

    if (list === 'toWatch') {
        const maxOrd = data[targetList].length > 0 ? Math.max(...data[targetList].map(i => i.customOrder || 0)) : -1;
        liteItem.customOrder = maxOrd + 1;
    } else {
        liteItem.rating = null; liteItem.review = ""; liteItem.watchDates = [Date.now()];
    }

    data[targetList].unshift(liteItem);
    await saveData();

    switchMainTab(type === 'movie' ? 'movies' : 'series'); switchSubTab(list);
    document.getElementById('searchInput').value = ''; document.getElementById('searchResults').style.display = 'none';
    const clearBtn = document.getElementById('searchClearBtn'); if (clearBtn) clearBtn.style.display = 'none';

    showCustomAlert('Sukces!', `"${escapeHTML(liteItem.title)}" dodano do listy.`, 'success');
    return true;
}
// ==========================================
// 8. ZAKŁADKA ODKRYWAJ I STATYSTYKI
// ==========================================
async function loadDiscoverTab(endpoint = 'trending', isGenre = false) {
    const gridContainer = document.getElementById('main-discover-grid');
    gridContainer.innerHTML = `<div style="text-align:center; padding: 40px 0; color:var(--text-secondary); width:100%; grid-column: 1 / -1;">Ładowanie...</div>`;
    let res, typeOver = null;

    try {
        if (isGenre) { res = await fetchFromTMDB('/discover/movie', { sort_by: 'popularity.desc', with_genres: endpoint, page: 1 }); typeOver = 'movie'; }
        else {
            switch (endpoint) {
                case 'movies_popular': res = await fetchFromTMDB('/movie/popular', { region: 'PL' }); typeOver = 'movie'; break;
                case 'series_popular': res = await fetchFromTMDB('/tv/popular'); typeOver = 'tv'; break;
                case 'in_theaters': res = await fetchFromTMDB('/movie/now_playing', { region: 'PL' }); typeOver = 'movie'; break;
                case 'top_rated': res = await fetchFromTMDB('/movie/top_rated', { region: 'PL' }); typeOver = 'movie'; break;
                default: res = await fetchFromTMDB('/trending/all/week'); break;
            }
        }
        if (res) {
            let results = res.results.filter(i => i.poster_path).slice(0, 18);
            if (typeOver) results.forEach(i => i.media_type = typeOver); else results = results.filter(i => i.media_type === 'movie' || i.media_type === 'tv');
            renderDiscoverGridHTML(results, gridContainer);
        } else { gridContainer.innerHTML = `<div style="text-align:center; color:var(--primary-color); width:100%; grid-column: 1 / -1; padding: 40px 0;">Błąd pobierania danych.</div>`; }
    } catch { gridContainer.innerHTML = `<div style="text-align:center; color:var(--primary-color); width:100%; grid-column: 1 / -1; padding: 40px 0;">Sprawdź połączenie sieciowe.</div>`; }
}

function renderDiscoverGridHTML(results, gridContainer) {
    if (!results || results.length === 0) { gridContainer.innerHTML = `<div style="text-align:center; color:var(--text-secondary); width:100%; grid-column: 1 / -1;">Brak wyników.</div>`; return; }

    let html = '';
    const heroItem = results[0];
    if (heroItem) {
        const bgSrc = heroItem.backdrop_path ? IMAGE_BASE_URL.replace('w500', 'w780') + heroItem.backdrop_path : (heroItem.poster_path ? IMAGE_BASE_URL + heroItem.poster_path : POSTER_PLACEHOLDER);
        const safeTitle = escapeHTML(heroItem.title || heroItem.name);
        html += `<div style="grid-column: 1 / -1;"><div class="discover-hero" data-id="${heroItem.id}" data-type="${heroItem.media_type}"><div class="discover-hero-bg" style="background-image: url('${bgSrc}');"></div><div class="discover-hero-gradient"></div><div class="discover-hero-content"><span class="discover-hero-badge">Nr 1 w Trendach</span><h2 class="discover-hero-title">${safeTitle}</h2><div class="discover-hero-btn"><svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg> Sprawdź tytuł</div></div></div></div>`;
    }

    const gridItems = results.slice(1).map((item, index) => {
        const posterSrc = item.poster_path ? IMAGE_BASE_URL.replace('w500', 'w300') + item.poster_path : POSTER_PLACEHOLDER;
        const isAlreadyAdded = Object.values(data).flat().some(i => String(i.id) === String(item.id));
        const badgeHTML = isAlreadyAdded ? `<div class="discover-badge-unreleased" style="background:var(--success-color);">W kolekcji</div>` : '';
        return `<div class="discover-item" data-id="${item.id}" data-type="${item.media_type}" title="${escapeHTML(item.title || item.name)}" style="animation: fadeIn 0.4s ease-out ${(index % 18) * 0.03}s both;"><div class="discover-poster-wrapper"><img class="fade-image" src="${posterSrc}" alt="okładka" loading="lazy" decoding="async" onload="this.classList.add('loaded')" onerror="this.src='${POSTER_PLACEHOLDER}';">${badgeHTML}</div><div class="discover-item-title">${escapeHTML(item.title || item.name)}</div></div>`;
    }).join('');

    gridContainer.innerHTML = html + gridItems;
    gridContainer.onclick = (e) => {
        const item = e.target.closest('.discover-item') || e.target.closest('.discover-hero');
        if (item) {
            const id = item.dataset.id; const type = item.dataset.type;
            const isInLibrary = Object.values(data).flat().some(i => String(i.id) === String(id) && i.type === type);
            if (isInLibrary) openDetailsModal(id, type);
            else openPreviewModal(id, type);
        }
    };
}

function renderProfileStats() {
    const c = document.getElementById('profile-stats-container');
    let tMovies = data.moviesWatched.length; let tSeries = data.seriesWatched.length;
    let runtime = 0; let gCounts = {}; let sumRat = 0; let ratCount = 0;
    let dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }; let decades = {};
    let tCol = data.moviesToWatch.length + tMovies + data.seriesToWatch.length + tSeries; let tComp = tMovies + tSeries;

    data.moviesWatched.forEach(m => {
        if (m.runtime) runtime += m.runtime;
        if (m.rating > 0) { sumRat += m.rating; ratCount++; let b = Math.ceil(m.rating); if (b > 0 && b <= 5) dist[b]++; }
        if (m.year) { let d = Math.floor(parseInt(m.year) / 10) * 10; decades[d] = (decades[d] || 0) + 1; }
        if (m.genres) m.genres.forEach(g => { gCounts[g] = (gCounts[g] || 0) + 1; });
    });

    [...data.seriesWatched, ...data.seriesToWatch].forEach(s => {
        if (s.rating > 0) { sumRat += s.rating; ratCount++; let b = Math.ceil(s.rating); if (b > 0 && b <= 5) dist[b]++; }
        if (data.seriesWatched.includes(s) && s.year) { let d = Math.floor(parseInt(s.year) / 10) * 10; decades[d] = (decades[d] || 0) + 1; }
    });
    data.seriesWatched.forEach(s => { if (s.genres) s.genres.forEach(g => { gCounts[g] = (gCounts[g] || 0) + 1; }); });

    let timeStr = '0h';
    if (runtime > 0) { const hrs = Math.floor(runtime / 60); const days = Math.floor(hrs / 24); if (days > 0) timeStr = `<span class="highlight">${days}d</span> ${hrs % 24}h`; else timeStr = `<span class="highlight">${hrs}h</span>`; }

    let topDec = "Brak"; let maxDec = 0;
    for (const [dec, count] of Object.entries(decades)) { if (count > maxDec) { maxDec = count; topDec = dec + "s"; } }

    let compRate = tCol > 0 ? Math.round((tComp / tCol) * 100) : 0;
    const avgRat = ratCount > 0 ? (sumRat / ratCount).toFixed(1) : '-';
    const topG = Object.entries(gCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const topGHTML = topG.length > 0 ? `<div class="top-genres-list">${topG.map(g => `<span class="profile-genre-tag"><strong style="color: var(--primary-color);">${g[1]}</strong> ${escapeHTML(g[0])}</span>`).join('')}</div>` : '<div style="font-size:0.8rem; color:var(--text-secondary); margin-top:8px;">Brak danych</div>';

    let maxRat = Math.max(...Object.values(dist)); if (maxRat === 0) maxRat = 1;
    let chart = `<div class="rating-bars">`;
    for (let i = 1; i <= 5; i++) { let hPct = (dist[i] / maxRat) * 100; chart += `<div class="chart-col"><div class="chart-tooltip">${dist[i]} ocen</div><div class="chart-bar" style="height: ${hPct}%;"></div></div>`; }
    chart += `</div><div class="chart-labels"><span class="chart-label">★</span><span class="chart-label">★★</span><span class="chart-label">★★★</span><span class="chart-label">★★★★</span><span class="chart-label">★★★★★</span></div>`;

    c.innerHTML = `<div class="stat-card"><svg class="icon-bg" viewBox="0 0 24 24"><path d="M19.8 3.2L12 11 4.2 3.2 3.5 4l7.8 7.8-7.8 7.8.7.7 7.8-7.8 7.8 7.8.7-.7-7.8-7.8L19.8 4z"/></svg><div class="label">Filmy</div><div class="value">${tMovies}</div></div><div class="stat-card"><svg class="icon-bg" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line></svg><div class="label">Czas (Filmy)</div><div class="value">${timeStr}</div></div><div class="stat-card"><svg class="icon-bg" viewBox="0 0 24 24"><path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zm-10-7h9v6h-9z"/></svg><div class="label">Seriale</div><div class="value">${tSeries}</div></div><div class="stat-card"><svg class="icon-bg" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg><div class="label">Śr. Ocen</div><div class="value">${avgRat}</div></div><div class="stat-card"><div class="label">Ulubiona Epoka</div><div class="value">${topDec}</div></div><div class="stat-card"><div class="label">Ukończono</div><div class="value">${compRate}<span style="font-size:1rem; color:var(--text-secondary)">%</span></div></div><div class="stat-card full-width"><div class="label">Ulubione Gatunki</div>${topGHTML}</div><div class="stat-card full-width"><div class="label" style="margin-bottom:0;">Rozkład ocen</div><div class="rating-chart-wrap">${chart}</div></div>`;
}

// ==========================================
// 9. LOGIKA POBIERANIA SZCZEGÓŁÓW API
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
        const globalYear = finalReleaseDate ? parseInt(finalReleaseDate.substring(0, 4)) : 0;
        const plRelease = d.release_dates.results.find(r => r.iso_3166_1 === 'PL');
        const usRelease = d.release_dates.results.find(r => r.iso_3166_1 === 'US');

        const getTheatricalDate = (countryData) => {
            if (!countryData || !countryData.release_dates) return null;
            const theatricals = countryData.release_dates.filter(rd => rd.type === 3);
            if (theatricals.length === 0) return null;
            theatricals.sort((a, b) => new Date(a.release_date) - new Date(b.release_date));
            return theatricals[0].release_date.substring(0, 10);
        };

        let localDate = getTheatricalDate(plRelease) || getTheatricalDate(usRelease);
        if (localDate) {
            const localYear = parseInt(localDate.substring(0, 4));
            if (globalYear > 0 && Math.abs(localYear - globalYear) <= 1) finalReleaseDate = localDate;
        }
    }

    const item = {
        id: d.id, title: d.title || d.name, poster: d.poster_path ? IMAGE_BASE_URL + d.poster_path : null,
        backdrop: d.backdrop_path ? IMAGE_BASE_URL.replace('w500', 'w780') + d.backdrop_path : null,
        type: type, year: (finalReleaseDate || '').substring(0, 4), releaseDate: finalReleaseDate,
        overview: d.overview, genres: d.genres ? d.genres.map(g => g.name) : [],
        isFavorite: false, customTags: [], vod: vodList, tmdbRating: d.vote_average ? parseFloat(d.vote_average).toFixed(1) : null
    };
    if (type === 'tv') {
        item.status = d.status;
        
        // --- POCZĄTEK ZMIANY: Przesunięcie czasu dla Europy (+1 dzień) ---
        let adjustedAirDate = null;
        if (d.next_episode_to_air && d.next_episode_to_air.air_date) {
            const tempDate = new Date(d.next_episode_to_air.air_date);
            tempDate.setDate(tempDate.getDate() + 1); // Dodajemy 1 dzień
            adjustedAirDate = tempDate.toISOString().split('T')[0]; // Formatujemy z powrotem do "RRRR-MM-DD"
        }

        item.nextEpisodeToAir = d.next_episode_to_air ? { 
            date: adjustedAirDate, 
            season: d.next_episode_to_air.season_number, 
            episode: d.next_episode_to_air.episode_number 
        } : null;
        // --- KONIEC ZMIANY ---

        const realSeasons = d.seasons ? d.seasons.filter(s => s.season_number > 0) : [];
        item.seasons = realSeasons; 
        item.numberOfSeasons = realSeasons.length; 
        item.numberOfEpisodes = realSeasons.reduce((acc, s) => acc + s.episode_count, 0); 
        item.progress = {};
    } else if (type === 'movie') { 
        item.runtime = d.runtime || null; 
    }
    
    return item;
}
async function getCredits(id, type) {
    if (String(id).startsWith('custom_')) return [];
    const cacheKey = `credits_${type}_${id}`;
    const cached = await db.getCache(cacheKey, 7); if (cached) return cached;
    const data = await fetchFromTMDB(`/${type}/${id}/credits`);
    if (!data) return [];
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
    let data = await fetchFromTMDB(`/${type}/${id}/recommendations`, { page: 1 });
    let results = data?.results ? data.results.filter(i => i.poster_path) : [];
    if (results.length === 0) {
        data = await fetchFromTMDB(`/${type}/${id}/similar`, { page: 1 });
        results = data?.results ? data.results.filter(i => i.poster_path) : [];
    }
    const finalRes = results.slice(0, 15);
    await db.setCache(cacheKey, finalRes); return finalRes;
}

async function getSeasonDetails(seriesId, seasonNumber) {
    const cacheKey = `season_${seriesId}_${seasonNumber}`;
    const cached = await db.getCache(cacheKey, 2); if (cached) return cached;
    const data = await fetchFromTMDB(`/tv/${seriesId}/season/${seasonNumber}`);
    if (!data) return null;
    await db.setCache(cacheKey, data); return data;
}

async function getActorDetails(actorId) {
    const cacheKey = `actor_${actorId}`;
    const cached = await db.getCache(cacheKey, 7); if (cached) return cached;
    let dt = await fetchFromTMDB(`/person/${actorId}`);
    if (!dt) return null;
    if (!dt.biography) { const en = await fetchFromTMDB(`/person/${actorId}`, { language: 'en-US' }); if (en) dt.biography = en.biography; }
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

async function getReviews(id, type) {
    if (String(id).startsWith('custom_')) return [];
    const cacheKey = `reviews_full_${type}_${id}`;
    const cached = await db.getCache(cacheKey, 7); if (cached) return cached;
    let data = await fetchFromTMDB(`/${type}/${id}/reviews`, { page: 1, language: 'pl-PL' });
    if (!data || !data.results || data.results.length === 0) {
        data = await fetchFromTMDB(`/${type}/${id}/reviews`, { page: 1, language: 'en-US' });
    }
    const finalRes = data?.results ? data.results : [];
    await db.setCache(cacheKey, finalRes); return finalRes;
}

// ==========================================
// 10. FUNKCJE POMOCNICZE WIDOKÓW
// ==========================================
function isSeriesFinished(item) { if (item.type !== 'tv') return true; return item.status === 'Ended' || item.status === 'Canceled'; }
function getAllUniqueTags() { const allItems = [...data.moviesToWatch, ...data.moviesWatched, ...data.seriesToWatch, ...data.seriesWatched]; return [...new Set(allItems.flatMap(item => item.customTags || []))].sort(); }
function renderCollapsibleText(text) { if (!text) return 'Brak informacji dla tego wpisu.'; const safeText = escapeHTML(text).replace(/\n/g, '<br>'); if (safeText.length > 280) { return `<div class="collapsible-text-container"><div class="overview-text collapsible-text">${safeText}</div><button type="button" class="read-more-btn" onclick="this.previousElementSibling.classList.toggle('expanded'); this.textContent = this.previousElementSibling.classList.contains('expanded') ? 'Zwiń' : 'Rozwiń';">Rozwiń</button></div>`; } return `<div class="overview-text">${safeText}</div>`; }
function getNextEpisodeInfo(item) { if (!item.seasons || item.seasons.length === 0) return null; if (!item.progress) item.progress = {}; const sortedSeasons = [...item.seasons].sort((a, b) => a.season_number - b.season_number); const today = new Date(); today.setHours(0, 0, 0, 0); for (let s of sortedSeasons) { const sNum = s.season_number; if (sNum === 0) continue; const watched = item.progress[sNum] || []; let maxAvailableEp = s.episode_count; if (item.nextEpisodeToAir && item.nextEpisodeToAir.season === sNum) { const airDate = new Date(item.nextEpisodeToAir.date); if (airDate > today) maxAvailableEp = item.nextEpisodeToAir.episode - 1; } if (watched.length < maxAvailableEp) { for (let i = 1; i <= maxAvailableEp; i++) { if (!watched.includes(i)) return { season: sNum, episode: i, string: `S${String(sNum).padStart(2, '0')}E${String(i).padStart(2, '0')}` }; } } } return null; }
function getNextEpisodeStr(item) { const info = getNextEpisodeInfo(item); return info ? info.string : null; }

function getStatusBadge(status) {
    if (!status) return '';
    switch (status) {
        case 'Returning Series': return '<span class="status-badge status-returning"><span class="status-dot"></span>W produkcji</span>';
        case 'Ended': return '<span class="status-badge status-ended"><span class="status-dot"></span>Zakończony</span>';
        case 'Canceled': return '<span class="status-badge status-canceled"><span class="status-dot"></span>Anulowany</span>';
        case 'In Production': return '<span class="status-badge status-in-production"><span class="status-dot"></span>Tworzenie</span>';
        default: return `<span class="status-badge" style="background:var(--card-color); color: var(--text-secondary); border: 1px solid var(--border-color);"><span class="status-dot" style="background:var(--text-secondary);"></span>${escapeHTML(status)}</span>`;
    }
}

function getNextAirDateString(nextEpData) { 
    if (!nextEpData || !nextEpData.date) return null; 
    
    // Tworzymy datę i ucinamy godziny, by Polska strefa czasowa nie psuła dni
    const airDate = new Date(nextEpData.date); 
    airDate.setHours(0, 0, 0, 0); 
    
    const today = new Date(); 
    today.setHours(0, 0, 0, 0); 
    
    // Zmiana z ceil na round - koniec z przekłamywaniem dni o jeden w górę!
    const diffDays = Math.round((airDate - today) / (1000 * 60 * 60 * 24)); 
    
    const epString = `S${String(nextEpData.season).padStart(2, '0')}E${String(nextEpData.episode).padStart(2, '0')}`; 
    const dateString = airDate.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }); 
    
    if (diffDays < 0) return null; 
    if (diffDays === 0) return `${epString} dzisiaj!`; 
    if (diffDays === 1) return `${epString} jutro!`; 
    if (diffDays > 1 && diffDays <= 7) return `${epString} za ${diffDays} dni`; 
    return `${epString}: ${dateString}`; 
}

const formatRuntime = (minutes) => { if (!minutes || minutes <= 0) return ''; const hours = Math.floor(minutes / 60); const remainingMinutes = minutes % 60; let formatted = []; if (hours > 0) formatted.push(`${hours}h`); if (remainingMinutes > 0) formatted.push(`${remainingMinutes}min`); return formatted.join(' '); };

const generateStarRatingDisplay = (rating) => { let starsHTML = ''; const starPath = "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"; for (let i = 1; i <= 5; i++) { if (rating >= i) { starsHTML += `<svg viewBox="0 0 24 24" fill="var(--warning-color)"><path d="${starPath}"/></svg>`; } else if (rating >= i - 0.5) { starsHTML += `<svg viewBox="0 0 24 24"><defs><linearGradient id="half_grad_${i}" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="50%" stop-color="var(--warning-color)"/><stop offset="50%" stop-color="var(--border-color)"/></linearGradient></defs><path d="${starPath}" fill="url(#half_grad_${i})"/></svg>`; } else { starsHTML += `<svg viewBox="0 0 24 24" fill="var(--border-color)"><path d="${starPath}"/></svg>`; } } return `<div class="star-rating-display">${starsHTML}</div>`; };

const getListAndItem = (id, type) => { for (const listName in data) { if (Array.isArray(data[listName])) { const item = data[listName].find(i => String(i.id) === String(id) && i.type === type); if (item) return { listName, item }; } } return { listName: null, item: null }; };

const showMainContent = () => { document.getElementById('configSection').style.display = 'none'; document.getElementById('mainContent').style.display = 'flex'; };

function setupSwipeToClose(modalElement, closeCallback) {
    const wrapper = modalElement.querySelector('.modern-modal-wrapper'); if (!wrapper) return;
    let startY = 0; let currentY = 0; let isDragging = false;
    wrapper.addEventListener('touchstart', (e) => { const scrollArea = wrapper.querySelector('.modern-modal-scroll'); if (scrollArea && scrollArea.contains(e.target) && scrollArea.scrollTop > 0) { isDragging = false; return; } startY = e.touches[0].clientY; isDragging = true; wrapper.style.transition = 'none'; }, { passive: true });
    wrapper.addEventListener('touchmove', (e) => { if (!isDragging) return; const deltaY = e.touches[0].clientY - startY; if (deltaY > 0) { e.preventDefault(); currentY = deltaY; wrapper.style.transform = `translateY(${currentY}px)`; } }, { passive: false });
    wrapper.addEventListener('touchend', () => { if (!isDragging) return; isDragging = false; wrapper.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'; if (currentY > 100) { wrapper.style.transform = `translateY(100%)`; setTimeout(closeCallback, 250); } else wrapper.style.transform = `translateY(0)`; currentY = 0; });
}

// ==========================================
// 11. WIDOKI MODALNE
// ==========================================
async function openSortModal() {
    toggleAppDepthEffect(true);
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

    const optsHTML = opts.map(o => `<label class="modern-radio-row"><input type="radio" name="sort" value="${o.value}" ${state.sortBy === o.value ? 'checked' : ''}><svg class="icon" viewBox="0 0 24 24">${o.icon}</svg><span class="label-text">${o.label}</span><svg class="check-icon" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></label>`).join('');
    const modal = document.getElementById('detailsModalContainer');
    modal.innerHTML = `<div class="modal-overlay"><div class="modern-modal-wrapper control-modal-content"><div class="modal-drag-handle"></div><h3>Sortuj</h3><div class="control-modal-options">${optsHTML}</div><div class="control-modal-footer"><button class="reset-btn">Domyślne</button><button class="apply-btn">Zastosuj</button></div></div></div>`;

    const close = () => { modal.innerHTML = ''; toggleAppDepthEffect(false); };
    setupSwipeToClose(modal.querySelector('.modal-overlay'), close);
    modal.querySelector('.modal-overlay').onclick = e => { if (e.target.classList.contains('modal-overlay')) close(); };
    modal.querySelector('.apply-btn').onclick = async () => { const sel = document.querySelector('input[name="sort"]:checked'); if (sel) state.sortBy = sel.value; await saveData(); updateToolbarUI(viewState.activeMainTab); renderList(data[listId], listId); close(); };
    modal.querySelector('.reset-btn').onclick = async () => { state.sortBy = 'dateAdded_desc'; await saveData(); updateToolbarUI(viewState.activeMainTab); renderList(data[listId], listId); close(); };
}

function openBackupSettingsModal() {
    toggleAppDepthEffect(true);
    const currentFreq = localStorage.getItem('smartBackupFreq') || '30';

    const opts = [
        { value: '0', label: 'Wyłączone' },
        { value: '7', label: 'Przypominaj co 7 dni' },
        { value: '30', label: 'Przypominaj co 30 dni' },
        { value: '90', label: 'Przypominaj co 90 dni' }
    ];

    const optsHTML = opts.map(o => `<label class="modern-radio-row"><input type="radio" name="backup-freq" value="${o.value}" ${currentFreq === o.value ? 'checked' : ''}><span class="label-text">${o.label}</span><svg class="check-icon" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></label>`).join('');

    const modal = document.getElementById('detailsModalContainer');
    modal.innerHTML = `<div class="modal-overlay"><div class="modern-modal-wrapper control-modal-content"><div class="modal-drag-handle"></div><h3 style="margin-bottom:8px;">Planowany Backup</h3><p style="font-size:0.85rem; color:var(--text-secondary); text-align:center; margin-bottom:16px;">Przypomni o kopii zapasowej, jeśli wprowadzono zmiany w kolekcji.</p><div class="control-modal-options">${optsHTML}</div><div class="control-modal-footer"><button class="apply-btn" style="width:100%;">Zapisz</button></div></div></div>`;

    const close = () => { modal.innerHTML = ''; toggleAppDepthEffect(false); };
    setupSwipeToClose(modal.querySelector('.modal-overlay'), close);
    modal.querySelector('.modal-overlay').onclick = e => { if (e.target.classList.contains('modal-overlay')) close(); };

    modal.querySelector('.apply-btn').onclick = () => {
        const sel = document.querySelector('input[name="backup-freq"]:checked');
        if (sel) { localStorage.setItem('smartBackupFreq', sel.value); showCustomAlert('Zapisano', 'Ustawienia przypomnień zaktualizowane.', 'success'); }
        close();
    };
}

async function openFilterModal() {
    toggleAppDepthEffect(true);
    const listId = getActiveListId(); const state = viewState[listId];

    // Zabezpieczenie stanu startowego
    if (state.filterByVod === undefined) state.filterByVod = 'all';
    if (state.maxRuntime === undefined) state.maxRuntime = 240; // 240 to "Bez limitu"

    const isMovies = listId.includes('movies'); // Sprawdzamy czy to zakładka filmów
    const uniqueGenres = [...new Set((data[listId] || []).flatMap(item => item.genres || []))].sort();
    const uniqueTags = [...new Set((data[listId] || []).flatMap(item => item.customTags || []))].sort();
    const topVodProviders = ['Netflix', 'Max', 'Amazon Prime Video', 'Disney Plus', 'Apple TV Plus', 'SkyShowtime'];

    // 1. Zbudowanie Suwaka Czasu (Tylko dla filmów)
    let timeFilterHTML = '';
    if (isMovies) {
        const formatTime = (mins) => {
            if (mins >= 240) return 'Bez limitu';
            const h = Math.floor(mins / 60); const m = mins % 60;
            return h > 0 ? `${h}h ${m}m` : `${m}m`;
        };
        timeFilterHTML = `
            <div class="filter-section-title" style="margin-top:0;">Ile masz czasu? ⏱️</div>
            <div style="background: color-mix(in srgb, var(--bg-color) 70%, rgba(0,0,0,0.2)); border: 1px solid color-mix(in srgb, var(--border-color) 30%, transparent); border-radius: var(--radius-md); padding: 16px; margin-bottom: 20px; box-shadow: inset 0 2px 6px rgba(0,0,0,0.3);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 16px;">
                    <span style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 600;">Maksymalnie:</span>
                    <strong id="runtime-display" style="color: var(--primary-color); font-size: 1.1rem;">${formatTime(state.maxRuntime)}</strong>
                </div>
                <input type="range" id="runtime-slider" min="60" max="240" step="10" value="${state.maxRuntime}" style="width:100%;">
                <div style="display:flex; justify-content:space-between; font-size:0.7rem; color:var(--text-secondary); margin-top:8px; font-weight:600;">
                    <span>1 godz.</span><span>Bez limitu</span>
                </div>
            </div>
        `;
    }

    // 2. Reszta starych filtrów
    let filterOptionsHTML = `${timeFilterHTML}<label class="modern-toggle-row"><span>Tylko ulubione</span><div class="toggle-switch"><input type="checkbox" id="filter-favorites-checkbox" ${state.filterFavoritesOnly ? 'checked' : ''}><div class="slider"></div></div></label><div class="filter-section-title">Gdzie obejrzeć? (VOD)</div><div class="modern-chip-group" style="margin-bottom: 16px;"><label class="modern-chip"><input type="radio" name="vod-filter" value="all" ${state.filterByVod === 'all' ? 'checked' : ''}><span>Wszystkie</span></label>`;
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

    // Ożywienie suwaka
    if (isMovies) {
        const slider = document.getElementById('runtime-slider');
        const display = document.getElementById('runtime-display');
        slider.addEventListener('input', (e) => {
            const v = parseInt(e.target.value);
            if (v >= 240) display.textContent = 'Bez limitu';
            else { const h = Math.floor(v / 60); const m = v % 60; display.textContent = h > 0 ? `${h}h ${m}m` : `${m}m`; }
        });
    }

    const close = () => { modalContainer.innerHTML = ''; toggleAppDepthEffect(false); };
    modalContainer.querySelector('.modal-overlay').onclick = e => { if (e.target.classList.contains('modal-overlay')) close(); };
    setupSwipeToClose(modalContainer.querySelector('.modal-overlay'), close);

    modalContainer.querySelector('.apply-btn').onclick = async () => {
        state.filterFavoritesOnly = document.getElementById('filter-favorites-checkbox').checked;
        if (isMovies) state.maxRuntime = parseInt(document.getElementById('runtime-slider').value);

        const selGenre = document.querySelector('input[name="genre-filter"]:checked'); if (selGenre) state.filterByGenre = selGenre.value;
        const selTag = document.querySelector('input[name="tag-filter"]:checked'); if (selTag) state.filterByCustomTag = selTag.value;
        const selVod = document.querySelector('input[name="vod-filter"]:checked'); if (selVod) state.filterByVod = selVod.value;

        await saveData(); updateToolbarUI(viewState.activeMainTab); renderList(data[listId], listId); close();
    };
    modalContainer.querySelector('.reset-btn').onclick = async () => {
        state.filterFavoritesOnly = false; state.filterByGenre = 'all'; state.filterByCustomTag = 'all'; state.filterByVod = 'all';
        if (isMovies) state.maxRuntime = 240;
        await saveData(); updateToolbarUI(viewState.activeMainTab); renderList(data[listId], listId); close();
    };
}

const deleteTagGlobally = async (tagToDelete, item, onUpdate) => {
    if (await showCustomConfirm('Usuń tag', `Czy na pewno chcesz trwale usunąć tag "${tagToDelete}" z CAŁEGO konta?`)) {
        ['moviesToWatch', 'moviesWatched', 'seriesToWatch', 'seriesWatched'].forEach(listName => { data[listName].forEach(i => { if (i.customTags) i.customTags = i.customTags.filter(t => t !== tagToDelete); }); });
        await saveData(); if (item && item.customTags) item.customTags = item.customTags.filter(t => t !== tagToDelete);
        onUpdate(); const activeList = getActiveListId(); if (activeList) renderList(data[activeList], activeList, true);
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
        closeBtn.onclick = close; overlay.onclick = (e) => { if (e.target === overlay) close(); };
        const addNewTag = async () => { const val = input.value.trim(); if (val && !(item.customTags || []).includes(val)) { if (!item.customTags) item.customTags = []; item.customTags.push(val); await saveData(); close(); } };
        addBtn.onclick = addNewTag; input.addEventListener('keyup', (e) => { if (e.key === 'Enter') addNewTag(); });
        c.querySelectorAll('.existing-tag-btn').forEach(btn => { btn.onclick = async (e) => { const t = e.currentTarget.dataset.addtag; if (!item.customTags) item.customTags = []; item.customTags.push(t); await saveData(); close(); }; });
        c.querySelectorAll('.delete-global-tag-btn').forEach(btn => { btn.onclick = (e) => { const t = e.currentTarget.dataset.deltag; deleteTagGlobally(t, item, renderContent); }; });
    };
    renderContent();
}

function showInfoModal() {
    toggleAppDepthEffect(true);
    const checkIcon = `<svg class="info-feature-icon" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    const strengthsHTML = `<h3 style="text-align: left; margin-top: 24px; margin-bottom: 16px; font-size: 1.1rem; color: var(--text-color);">Mocne strony aplikacji</h3><div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;"><div style="background: color-mix(in srgb, var(--success-color) 10%, transparent); border: 1px solid color-mix(in srgb, var(--success-color) 30%, transparent); padding: 16px; border-radius: var(--radius-md); display: flex; gap: 12px; align-items: flex-start;"><svg style="width:24px; height:24px; fill:none; stroke:var(--success-color); stroke-width:2; flex-shrink:0;" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg><div><strong style="display:block; color:var(--text-color); font-size:0.95rem; margin-bottom:4px;">100% Prywatności</strong><span style="font-size:0.85rem; color:var(--text-secondary); line-height:1.4;">Brak kont, logowania i śledzenia. Twoje dane są przypisane tylko do Twojego urządzenia.</span></div></div><div style="background: color-mix(in srgb, var(--info-color) 10%, transparent); border: 1px solid color-mix(in srgb, var(--info-color) 30%, transparent); padding: 16px; border-radius: var(--radius-md); display: flex; gap: 12px; align-items: flex-start;"><svg style="width:24px; height:24px; fill:none; stroke:var(--info-color); stroke-width:2; flex-shrink:0;" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg><div><strong style="display:block; color:var(--text-color); font-size:0.95rem; margin-bottom:4px;">Szybkość i niezależność</strong><span style="font-size:0.85rem; color:var(--text-secondary); line-height:1.4;">Działa jako PWA. Ładuje się błyskawicznie i nie zużywa niepotrzebnie baterii w tle.</span></div></div><div style="background: color-mix(in srgb, var(--primary-color) 10%, transparent); border: 1px solid color-mix(in srgb, var(--primary-color) 30%, transparent); padding: 16px; border-radius: var(--radius-md); display: flex; gap: 12px; align-items: flex-start;"><svg style="width:24px; height:24px; fill:none; stroke:var(--primary-color); stroke-width:2; flex-shrink:0;" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg><div><strong style="display:block; color:var(--text-color); font-size:0.95rem; margin-bottom:4px;">Czysty interfejs</strong><span style="font-size:0.85rem; color:var(--text-secondary); line-height:1.4;">Bez reklam, bez abonamentu. Stworzone z myślą o prostocie.</span></div></div></div>`;
    const infoHTML = `<div class="modal-overlay"><div class="modern-modal-wrapper"><div class="modal-drag-handle"></div><button class="modal-top-close-btn" title="Zamknij">${ICONS.close}</button><div class="modern-modal-scroll" style="padding: 32px 24px;"><h2 style="margin: 0 0 8px; display: flex; align-items: center; gap: 12px; font-size: 1.6rem;"><svg class="app-logo-icon" style="width:36px; height:36px;" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path d="M401.7,144.2C382.4,106.6,343.3,80,299.7,80c-48.5,0-88.7,35.5-96.8,81.4c-42.5,0-76.8,34.4-76.8,76.8 c0,35.1,22.4,64.8,53.2,73.8c-7.3,4.4-15.6,6.9-24.4,6.9c-32.1,0-58.1,26-58.1,58.1h29.1c0-16,13-29.1,29.1-29.1 s29.1,13,29.1,29.1h29.1h29.1h29.1c0-16,13-29.1,29.1-29.1s29.1,13,29.1,29.1h29.1c0-32.1-26-58.1-58.1-58.1 c-8.8,0-17.1,2.5-24.4-6.9c30.8-9,53.2-38.7,53.2-73.8C478.5,178.6,444.2,144.2,401.7,144.2z M241.6,220.3 c-12,0-21.8-9.8-21.8-21.8s9.8-21.8,21.8-21.8s21.8,9.8,21.8,21.8S253.6,220.3,241.6,220.3z M358.4,220.3 c-12,0-21.8-9.8-21.8-21.8s9.8-21.8,21.8-21.8s21.8,9.8,21.8,21.8S370.4,220.3,358.4,220.3z"/></svg><span>PenguinFlix</span></h2><p style="color: var(--text-secondary); margin-bottom: 24px; font-size: 1.05rem;">Twój osobisty dziennik filmów i seriali.</p><h3 style="text-align: left; margin-bottom: 16px; font-size: 1.1rem; color: var(--text-color);">Kluczowe Funkcje</h3><ul class="info-feature-list"><li class="info-feature-item">${checkIcon} <span>Oceny, recenzje, dodawanie tagów i ręcznych wpisów.</span></li><li class="info-feature-item">${checkIcon} <span>Śledzenie odcinków (z kalendarzem premier).</span></li><li class="info-feature-item">${checkIcon} <span>Panel powiadomień.</span></li><li class="info-feature-item">${checkIcon} <span>Odkrywanie trendów, trailerów i pełnej obsady.</span></li><li class="info-feature-item">${checkIcon} <span>Zaawansowane filtry VOD (Netflix, HBO itp.).</span></li></ul>${strengthsHTML}<div class="important-note"><strong>Ważne:</strong> Z racji pełnej prywatności i braku chmury, aby uniknąć utraty danych, <strong>regularnie twórz kopię zapasową</strong> w zakładce Profil!</div><p style="font-size: 0.8rem; color: var(--text-secondary);">Ta aplikacja korzysta z API The Movie Database (TMDb).<br><img src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg" alt="TMDb Logo" class="tmdb-logo"></p></div></div></div>`;
    const c = document.getElementById('customAlertContainer'); c.innerHTML = infoHTML;
    const modal = c.querySelector('.modal-overlay'); const close = () => { c.innerHTML = ''; toggleAppDepthEffect(false); };
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
    toast.innerHTML = `<div class="toast-icon-wrap ${type}">${icons[type] || icons.info}</div><div class="toast-content"><span class="toast-title">${title}</span><span class="toast-msg">${message}</span></div><div class="toast-progress" style="color: ${type === 'success' ? 'var(--success-color)' : type === 'error' ? 'var(--primary-color)' : '#3b82f6'}"></div>`;
    toastContainer.appendChild(toast);
    const hideTimeout = setTimeout(() => { if (!toast.classList.contains('hiding')) { toast.classList.add('hiding'); toast.addEventListener('animationend', () => toast.remove()); } }, 3500);
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
        o.onclick = (e) => { if (e.target === o) cleanup(false); };
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
        let isReleased = false; if (item.release_date || item.first_air_date) { const rd = new Date(item.release_date || item.first_air_date); const td = new Date(); td.setHours(0, 0, 0, 0); isReleased = rd <= td; }
        const wBtn = isReleased ? `<button class="icon-button add-item" data-id="${item.id}" data-type="${item.media_type}" data-list="watched" title="Obejrzane"><svg viewBox="0 0 24 24"><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,16.5L6.5,12L7.91,10.59L11,13.67L16.09,8.59L17.5,10L11,16.5Z"/></svg></button>` : ``;
        div.innerHTML = `<img src="${posterSrc}" alt="Okładka" onerror="this.src='${POSTER_PLACEHOLDER}';"><div class="info"><strong>${safeTitle}</strong><span>${((item.release_date || item.first_air_date) || 'Brak daty').substring(0, 4)}</span></div><div class="actions"><button class="icon-button add-item" data-id="${item.id}" data-type="${item.media_type}" data-list="toWatch" title="Do obejrzenia"><svg viewBox="0 0 24 24"><path d="M17,3A2,2 0 0,1 19,5V21L12,18L5,21V5C5,3.89 5.9,3 7,3H17M11,14H9V12H11V14M15,14H13V12H15V14M11,10H9V8H11V10M15,10H13V8H15V10Z"/></svg></button>${wBtn}</div>`;
        container.appendChild(div);
    });
    if (filtered.length > 5) { const showAll = document.createElement('div'); showAll.className = 'search-item show-all-results-btn'; showAll.innerHTML = `<span>Pokaż wszystkie ${filtered.length} wyników</span>`; showAll.style.justifyContent = 'center'; showAll.style.fontWeight = '600'; container.appendChild(showAll); showAll.addEventListener('click', showAllResultsModal); }
}

function showAllResultsModal() {
    toggleAppDepthEffect(true);
    const query = escapeHTML(document.getElementById('searchInput').value); const modalContainer = document.getElementById('detailsModalContainer');
    const filtered = fullSearchResults.filter(item => (item.media_type === 'movie' || item.media_type === 'tv') && item.poster_path);
    const rHTML = filtered.map(item => {
        const safeTitle = escapeHTML(item.title || item.name); const posterSrc = item.poster_path ? IMAGE_BASE_URL.replace('w500', 'w200') + item.poster_path : POSTER_PLACEHOLDER;
        let isReleased = false; if (item.release_date || item.first_air_date) { const rd = new Date(item.release_date || item.first_air_date); const td = new Date(); td.setHours(0, 0, 0, 0); isReleased = rd <= td; }
        const wBtn = isReleased ? `<button class="icon-button add-item" data-id="${item.id}" data-type="${item.media_type}" data-list="watched" title="Obejrzane"><svg viewBox="0 0 24 24"><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,16.5L6.5,12L7.91,10.59L11,13.67L16.09,8.59L17.5,10L11,16.5Z"/></svg></button>` : ``;
        return `<div class="search-item" data-id="${item.id}" data-type="${item.media_type}"><img class="fade-image" src="${posterSrc}" onload="this.classList.add('loaded')" onerror="this.src='${POSTER_PLACEHOLDER}';"><div class="info"><strong>${safeTitle}</strong><span>${((item.release_date || item.first_air_date) || 'Brak daty').substring(0, 4)}</span></div><div class="actions"><button class="icon-button add-item" data-id="${item.id}" data-type="${item.media_type}" data-list="toWatch"><svg viewBox="0 0 24 24"><path d="M17,3A2,2 0 0,1 19,5V21L12,18L5,21V5C5,3.89 5.9,3 7,3H17M11,14H9V12H11V14M15,14H13V12H15V14M11,10H9V8H11V10M15,10H13V8H15V10Z"/></svg></button>${wBtn}</div></div>`;
    }).join('');
    modalContainer.innerHTML = `<div class="modal-overlay"><div class="modern-modal-wrapper" style="max-width: 700px;"><div class="modal-drag-handle"></div><button class="modal-top-close-btn" title="Zamknij">${ICONS.close}</button><div style="padding: 24px 24px 16px; border-bottom: 1px solid var(--border-color); text-align: center;"><h2 style="margin: 0; font-size: 1.2rem;">Wyniki dla: "${query}"</h2></div><div class="modern-modal-scroll" style="padding: 0;"><div class="all-results-list">${rHTML}</div></div></div></div>`;
    document.getElementById('searchResults').style.display = 'none';

    const modal = modalContainer.querySelector('.modal-overlay'); const close = () => { modalContainer.innerHTML = ''; toggleAppDepthEffect(false); };
    modal.addEventListener('click', e => { if (e.target === modal) close(); }); modal.querySelector('.modal-top-close-btn').addEventListener('click', close); setupSwipeToClose(modal, close);
    modal.querySelector('.all-results-list').addEventListener('click', (e) => {
        const addBtn = e.target.closest('.add-item'); const item = e.target.closest('.search-item');
        if (addBtn) { e.stopPropagation(); handleQuickAddItem(addBtn); close(); } else if (item) { if (item.dataset.id) { openPreviewModal(item.dataset.id, item.dataset.type); close(); } }
    });
}

function getModalHeaderHTML(item, isAdded) {
    const bgImage = item.backdrop || item.poster || POSTER_PLACEHOLDER;
    const bgFilter = item.backdrop ? '' : 'filter: blur(20px) brightness(0.5); transform: scale(1.1);';
    let rTime = ''; if (item.type === 'movie' && item.runtime) rTime = ` • ${formatRuntime(item.runtime)}`;
    let sBadge = item.type === 'tv' ? getStatusBadge(item.status) : '';

    return `<div class="modal-drag-handle"></div>
    <button class="modal-top-close-btn" title="Zamknij">${ICONS.close}</button>
    <div class="modal-hero-header">
        <div class="hero-bg-img" style="background-image: url('${bgImage}'); ${bgFilter}"></div>
        <div class="hero-gradient"></div>
        <div class="hero-content">
            <div class="hero-poster-wrapper">
                <img src="${item.poster || POSTER_PLACEHOLDER}" class="hero-poster-mini" fetchpriority="high" decoding="sync" onerror="this.src='${POSTER_PLACEHOLDER}';">
            </div>
            <div class="hero-text">
                <div class="hero-title-row">
                    <h2 class="hero-title">${escapeHTML(item.title)}</h2>
                    <div class="hero-actions-container" style="display:flex; flex-direction:column; gap:8px; flex-shrink:0;">
                        <div id="hero-fav-container"></div>
                    </div>
                </div>
                <div class="hero-meta">${item.year}${rTime}${sBadge}</div>
                <div id="trailer-section-container"></div>
            </div>
        </div>
    </div>`;
}

function renderProvidersHTML(providers) {
    if (!providers || providers.length === 0) return '';
    const lHTML = providers.map(p => `<img class="provider-logo" src="${IMAGE_BASE_URL.replace('w500', 'w92')}${p.logo_path}" alt="${escapeHTML(p.provider_name)}" title="${escapeHTML(p.provider_name)}">`).join('');
    return `<div class="providers-section"><h3>Gdzie obejrzeć?</h3><div class="providers-list">${lHTML}</div><span style="font-size:0.75rem; color:var(--text-secondary); display:block; margin-top:8px;">Dane o platformach dostarcza JustWatch</span></div>`;
}

function renderRecommendationsHTML(recs, type) {
    if (!recs || recs.length === 0) return '';
    const rHTML = recs.map(item => { const pSrc = IMAGE_BASE_URL.replace('w500', 'w200') + item.poster_path; return `<div class="recommendation-item" data-id="${item.id}" data-type="${type}"><img src="${pSrc}" alt="Okładka" loading="lazy" onerror="this.src='${POSTER_PLACEHOLDER}';"><strong>${escapeHTML(item.title || item.name)}</strong></div>`; }).join('');
    return `<div class="recommendations-section"><h3>Polecane tytuły</h3><div class="recommendations-scroller">${rHTML}</div></div>`;
}

function renderReviewsHTML(reviews, id, type) {
    if (!reviews || reviews.length === 0) return '';
    const previewReviews = reviews.slice(0, 4);
    const cards = previewReviews.map(r => {
        const ratingBadge = r.author_details?.rating ? `<span class="public-review-rating">★ ${r.author_details.rating}</span>` : '';
        const cleanContent = escapeHTML(r.content).replace(/\n/g, '<br>');
        return `<div class="public-review-card" onclick="openFullReviewsModal('${id}', '${type}')" style="cursor:pointer; transition:transform 0.2s;"><div class="public-review-header"><div class="public-review-author">${escapeHTML(r.author)}</div>${ratingBadge}</div><div class="public-review-content">${cleanContent}</div></div>`;
    }).join('');

    return `<div class="reviews-section"><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;"><h3 style="margin: 0;">Opinie społeczności</h3><button class="reviews-header-btn" onclick="openFullReviewsModal('${id}', '${type}')">Wszystkie (${reviews.length}) <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg></button></div><div class="reviews-scroller">${cards}</div></div>`;
}

async function openFullReviewsModal(id, type) {
    const c = document.getElementById('actorModalContainer');
    c.innerHTML = `<div class="modal-overlay" style="z-index: 3000;"><div class="modern-modal-wrapper"><div class="modern-modal-scroll" style="padding: 40px; text-align:center; color:var(--text-secondary);">Ładowanie opinii...</div></div></div>`;
    const reviews = await getReviews(id, type);
    if (!reviews || reviews.length === 0) { c.innerHTML = ''; return; }

    const listHTML = reviews.map(r => {
        const ratingBadge = r.author_details?.rating ? `<span class="public-review-rating">★ ${r.author_details.rating}</span>` : '';
        const cleanContent = escapeHTML(r.content).replace(/\n/g, '<br>');
        return `<div style="background:var(--card-color); border:1px solid var(--border-color); padding:20px; border-radius:var(--radius-md); margin-bottom:16px; box-shadow:0 2px 8px rgba(0,0,0,0.1);"><div style="display:flex; justify-content:space-between; margin-bottom:16px;"><strong style="font-size:1.1rem;">${escapeHTML(r.author)}</strong>${ratingBadge}</div><div style="font-size:0.95rem; color:var(--text-secondary); line-height:1.6;">${cleanContent}</div></div>`;
    }).join('');

    c.innerHTML = `<div class="modal-overlay actor-modal-overlay" id="fullReviewsOverlay"><div class="modern-modal-wrapper" style="padding:0;"><div class="modal-drag-handle"></div><div style="padding: 16px 24px; border-bottom: 1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; background:var(--bg-color); z-index:10;"><h3 style="margin:0; font-size:1.2rem;">Opinie (${reviews.length})</h3><button class="icon-button close-reviews-btn" style="background:var(--card-color);">${ICONS.close}</button></div><div class="modern-modal-scroll" style="padding: 24px;">${listHTML}</div></div></div>`;

    const overlay = c.querySelector('#fullReviewsOverlay');
    const close = () => { c.innerHTML = ''; };
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    c.querySelector('.close-reviews-btn').addEventListener('click', close);
    setupSwipeToClose(overlay, close);
}

async function openPreviewModal(id, type) {
    toggleAppDepthEffect(true);
    history.pushState({ modalOpen: true }, '');

    const dModal = document.getElementById('detailsModalContainer');
    dModal.innerHTML = `<div class="modal-overlay"><div class="modern-modal-wrapper"><div class="skeleton-box skeleton-modal-header"></div><div class="skeleton-box skeleton-title"></div><div class="skeleton-box skeleton-text-line"></div><div class="skeleton-box skeleton-text-line"></div><div class="skeleton-box skeleton-text-line short"></div></div></div>`;

    const item = await getItemDetails(id, type);
    if (!item) { dModal.innerHTML = ''; toggleAppDepthEffect(false); showCustomAlert('Błąd', 'Brak danych.', 'error'); return; }

    const isAlreadyAdded = Object.values(data).flat().some(i => String(i.id) === String(id) && i.type === type);
    const localItem = Object.values(data).flat().find(i => String(i.id) === String(id) && i.type === type);
    if (localItem && localItem.customTags) item.customTags = localItem.customTags;

    let canWatch = true;
    if (item.type === 'tv' && !isSeriesFinished(item)) canWatch = false;
    else if (item.type === 'movie') { if (!item.releaseDate) canWatch = false; else { const t = new Date(); t.setHours(0, 0, 0, 0); const rd = new Date(item.releaseDate); rd.setHours(0, 0, 0, 0); if (rd > t) canWatch = false; } }

    let fHTML = isAlreadyAdded ? `<div class="modal-sticky-footer" style="justify-content: center;"><span style="display: flex; align-items: center; gap: 8px; font-weight: 600; color: var(--success-color);"><svg viewBox="0 0 24 24" style="width: 22px; height: 22px; fill: currentColor;"><path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z" /></svg> Tytuł w kolekcji</span></div>` : canWatch ? `<div class="modal-sticky-footer"><button id="previewAddToWatchedBtn" class="modal-btn secondary">Do Obejrzanych</button><button id="previewAddToWatchBtn" class="modal-btn primary">Do Obejrzenia</button></div>` : `<div class="modal-sticky-footer"><button id="previewAddToWatchBtn" class="modal-btn primary" style="width: 100%;">Dodaj do Obejrzenia</button></div>`;
    const tagsHTML = (item.customTags || []).map(t => `<span class="custom-tag">${escapeHTML(t)} <svg class="remove-tag" data-tag="${escapeHTML(t)}" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></span>`).join('');

    let addTagBtnHTML = isAlreadyAdded ? `<button id="modal-manage-tags-btn" style="background:var(--card-color); border:1px solid var(--border-color); color:var(--text-color); width:36px; height:36px; border-radius:50%; display:flex; justify-content:center; align-items:center; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.2); flex-shrink:0;" title="Dodaj Tag"><svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg></button>` : '';
    let pinBtnHTML = isAlreadyAdded ? `<button id="modal-pin-btn" style="background:${localItem && localItem.isPinned ? 'var(--info-color)' : 'var(--card-color)'}; border:1px solid ${localItem && localItem.isPinned ? 'var(--info-color)' : 'var(--border-color)'}; color:${localItem && localItem.isPinned ? '#ffffff' : 'var(--text-secondary)'}; width:36px; height:36px; border-radius:50%; display:flex; justify-content:center; align-items:center; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.2); flex-shrink:0; transition:all 0.2s ease;" title="Przypnij na górę listy">${ICONS.pin.replace('viewBox="0 0 24 24"', 'viewBox="0 0 24 24" style="width:18px;height:18px;fill:currentColor;"')}</button>` : '';
    let shareBtnHTML = `<button id="modal-share-btn" style="background:var(--card-color); border:1px solid var(--border-color); color:var(--text-color); width:36px; height:36px; border-radius:50%; display:flex; justify-content:center; align-items:center; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.2); flex-shrink:0; transition:color 0.2s;" data-title="${encodeURIComponent(item.title || '')}" data-poster="${item.poster || ''}" data-year="${item.year || ''}" data-rating="${item.tmdbRating || ''}" data-overview="${encodeURIComponent(item.overview || '')}" title="Udostępnij">${ICONS.share.replace('viewBox="0 0 24 24"', 'viewBox="0 0 24 24" style="width:18px;height:18px;fill:currentColor;"')}</button>`;

    let tmdbRatingInfo = item.tmdbRating && item.tmdbRating > 0 ? `<div style="display:flex; align-items:center; gap:12px;"><svg class="tmdb-rating-star" viewBox="0 0 24 24" style="width:32px;height:32px;fill:var(--warning-color);filter:drop-shadow(0 4px 8px rgba(255, 193, 7, 0.3));"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg><div class="tmdb-rating-info" style="display:flex;flex-direction:column;justify-content:center;"><div class="tmdb-rating-score" style="font-size:1.4rem;font-weight:800;color:var(--text-color);line-height:1;">${item.tmdbRating} <span class="max-score" style="font-size:0.9rem;color:var(--text-secondary);font-weight:600;">/ 10</span></div><div class="tmdb-rating-label" style="font-size:0.75rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:1px;margin-top:4px;font-weight:700;">Ocena TMDb</div></div></div>` : `<div></div>`;
    let actionRowHTML = `<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; padding:0 4px;">${tmdbRatingInfo}<div style="display:flex; align-items:center; gap:10px;">${addTagBtnHTML}${pinBtnHTML}${shareBtnHTML}</div></div>`;

    dModal.innerHTML = `<div class="modal-overlay"><div class="modern-modal-wrapper">${getModalHeaderHTML(item, isAlreadyAdded)}<div class="modern-modal-scroll"><div class="modal-body-content">${actionRowHTML}<div class="genres">${(item.genres || []).map(g => `<span class="genre-tag">${escapeHTML(g)}</span>`).join('')}${tagsHTML}</div><div><h3>Opis</h3>${renderCollapsibleText(item.overview)}</div><div id="providers-container"></div><div id="cast-container"></div><div id="recommendations-container"></div><div id="reviews-container"></div></div></div>${fHTML}</div></div>`;

    const modal = dModal.querySelector('.modal-overlay');
    const close = () => { dModal.innerHTML = ''; toggleAppDepthEffect(false); if (history.state && history.state.modalOpen) history.back(); };

    modal.addEventListener('click', async (e) => {
        if (e.target === modal) { close(); return; }
        const cast = e.target.closest('.cast-member[data-actor-id]'); if (cast) { openActorDetailsModal(cast.dataset.actorId); return; }
        const rec = e.target.closest('.recommendation-item');
        if (rec) {
            const rId = rec.dataset.id; const rType = rec.dataset.type;
            if (Object.values(data).flat().some(i => String(i.id) === String(rId) && i.type === rType)) openDetailsModal(rId, rType); else openPreviewModal(rId, rType);
            return;
        }
        const removeIcon = e.target.closest('.remove-tag');
        if (removeIcon) {
            if (localItem) { localItem.customTags = localItem.customTags.filter(t => t !== removeIcon.dataset.tag); await saveData(); }
            openPreviewModal(id, type); return;
        }
    });
    modal.querySelector('.modal-top-close-btn').addEventListener('click', close); setupSwipeToClose(modal, close);

    const mngBtn = modal.querySelector('#modal-manage-tags-btn');
    if (mngBtn) mngBtn.addEventListener('click', () => openManageTagsModal(item, () => openPreviewModal(id, type)));

    const pinBtn = modal.querySelector('#modal-pin-btn');
    if (pinBtn && localItem) {
        pinBtn.addEventListener('click', async (e) => {
            triggerHaptic('light');
            localItem.isPinned = !localItem.isPinned;
            e.currentTarget.style.background = localItem.isPinned ? 'var(--info-color)' : 'var(--card-color)';
            e.currentTarget.style.borderColor = localItem.isPinned ? 'var(--info-color)' : 'var(--border-color)';
            e.currentTarget.style.color = localItem.isPinned ? '#ffffff' : 'var(--text-secondary)';
            await saveData();
            const listId = getActiveListId();
            if (listId) renderList(data[listId], listId, true);
        });
    }

    const shareBtn = modal.querySelector('#modal-share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', (e) => {
            const btn = e.currentTarget;
            handleNativeShare(decodeURIComponent(btn.dataset.title || ''), btn.dataset.poster, btn.dataset.year, btn.dataset.rating, decodeURIComponent(btn.dataset.overview || ''));
        });
    }

    getWatchProviders(id, type).then(p => { const c = document.getElementById('providers-container'); if (c && p) c.innerHTML = renderProvidersHTML(p); });
    getRecommendations(id, type).then(r => { const c = document.getElementById('recommendations-container'); if (c && r.length > 0) c.innerHTML = renderRecommendationsHTML(r, type); });
    getTrailerKey(id, type).then(tk => { if (tk) { const c = document.getElementById('trailer-section-container'); if (c) { c.innerHTML = `<button class="hero-trailer-btn"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> Zwiastun</button>`; c.querySelector('.hero-trailer-btn').onclick = () => openTrailerModal(tk); } } });
    getCredits(id, type).then(c => { const cc = document.getElementById('cast-container'); if (cc && c.length > 0) { const cH = c.map(m => `<div class="cast-member" data-actor-id="${m.id}"><img src="${IMAGE_BASE_URL.replace('w500', 'w200')}${m.profile_path}" loading="lazy" onerror="this.outerHTML = ICONS.person;"><strong>${escapeHTML(m.name)}</strong><span>${escapeHTML(m.character)}</span></div>`).join(''); cc.innerHTML = `<div class="cast-section" style="margin-top:0; padding-top:0; border:none;"><h3>Obsada</h3><div class="cast-scroller">${cH}</div></div>`; } });
    getReviews(id, type).then(revs => { const c = document.getElementById('reviews-container'); if (c && revs.length > 0) c.innerHTML = renderReviewsHTML(revs, id, type); });

    if (!isAlreadyAdded) {
        const wBtn = document.getElementById('previewAddToWatchBtn'); const wdBtn = document.getElementById('previewAddToWatchedBtn');
        if (wBtn) wBtn.onclick = async () => { if (await addItemToList(id, type, 'toWatch')) close(); };
        if (wdBtn) wdBtn.onclick = async () => { if (await addItemToList(id, type, 'watched')) close(); };
    }
}

async function openDetailsModal(id, type) {
    toggleAppDepthEffect(true);
    history.pushState({ modalOpen: true }, '');

    const { listName, item } = getListAndItem(id, type);
    if (!item) { toggleAppDepthEffect(false); return; }

    const dModal = document.getElementById('detailsModalContainer');
    dModal.innerHTML = `<div class="modal-overlay"><div class="modern-modal-wrapper"><div class="skeleton-box skeleton-modal-header"></div><div class="skeleton-box skeleton-title"></div><div class="skeleton-box skeleton-text-line"></div><div class="skeleton-box skeleton-text-line short"></div></div></div>`;

    if (!String(id).startsWith('custom_') && (!item.backdrop || item.vod === undefined || item.tmdbRating === undefined || (type === 'movie' && item.runtime === undefined) || (type === 'tv' && item.status === undefined))) {
        const fd = await getItemDetails(id, type);
        if (fd) {
            item.backdrop = fd.backdrop || item.backdrop; item.poster = fd.poster || item.poster; item.overview = fd.overview || item.overview; item.genres = fd.genres || item.genres; item.releaseDate = fd.releaseDate || item.releaseDate; item.vod = fd.vod || [];
            item.tmdbRating = fd.tmdbRating || item.tmdbRating;
            if (type === 'tv') { item.status = fd.status !== undefined ? fd.status : item.status; item.nextEpisodeToAir = fd.nextEpisodeToAir !== undefined ? fd.nextEpisodeToAir : item.nextEpisodeToAir; item.seasons = fd.seasons || item.seasons; item.numberOfSeasons = fd.numberOfSeasons || item.numberOfSeasons; item.numberOfEpisodes = fd.numberOfEpisodes || item.numberOfEpisodes; if (!item.progress) item.progress = {}; } else if (type === 'movie') { item.runtime = fd.runtime || item.runtime; }
            await saveData();
        }
    }

    const isToWatch = listName === 'seriesToWatch'; const isWatched = listName.includes('Watched');

    let fHTML = '';
    if (isWatched) { fHTML = `<div class="modal-sticky-footer"><button id="saveReviewBtn" class="modal-btn primary">Zapisz Ocenę</button></div>`; }
    else {
        let cw = true; let wMsg = '';
        if (item.type === 'tv' && !isSeriesFinished(item)) { cw = false; wMsg = 'Zakończ serial, aby przenieść do obejrzanych.'; }
        else if (item.type === 'movie') {
            if (!item.releaseDate) { cw = false; wMsg = `Brak daty premiery.`; }
            else { const t = new Date(); t.setHours(0, 0, 0, 0); const rd = new Date(item.releaseDate); rd.setHours(0, 0, 0, 0); if (rd > t) { cw = false; wMsg = `Premiera: ${rd.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}.`; } }
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
            if (aStr) nxBanner = `<div style="background: color-mix(in srgb, var(--info-color) 15%, transparent); padding: 12px; border-radius: var(--radius-md); margin-bottom: 16px; border: 1px solid color-mix(in srgb, var(--info-color) 30%, transparent); font-weight:bold; color: var(--text-color); display:flex; align-items:center; gap:8px;"><svg viewBox="0 0 24 24" style="width:20px; height:20px; fill:var(--info-color)"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg> Jesteś na bieżąco! <span style="color:var(--info-color)">Premiera: ${aStr}</span></div>`;
            else nxBanner = `<div style="background: color-mix(in srgb, var(--text-secondary) 15%, transparent); padding: 12px; border-radius: var(--radius-md); margin-bottom: 16px; border: 1px solid color-mix(in srgb, var(--text-secondary) 30%, transparent); font-weight:bold; color: var(--text-color); display:flex; align-items:center; gap:8px;">⏳ Jesteś na bieżąco! Nieznana data premiery.</div>`;
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

    let addTagBtnHTML = `<button id="modal-manage-tags-btn" style="background:var(--card-color); border:1px solid var(--border-color); color:var(--text-color); width:36px; height:36px; border-radius:50%; display:flex; justify-content:center; align-items:center; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.2); flex-shrink:0;" title="Dodaj Tag"><svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg></button>`;
    let pinBtnHTML = `<button id="modal-pin-btn" style="background:${item.isPinned ? 'var(--info-color)' : 'var(--card-color)'}; border:1px solid ${item.isPinned ? 'var(--info-color)' : 'var(--border-color)'}; color:${item.isPinned ? '#ffffff' : 'var(--text-secondary)'}; width:36px; height:36px; border-radius:50%; display:flex; justify-content:center; align-items:center; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.2); flex-shrink:0; transition:all 0.2s ease;" title="Przypnij na górę listy">${ICONS.pin.replace('viewBox="0 0 24 24"', 'viewBox="0 0 24 24" style="width:18px;height:18px;fill:currentColor;"')}</button>`;
    let shareBtnHTML = `<button id="modal-share-btn" style="background:var(--card-color); border:1px solid var(--border-color); color:var(--text-color); width:36px; height:36px; border-radius:50%; display:flex; justify-content:center; align-items:center; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.2); flex-shrink:0; transition:color 0.2s;" data-title="${encodeURIComponent(item.title || '')}" data-poster="${item.poster || ''}" data-year="${item.year || ''}" data-rating="${item.tmdbRating || ''}" data-overview="${encodeURIComponent(item.overview || '')}" title="Udostępnij">${ICONS.share.replace('viewBox="0 0 24 24"', 'viewBox="0 0 24 24" style="width:18px;height:18px;fill:currentColor;"')}</button>`;

    let tmdbRatingInfo = item.tmdbRating && item.tmdbRating > 0 ? `<div style="display:flex; align-items:center; gap:12px;"><svg class="tmdb-rating-star" viewBox="0 0 24 24" style="width:32px;height:32px;fill:var(--warning-color);filter:drop-shadow(0 4px 8px rgba(255, 193, 7, 0.3));"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg><div class="tmdb-rating-info" style="display:flex;flex-direction:column;justify-content:center;"><div class="tmdb-rating-score" style="font-size:1.4rem;font-weight:800;color:var(--text-color);line-height:1;">${item.tmdbRating} <span class="max-score" style="font-size:0.9rem;color:var(--text-secondary);font-weight:600;">/ 10</span></div><div class="tmdb-rating-label" style="font-size:0.75rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:1px;margin-top:4px;font-weight:700;">Ocena TMDb</div></div></div>` : `<div></div>`;
    let actionRowHTML = `<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; padding:0 4px;">${tmdbRatingInfo}<div style="display:flex; align-items:center; gap:10px;">${addTagBtnHTML}${pinBtnHTML}${shareBtnHTML}</div></div>`;

    dModal.innerHTML = `<div class="modal-overlay"><div class="modern-modal-wrapper">${getModalHeaderHTML(item, true)}<div class="modern-modal-scroll"><div class="modal-body-content">${nxBanner}${actionRowHTML}<div class="genres">${(item.genres || []).map(g => `<span class="genre-tag">${escapeHTML(g)}</span>`).join('')}${tagsHTML}</div><div><h3>Opis</h3>${renderCollapsibleText(item.overview)}</div><div id="providers-container"></div><div id="seasons-container"></div><div id="cast-container"></div><div id="recommendations-container"></div><div id="reviews-container"></div>${rewatchHTML}${isWatched ? `<div class="review-card" style="margin-top: 24px;"><h3>Twoja ocena</h3><div class="star-rating-interactive"></div><div class="rating-controls"><button id="rating-decrement">-</button><span id="rating-display" class="rating-display"></span><button id="rating-increment">+</button></div><textarea id="reviewText" class="modern-textarea" placeholder="Napisz co myślisz..."></textarea></div>` : ''}</div></div>${fHTML}</div></div>`;

    const modal = dModal.querySelector('.modal-overlay');

    const mngBtn = modal.querySelector('#modal-manage-tags-btn');
    if (mngBtn) mngBtn.addEventListener('click', () => openManageTagsModal(item, () => openDetailsModal(id, type)));

    const pinBtn = modal.querySelector('#modal-pin-btn');
    if (pinBtn) {
        pinBtn.addEventListener('click', async (e) => {
            triggerHaptic('light');
            item.isPinned = !item.isPinned;
            e.currentTarget.style.background = item.isPinned ? 'var(--info-color)' : 'var(--card-color)';
            e.currentTarget.style.borderColor = item.isPinned ? 'var(--info-color)' : 'var(--border-color)';
            e.currentTarget.style.color = item.isPinned ? '#ffffff' : 'var(--text-secondary)';
            await saveData();
            renderList(data[listName], listName, true);
        });
    }

    const shareBtn = modal.querySelector('#modal-share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', (e) => {
            const btn = e.currentTarget;
            handleNativeShare(decodeURIComponent(btn.dataset.title || ''), btn.dataset.poster, btn.dataset.year, btn.dataset.rating, decodeURIComponent(btn.dataset.overview || ''));
        });
    }

    if (isWatched) { const rTx = document.getElementById('reviewText'); if (rTx) rTx.value = item.review || ''; }
    const fC = modal.querySelector('#hero-fav-container');
    if (fC) {
        fC.innerHTML = `<button id="modal-favorite-btn" class="hero-fav-btn ${item.isFavorite ? 'active' : ''}">${ICONS.star}</button>`;
        fC.querySelector('#modal-favorite-btn').addEventListener('click', async (e) => { item.isFavorite = !item.isFavorite; e.currentTarget.classList.toggle('active', item.isFavorite); await saveData(); renderList(data[listName], listName, true); });
    }

    const close = () => { dModal.innerHTML = ''; toggleAppDepthEffect(false); renderList(data[listName], listName, true); if (history.state && history.state.modalOpen) history.back(); };

    modal.addEventListener('click', async (e) => {
        if (e.target === modal) { close(); return; }
        const rewatchHeader = e.target.closest('.rewatch-accordion-header'); if (rewatchHeader) { triggerHaptic('light'); rewatchHeader.parentElement.classList.toggle('expanded'); return; }
        const cast = e.target.closest('.cast-member[data-actor-id]'); if (cast) { openActorDetailsModal(cast.dataset.actorId); return; }
        const rec = e.target.closest('.recommendation-item');
        if (rec) {
            const rId = rec.dataset.id; const rType = rec.dataset.type;
            if (Object.values(data).flat().some(i => String(i.id) === String(rId) && i.type === rType)) openDetailsModal(rId, rType); else openPreviewModal(rId, rType);
            return;
        }
        const removeIcon = e.target.closest('.remove-tag');
        if (removeIcon) { item.customTags = item.customTags.filter(t => t !== removeIcon.dataset.tag); await saveData(); openDetailsModal(id, type); return; }
        const addRewatchBtn = e.target.closest('#add-rewatch-btn');
        if (addRewatchBtn) { triggerHaptic('success'); item.watchDates.push(Date.now()); await saveData(); openDetailsModal(id, type); showCustomAlert('Świetnie!', 'Dodano dzisiejszy seans do pamiętnika.', 'success'); return; }
        const delRewatchBtn = e.target.closest('.delete-rewatch-btn');
        if (delRewatchBtn) {
            if (item.watchDates.length <= 1) { showCustomAlert('Uwaga', 'Nie możesz usunąć jedynego seansu z wpisu.', 'info'); return; }
            if (await showCustomConfirm('Usunąć seans?', 'Czy na pewno chcesz usunąć tę datę z historii oglądania?')) { item.watchDates.splice(parseInt(delRewatchBtn.dataset.idx), 1); await saveData(); openDetailsModal(id, type); } return;
        }
    });
    modal.querySelector('.modal-top-close-btn').addEventListener('click', close); setupSwipeToClose(modal, close);

    if (!String(item.id).startsWith('custom_')) {
        getWatchProviders(id, type).then(p => { const c = document.getElementById('providers-container'); if (c && p) c.innerHTML = renderProvidersHTML(p); });
        getRecommendations(id, type).then(r => { const c = document.getElementById('recommendations-container'); if (c && r.length > 0) c.innerHTML = renderRecommendationsHTML(r, type); });
        getTrailerKey(id, type).then(tk => { if (tk) { const c = document.getElementById('trailer-section-container'); if (c) { c.innerHTML = `<button class="hero-trailer-btn"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> Zwiastun</button>`; c.querySelector('.hero-trailer-btn').onclick = () => openTrailerModal(tk); } } });
    }
    getCredits(id, type).then(c => { const cc = document.getElementById('cast-container'); if (cc && c.length > 0) { const cH = c.map(m => `<div class="cast-member" data-actor-id="${m.id}"><img src="${IMAGE_BASE_URL.replace('w500', 'w200')}${m.profile_path}" loading="lazy" onerror="this.outerHTML = ICONS.person;"><strong>${escapeHTML(m.name)}</strong><span>${escapeHTML(m.character)}</span></div>`).join(''); cc.innerHTML = `<div class="cast-section" style="margin-top:0; padding-top:0; border:none;"><h3>Obsada</h3><div class="cast-scroller">${cH}</div></div>`; } });
    getReviews(id, type).then(revs => { const c = document.getElementById('reviews-container'); if (c && revs.length > 0) c.innerHTML = renderReviewsHTML(revs, id, type); });
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
    const td = new Date(); td.setHours(0, 0, 0, 0);
    let blockFrom = 9999; if (item.nextEpisodeToAir && item.nextEpisodeToAir.season === sNum) { const ad = new Date(item.nextEpisodeToAir.date); if (ad > td) blockFrom = item.nextEpisodeToAir.episode; }

    const epHTML = seasonData.episodes.map(ep => {
        const isC = item.progress[sNum].includes(ep.episode_number); const uId = `s${sNum}-ep${ep.episode_number}`;
        const rt = ep.runtime ? `<span class="episode-runtime">${ep.runtime} min</span>` : '';
        let isFut = false; let fw = '';
        if (ep.episode_number >= blockFrom) { isFut = true; const ed = new Date(ep.air_date); fw = `<div style="font-size:0.75rem; color:var(--primary-color); margin-top:2px;">Premiera: ${ed > td ? ed.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }) : 'wkrótce'}</div>`; }
        else if (ep.air_date) { const ed = new Date(ep.air_date); if (ed > td) { isFut = true; fw = `<div style="font-size:0.75rem; color:var(--primary-color); margin-top:2px;">Premiera: ${ed.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}</div>`; } }
        return `<div class="episode-item" style="${isFut ? 'opacity: 0.6; pointer-events: none;' : ''}"><div class="episode-info"><div class="episode-title-line"><div class="episode-title-group"><span class="episode-number">${ep.episode_number}.</span><span class="episode-title">${escapeHTML(ep.name)}</span></div>${rt}</div>${renderCollapsibleText(ep.overview)}${fw}</div><label class="episode-status-toggle" for="${uId}"><input type="checkbox" id="${uId}" data-episode-number="${ep.episode_number}" ${isC ? 'checked' : ''} ${isFut ? 'disabled' : ''}><svg class="icon icon-watched" viewBox="0 0 24 24"><path d="M12,4.5C7,4.5 2.73,7.61 1,12c1.73,4.39 6,7.5 11,7.5s9.27-3.11 11-7.5C21.27,7.61 17,4.5 12,4.5M12,17a5,5 0 1,1 0-10,5 5 0 0,1 0,10m0-8a3,3 0 1,0 0,6,3 3 0 0,0 0-6Z"/></svg><svg class="icon icon-unwatched" viewBox="0 0 24 24"><path d="M11.83,9.17C12.2,9.06 12.59,9 13,9a4,4 0 0,1 4,4c0,0.41-0.06,0.8-0.17,1.17L19.83,17.17C21.5,15.82 22.8,14 23.5,12C21.83,8.44 17.75,6 13,6c-1.55,0-3.04,0.33-4.38,0.9L11.83,9.17M13,4.5C18,4.5 22.27,7.61 24,12c-0.69,1.66-1.7,3.16-2.92,4.33L18.6,13.87C18.85,13.29 19,12.66 19,12a4,4 0 0,0-4-4c-0.66,0-1.29,0.15-1.87,0.4L10.6,5.92C11.39,4.72 12.56,4.5 13,4.5M3.27,4.27l1.59,1.59C3.15,7.45 1.83,9.53 1,12c1.83,3.56 5.75,6 10.5,6c1.76,0 3.44-0.44 5-1.18l2.18,2.18l1.41-1.41L4.68,2.86L3.27,4.27M7.53,9.8l1.55,1.55c-0.05,0.21-0.08,0.42-0.08,0.65a2.5,2.5 0 0,0 2.5,2.5c0.23,0 0.44-0.03 0.65-0.08l1.55,1.55C11.7,16.84 10.9,17 10,17a4.5,4.5 0 0,1-4.5-4.5c0-0.9,0.16-1.7,0.47-2.47Z"/></svg></label></div>`;
    }).join('');

    const avEps = seasonData.episodes.filter(ep => { const ed = ep.air_date ? new Date(ep.air_date) : null; return (!ed || ed <= td) && ep.episode_number < blockFrom; });
    const allW = item.progress[sNum].length >= avEps.length && avEps.length > 0;

    container.innerHTML = `<div class="season-actions"><button class="season-toggle-all-btn" data-action="toggle-all">${allW ? 'Odznacz obejrzane' : 'Zaznacz wydane'}</button></div>${epHTML}`;

    container.addEventListener('change', async e => {
        if (e.target.type === 'checkbox') {
            const epNum = parseInt(e.target.dataset.episodeNumber);
            if (e.target.checked) {
                let hasUnch = false; for (let i = 1; i < epNum; i++) { if (!item.progress[sNum].includes(i)) hasUnch = true; }
                if (hasUnch) {
                    if (await showCustomConfirm('Zaznaczyć poprzednie?', 'Zaznaczyć też wszystkie poprzednie odcinki z tego sezonu?')) {
                        for (let i = 1; i <= epNum; i++) if (!item.progress[sNum].includes(i)) item.progress[sNum].push(i);
                        container.querySelectorAll('input[type="checkbox"]').forEach(cb => { if (parseInt(cb.dataset.episodeNumber) <= epNum && !cb.disabled) cb.checked = true; });
                    } else if (!item.progress[sNum].includes(epNum)) item.progress[sNum].push(epNum);
                } else if (!item.progress[sNum].includes(epNum)) item.progress[sNum].push(epNum);
            } else item.progress[sNum] = item.progress[sNum].filter(ep => ep !== epNum);

            await saveData(); updateSeasonProgressUI(item, sNum); renderList(data['seriesToWatch'], 'seriesToWatch', true);
            const totW = Object.values(item.progress).reduce((acc, arr) => acc + arr.length, 0);
            if (totW >= item.numberOfEpisodes && !item.nextEpisodeToAir && isSeriesFinished(item)) { setTimeout(async () => { if (await showCustomConfirm('Gratulacje! 🎉', 'Obejrzałeś cały serial. Przenieść do obejrzanych?')) { await handleMoveItem(item.id, 'tv'); document.getElementById('detailsModalContainer').innerHTML = ''; toggleAppDepthEffect(false); } }, 400); }
        }
    });

    container.querySelector('.season-toggle-all-btn').addEventListener('click', async e => {
        if (allW) { item.progress[sNum] = []; container.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false); }
        else { item.progress[sNum] = avEps.map(ep => ep.episode_number); container.querySelectorAll('input[type="checkbox"]:not(:disabled)').forEach(cb => cb.checked = true); }
        await saveData(); updateSeasonProgressUI(item, sNum); e.target.textContent = allW ? 'Zaznacz wydane' : 'Odznacz obejrzane'; renderList(data['seriesToWatch'], 'seriesToWatch', true);
        if (!allW) { const totW = Object.values(item.progress).reduce((acc, arr) => acc + arr.length, 0); if (totW >= item.numberOfEpisodes && !item.nextEpisodeToAir && isSeriesFinished(item)) { setTimeout(async () => { if (await showCustomConfirm('Ukończono! 🎉', 'Przenieść do obejrzanych?')) { await handleMoveItem(item.id, 'tv'); document.getElementById('detailsModalContainer').innerHTML = ''; toggleAppDepthEffect(false); } }, 400); } }
    });
}

function updateSeasonProgressUI(item, sNum) { const sd = document.querySelector(`.season-details[data-season-number="${sNum}"]`); if (sd) { const p = sd.querySelector('.season-progress'); const tot = p.textContent.split('/')[1].trim(); p.textContent = `${item.progress[sNum]?.length || 0} / ${tot}`; } }

function openCustomAddModal() {
    toggleAppDepthEffect(true);
    const mHTML = `<div class="modal-overlay" id="customAddModal"><div class="modern-modal-wrapper" style="max-width: 450px;"><div class="modal-drag-handle"></div><button class="modal-top-close-btn" title="Zamknij">${ICONS.close}</button><div class="modern-modal-scroll" style="padding: 24px;"><h3 style="margin: 0 0 20px 0; font-size: 1.3rem; text-align: center;">Dodaj ręcznie</h3><form id="custom-add-form"><div class="custom-add-group"><label class="custom-add-label">Tytuł</label><input type="text" id="custom-title" class="custom-input" placeholder="Wpisz nazwę..." required></div><div class="custom-add-group"><label class="custom-add-label">Rok produkcji</label><input type="number" id="custom-year" class="custom-input" placeholder="Np. 2024"></div><div class="custom-add-group"><label class="custom-add-label">URL plakatu</label><input type="url" id="custom-poster" class="custom-input" placeholder="https://..."></div><div class="custom-add-group"><label class="custom-add-label">Typ nośnika</label><div class="modern-radio-group"><label class="modern-radio-label"><input type="radio" name="custom-type" value="movie" checked><span>Film</span></label><label class="modern-radio-label"><input type="radio" name="custom-type" value="tv"><span>Serial</span></label></div></div><div class="custom-add-group"><label class="custom-add-label">Lista</label><div class="modern-radio-group"><label class="modern-radio-label"><input type="radio" name="custom-list" value="toWatch" checked><span>Do obejrzenia</span></label><label class="modern-radio-label"><input type="radio" name="custom-list" value="watched"><span>Obejrzane</span></label></div></div><button type="submit" class="modal-btn primary" style="width:100%; margin-top: 10px;">Zapisz tytuł w bibliotece</button></form></div></div></div>`;
    const c = document.getElementById('detailsModalContainer'); c.innerHTML = mHTML;
    const modal = c.querySelector('.modal-overlay'); const f = c.querySelector('#custom-add-form'); const close = () => { c.innerHTML = ''; toggleAppDepthEffect(false); };
    modal.addEventListener('click', e => { if (e.target === modal) close(); }); modal.querySelector('.modal-top-close-btn').addEventListener('click', close); setupSwipeToClose(modal, close);

    f.addEventListener('submit', async e => {
        e.preventDefault(); const t = escapeHTML(document.getElementById('custom-title').value.trim());
        if (!t) { showCustomAlert('Błąd', 'Tytuł jest wymagany.', 'error'); return; }
        const type = document.querySelector('input[name="custom-type"]:checked').value; const lst = document.querySelector('input[name="custom-list"]:checked').value;
        const tList = (type === 'movie' ? 'movies' : 'series') + (lst === 'toWatch' ? 'ToWatch' : 'Watched');
        const nIt = { id: `custom_${Date.now()}`, title: t, year: escapeHTML(document.getElementById('custom-year').value) || '', poster: escapeHTML(document.getElementById('custom-poster').value.trim()) || null, type: type, overview: 'Dodano ręcznie.', genres: [], isFavorite: false, customTags: [], dateAdded: Date.now(), releaseDate: null, tmdbRating: null };
        if (lst === 'toWatch') { const mx = data[tList].length > 0 ? Math.max(...data[tList].map(i => i.customOrder || 0)) : -1; nIt.customOrder = mx + 1; } else { nIt.rating = null; nIt.review = ""; nIt.watchDates = [Date.now()]; }
        if (type === 'movie') nIt.runtime = null;
        data[tList].unshift(nIt); await saveData(); switchMainTab(type === 'movie' ? 'movies' : 'series'); switchSubTab(lst); close(); showCustomAlert('Gotowe', `Dodano.`, 'success');
    });
}

async function openActorDetailsModal(actorId) {
    history.pushState({ modalOpen: true }, '');
    toggleAppDepthEffect(true);
    const c = document.getElementById('actorModalContainer');
    c.innerHTML = `<div class="modal-overlay actor-modal-overlay"><div class="modern-modal-wrapper"><div style="display:flex; flex-direction:column; align-items:center; margin-top:30px;"><div class="skeleton-box" style="width:150px; height:150px; border-radius:50%; margin-bottom:20px;"></div><div class="skeleton-box skeleton-title" style="width:200px; margin:0 auto 20px;"></div><div class="skeleton-box skeleton-text-line"></div><div class="skeleton-box skeleton-text-line"></div><div class="skeleton-box skeleton-text-line short"></div></div></div></div>`;

    const ad = await getActorDetails(actorId);
    if (!ad) { c.innerHTML = ''; toggleAppDepthEffect(false); showCustomAlert('Błąd', 'Brak danych o aktorze.', 'error'); return; }

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

    const modal = c.querySelector('.modal-overlay');
    const close = () => { c.innerHTML = ''; toggleAppDepthEffect(false); if (history.state && history.state.modalOpen) history.back(); };
    setupSwipeToClose(modal, close);

    modal.addEventListener('click', e => {
        if (e.target === modal) close();
        const kfItem = e.target.closest('.known-for-item');
        if (kfItem && kfItem.dataset.id && kfItem.dataset.type) {
            const rId = kfItem.dataset.id; const rType = kfItem.dataset.type;
            close();
            setTimeout(() => {
                const isInLibrary = Object.values(data).flat().some(i => String(i.id) === String(rId) && i.type === rType);
                if (isInLibrary) openDetailsModal(rId, rType);
                else openPreviewModal(rId, rType);
            }, 50);
            return;
        }
        const h = e.target.closest('.filmography-item-header'); if (h) { const d = h.nextElementSibling; if (d && d.classList.contains('filmography-item-details')) { d.style.display = d.style.display === 'block' ? 'none' : 'block'; } }
        const add = e.target.closest('.add-filmography-item-btn'); if (add) addItemFromFilmography(add);
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
    const container = document.querySelector('.star-rating-interactive'); if (!container) return;
    const rd = document.getElementById('rating-display'); const decBtn = document.getElementById('rating-decrement'); const incBtn = document.getElementById('rating-increment');
    let cr = item.rating || 0; const sP = "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z";
    for (let i = 1; i <= 5; i++) { const s = document.createElement('div'); s.className = 'star'; s.innerHTML = `<svg class="star-background" viewBox="0 0 24 24"><path d="${sP}"/></svg><svg class="star-foreground" viewBox="0 0 24 24"><path d="${sP}"/></svg>`; container.appendChild(s); }
    const updUI = (rat) => { cr = rat; container.dataset.rating = cr; container.querySelectorAll('.star-foreground').forEach((st, idx) => { const sc = cr - idx; if (sc >= 1) st.style.clipPath = 'inset(0 0 0 0)'; else if (sc > 0) st.style.clipPath = `inset(0 ${100 - sc * 100}% 0 0)`; else st.style.clipPath = 'inset(0 100% 0 0)'; }); rd.textContent = `${cr.toFixed(1)} / 5.0`; decBtn.disabled = cr <= 0; incBtn.disabled = cr >= 5; };
    const calcEvt = (e) => { const r = container.getBoundingClientRect(); const mx = e.clientX - r.left; const rw = (mx / r.width) * 5; return Math.max(0, Math.min(5, Math.round(rw * 2) / 2)); };
    container.addEventListener('mousemove', e => updUI(calcEvt(e))); container.addEventListener('mouseleave', () => updUI(parseFloat(container.dataset.rating))); container.addEventListener('click', e => updUI(calcEvt(e)));
    decBtn.addEventListener('click', () => { let r = parseFloat(container.dataset.rating); if (r > 0) updUI(r - 0.5); }); incBtn.addEventListener('click', () => { let r = parseFloat(container.dataset.rating); if (r < 5) updUI(r + 0.5); });
    updUI(cr);
}

async function handleNativeShare(title, posterUrl, year, rating, overview) {
    triggerHaptic('medium');
    showCustomAlert('Generowanie...', 'Tworzę infografikę...', 'info');

    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const canvasWidth = 1080;

        const wrapText = (context, text, maxWidth) => {
            const words = String(text).split(' '); let lines = []; let currentLine = words[0] || '';
            for (let i = 1; i < words.length; i++) {
                const word = words[i]; const width = context.measureText(currentLine + " " + word).width;
                if (width < maxWidth) { currentLine += " " + word; } else { lines.push(currentLine); currentLine = word; }
            }
            lines.push(currentLine); return lines;
        };

        const roundRect = (ctx, x, y, width, height, radius) => {
            ctx.beginPath(); ctx.moveTo(x + radius, y); ctx.lineTo(x + width - radius, y); ctx.quadraticCurveTo(x + width, y, x + width, y + radius); ctx.lineTo(x + width, y + height - radius); ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height); ctx.lineTo(x + radius, y + height); ctx.quadraticCurveTo(x, y + height, x, y + height - radius); ctx.lineTo(x, y + radius); ctx.quadraticCurveTo(x, y, x + radius, y); ctx.closePath();
        };

        const padding = 60; const posterWidth = 320; const posterHeight = 480; const textX = padding + posterWidth + 50; const maxTextWidth = canvasWidth - textX - padding;

        ctx.font = 'bold 64px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const safeTitle = title ? String(title) : "Tytuł nieznany";
        const titleLines = wrapText(ctx, safeTitle, maxTextWidth); const titleHeight = titleLines.length * 76;

        ctx.font = '28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const cleanOverview = (!overview || overview === "null" || overview === "") ? "Brak opisu dla tego tytułu." : String(overview);
        const overviewLines = wrapText(ctx, cleanOverview, maxTextWidth); const overviewHeight = overviewLines.length * 40;

        const calculatedTextHeight = titleHeight + 40 + 50 + 40 + overviewHeight;
        const canvasHeight = Math.max(padding + posterHeight + padding, padding + calculatedTextHeight + padding);
        canvas.height = canvasHeight; canvas.width = canvasWidth;

        let hasImage = false; const img = new Image();
        if (posterUrl && posterUrl !== POSTER_PLACEHOLDER) {
            img.crossOrigin = "anonymous";
            img.src = posterUrl.replace('w500', 'w780') + '?t=' + new Date().getTime();
            await new Promise((resolve) => { img.onload = () => { hasImage = true; resolve(); }; img.onerror = () => { resolve(); }; });
        }

        if (hasImage) {
            ctx.filter = 'blur(60px) saturate(1.5)';
            const scale = Math.max(canvasWidth / img.width, canvasHeight / img.height);
            const x = (canvasWidth / 2) - (img.width / 2) * scale; const y = (canvasHeight / 2) - (img.height / 2) * scale;
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
            ctx.filter = 'none';
            const grd = ctx.createLinearGradient(0, 0, 0, canvasHeight);
            grd.addColorStop(0, 'rgba(16, 17, 20, 0.75)'); grd.addColorStop(1, 'rgba(16, 17, 20, 0.95)');
            ctx.fillStyle = grd; ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        } else { ctx.fillStyle = '#101114'; ctx.fillRect(0, 0, canvasWidth, canvasHeight); }

        if (hasImage) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'; ctx.shadowBlur = 30; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 15;
            ctx.save(); roundRect(ctx, padding, padding, posterWidth, posterHeight, 20); ctx.fill(); ctx.clip();
            ctx.shadowColor = 'transparent'; ctx.drawImage(img, padding, padding, posterWidth, posterHeight); ctx.restore();
        }

        let drawY = padding + 60;
        ctx.fillStyle = '#FFFFFF'; ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 2;
        ctx.font = '900 64px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        titleLines.forEach(line => { ctx.fillText(line, textX, drawY); drawY += 76; });
        ctx.shadowColor = 'transparent'; drawY += 10;

        const drawBadge = (text, startX, startY, bgColor, textColor) => {
            ctx.font = 'bold 22px -apple-system, sans-serif'; const textWidth = ctx.measureText(text).width;
            ctx.fillStyle = bgColor; roundRect(ctx, startX, startY, textWidth + 30, 44, 22); ctx.fill();
            ctx.fillStyle = textColor; ctx.fillText(text, startX + 15, startY + 31); return startX + textWidth + 45;
        };

        let badgeX = textX;
        if (year && year !== 'null') badgeX = drawBadge(year, badgeX, drawY, 'rgba(255, 255, 255, 0.15)', '#FFFFFF');
        if (rating && rating !== 'null') drawBadge(`⭐ TMDB: ${rating}`, badgeX, drawY, 'rgba(245, 197, 24, 0.2)', '#F5C518');

        drawY += 80;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'; ctx.font = '28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        overviewLines.forEach(line => { ctx.fillText(line, textX, drawY); drawY += 42; });

        canvas.toBlob(async (blob) => {
            const file = new File([blob], `${safeTitle.replace(/[^a-z0-9]/gi, '_')}.jpg`, { type: 'image/jpeg' });
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                try { await navigator.share({ files: [file], title: safeTitle, text: `Sprawdź to! 🍿` }); }
                catch (e) { if (e.name !== 'AbortError') showCustomAlert('Błąd', 'Udostępnianie anulowane.', 'error'); }
            } else {
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
                showCustomAlert('Gotowe!', 'Karta filmu pobrana na urządzenie.', 'success');
            }
        }, 'image/jpeg', 0.82);

    } catch (err) {
        console.error(err);
        showCustomAlert('Błąd', 'Wystąpił problem przy generowaniu karty.', 'error');
    }
}

// ==========================================
// 12. ZARZĄDZANIE DANYMI I SYNCHRONIZACJA
// ==========================================
async function saveData() {
    try {
        await db.set('mainState', { data, viewState });
        localStorage.setItem('lastDataChangeDate', Date.now());
    } catch {
        showCustomAlert('Błąd Krytyczny', 'Nie można zapisać danych.', 'error');
    }
}

async function loadData() {
    let saved = await db.get('mainState');
    if (saved) { data = saved.data || data; viewState = saved.viewState || viewState; }
    else {
        const old = localStorage.getItem('penguinFlixData_v2') || localStorage.getItem('penguinFlixData_v1') || localStorage.getItem('cineLogData_v12');
        if (old) { try { const p = JSON.parse(old); data = p.data || p || data; viewState = p.viewState || viewState; await saveData(); localStorage.removeItem('penguinFlixData_v2'); } catch { } }
    }
    migrateData(data);
}

function migrateData(dt) {
    Object.keys(dt).forEach(k => {
        if (Array.isArray(dt[k])) {
            dt[k].forEach(i => {
                if (i.dateAdded === undefined) i.dateAdded = Date.now() - Math.floor(Math.random() * 100000);
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
    a.click(); URL.revokeObjectURL(a.href);
    localStorage.setItem('lastBackupDate', Date.now());
    showCustomAlert('Sukces', 'Pobrano kopie zapasową.', 'success');
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

                // --- POCZĄTEK ZMIANY: Czyszczenie i restart powiadomień ---
                localStorage.removeItem('penguinNotifs'); // Kasujemy stare powiadomienia
                document.getElementById('notification-badge').style.display = 'none'; // Chowamy kropkę
                if (typeof NotificationManager !== 'undefined') {
                    // Natychmiast odpalamy silnik na NOWYCH danych z pliku
                    NotificationManager.runEngine();
                }
                // --- KONIEC ZMIANY ---

                showCustomAlert('Sukces!', `Przywrócono dane z pliku "${f.name}".`, 'success');
            } else throw new Error();
        } catch { showCustomAlert('Błąd', 'Zły format pliku.', 'error'); }
    };
    r.readAsText(f); e.target.value = '';
}
async function refreshStaleSeries() {
    const today = new Date(); today.setHours(0, 0, 0, 0); let needsSave = false;
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
                } catch (e) { }
                await new Promise(r => setTimeout(r, 400));
            }
        }
    };
    await checkAndRefreshList('seriesToWatch');
    if (needsSave) { await saveData(); const activeList = getActiveListId(); if (activeList === 'seriesToWatch') renderList(data[activeList], activeList, true); }
}
// ==========================================
// 15. CICHY PRACOWNIK W TLE (Naprawa starych danych)
// ==========================================
async function healMissingData() {
    const listsToCheck = ['moviesToWatch', 'moviesWatched'];
    let needsSave = false;
    let itemsHealed = 0;

    for (const listName of listsToCheck) {
        if (!data[listName]) continue;

        for (let i = 0; i < data[listName].length; i++) {
            const item = data[listName][i];

            // Pomijamy wpisy ręczne (custom) i te, które już mają wpisany czas trwania (nawet jeśli to 0)
            if (String(item.id).startsWith('custom_')) continue;
            if (item.runtime !== undefined && item.runtime !== null) continue;

            // Jeśli brakuje czasu trwania, dociągamy go cicho z internetu
            try {
                const details = await getItemDetails(item.id, 'movie');
                if (details && details.runtime !== undefined) {
                    item.runtime = details.runtime;
                    needsSave = true;
                    itemsHealed++;
                }
            } catch (e) {
                console.error("Błąd podczas naprawy danych", e);
            }

            // ODPOCZYNEK: 300ms pauzy, żeby nie spalić procesora i nie obciążyć API TMDB
            await new Promise(resolve => setTimeout(resolve, 300));

            // Zapisujemy postęp co 5 naprawionych filmów (w razie gdyby ktoś zamknął apkę)
            if (itemsHealed > 0 && itemsHealed % 5 === 0) {
                await saveData();
                needsSave = false;
            }
        }
    }

    // Zapis końcowy i odświeżenie listy (jeśli użytkownik akurat ma włączony suwak)
    if (needsSave) {
        await saveData();
        const activeList = getActiveListId();
        if (activeList && activeList.includes('movies')) {
            renderList(data[activeList], activeList, true);
        }
    }
}

// ==========================================
// 13. PWA (Service Worker) z AUTO-UPDATE
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').then(reg => {
            console.log('SW zarejestrowany');
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log('Nowa wersja! Odświeżam...');
                        window.location.reload();
                    }
                });
            });
        }).catch(e => console.log('SW błąd', e));
    });
}

// ==========================================
// 14. INTELIGENTNE CENTRUM POWIADOMIEŃ
// ==========================================
let smartNotificationsEnabled = localStorage.getItem('smartNotificationsEnabled') !== 'false';

const NotificationManager = {
    key: 'penguinNotifs',
    lastRecKey: 'penguinLastRecDate',

    // ZMIANA 1: Auto-kasowanie starszych niż 7 dni
    get() {
        const rawNotifs = JSON.parse(localStorage.getItem(this.key) || '[]');
        const now = Date.now();
        // Zostawiamy TYLKO te powiadomienia, które są młodsze niż 7 dni (7 dni * 24h * 60m * 60s * 1000ms)
        const freshNotifs = rawNotifs.filter(n => (now - n.timestamp) < 7 * 24 * 60 * 60 * 1000);

        if (freshNotifs.length !== rawNotifs.length) {
            localStorage.setItem(this.key, JSON.stringify(freshNotifs));
        }
        return freshNotifs;
    },

    save(notifs) { localStorage.setItem(this.key, JSON.stringify(notifs)); this.updateBadge(); },

    add(notif) {
        const notifs = this.get();
        const existingIndex = notifs.findIndex(n => n.id === notif.id);

        if (existingIndex === -1) {
            // Całkowicie nowe powiadomienie - dodajemy i zapalamy kropkę
            notifs.unshift({ ...notif, timestamp: Date.now(), read: false });
            this.save(notifs.slice(0, 20));
        } else {
            // Powiadomienie istnieje. Sprawdzamy, czy zmienił się tekst (minął dzień)
            if (notifs[existingIndex].title !== notif.title) {
                notifs[existingIndex].title = notif.title;
                notifs[existingIndex].desc = notif.desc;
                notifs[existingIndex].read = false; // Oznaczamy jako NIEPRZECZYTANE
                this.save(notifs); // Zapisuje i ZAPALA kropkę!
            }
        }
    },

    // ZMIANA 2: Funkcja do ręcznego usuwania konkretnego powiadomienia
    remove(id) {
        const notifs = this.get();
        const filtered = notifs.filter(n => n.id !== id);
        this.save(filtered);
    },

    markAllRead() {
        const notifs = this.get();
        let changed = false;
        notifs.forEach(n => { if (!n.read) { n.read = true; changed = true; } });
        if (changed) this.save(notifs);
    },

    updateBadge() {
        const badge = document.getElementById('notification-badge');
        if (badge) {
            const unreadCount = this.get().filter(n => !n.read).length;
            badge.style.display = (smartNotificationsEnabled && unreadCount > 0) ? 'block' : 'none';
        }
    },

    async runEngine() {
        if (!smartNotificationsEnabled) { this.updateBadge(); return; }
        this.checkPremieres();
        await this.generateRecommendations();
        this.updateBadge();
    },

    checkPremieres() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTime = today.getTime();

        const getDaysToPremiere = (dateString) => {
            if (!dateString || dateString === "") return -1;
            const rDate = new Date(dateString);
            if (isNaN(rDate.getTime())) return -1;

            rDate.setHours(0, 0, 0, 0);
            const rTime = rDate.getTime();

            const diffTime = rTime - todayTime;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays >= 0 && diffDays <= 4) return diffDays;
            return -1;
        };

        const getTitlePrefix = (days) => {
            if (days === 0) return 'Premiera Dzisiaj! 🍿';
            if (days === 1) return 'Premiera Jutro! ⏳';
            return `Premiera za ${days} dni 📅`;
        };

        (data.moviesToWatch || []).forEach(m => {
            const days = getDaysToPremiere(m.releaseDate);
            if (days !== -1) {
                this.add({ id: `prem_m_${m.id}_${m.releaseDate}`, title: getTitlePrefix(days), desc: `Film "${m.title}" wchodzi na ekrany.`, image: m.poster, targetId: m.id, targetType: 'movie' });
            }
        });

               // Sprawdzanie seriali "Do obejrzenia" (NAPRAWIONA INTELIGENCJA)
        (data.seriesToWatch || []).forEach(s => {
            if(s.nextEpisodeToAir) {
                const days = getDaysToPremiere(s.nextEpisodeToAir.date);
                if(days !== -1) {
                    
                    // 1. Ile odcinków użytkownik obejrzał?
                    let totalWatched = 0;
                    if (s.progress) {
                        totalWatched = Object.values(s.progress).reduce((acc, arr) => acc + arr.length, 0);
                    }
                    
                    // 2. Ile odcinków FAKTYCZNIE wyszło do tej pory? (Matematyka na sezonach)
                    let airedSoFar = 0;
                    if (s.seasons) {
                        s.seasons.forEach(season => {
                            // Sumujemy wszystkie odcinki z poprzednich sezonów
                            if (season.season_number > 0 && season.season_number < s.nextEpisodeToAir.season) {
                                airedSoFar += season.episode_count;
                            }
                        });
                    }
                    // Dodajemy wyemitowane już odcinki z bieżącego sezonu
                    airedSoFar += (s.nextEpisodeToAir.episode - 1);

                    // 3. WARUNEK: Powiadamiamy tylko jeśli masz max 3 odcinki zaległości
                    // Jeśli to nowość (S01E01), to airedSoFar = 0, więc 0 >= -3 (Prawda -> powiadamia!)
                    if (totalWatched >= airedSoFar - 3) {
                        const epStr = `S${String(s.nextEpisodeToAir.season).padStart(2,'0')}E${String(s.nextEpisodeToAir.episode).padStart(2,'0')}`;
                        this.add({ 
                            id: `prem_s_${s.id}_${s.nextEpisodeToAir.date}`, 
                            title: days === 0 ? 'Nowy odcinek! 📺' : `Odcinek za ${days} dni 📺`, 
                            desc: `Wychodzi ${epStr} serialu "${s.title}".`, 
                            image: s.poster, targetId: s.id, targetType: 'tv' 
                        });
                    }
                }
            }
        });
    },

    async generateRecommendations() {
        const lastRec = parseInt(localStorage.getItem(this.lastRecKey) || '0');
        const now = Date.now();
        if (now - lastRec < 5 * 24 * 60 * 60 * 1000) return;

        const topMovies = (data.moviesWatched || []).filter(m => m.rating >= 4);
        if (topMovies.length === 0) return;

        const seed = topMovies[Math.floor(Math.random() * topMovies.length)];
        const currentYear = new Date().getFullYear();

        try {
            const recs = await getRecommendations(seed.id, 'movie');
            if (recs && recs.length > 0) {
                const allIds = Object.values(data).flat().map(i => String(i.id));
                const newRecs = recs.filter(r => {
                    if (allIds.includes(String(r.id))) return false;
                    if (!r.release_date) return false;
                    return parseInt(r.release_date.substring(0, 4)) === currentYear;
                });

                if (newRecs.length > 0) {
                    const rec = newRecs[0];
                    this.add({
                        id: `rec_${rec.id}_${now}`,
                        title: '✨ Nowość dla Ciebie',
                        desc: `W tegorocznych nowościach znaleźliśmy "${escapeHTML(rec.title || rec.name)}". Może Ci się spodobać!`,
                        image: rec.poster_path ? IMAGE_BASE_URL.replace('w500', 'w200') + rec.poster_path : POSTER_PLACEHOLDER,
                        targetId: rec.id, targetType: 'movie'
                    });
                    localStorage.setItem(this.lastRecKey, now);
                }
            }
        } catch (e) { console.error('Błąd silnika rekomendacji', e); }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const notifCb = document.getElementById('smart-notifications-checkbox');
    if (notifCb) {
        notifCb.checked = smartNotificationsEnabled;
        notifCb.addEventListener('change', (e) => {
            smartNotificationsEnabled = e.target.checked;
            localStorage.setItem('smartNotificationsEnabled', smartNotificationsEnabled);

            if (!smartNotificationsEnabled) {
                localStorage.removeItem('penguinNotifs'); // Czyszczenie
                document.getElementById('notification-badge').style.display = 'none';
                showCustomAlert('Powiadomienia są nieaktywne.', '', 'info');
            } else {
                showCustomAlert('Powiadomienia są aktywne.', '', 'success');
                NotificationManager.runEngine();
            }
        });
    }

    const bellBtn = document.getElementById('notification-bell-btn');
    const panelContainer = document.getElementById('notificationPanelContainer');

    if (bellBtn && panelContainer) {
        bellBtn.addEventListener('click', () => {
            triggerHaptic('light');

            const notifs = NotificationManager.get();
            let listHTML = '';

            if (!smartNotificationsEnabled) {
                listHTML = `<div style="text-align:center; padding: 40px 20px; color: var(--text-secondary);">Inteligentne podpowiedzi są wyłączone w Ustawieniach.</div>`;
            } else if (notifs.length === 0) {
                listHTML = `<div style="text-align:center; padding: 40px 20px; color: var(--text-secondary);"><svg viewBox="0 0 24 24" style="width:48px;height:48px;fill:none;stroke:currentColor;stroke-width:1;margin-bottom:12px;opacity:0.5;"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg><br>Brak nowych powiadomień.</div>`;
            } else {
                const timeFormatter = new Intl.RelativeTimeFormat('pl', { numeric: 'auto' });

                const renderCard = (n) => {
                    const daysAgo = Math.round((n.timestamp - Date.now()) / (1000 * 60 * 60 * 24));
                    const timeStr = daysAgo === 0 ? 'Dzisiaj' : timeFormatter.format(daysAgo, 'day');

                    // ZMIANA 3: Dodanie przycisku krzyżyka (X) do karty i marginesu
                    return `
                    <div class="notif-card ${n.read ? '' : 'unread'}" data-target-id="${n.targetId}" data-target-type="${n.targetType}" style="cursor:pointer; padding-right: 44px;">
                        <img src="${n.image}" alt="Poster" onerror="this.src='${POSTER_PLACEHOLDER}';">
                        <div class="notif-content">
                            <span class="notif-title">${escapeHTML(n.title)}</span>
                            <span class="notif-desc">${escapeHTML(n.desc)}</span>
                            <span class="notif-time">${timeStr}</span>
                        </div>
                        <button class="notif-delete-btn" data-id="${n.id}" title="Usuń powiadomienie">
                            <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                        </button>
                    </div>`;
                };

                const movieNotifs = notifs.filter(n => String(n.id).startsWith('prem_m_'));
                const seriesNotifs = notifs.filter(n => String(n.id).startsWith('prem_s_'));
                const recNotifs = notifs.filter(n => String(n.id).startsWith('rec_'));

                if (movieNotifs.length > 0) listHTML += `<div class="notif-group"><div class="notif-group-title">🎬 Premiery Filmowe</div>${movieNotifs.map(renderCard).join('')}</div>`;
                if (seriesNotifs.length > 0) listHTML += `<div class="notif-group"><div class="notif-group-title">📺 Nowe Odcinki</div>${seriesNotifs.map(renderCard).join('')}</div>`;
                if (recNotifs.length > 0) listHTML += `<div class="notif-group"><div class="notif-group-title">✨ Polecane Nowości</div>${recNotifs.map(renderCard).join('')}</div>`;
            }

            // Zbudowany kod HTML panelu
            panelContainer.innerHTML = `
                <div class="modal-overlay" id="notifOverlay" style="background: rgba(0,0,0,0.4); justify-content: flex-end;">
                    <div class="notification-drawer open" id="notifDrawer" onclick="event.stopPropagation()">
                        <!-- DODANY UCHWYT GESTU -->
                        <div class="drawer-swipe-handle"></div>
                        
                        <div class="notification-header">
                            <h2 style="display:flex; align-items:center; gap:8px;">
                                Powiadomienia 
                                ${notifs.length > 0 ? `<button class="clear-all-notifs-btn">Wyczyść</button>` : ''}
                            </h2>
                            <button class="icon-button close-notif-btn">${ICONS.close}</button>
                        </div>
                        <div class="notification-list" id="notificationListWrap">${listHTML}</div>
                    </div>
                </div>
            `;
            document.getElementById('notification-badge').style.display = 'none';

            const overlay = document.getElementById('notifOverlay');
            const drawer = document.getElementById('notifDrawer');

            const closePanel = () => {
                drawer.style.transform = 'translateX(100%)';
                setTimeout(() => { panelContainer.innerHTML = ''; NotificationManager.markAllRead(); }, 300);
            };

            overlay.addEventListener('click', closePanel);
            overlay.querySelector('.close-notif-btn').addEventListener('click', closePanel);
            // NOWE: Obsługa przycisku "Wyczyść"
            const clearBtn = overlay.querySelector('.clear-all-notifs-btn');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    triggerHaptic('medium');
                    NotificationManager.save([]); // Kasuje całą bazę powiadomień
                    document.getElementById('notificationListWrap').innerHTML = `<div style="text-align:center; padding: 40px 20px; color: var(--text-secondary);"><svg viewBox="0 0 24 24" style="width:48px;height:48px;fill:none;stroke:currentColor;stroke-width:1;margin-bottom:12px;opacity:0.5;"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg><br>Brak nowych powiadomień.</div>`;
                    clearBtn.remove(); // Ukrywa przycisk "wyczyść" bo jest już pusto
                });
            }

            // ZMIANA 4: Obsługa kliknięcia w krzyżyk (X) bez otwierania filmu
            overlay.querySelectorAll('.notif-delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Blokuje otwarcie modala filmu!
                    triggerHaptic('light');

                    const notifId = btn.dataset.id;
                    const card = btn.closest('.notif-card');

                    // Usuwamy z bazy
                    NotificationManager.remove(notifId);

                    // Animacja usuwania z ekranu
                    card.classList.add('removing');
                    setTimeout(() => {
                        const group = card.closest('.notif-group');
                        card.remove();

                        // Jeśli usunięto ostatnie z grupy (np. jedyny serial), usuwamy nagłówek "Nowe Odcinki"
                        if (group && group.querySelectorAll('.notif-card').length === 0) group.remove();

                        // Jeśli całkowicie pusto, pokazujemy info o braku powiadomień
                        const listWrap = document.getElementById('notificationListWrap');
                        if (listWrap && listWrap.querySelectorAll('.notif-card').length === 0) {
                            listWrap.innerHTML = `<div style="text-align:center; padding: 40px 20px; color: var(--text-secondary);"><svg viewBox="0 0 24 24" style="width:48px;height:48px;fill:none;stroke:currentColor;stroke-width:1;margin-bottom:12px;opacity:0.5;"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg><br>Brak nowych powiadomień.</div>`;
                        }
                    }, 300); // Czas trwania animacji z CSS
                });
            });

            // Otwieranie szczegółów
            overlay.querySelectorAll('.notif-card').forEach(card => {
                card.addEventListener('click', () => {
                    const tId = card.dataset.targetId; const tType = card.dataset.targetType;
                    if (tId && tType) {
                        closePanel();
                        const inLibrary = Object.values(data).flat().some(i => String(i.id) === String(tId));
                        setTimeout(() => { inLibrary ? openDetailsModal(tId, tType) : openPreviewModal(tId, tType); }, 300);
                    }
                });
            });

            let startX = 0; let currentX = 0; let isDragging = false;
            drawer.addEventListener('touchstart', (e) => {
                if (e.target.closest('.notification-list') && drawer.scrollHeight > drawer.clientHeight) return;
                startX = e.touches[0].clientX;
                isDragging = true;
                drawer.style.transition = 'none';
            }, { passive: true });

            drawer.addEventListener('touchmove', (e) => {
                if (!isDragging) return;
                const deltaX = e.touches[0].clientX - startX;
                if (deltaX > 0) { e.preventDefault(); currentX = deltaX; drawer.style.transform = `translateX(${currentX}px)`; }
            }, { passive: false });

            drawer.addEventListener('touchend', () => {
                if (!isDragging) return;
                isDragging = false;
                drawer.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
                if (currentX > 100) closePanel(); else drawer.style.transform = `translateX(0)`;
                currentX = 0;
            });
        });
    }
});

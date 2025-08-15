//* RouterHaus Kits — Ultra Modern Enhanced App Logic
   Next-Generation UX with Advanced Interactions and Animations
*/
(() => {
  // ---------- Enhanced Utilities ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const byId = (id) => document.getElementById(id);
  const debounce = (fn, d = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn.apply(null, a), d); }; };
  const throttle = (fn, d = 16) => { let t, l = 0; return (...a) => { const n = Date.now(); if (n - l >= d) { l = n; fn.apply(null, a); } else { clearTimeout(t); t = setTimeout(() => { l = Date.now(); fn.apply(null, a); }, d - (n - l)); } }; };
  const qs = new URLSearchParams(location.search);

  // ---------- Enhanced localStorage with error handling ----------
  const LS = {
    get: (k, d = null) => {
      try {
        const val = localStorage.getItem(k);
        return val ? JSON.parse(val) : d;
      } catch {
        return d;
      }
    },
    set: (k, v) => {
      try {
        localStorage.setItem(k, JSON.stringify(v));
      } catch (e) {
        console.warn('localStorage set failed:', e);
      }
    },
    del: (k) => {
      try {
        localStorage.removeItem(k);
      } catch (e) {
        console.warn('localStorage delete failed:', e);
      }
    },
  };

  // ---------- Helper functions ----------
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const fmtMoney = (v) => (v == null || Number(v) === 0 ? '' : `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
  const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));
  const nopunct = (s) => String(s || '').toLowerCase().replace(/[\W_]+/g, '');
  const randomId = () => Math.random().toString(36).substr(2, 9);
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

  // ---------- Toast (modern) ----------
  const showToast = (msg, type = 'info', duration = 4000) => {
    try {
      if (typeof window.showToast === 'function') return window.showToast(msg, type);
      const toast = document.createElement('div');
      toast.className = `toast-modern toast-${type}`;
      toast.innerHTML = `
        <div class="toast-content">
          <i class="toast-icon fas ${getToastIcon(type)}"></i>
          <span class="toast-message">${msg}</span>
          <button class="toast-close" aria-label="Close">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `;
      let container = document.querySelector('.toast-container');
      if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
      }
      container.appendChild(toast);
      requestAnimationFrame(() => { toast.classList.add('toast-show'); });
      const remove = () => { toast.classList.remove('toast-show'); setTimeout(() => container.removeChild(toast), 300); };
      setTimeout(remove, duration);
      toast.querySelector('.toast-close').addEventListener('click', remove);
    } catch (e) {
      console[type === 'error' ? 'error' : 'log'](`[${type}] ${msg}`);
    }
  };
  const getToastIcon = (type) => ({ success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' }[type] || 'fa-info-circle');

  // ---------- Animation utility ----------
  const animateValue = (obj, start, end, duration, callback) => {
    let startTime = null;
    const step = (ts) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const value = start + (end - start) * ease(progress);
      callback(value);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  // ---------- Performance monitor ----------
  const perf = {
    marks: new Map(),
    mark: (name) => { perf.marks.set(name, performance.now()); },
    measure: (name, startMark) => { const start = perf.marks.get(startMark); const end = performance.now(); console.debug(`⚡ ${name}: ${(end - start).toFixed(2)}ms`); return end - start; }
  };

  // ---------- State (reactive) ----------
  const state = new Proxy({
    data: [],
    filtered: [],
    facets: {},
    facetDefs: {},
    openDetails: LS.get('rh.details', {}),
    sort: qs.get('sort') || 'relevance',
    page: Math.max(1, Number(qs.get('page')) || 1),
    pageSize: Number(qs.get('ps')) || 12,
    compare: new Set(),
    quiz: LS.get('rh.quiz.answers') || null,
    showRecos: (qs.get('recos') ?? '1') !== '0',
    search: qs.get('q')?.trim().toLowerCase() || '',
    lowDataMode: LS.get('rh.lowData', false),
    optOut: LS.get('rh.optOut', false),
    isLoading: false,
    lastUpdate: Date.now(),
    theme: LS.get('rh.theme', 'auto'),
    animations: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  }, {
    set(target, prop, value) {
      const oldValue = target[prop];
      target[prop] = value;
      target.lastUpdate = Date.now();
      if (oldValue !== value) {
        document.dispatchEvent(new CustomEvent('statechange', { detail: { prop, value, oldValue } }));
      }
      return true;
    }
  });

  // ---------- Element refs ----------
  const el = {
    headerMount: byId('header-placeholder'),
    footerMount: byId('footer-placeholder'),
    filtersAside: byId('filtersAside'),
    filtersForm: byId('filtersForm'),
    quickChips: byId('quickChips'),
    emptyQuickChips: byId('emptyQuickChips'),
    expandAll: byId('expandAll'),
    collapseAll: byId('collapseAll'),
    clearAllFacets: byId('clearAllFacets'),
    matchCount: byId('matchCount'),
    activeChips: byId('activeChips'),
    sortSelect: byId('sortSelect'),
    pageSizeSelect: byId('pageSizeSelect'),
    toggleRecos: byId('toggleRecos'),
    lowDataToggle: byId('lowDataToggle'),
    progressFill: byId('progressFill'),
    floatingNav: $('.floating-nav'),
    navDots: $('.nav-dot'),
    yourPicks: byId('yourPicks'),
    picksGrid: byId('picksGrid'),
    recommendations: byId('recommendations'),
    recoGrid: byId('recoGrid'),
    recoNote: byId('recoNote'),
    paginationTop: byId('paginationTop'),
    paginationBottom: byId('paginationBottom'),
    kitsStatus: byId('kitsStatus'),
    kitsError: byId('kitsError'),
    skeletonTpl: byId('skeletonTpl'),
    cardTpl: byId('cardTpl'),
    skeletonGrid: byId('skeletonGrid'),
    resultsGrid: byId('kitResults'),
    emptyState: byId('emptyState'),
    filtersFab: byId('filtersFab'),
    activeCountBadge: byId('activeCount'),
    filtersDrawer: byId('filtersDrawer'),
    drawerTitle: byId('drawerTitle'),
    drawerFormMount: byId('drawerFormMount'),
    applyDrawer: byId('applyDrawer'),
    openFiltersHeader: byId('openFiltersHeader'),
    copyLink: byId('copyLink'),
    resetAll: byId('resetAll'),
    comparePanel: byId('comparePanel'),
    compareItemsPanel: byId('compareItemsPanel'),
    clearCompare: byId('clearCompare'),
    compareDrawer: byId('compareDrawer'),
    compareItems: byId('compareItems'),
    clearCompareMobile: byId('clearCompareMobile'),
    compareSticky: byId('compareSticky'),
    compareCount: byId('compareCount'),
    badge_brand: byId('badge-brand'),
    badge_wifi: byId('badge-wifiGen'),
    badge_mesh: byId('badge-meshReady'),
    badge_wan: byId('badge-wanTier'),
    badge_cov: byId('badge-coverageBucket'),
    badge_dev: byId('badge-deviceLoad'),
    badge_use: byId('badge-primaryUse'),
    badge_price: byId('badge-priceBucket'),
    facet_brand: byId('facet-brand'),
    facet_wifiGen: byId('facet-wifiGen'),
    facet_wifiBands: byId('facet-wifiBands'),
    facet_meshReady: byId('facet-meshReady'),
    facet_meshEco: byId('facet-meshEco'),
    facet_wanTier: byId('facet-wanTier'),
    facet_lanCount: byId('facet-lanCount'),
    facet_multiGigLan: byId('facet-multiGigLan'),
    facet_usb: byId('facet-usb'),
    facet_coverageBucket: byId('facet-coverageBucket'),
    facet_deviceLoad: byId('facet-deviceLoad'),
    facet_primaryUse: byId('facet-primaryUse'),
    facet_access: byId('facet-access'),
    facet_priceBucket: byId('facet-priceBucket'),
    chatBtn: byId('chat-btn'),
    chatModal: byId('chat-modal'),
    chatMessages: $('.chat-messages-modern', byId('chat-modal')),
    chatInputForm: $('.chat-input-modern', byId('chat-modal')),
    chatInput: $('.chat-input-modern input', byId('chat-modal')),
    chatMic: $('.mic-btn', byId('chat-modal')),
    chatOptOut: byId('opt-out'),
    searchInput: byId('searchInput'),
    searchBtn: byId('searchBtn'),
    voiceBtn: $('.voice-btn'),
  };

  // ---------- Intersection / Performance observers ----------
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting && state.animations) {
        setTimeout(() => { entry.target.classList.add('in-view'); }, index * 100);
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      if (location.hostname === 'localhost') {
        list.getEntries().forEach(entry => { if (entry.duration > 100) console.warn(`🐌 Slow operation: ${entry.name} took ${entry.duration.toFixed(2)}ms`); });
      }
    });
    observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
  }

  // ---------- Partials loading ----------
  const mountPartial = async (target) => {
    if (!target?.dataset?.partial) return;
    const path = target.dataset.partial;
    try {
      perf.mark(`partial-${path}-start`);
      const res = await fetch(path, { cache: 'no-store' });
      if (res.ok) {
        target.innerHTML = await res.text();
        perf.measure(`Partial ${path}`, `partial-${path}-start`);
        if (state.animations) {
          target.style.opacity = '0';
          target.style.transform = 'translateY(20px)';
          requestAnimationFrame(() => {
            target.style.transition = 'all 0.3s ease';
            target.style.opacity = '1';
            target.style.transform = 'translateY(0)';
          });
        }
      }
    } catch (e) {
      console.warn(`Failed to load partial: ${path}`, e);
    }
  };

  // ---------- Data fetching ----------
  const getJsonUrl = () => (window.RH_CONFIG?.jsonUrl || 'kits.json');
  const fetchData = async () => {
    perf.mark('data-fetch-start');
    const urls = [getJsonUrl(), './kits.json'];
    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: 'no-store', headers: { 'Accept': 'application/json' } });
        if (!res.ok) continue;
        const arr = await res.json();
        if (Array.isArray(arr)) { perf.measure('Data fetch', 'data-fetch-start'); return arr.map(deriveFields); }
      } catch (e) { console.warn(`Failed to fetch from ${url}:`, e); }
    }
    throw new Error('Unable to load kits.json from any source');
  };

  // ---------- Field derivation ----------
  function deriveFields(x, idx) {
    const o = { ...x };
    o.id = o.id ?? `kit_${idx}_${(o.model || '').replace(/\W+/g, '').slice(0, 12)}_${randomId()}`;
    o.brand = o.brand || o.manufacturer || guessBrand(o.model);
    o.model = (o.model || '').trim();
    o.wifiStandard = normWifi(o.wifiStandard || o.wifi || '');
    if (!Array.isArray(o.wifiBands) || !o.wifiBands.length) o.wifiBands = guessBands(o.wifiStandard);
    o.meshReady = !!o.meshReady;
    o.coverageSqft = num(o.coverageSqft);
    o.coverageBucket = o.coverageBucket || coverageToBucket(o.coverageSqft);
    o.maxWanSpeedMbps = num(o.maxWanSpeedMbps);
    o.wanTierLabel = o.wanTierLabel || wanLabelFromMbps(o.maxWanSpeedMbps);
    o.wanTier = o.wanTier ?? wanNumericFromLabel(o.wanTierLabel);
    o.lanCount = Number.isFinite(Number(o.lanCount)) ? Number(o.lanCount) : null;
    o.multiGigLan = !!o.multiGigLan;
    o.usb = !!o.usb;
    o.deviceCapacity = num(o.deviceCapacity);
    if (!o.deviceLoad) o.deviceLoad = capacityToLoad(o.deviceCapacity);
    if (!Array.isArray(o.primaryUses)) o.primaryUses = o.primaryUse ? [String(o.primaryUse)] : [];
    if (!o.primaryUse && o.primaryUses.length) o.primaryUse = o.primaryUses[0];
    o.primaryUse = o.primaryUse || 'All-Purpose';
    o.applicableDeviceLoads = Array.isArray(o.applicableDeviceLoads) && o.applicableDeviceLoads.length ? uniq(o.applicableDeviceLoads) : uniq([o.deviceLoad]);
    o.applicableCoverageBuckets = Array.isArray(o.applicableCoverageBuckets) && o.applicableCoverageBuckets.length ? uniq(o.applicableCoverageBuckets) : uniq([o.coverageBucket]);
    o.applicableWanTiers = Array.isArray(o.applicableWanTiers) && o.applicableWanTiers.length ? uniq(o.applicableWanTiers) : uniq([o.wanTierLabel]);
    o.applicablePrimaryUses = Array.isArray(o.applicablePrimaryUses) && o.applicablePrimaryUses.length ? uniq(o.applicablePrimaryUses.concat(o.primaryUses)) : uniq(o.primaryUses);
    o.accessSupport = Array.isArray(o.accessSupport) && o.accessSupport.length ? o.accessSupport : ['Cable', 'Fiber'];
    o.priceUsd = num(o.priceUsd);
    o.priceBucket = o.priceBucket || priceToBucket(o.priceUsd);
    o.reviewCount = num(o.reviewCount ?? o.reviews);
    o.reviews = o.reviewCount;
    o.rating = Number.isFinite(Number(o.rating)) ? Number(o.rating) : 0;
    o.img = typeof o.img === 'string' ? o.img : (o.image || '');
    o.url = typeof o.url === 'string' ? o.url : '';
    o.updatedAt = o.updatedAt || '';
    o._score = calculateRelevanceScore(o);
    o._searchText = buildSearchText(o);
    o._badges = generateBadges(o);
    o._features = extractFeatures(o);
    return o;
  }

  const num = (v) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : 0; };
  const guessBrand = (m) => (m || '').split(' ')[0] || 'Unknown';
  const normWifi = (w) => { const s = String(w).toUpperCase().replace(/\s+/g, ''); if (s.includes('7') || s.includes('BE')) return '7'; if (s.includes('6E')) return '6E'; if (s.includes('6')) return '6'; if (s.includes('5')) return '5'; return '6'; };
  const guessBands = (wifiStandard) => (/6E|7|BE/.test(String(wifiStandard)) ? ['2.4','5','6'] : ['2.4','5']);
  const calculateRelevanceScore = (o) => { let score = 0; switch (o.wifiStandard) { case '7': score += 8; break; case '6E': score += 6; break; case '6': score += 4; break; case '5': score += 2; break; default: score += 1; } if (o.meshReady) score += 3; if (wanRank(o) >= 3) score += 2; if (o.multiGigLan) score += 1; if (o.priceUsd > 0) score += 1; if (o.rating >= 4.5) score += 2; if (o.reviewCount > 100) score += 1; return score; };
  const buildSearchText = (o) => [ o.brand, o.model, 'wifi', `wifi-${o.wifiStandard}`, `wifi ${o.wifiStandard}`, `wifi${o.wifiStandard}`, o.wifiStandard, o.wanTierLabel, o.meshReady ? 'mesh mesh-ready' : 'standalone non-mesh', ...(o.primaryUses || []), ...(o.applicablePrimaryUses || []), ...(o.useTags || []), ].join(' ').toLowerCase();
  const generateBadges = (o) => { const badges = []; if (o.wifiStandard === '7') badges.push({ text: 'Wi-Fi 7', type: 'primary' }); if (o.wifiStandard === '6E') badges.push({ text: 'Wi-Fi 6E', type: 'accent' }); if (o.meshReady) badges.push({ text: 'Mesh Ready', type: 'success' }); if (o.rating >= 4.5 && o.reviewCount > 50) badges.push({ text: 'Top Rated', type: 'warning' }); return badges; };
  const extractFeatures = (o) => { const features = []; if (o.multiGigLan) features.push('Multi-Gig LAN'); if (o.usb) features.push('USB Ports'); if (o.wanTier >= 2500) features.push('High-Speed WAN'); if (o.deviceCapacity >= 50) features.push('High Device Capacity'); return features; };
  const coverageToBucket = (sq) => { if (!sq) return ''; if (sq < 1800) return 'Apartment/Small'; if (sq <= 3200) return '2–3 Bedroom'; return 'Large/Multi-floor'; };
  const wanLabelFromMbps = (mbps) => { if (!mbps) return ''; if (mbps >= 10000) return '10G'; if (mbps >= 5000) return '5G'; if (mbps >= 2500) return '2.5G'; return '≤1G'; };
  const wanNumericFromLabel = (label) => ({ '10G': 10000, '5G': 5000, '2.5G': 2500, '≤1G': 1000 }[label] || 0);
  const wanRank = (o) => ({ '10G': 4, '5G': 3, '2.5G': 2, '≤1G': 1 }[o.wanTierLabel || wanLabelFromMbps(o.maxWanSpeedMbps) || ''] || 0);
  const priceToBucket = (p) => { if (!p) return 'N/A'; if (p < 150) return '<150'; if (p < 300) return '150–299'; if (p < 600) return '300–599'; return '600+'; };
  const capacityToLoad = (n) => { if (!n) return ''; if (n <= 8) return '1–5'; if (n <= 20) return '6–15'; if (n <= 40) return '16–30'; if (n <= 80) return '31–60'; if (n <= 120) return '61–100'; return '100+'; };

  // ---------- URL sync ----------
  const syncUrl = debounce(() => {
    const qs2 = new URLSearchParams();
    if (state.sort !== 'relevance') qs2.set('sort', state.sort);
    if (state.page > 1) qs2.set('page', String(state.page));
    if (state.pageSize !== 12) qs2.set('ps', String(state.pageSize));
    if (!state.showRecos) qs2.set('recos', '0');
    if (state.search) qs2.set('q', state.search);
    for (const [k, vals] of Object.entries(state.facets)) if (vals.size) qs2.set(k, [...vals].join(','));
    const qStr = qs2.toString();
    const newUrl = qStr ? `?${qStr}` : location.pathname;
    if (newUrl !== location.search) { try { history.replaceState(null, '', newUrl); } catch (e) { console.warn('Failed to update URL:', e); } }
  }, 300);

  // ---------- Facet system ----------
  function buildFacetDefs() {
    perf.mark('facet-defs-start');
    state.facetDefs = {
      brand: { id: 'brand', label: 'Brand', el: el.facet_brand, badge: el.badge_brand, getValues: (o) => [o.brand].filter(Boolean), icon: 'fas fa-tags' },
      wifi: { id: 'wifi', label: 'Wi-Fi Generation', el: el.facet_wifiGen, badge: el.badge_wifi, getValues: (o) => [o.wifiStandard].filter(Boolean), order: ['7','6E','6','5'], icon: 'fas fa-wifi' },
      bands:{ id: 'bands', label: 'Wi-Fi Bands', el: el.facet_wifiBands, getValues: (o)=> Array.isArray(o.wifiBands)? o.wifiBands.filter(Boolean):[], order:['2.4','5','6'], icon:'fas fa-signal' },
      mesh: { id: 'mesh', label: 'Mesh Technology', el: el.facet_meshReady, badge: el.badge_mesh, getValues: (o)=>[o.meshReady?'Mesh-ready':'Standalone'], map: { 'Mesh-ready': o=>!!o.meshReady, 'Standalone': o=>!o.meshReady }, order: ['Mesh-ready','Standalone'], icon:'fas fa-project-diagram' },
      wan:  { id: 'wan', label: 'WAN Speed Tier', el: el.facet_wanTier, badge: el.badge_wan, getValues: (o)=> (Array.isArray(o.applicableWanTiers)&&o.applicableWanTiers.length? o.applicableWanTiers : [o.wanTierLabel].filter(Boolean)), order:['10G','5G','2.5G','≤1G'], icon:'fas fa-tachometer-alt' },
      lanCount: { id:'lanCount', label:'LAN Ports', el: el.facet_lanCount, getValues: o=> Number.isFinite(o.lanCount)? [String(o.lanCount)] : [], icon:'fas fa-ethernet' },
      multiGigLan: { id:'multiGigLan', label:'Multi-Gigabit LAN', el: el.facet_multiGigLan, getValues:o=>[o.multiGigLan?'Yes':'No'], order:['Yes','No'], icon:'fas fa-bolt' },
      usb: { id:'usb', label:'USB Connectivity', el: el.facet_usb, getValues:o=>[o.usb?'Yes':'No'], order:['Yes','No'], icon:'fab fa-usb' },
      coverage: { id:'coverage', label:'Coverage Area', el: el.facet_coverageBucket, badge: el.badge_cov, getValues:o=> (Array.isArray(o.applicableCoverageBuckets)&&o.applicableCoverageBuckets.length? o.applicableCoverageBuckets : [o.coverageBucket].filter(Boolean)), order:['Apartment/Small','2–3 Bedroom','Large/Multi-floor'], icon:'fas fa-home' },
      device: { id:'device', label:'Device Capacity', el: el.facet_deviceLoad, badge: el.badge_dev, getValues:o=> (Array.isArray(o.applicableDeviceLoads)&&o.applicableDeviceLoads.length? o.applicableDeviceLoads : [o.deviceLoad].filter(Boolean)), order:['1–5','6–15','16–30','31–60','61–100','100+'], icon:'fas fa-mobile-alt' },
      use: { id:'use', label:'Primary Use Case', el: el.facet_primaryUse, badge: el.badge_use, getValues:o=> uniq([...(o.primaryUses||[]), ...(o.applicablePrimaryUses||[]), o.primaryUse]).filter(Boolean), icon:'fas fa-bullseye' },
      access: { id:'access', label:'Internet Access Type', el: el.facet_access, getValues:o=> Array.isArray(o.accessSupport)? o.accessSupport.filter(Boolean):[], order:['Cable','Fiber','FixedWireless5G','Satellite','DSL'], icon:'fas fa-globe' },
      price: { id:'price', label:'Price Range', el: el.facet_priceBucket, badge: el.badge_price, getValues:o=> [o.priceBucket].filter(Boolean).filter(x=>x!=='N/A'), order:['<150','150–299','300–599','600+'], icon:'fas fa-dollar-sign' },
    };
    for (const key of Object.keys(state.facetDefs)) { const val = qs.get(key); state.facets[key] = new Set(val ? val.split(',') : []); }
    perf.measure('Build facet definitions', 'facet-defs-start');
  }

  function facetOptionsFromData() {
    perf.mark('facet-options-start');
    const setmap = {}; for (const key of Object.keys(state.facetDefs)) setmap[key] = new Set();
    for (const o of state.data) {
      for (const [key, def] of Object.entries(state.facetDefs)) {
        def.getValues(o).forEach(v => { const s = String(v || '').trim(); if (s) setmap[key].add(s); });
      }
    }
    const opts = {};
    for (const [key, def] of Object.entries(state.facetDefs)) {
      const values = [...setmap[key]];
      if (def.order) {
        const ordered = def.order.filter(v => setmap[key].has(v));
        for (const v of values) if (!ordered.includes(v)) ordered.push(v);
        opts[key] = ordered.map(v => ({ value: v, label: v, count: 0 }));
      } else {
        opts[key] = values.sort().map(v => ({ value: v, label: v, count: 0 }));
      }
    }
    for (const o of state.filtered) {
      for (const [key, def] of Object.entries(state.facetDefs)) {
        def.getValues(o).forEach(v => { const option = opts[key].find(opt => opt.value === v); if (option) option.count++; });
      }
    }
    perf.measure('Generate facet options', 'facet-options-start');
    return opts;
  }

  function renderFacet(def, options) {
    if (!def.el) return;
    perf.mark(`render-facet-${def.id}-start`);
    const selected = state.facets[def.id];
    def.el.innerHTML = '';
    const fragment = document.createDocumentFragment();
    for (const opt of options) {
      const raw = typeof opt === 'string' ? opt : opt.value;
      const labelText = typeof opt === 'string' ? opt : opt.label;
      const count = typeof opt === 'object' ? opt.count : 0;
      const id = `f_${def.id}_${raw.replace(/\W+/g,'')}`;
      const label = document.createElement('label');
      label.className = 'facet-option-modern';
      label.innerHTML = `
        <input type="checkbox" id="${id}" value="${raw}">
        <span class="option-content">
          <span class="option-text">${labelText}</span>
          ${count > 0 ? `<span class="option-count">(${count})</span>` : ''}
        </span>
        <span class="option-indicator"></span>
      `;
      const input = label.querySelector('input');
      input.checked = selected.has(raw);
      input.addEventListener('change', () => {
        if (input.checked) { selected.add(raw); if ('vibrate' in navigator) navigator.vibrate(10); } else { selected.delete(raw); }
        state.page = 1; onStateChanged({ focusAfter: label, source: 'facet-change' });
        trackEvent('facet_change', { facet: def.id, value: raw, action: input.checked ? 'add' : 'remove' });
      });
      fragment.appendChild(label);
    }
    def.el.appendChild(fragment);
    if (def.badge) {
      const n = selected.size;
      def.badge.textContent = String(n);
      def.badge.style.visibility = n ? 'visible' : 'hidden';
      if (state.animations && n > 0) { def.badge.style.transform = 'scale(1.2)'; setTimeout(() => { def.badge.style.transform = 'scale(1)'; }, 150); }
    }
    perf.measure(`Render facet ${def.id}`, `render-facet-${def.id}-start`);
  }

  function renderAllFacets() {
    perf.mark('render-all-facets-start');
    const opts = facetOptionsFromData();
    for (const [key, def] of Object.entries(state.facetDefs)) {
      renderFacet(def, opts[key] || []);
      const details = document.querySelector(`details.facet[data-facet="${key}"]`);
      if (details && typeof state.openDetails[key] === 'boolean') details.open = state.openDetails[key];
      details?.addEventListener('toggle', () => {
        state.openDetails[key] = details.open; LS.set('rh.details', state.openDetails);
        const chevron = details.querySelector('.facet-chevron'); if (chevron && state.animations) chevron.style.transform = details.open ? 'rotate(180deg)' : 'rotate(0)';
        trackEvent('facet_toggle', { facet: key, open: details.open });
      });
    }
    perf.measure('Render all facets', 'render-all-facets-start');
  }

  // ---------- Filtering ----------
  function applyFilters() {
    perf.mark('apply-filters-start');
    const selected = state.facets;
    const anyFacet = Object.values(selected).some(s => s.size);
    const term = state.search;
    const filtered = state.data.filter(o => {
      if (term) {
        const searchText = o._searchText || buildSearchText(o);
        const tokens = term.split(/\s+/).filter(Boolean);
        for (const token of tokens) {
          const tokenNorm = nopunct(token);
          const textNorm = nopunct(searchText);
          const exactMatch = searchText.includes(token);
          const normalizedMatch = textNorm.includes(tokenNorm);
          const brandMatch = nopunct(o.brand).includes(tokenNorm);
          const modelMatch = nopunct(o.model).includes(tokenNorm);
          if (!(exactMatch || normalizedMatch || brandMatch || modelMatch)) return false;
        }
      }
      for (const [key, def] of Object.entries(state.facetDefs)) {
        const sel = selected[key]; if (!sel || sel.size === 0) continue;
        if (def.map) { const matches = [...sel].some(v => !!def.map[v]?.(o)); if (!matches) return false; continue; }
        const vals = new Set(def.getValues(o).map(String));
        const hasMatch = [...sel].some(v => vals.has(v));
        if (!hasMatch) return false;
      }
      return true;
    });
    state.filtered = filtered;
    const isEmpty = anyFacet && filtered.length === 0;
    el.emptyState?.classList.toggle('hide', !isEmpty);
    if (el.matchCount) {
      const currentCount = parseInt(el.matchCount.textContent) || 0;
      const newCount = filtered.length;
      if (state.animations && currentCount !== newCount) {
        animateValue(null, currentCount, newCount, 300, (value) => { el.matchCount.textContent = `${Math.round(value)} matches`; });
      } else {
        el.matchCount.textContent = `${newCount} matches`;
      }
    }
    perf.measure('Apply filters', 'apply-filters-start');
    return filtered;
  }

  // ---------- Sorting ----------
  const comparators = {
    relevance: (a, b) => (b._score - a._score) || cmpPriceAsc(a, b),
    'wifi-desc': (a, b) => rankWifi(b) - rankWifi(a) || cmpPriceAsc(a, b),
    'price-asc': (a, b) => cmpPriceAsc(a, b),
    'price-desc': (a, b) => (b.priceUsd - a.priceUsd) || cmpPriceAsc(a, b),
    'coverage-desc': (a, b) => (b.coverageSqft - a.coverageSqft) || cmpPriceAsc(a, b),
    'wan-desc': (a, b) => (wanRank(b) - wanRank(a)) || cmpPriceAsc(a, b),
    'reviews-desc': (a, b) => (b.reviews - a.reviews) || (b.rating - a.rating) || cmpPriceAsc(a, b),
    'rating-desc': (a, b) => (b.rating - a.rating) || (b.reviews - a.reviews) || cmpPriceAsc(a, b),
  };
  function cmpPriceAsc(a, b) { return (a.priceUsd || Infinity) - (b.priceUsd || Infinity); }
  function rankWifi(o) { const ranks = { '7': 4, '6E': 3, '6': 2, '5': 1 }; return ranks[o.wifiStandard] || 0; }
  function sortResults() { perf.mark('sort-results-start'); const comparator = comparators[state.sort] || comparators.relevance; state.filtered.sort(comparator); perf.measure('Sort results', 'sort-results-start'); }

  // ---------- Pagination ----------
  function paginate() {
    perf.mark('paginate-start');
    const total = state.filtered.length;
    const pageCount = Math.max(1, Math.ceil(total / state.pageSize));
    state.page = clamp(state.page, 1, pageCount);
    const start = (state.page - 1) * state.pageSize;
    const end = start + state.pageSize;
    const slice = state.filtered.slice(start, end);
    renderPagination(el.paginationTop, pageCount, total);
    renderPagination(el.paginationBottom, pageCount, total);
    perf.measure('Paginate', 'paginate-start');
    return slice;
  }
  function renderPagination(container, pageCount, total) {
    if (!container) return;
    container.innerHTML = '';
    if (pageCount <= 1) return;
    const fragment = document.createDocumentFragment();
    const info = document.createElement('div');
    info.className = 'pagination-info';
    const start = (state.page - 1) * state.pageSize + 1;
    const end = Math.min(state.page * state.pageSize, total);
    info.textContent = `Showing ${start}-${end} of ${total}`;
    fragment.appendChild(info);
    const controls = document.createElement('div');
    controls.className = 'pagination-controls';
    const makeBtn = (label, page, cls = 'page', icon = null) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = `btn-modern ${cls}`;
      b.innerHTML = icon ? `<i class="${icon}"></i> ${label}` : label;
      b.setAttribute('data-page', String(page));
      b.disabled = page === state.page || page < 1 || page > pageCount;
      if (cls === 'page' && page === state.page) { b.setAttribute('aria-current', 'page'); b.classList.add('primary'); }
      b.addEventListener('click', () => { if (b.disabled) return; state.page = page; onStateChanged({ scrollToTop: true, source: 'pagination' }); trackEvent('pagination', { page, total_pages: pageCount }); });
      return b;
    };
    controls.appendChild(makeBtn('Previous', state.page - 1, 'page prev', 'fas fa-chevron-left'));
    for (const p of generatePageNumbers(state.page, pageCount)) {
      if (p === '…') { const span = document.createElement('span'); span.className = 'page-ellipsis'; span.textContent = '…'; controls.appendChild(span); }
      else { controls.appendChild(makeBtn(String(p), p)); }
    }
    controls.appendChild(makeBtn('Next', state.page + 1, 'page next', 'fas fa-chevron-right'));
    fragment.appendChild(controls);
    container.appendChild(fragment);
  }
  function generatePageNumbers(current, total) {
    const pages = []; const maxVisible = 7;
    if (total <= maxVisible) { for (let i = 1; i <= total; i++) pages.push(i); return pages; }
    const start = Math.max(1, current - Math.floor(maxVisible / 2));
    const end = Math.min(total, start + maxVisible - 1);
    if (start > 1) { pages.push(1); if (start > 2) pages.push('…'); }
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < total) { if (end < total - 1) pages.push('…'); pages.push(total); }
    return pages;
  }

  // ---------- Active filter chips ----------
  function renderActiveChips() {
    if (!el.activeChips) return;
    perf.mark('render-chips-start');
    el.activeChips.innerHTML = '';
    let chipCount = 0; const fragment = document.createDocumentFragment();
    for (const [key, def] of Object.entries(state.facetDefs)) {
      const sel = state.facets[key]; if (!sel || sel.size === 0) continue;
      for (const v of sel) {
        chipCount++;
        const chipBtn = document.createElement('button');
        chipBtn.type = 'button'; chipBtn.className = 'chip-modern active-chip';
        chipBtn.setAttribute('role', 'listitem'); chipBtn.setAttribute('aria-label', `Remove ${def.label}: ${v}`);
        chipBtn.innerHTML = `
          <i class="${def.icon || 'fas fa-tag'}"></i>
          <span>${def.label}: ${v}</span>
          <i class="fas fa-times"></i>
        `;
        chipBtn.addEventListener('click', () => {
          sel.delete(v); state.page = 1; onStateChanged({ focusAfter: el.activeChips, source: 'chip-remove' });
          trackEvent('filter_remove', { facet: key, value: v, method: 'chip' });
        });
        fragment.appendChild(chipBtn);
      }
    }
    el.activeChips.appendChild(fragment);
    el.activeChips.style.display = chipCount ? '' : 'none';
    if (el.activeCountBadge) {
      el.activeCountBadge.textContent = String(chipCount);
      if (state.animations) { el.activeCountBadge.style.transform = 'scale(1.2)'; setTimeout(() => { el.activeCountBadge.style.transform = 'scale(1)'; }, 150); }
    }
    perf.measure('Render active chips', 'render-chips-start');
  }

  // ---------- Compare system ----------
  const MAX_COMPARE = 4;
  function toggleCompare(id) {
    if (state.compare.has(id)) { state.compare.delete(id); showToast('Removed from comparison', 'info'); }
    else { if (state.compare.size >= MAX_COMPARE) { showToast(`You can compare up to ${MAX_COMPARE} products`, 'warning'); return; } state.compare.add(id); showToast('Added to comparison', 'success'); }
    updateCompareUI();
    trackEvent('compare_toggle', { product_id: id, action: state.compare.has(id) ? 'add' : 'remove', compare_count: state.compare.size });
  }
  function clearCompareAll() { const count = state.compare.size; state.compare.clear(); updateCompareUI(); if (count > 0) { showToast('Comparison cleared', 'info'); trackEvent('compare_clear', { items_cleared: count }); } }
  function updateCompareUI() {
    const items = [...state.compare].map(id => state.data.find(x => x.id === id)).filter(Boolean);
    if (el.compareItemsPanel) { el.compareItemsPanel.innerHTML = ''; const frag = document.createDocumentFragment(); items.forEach(item => frag.appendChild(createCompareBadge(item))); el.compareItemsPanel.appendChild(frag); }
    if (el.compareItems) { el.compareItems.innerHTML = ''; const frag = document.createDocumentFragment(); items.forEach(item => frag.appendChild(createCompareBadge(item))); el.compareItems.appendChild(frag); }
    if (el.compareCount) el.compareCount.textContent = String(items.length);
    if (el.compareSticky) { el.compareSticky.hidden = items.length === 0; if (state.animations && items.length > 0) { el.compareSticky.style.transform = 'translateX(50%) translateY(-4px) scale(1.05)'; setTimeout(() => { el.compareSticky.style.transform = 'translateX(50%) translateY(0) scale(1)'; }, 200); } }
    $$('.compare-btn').forEach(btn => { const productId = btn.closest('.product-modern')?.dataset?.id; if (productId) { const isActive = state.compare.has(productId); btn.setAttribute('aria-pressed', isActive ? 'true' : 'false'); btn.classList.toggle('active', isActive); const icon = btn.querySelector('i'); if (icon) icon.className = isActive ? 'fas fa-check' : 'fas fa-plus'; } });
    if (el.compareDrawer && items.length === 0) el.compareDrawer.hidden = true;
  }
  function createCompareBadge(item) {
    const badge = document.createElement('div');
    badge.className = 'compare-item-modern';
    badge.innerHTML = `
      <span class="item-name" title="${item.model}">${item.model}</span>
      <button class="item-remove" aria-label="Remove ${item.model}">
        <i class="fas fa-times"></i>
      </button>
    `;
    badge.querySelector('.item-remove').addEventListener('click', (e) => { e.stopPropagation(); toggleCompare(item.id); });
    return badge;
  }

  // ---------- Recommendations ----------
  function quizMatch(product, quiz) {
    if (!quiz) return true;
    const coverageMatch = !quiz.coverage || (product.applicableCoverageBuckets || [product.coverageBucket]).includes(quiz.coverage);
    const deviceMatch = !quiz.devices || (product.applicableDeviceLoads || [product.deviceLoad]).includes(quiz.devices);
    const useMatch = !quiz.use || uniq([...(product.primaryUses || []), ...(product.applicablePrimaryUses || []), product.primaryUse]).includes(quiz.use);
    const accessMatch = !quiz.access || (product.accessSupport || []).includes(quiz.access);
    const priceMatch = !quiz.price || matchesPriceBucket(product.priceUsd, quiz.price);
    return coverageMatch && deviceMatch && useMatch && accessMatch && priceMatch;
  }
  function matchesPriceBucket(price, bucket) {
    if (!bucket || !price) return true;
    const ranges = { '<150': [0,149], '150–299': [150,299], '300–599':[300,599], '600+':[600,Infinity] };
    const range = ranges[bucket];
    return range && price >= range[0] && price <= range[1];
  }
  function computeRecommendations() {
    perf.mark('compute-recommendations-start');
    if (!state.showRecos) return [];
    let candidates = state.data;
    if (state.quiz) candidates = candidates.filter(p => quizMatch(p, state.quiz));
    const scored = candidates.map(product => ({ ...product, _recoScore: calculateRecommendationScore(product) }));
    scored.sort((a, b) => b._recoScore - a._recoScore);
    perf.measure('Compute recommendations', 'compute-recommendations-start');
    return scored.slice(0, 8);
  }
  function calculateRecommendationScore(product) {
    let score = product._score || 0;
    if (product.rating >= 4.5) score += 3;
    if (product.reviewCount > 100) score += 2;
    if (product.reviewCount > 500) score += 1;
    if (product.updatedAt) {
      const monthsOld = (Date.now() - new Date(product.updatedAt)) / (1000 * 60 * 60 * 24 * 30);
      if (monthsOld < 6) score += 2; else if (monthsOld < 12) score += 1;
    }
    if (product.img) score += 1; if (product.url) score += 1; if (product._features?.length > 2) score += 1;
    return score;
  }
  function renderRecommendations() {
    if (!el.recommendations || !el.recoGrid) return;
    perf.mark('render-recommendations-start');
    const recommendations = computeRecommendations();
    el.recommendations.style.display = recommendations.length ? '' : 'none';
    el.recoGrid.innerHTML = '';
    if (el.recoNote) el.recoNote.textContent = state.quiz ? 'Based on your quiz answers' : 'Top picks right now';
    const fragment = document.createDocumentFragment();
    recommendations.forEach((product, index) => {
      const card = renderCard(product);
      card.classList.add('recommendation-card');
      const badge = card.querySelector('.badge-recommended'); if (badge) badge.style.display = 'block';
      if (state.animations) { card.style.opacity = '0'; card.style.transform = 'translateY(20px)'; setTimeout(() => { card.style.transition = 'all 0.3s ease'; card.style.opacity = '1'; card.style.transform = 'translateY(0)'; }, index * 100); }
      fragment.appendChild(card);
    });
    el.recoGrid.appendChild(fragment);
    perf.measure('Render recommendations', 'render-recommendations-start');
  }

  // ---------- Results rendering ----------
  function renderSkeletons(count = state.pageSize) {
    if (!el.skeletonGrid || !el.skeletonTpl) return;
    el.skeletonGrid.innerHTML = ''; el.skeletonGrid.style.display = '';
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < count; i++) fragment.appendChild(el.skeletonTpl.content.cloneNode(true));
    el.skeletonGrid.appendChild(fragment);
  }
  function hideSkeletons() { if (el.skeletonGrid) el.skeletonGrid.style.display = 'none'; }
  function renderResults(items) {
    if (!el.resultsGrid) return;
    perf.mark('render-results-start');
    el.resultsGrid.innerHTML = ''; el.resultsGrid.setAttribute('aria-busy', 'false');
    const fragment = document.createDocumentFragment();
    items.forEach((product) => {
      const card = renderCard(product);
      if (state.animations) { card.classList.add('reveal'); revealObserver.observe(card); }
      fragment.appendChild(card);
    });
    el.resultsGrid.appendChild(fragment);
    perf.measure('Render results', 'render-results-start');
  }

  // ---------- Card rendering ----------
  function renderCard(product) {
    if (!el.cardTpl) return document.createElement('div');
    const card = el.cardTpl.content.cloneNode(true);
    const article = card.querySelector('article');
    if (article) {
      article.dataset.id = product.id;
      const img = card.querySelector('img');
      const mediaContainer = card.querySelector('.product-media-modern');
      if (product.img && !state.lowDataMode) {
        img.src = product.img; img.alt = product.model || 'Router image'; img.loading = 'lazy';
        img.addEventListener('load', () => { img.style.opacity = '1'; });
        img.addEventListener('error', () => { img.style.display = 'none'; mediaContainer.classList.add('no-image'); });
      } else { if (img) img.remove(); mediaContainer?.classList.add('no-image'); }
      const title = card.querySelector('.title-modern'); if (title) { title.textContent = product.model; title.title = product.model; }
      const badgeWifi = card.querySelector('.badge-wifi'); if (badgeWifi && product.wifiStandard) { badgeWifi.textContent = `Wi-Fi ${product.wifiStandard}`; badgeWifi.style.display = 'block'; }
      const chipsContainer = card.querySelector('.chips-line-modern');
      if (chipsContainer) { chipsContainer.innerHTML = ''; generateProductChips(product).forEach(chipText => { const chip = document.createElement('span'); chip.className = 'chip-modern small'; chip.textContent = chipText; chipsContainer.appendChild(chip); }); }
      const specsList = card.querySelector('.specs-modern');
      if (specsList) { specsList.innerHTML = ''; generateProductSpecs(product).forEach(spec => { const li = document.createElement('li'); li.textContent = spec; specsList.appendChild(li); }); }
      // --- Enhanced pricing ---
      const price = card.querySelector('.price-modern');
      if (price) {
        const priceSpan = price.querySelector('[itemprop="price"]');
        if (priceSpan) priceSpan.textContent = product.priceUsd || 0;
        const firstSpan = price.querySelector('span:first-child');
        if (firstSpan) firstSpan.textContent = fmtMoney(product.priceUsd);
      }
      // --- Enhanced CTA ---
      const buyLink = card.querySelector('.cta-row-modern a');
      if (buyLink) {
        if (product.url) { buyLink.href = product.url; buyLink.removeAttribute('aria-disabled'); buyLink.classList.remove('disabled'); }
        else { buyLink.href = '#'; buyLink.setAttribute('aria-disabled', 'true'); buyLink.classList.add('disabled'); buyLink.innerHTML = '<i class="fas fa-info-circle"></i> Details'; }
      }
      // --- Enhanced compare button ---
      const compareBtn = card.querySelector('.compare-btn');
      if (compareBtn) {
        const isInCompare = state.compare.has(product.id);
        compareBtn.setAttribute('aria-pressed', isInCompare ? 'true' : 'false');
        compareBtn.classList.toggle('active', isInCompare);
        const icon = compareBtn.querySelector('i'); if (icon) icon.className = isInCompare ? 'fas fa-check' : 'fas fa-plus';
        compareBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); toggleCompare(product.id); });
      }
      // --- Enhanced quick action buttons ---
      const quickActions = card.querySelectorAll('.quick-btn');
      quickActions.forEach(btn => {
        if (btn.title === 'Add to Favorites') {
          btn.addEventListener('click', () => {
            const isFavorite = btn.classList.contains('favorite');
            btn.classList.toggle('favorite', !isFavorite);
            const icon = btn.querySelector('i'); if (icon) icon.className = isFavorite ? 'fas fa-heart' : 'fas fa-heart-broken';
            showToast(isFavorite ? 'Removed from favorites' : 'Added to favorites', 'info');
            trackEvent('favorite_toggle', { product_id: product.id, action: isFavorite ? 'remove' : 'add' });
          });
        }
        if (btn.title === 'Quick View') { btn.addEventListener('click', () => { openProductModal(product); }); }
      });
      // --- Card click handling ---
      article.addEventListener('click', (e) => {
        if (e.target.closest('button, a')) return;
        trackEvent('product_click', { product_id: product.id, brand: product.brand, model: product.model });
        openProductModal(product);
      });
    }
    return card;
  }

  function generateProductChips(product) {
    const chips = [];
    if (product.wifiStandard) chips.push(`Wi-Fi ${product.wifiStandard}`);
    if (product.meshReady) chips.push('Mesh Ready');
    if (product.wanTierLabel && product.wanTierLabel !== '≤1G') chips.push(`${product.wanTierLabel} WAN`);
    if (product.coverageBucket && chips.length < 3) chips.push(product.coverageBucket);
    return chips.slice(0, 3);
  }
  function generateProductSpecs(product) {
    const specs = [];
    if (product.coverageBucket) specs.push(`Coverage: ${product.coverageBucket}`);
    if (product.deviceLoad) specs.push(`Devices: ${product.deviceLoad}`);
    const wanLabel = product.wanTierLabel || wanLabelFromMbps(product.maxWanSpeedMbps);
    if (wanLabel) specs.push(`Internet: ${wanLabel === '≤1G' ? 'up to 1 Gbps' : `${wanLabel}bps`}`);
    if (product.primaryUse && specs.length < 4) specs.push(`Best for: ${product.primaryUse}`);
    if (specs.length < 4 && product.wifiBands?.length) specs.push(`Bands: ${product.wifiBands.join(' / ')} GHz`);
    if (specs.length < 4 && product.multiGigLan) specs.push('Multi-Gig LAN');
    if (specs.length < 4 && Number.isFinite(product.lanCount)) specs.push(`${product.lanCount} LAN ports`);
    return specs.slice(0, 4);
  }

  // ---------- Modal system ----------
  function openProductModal(product) {
    let modal = document.getElementById('product-modal');
    if (!modal) { modal = createProductModal(); document.body.appendChild(modal); }
    populateProductModal(modal, product);
    modal.classList.add('active'); document.body.classList.add('modal-open');
    const closeBtn = modal.querySelector('.modal-close'); if (closeBtn) closeBtn.focus();
    trackEvent('product_modal_open', { product_id: product.id, brand: product.brand });
  }
  function createProductModal() {
    const modal = document.createElement('div');
    modal.id = 'product-modal'; modal.className = 'product-modal-modern'; modal.setAttribute('role','dialog'); modal.setAttribute('aria-modal','true');
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-container glass-modern">
        <header class="modal-header">
          <h2 class="modal-title"></h2>
          <button class="modal-close icon-btn-modern" aria-label="Close">
            <i class="fas fa-times"></i>
          </button>
        </header>
        <div class="modal-body">
          <div class="product-image-section">
            <img class="product-image" alt="" />
          </div>
          <div class="product-info-section">
            <div class="product-badges-section"></div>
            <div class="product-specs-section"></div>
            <div class="product-features-section"></div>
            <div class="product-price-section"></div>
            <div class="product-actions-section"></div>
          </div>
        </div>
      </div>
    `;
    modal.querySelector('.modal-close').addEventListener('click', closeProductModal);
    modal.querySelector('.modal-backdrop').addEventListener('click', closeProductModal);
    modal.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeProductModal(); });
    return modal;
  }
  function populateProductModal(modal, product) {
    const title = modal.querySelector('.modal-title'); if (title) title.textContent = product.model;
    const img = modal.querySelector('.product-image');
    if (img) { if (product.img) { img.src = product.img; img.alt = product.model; img.style.display = 'block'; } else { img.style.display = 'none'; } }
    const badgesSection = modal.querySelector('.product-badges-section');
    if (badgesSection) { badgesSection.innerHTML = ''; product._badges?.forEach(badge => { const span = document.createElement('span'); span.className = `badge-modern ${badge.type}`; span.textContent = badge.text; badgesSection.appendChild(span); }); }
    const specsSection = modal.querySelector('.product-specs-section');
    if (specsSection) {
      const specs = generateDetailedSpecs(product);
      specsSection.innerHTML = `
        <h3>Specifications</h3>
        <div class="specs-grid">
          ${specs.map(spec => `
            <div class="spec-item">
              <dt>${spec.label}</dt>
              <dd>${spec.value}</dd>
            </div>
          `).join('')}
        </div>
      `;
    }
    const featuresSection = modal.querySelector('.product-features-section');
    if (featuresSection && product._features?.length) {
      featuresSection.innerHTML = `
        <h3>Key Features</h3>
        <ul class="features-list">
          ${product._features.map(feature => `<li>${feature}</li>`).join('')}
        </ul>
      `;
    }
    const priceSection = modal.querySelector('.product-price-section');
    if (priceSection) priceSection.innerHTML = `
      <div class="price-display">
        <span class="price-amount">${fmtMoney(product.priceUsd)}</span>
        <span class="price-bucket">${product.priceBucket}</span>
      </div>
    `;
    const actionsSection = modal.querySelector('.product-actions-section');
    if (actionsSection) {
      const isInCompare = state.compare.has(product.id);
      actionsSection.innerHTML = `
        <div class="modal-actions">
          ${product.url ? `
            <a href="${product.url}" target="_blank" rel="noopener" class="btn-modern primary large">
              <i class="fas fa-shopping-cart"></i> Buy Now
            </a>
          ` : ''}
          <button class="btn-modern secondary compare-modal-btn" data-product-id="${product.id}">
            <i class="fas ${isInCompare ? 'fa-check' : 'fa-plus'}"></i>
            ${isInCompare ? 'In Comparison' : 'Add to Compare'}
          </button>
        </div>
      `;
      const compareBtn = actionsSection.querySelector('.compare-modal-btn');
      if (compareBtn) compareBtn.addEventListener('click', () => {
        toggleCompare(product.id);
        const isNowInCompare = state.compare.has(product.id);
        compareBtn.innerHTML = `
          <i class="fas ${isNowInCompare ? 'fa-check' : 'fa-plus'}"></i>
          ${isNowInCompare ? 'In Comparison' : 'Add to Compare'}
        `;
      });
    }
  }
  function generateDetailedSpecs(product) {
    const specs = [
      { label: 'Brand', value: product.brand },
      { label: 'Wi-Fi Standard', value: product.wifiStandard ? `Wi-Fi ${product.wifiStandard}` : 'N/A' },
      { label: 'Wi-Fi Bands', value: (product.wifiBands?.join(', ') + ' GHz') || 'N/A' },
      { label: 'Mesh Ready', value: product.meshReady ? 'Yes' : 'No' },
      { label: 'Coverage', value: product.coverageBucket || 'N/A' },
      { label: 'Device Capacity', value: product.deviceLoad || 'N/A' },
      { label: 'WAN Speed', value: product.wanTierLabel || 'N/A' },
      { label: 'LAN Ports', value: product.lanCount ? String(product.lanCount) : 'N/A' },
      { label: 'Multi-Gig LAN', value: product.multiGigLan ? 'Yes' : 'No' },
      { label: 'USB Ports', value: product.usb ? 'Yes' : 'No' },
      { label: 'Primary Use', value: product.primaryUse || 'N/A' },
    ].filter(spec => spec.value !== 'N/A');
    return specs;
  }
  function closeProductModal() {
    const modal = document.getElementById('product-modal');
    if (modal) { modal.classList.remove('active'); document.body.classList.remove('modal-open'); trackEvent('product_modal_close'); }
  }

  // ---------- Toolbar & search ----------
  function wireToolbar() {
    perf.mark('wire-toolbar-start');
    if (el.sortSelect) { el.sortSelect.value = state.sort; el.sortSelect.addEventListener('change', () => { state.sort = el.sortSelect.value; state.page = 1; onStateChanged({ source: 'sort-change' }); trackEvent('sort_change', { sort_type: state.sort }); }); }
    if (el.pageSizeSelect) { el.pageSizeSelect.value = String(state.pageSize); el.pageSizeSelect.addEventListener('change', () => { state.pageSize = Number(el.pageSizeSelect.value); state.page = 1; onStateChanged({ source: 'pagesize-change' }); trackEvent('pagesize_change', { page_size: state.pageSize }); }); }
    if (el.toggleRecos) { el.toggleRecos.checked = state.showRecos; el.toggleRecos.addEventListener('change', () => { state.showRecos = el.toggleRecos.checked; syncUrl(); renderRecommendations(); trackEvent('recommendations_toggle', { enabled: state.showRecos }); }); }
    if (el.lowDataToggle) { el.lowDataToggle.checked = state.lowDataMode; el.lowDataToggle.addEventListener('change', () => { state.lowDataMode = el.lowDataToggle.checked; LS.set('rh.lowData', state.lowDataMode); document.body.classList.toggle('low-data', state.lowDataMode); onStateChanged({ source: 'lowdata-toggle' }); trackEvent('low_data_toggle', { enabled: state.lowDataMode }); }); }
    document.body.classList.toggle('low-data', state.lowDataMode);
    el.openFiltersHeader?.addEventListener('click', openDrawer);
    el.filtersFab?.addEventListener('click', () => { openDrawer(); el.filtersFab.setAttribute('aria-expanded', 'true'); });
    wireSearch();
    wireCommandBarFeatures();
    wireProgressTracking();
    perf.measure('Wire toolbar', 'wire-toolbar-start');
  }
  function wireSearch() {
    if (!el.searchInput) return;
    const input = el.searchInput; const btn = el.searchBtn; const voiceBtn = el.voiceBtn;
    input.value = state.search;
    const clearBtn = createSearchClearButton(input);
    const executeSearch = () => { const newSearch = (input.value || '').trim().toLowerCase(); if (newSearch !== state.search) { state.search = newSearch; state.page = 1; onStateChanged({ scrollToTop: true, source: 'search' }); trackEvent('search', { query: newSearch, query_length: newSearch.length }); } };
    const debouncedSearch = debounce(executeSearch, 300);
    input.addEventListener('input', () => { debouncedSearch(); updateSearchClearButton(clearBtn, input.value); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); executeSearch(); } if (e.key === 'Escape' && input.value) { e.preventDefault(); input.value = ''; executeSearch(); updateSearchClearButton(clearBtn, ''); } });
    if (btn) btn.addEventListener('click', executeSearch);
    wireVoiceSearch(input, voiceBtn);
  }
  function createSearchClearButton(input) {
    const wrapper = input.closest('.search-wrapper'); if (!wrapper) return null;
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button'; clearBtn.className = 'search-clear-btn'; clearBtn.setAttribute('aria-label', 'Clear search'); clearBtn.innerHTML = '<i class="fas fa-times"></i>'; clearBtn.style.display = 'none';
    clearBtn.addEventListener('click', () => { input.value = ''; state.search = ''; state.page = 1; onStateChanged({ scrollToTop: true, source: 'search-clear' }); input.focus(); updateSearchClearButton(clearBtn, ''); trackEvent('search_clear'); });
    wrapper.appendChild(clearBtn);
    return clearBtn;
  }
  function updateSearchClearButton(clearBtn, value) { if (clearBtn) clearBtn.style.display = value ? 'flex' : 'none'; }
  function wireVoiceSearch(input, voiceBtn) {
    if (!voiceBtn || !('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) { if (voiceBtn) voiceBtn.style.display = 'none'; return; }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition; const recognition = new SpeechRecognition();
    recognition.continuous = false; recognition.interimResults = false; recognition.lang = 'en-US';
    voiceBtn.addEventListener('click', () => { if (voiceBtn.classList.contains('active')) { recognition.stop(); return; } voiceBtn.classList.add('active'); recognition.start(); trackEvent('voice_search_start'); });
    recognition.onresult = (event) => { const transcript = event.results[0][0].transcript; input.value = transcript; state.search = transcript.toLowerCase().trim(); state.page = 1; onStateChanged({ scrollToTop: true, source: 'voice-search' }); trackEvent('voice_search_success', { query: transcript, confidence: event.results[0][0].confidence }); };
    recognition.onend = () => { voiceBtn.classList.remove('active'); };
    recognition.onerror = (event) => { voiceBtn.classList.remove('active'); showToast('Voice recognition failed. Please try again.', 'error'); trackEvent('voice_search_error', { error: event.error }); };
  }
  function wireCommandBarFeatures() {
    const commandBar = $('.command-bar'); if (!commandBar) return;
    let lastScrollY = 0; const handleScroll = throttle(() => { const scrollY = window.scrollY; const isScrollingDown = scrollY > lastScrollY && scrollY > 100; commandBar.classList.toggle('condensed', isScrollingDown); lastScrollY = scrollY; }, 16);
    window.addEventListener('scroll', handleScroll, { passive: true });
  }
  function wireProgressTracking() {
    const progressRing = $('.page-progress-ring'); const progressCircle = $('.progress-ring-circle'); const progressPercentage = $('.progress-percentage');
    if (!progressRing || !progressCircle || !progressPercentage) return;
    const radius = progressCircle.r.baseVal.value; const circumference = radius * 2 * Math.PI;
    progressCircle.style.strokeDasharray = `${circumference} ${circumference}`; progressCircle.style.strokeDashoffset = circumference;
    const updateProgress = throttle(() => { const scrollTop = window.pageYOffset; const docHeight = document.documentElement.scrollHeight - window.innerHeight; const scrollPercent = Math.min(scrollTop / Math.max(docHeight, 1), 1); const offset = circumference - scrollPercent * circumference; progressCircle.style.strokeDashoffset = offset; const percentage = Math.round(scrollPercent * 100); progressPercentage.textContent = `${percentage}%`; const shouldShow = scrollTop > 200; progressRing.style.opacity = shouldShow ? '1' : '0'; progressRing.style.pointerEvents = shouldShow ? 'auto' : 'none'; }, 16);
    window.addEventListener('scroll', updateProgress, { passive: true }); updateProgress();
    progressRing.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); trackEvent('scroll_to_top', { method: 'progress_ring' }); });
  }

  // ---------- Drawer management ----------
  function openDrawer() {
    if (!el.filtersDrawer || !el.drawerFormMount || !el.filtersForm) return;
    el.drawerFormMount.innerHTML = '';
    const clonedForm = el.filtersForm.cloneNode(true);
    el.drawerFormMount.appendChild(clonedForm);
    el.filtersDrawer.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('scroll-lock');
    const firstFocusable = clonedForm.querySelector('input, button, select, [tabindex]:not([tabindex="-1"])');
    if (firstFocusable) setTimeout(() => firstFocusable.focus(), 100);
    wireDrawerControls(clonedForm);
    trackEvent('mobile_filters_open');
  }
  function wireDrawerControls(clonedForm) {
    $$('.close-drawer, [data-close-drawer]').forEach(btn => { btn.addEventListener('click', closeDrawer, { once: true }); });
    if (el.applyDrawer) { el.applyDrawer.onclick = () => { syncFormStates(clonedForm, el.filtersForm); closeDrawer(); onStateChanged({ source: 'mobile-filters-apply' }); trackEvent('mobile_filters_apply'); }; }
    const escHandler = (e) => { if (e.key === 'Escape') { closeDrawer(); document.removeEventListener('keydown', escHandler); } };
    document.addEventListener('keydown', escHandler);
  }
  function closeDrawer() {
    if (el.filtersDrawer) el.filtersDrawer.setAttribute('aria-hidden', 'true');
    if (el.filtersFab) el.filtersFab.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('scroll-lock');
    trackEvent('mobile_filters_close');
  }
  function syncFormStates(sourceForm, targetForm) {
    const stateMap = new Map();
    $$("input[type='checkbox']", sourceForm).forEach(input => { const facet = input.closest('.facet')?.dataset?.facet; const key = `${facet}::${input.value}`; stateMap.set(key, input.checked); });
    $$("input[type='checkbox']", targetForm).forEach(input => { const facet = input.closest('.facet')?.dataset?.facet; const key = `${facet}::${input.value}`; if (stateMap.has(key)) input.checked = stateMap.get(key); });
    rebuildFacetSelectionsFromDOM();
  }
  function rebuildFacetSelectionsFromDOM() {
    for (const [key] of Object.entries(state.facetDefs)) {
      const facetElement = document.querySelector(`[data-facet="${key}"]`);
      if (!facetElement) continue;
      const selected = new Set();
      $$("input[type='checkbox']:checked", facetElement).forEach(input => { selected.add(input.value); });
      state.facets[key] = selected;
    }
  }

  // ---------- State change orchestrator ----------
  const onStateChanged = debounce((options = {}) => {
    perf.mark('state-change-start');
    const { focusAfter, scrollToTop, source } = options;
    applyFilters();
    sortResults();
    renderActiveChips();
    renderAllFacets();
    renderRecommendations();
    const pageResults = paginate();
    renderResults(pageResults);
    updateCompareUI();
    syncUrl();
    if (focusAfter && document.contains(focusAfter)) setTimeout(() => focusAfter.focus(), 100);
    if (scrollToTop) window.scrollTo({ top: 0, behavior: state.animations ? 'smooth' : 'auto' });
    perf.measure('State change', 'state-change-start');
    trackEvent('state_change', { source: source || 'unknown', results_count: state.filtered.length, active_filters: Object.values(state.facets).reduce((sum, set) => sum + set.size, 0) });
  }, 100);

  // ---------- Analytics ----------
  const trackEvent = (eventName, parameters = {}) => {
    try {
      if (typeof gtag !== 'undefined') gtag('event', eventName, { ...parameters, page_title: document.title, page_location: window.location.href });
      if (window.RH_ANALYTICS) window.RH_ANALYTICS.track(eventName, parameters);
      if (location.hostname === 'localhost') console.log(`📊 Event: ${eventName}`, parameters);
    } catch (e) { console.warn('Analytics tracking failed:', e); }
  };

  // ---------- Keyboard shortcuts ----------
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select')) return;
    switch (e.key) {
      case 'Escape': handleEscapeKey(); break;
      case '/': e.preventDefault(); el.searchInput?.focus(); trackEvent('keyboard_shortcut', { key: 'search_focus' }); break;
      case 'f': if (e.ctrlKey || e.metaKey) { e.preventDefault(); el.searchInput?.focus(); trackEvent('keyboard_shortcut', { key: 'search_focus_ctrl' }); } break;
      case 'c': if (e.ctrlKey || e.metaKey) return; if (state.compare.size > 0) { el.compareSticky?.click(); trackEvent('keyboard_shortcut', { key: 'compare_toggle' }); } break;
    }
  });
  function handleEscapeKey() {
    if (document.querySelector('.modal-modern.active')) { closeProductModal(); return; }
    if (el.filtersDrawer?.getAttribute('aria-hidden') === 'false') { closeDrawer(); return; }
    if (state.search && el.searchInput === document.activeElement) { el.searchInput.value = ''; state.search = ''; state.page = 1; onStateChanged({ source: 'escape-clear-search' }); return; }
    const facetKeys = Object.keys(state.facetDefs);
    for (let i = facetKeys.length - 1; i >= 0; i--) {
      const facetSet = state.facets[facetKeys[i]];
      if (facetSet && facetSet.size) { const firstValue = facetSet.values().next().value; facetSet.delete(firstValue); state.page = 1; onStateChanged({ source: 'escape-clear-filter' }); return; }
    }
    trackEvent('escape_key_used');
  }

  // ---------- Initialization ----------
  async function initializeApp() {
    console.log('🚀 Initializing RouterHaus Kits (Ultra Modern)...');
    perf.mark('app-init-start');
    try {
      // Load header/footer partials (non-blocking)
      await Promise.all([
        el.headerMount ? mountPartial(el.headerMount) : null,
        el.footerMount ? mountPartial(el.footerMount) : null,
      ]);
      // Skeletons while loading
      renderSkeletons(12);
      // Fetch data
      state.data = await fetchData();
      state.filtered = state.data.slice();
      // Build facets & first render
      buildFacetDefs();
      onStateChanged({ source: 'init', scrollToTop: false });
      hideSkeletons();
      wireToolbar();
      // Wire compare clear buttons if present
      el.clearCompare?.addEventListener('click', clearCompareAll);
      el.clearCompareMobile?.addEventListener('click', clearCompareAll);
      // Copy link (if present)
      el.copyLink?.addEventListener('click', async () => { try { await navigator.clipboard.writeText(window.location.href); showToast('Link copied', 'success'); } catch { showToast('Copy failed', 'error'); } });
      // Reset all filters (if present)
      el.resetAll?.addEventListener('click', () => { for (const k of Object.keys(state.facets)) state.facets[k].clear(); state.search = ''; state.page = 1; onStateChanged({ source: 'reset-all', scrollToTop: true }); });
      perf.measure('App init', 'app-init-start');
    } catch (e) {
      console.error(e);
      if (el.kitsError) { el.kitsError.textContent = 'Failed to load data.'; el.kitsError.hidden = false; }
      hideSkeletons();
    }
  }

  document.addEventListener('DOMContentLoaded', initializeApp);

})();


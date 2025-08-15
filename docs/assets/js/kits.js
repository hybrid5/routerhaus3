/* RouterHaus Kits — App logic (client-side)
   (see header of your original for the full feature list)
*/
(() => {
  // ---------- Utilities ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const byId = (id) => document.getElementById(id);
  const debounce = (fn, d = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn.apply(null, a), d); }; };
  const qs = new URLSearchParams(location.search);
  const LS = {
    get: (k, d = null) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
    del: (k) => localStorage.removeItem(k),
  };
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const fmtMoney = (v) => (v == null || Number(v) === 0 ? '' : `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
  const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));
  const nopunct = (s) => String(s || '').toLowerCase().replace(/[\W_]+/g, ''); // normalize for fuzzy inclusion

  // Safe toast (fallback if a global showToast isn’t present)
  const showToast = (msg, type = 'info') => {
    try {
      if (typeof window.showToast === 'function') return window.showToast(msg, type);
      console[type === 'error' ? 'error' : 'log'](`[${type}] ${msg}`);
    } catch {}
  };

  // Optionally persist chat unless user opts out
  const LS_KEY_CHAT = 'rh.chat.history';
  const MAX_CHAT_MSGS = 50;

  // ---------- State ----------
  const state = {
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
  };

  // ---------- Elements ----------
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

    // badges
    badge_brand: byId('badge-brand'),
    badge_wifi: byId('badge-wifiGen'),
    badge_mesh: byId('badge-meshReady'),
    badge_wan: byId('badge-wanTier'),
    badge_cov: byId('badge-coverageBucket'),
    badge_dev: byId('badge-deviceLoad'),
    badge_use: byId('badge-primaryUse'),
    badge_price: byId('badge-priceBucket'),

    // facet containers
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

    // Chat
    chatBtn: byId('chat-btn'),
    chatModal: byId('chat-modal'),
    chatMessages: $('.chat-messages', byId('chat-modal')),
    chatInputForm: $('.chat-input', byId('chat-modal')),
    chatInput: $('.chat-input input', byId('chat-modal')),
    chatMic: $('.chat-input .mic', byId('chat-modal')),
    chatOptOut: byId('opt-out'),
  };

  // ---------- Partials ----------
  const mountPartial = async (target) => {
    const path = target?.dataset?.partial;
    if (!path) return;
    try {
      const res = await fetch(path, { cache: 'no-store' });
      if (res.ok) target.innerHTML = await res.text();
    } catch {}
  };

  // ---------- Data ----------
  const getJsonUrl = () => (window.RH_CONFIG?.jsonUrl || 'kits.json');
  const fetchData = async () => {
    const urls = [getJsonUrl(), './kits.json']; // include fallback
    for (const u of urls) {
      try {
        const res = await fetch(u, { cache: 'no-store' });
        if (!res.ok) continue;
        const arr = await res.json();
        if (Array.isArray(arr)) return arr.map(deriveFields);
      } catch {}
    }
    throw new Error('Unable to load kits.json');
  };

  // ---------- Derivations / normalizers ----------
  function deriveFields(x, idx) {
    const o = { ...x };

    // ids/brand/model
    o.id = o.id ?? `k_${idx}_${(o.model || '').replace(/\W+/g, '').slice(0, 12)}`;
    o.brand = o.brand || o.manufacturer || guessBrand(o.model);
    o.model = (o.model || '').trim();

    // wifi
    o.wifiStandard = normWifi(o.wifiStandard || o.wifi || '');
    if (!Array.isArray(o.wifiBands) || !o.wifiBands.length) o.wifiBands = guessBands(o.wifiStandard);

    // mesh, coverage
    o.meshReady = !!o.meshReady;
    o.coverageSqft = num(o.coverageSqft);
    o.coverageBucket = o.coverageBucket || coverageToBucket(o.coverageSqft);

    // WAN tier
    o.maxWanSpeedMbps = num(o.maxWanSpeedMbps);
    o.wanTierLabel = o.wanTierLabel || wanLabelFromMbps(o.maxWanSpeedMbps);
    o.wanTier = o.wanTier ?? wanNumericFromLabel(o.wanTierLabel);

    // ports
    o.lanCount = Number.isFinite(Number(o.lanCount)) ? Number(o.lanCount) : null;
    o.multiGigLan = !!o.multiGigLan;
    o.usb = !!o.usb;

    // device capacity/load
    o.deviceCapacity = num(o.deviceCapacity);
    if (!o.deviceLoad) o.deviceLoad = capacityToLoad(o.deviceCapacity);

    // uses
    if (!Array.isArray(o.primaryUses)) o.primaryUses = o.primaryUse ? [String(o.primaryUse)] : [];
    if (!o.primaryUse && o.primaryUses.length) o.primaryUse = o.primaryUses[0];
    o.primaryUse = o.primaryUse || 'All-Purpose';

    // applicable* inclusive envelopes
    o.applicableDeviceLoads = Array.isArray(o.applicableDeviceLoads) && o.applicableDeviceLoads.length
      ? uniq(o.applicableDeviceLoads) : uniq([o.deviceLoad]);
    o.applicableCoverageBuckets = Array.isArray(o.applicableCoverageBuckets) && o.applicableCoverageBuckets.length
      ? uniq(o.applicableCoverageBuckets) : uniq([o.coverageBucket]);
    o.applicableWanTiers = Array.isArray(o.applicableWanTiers) && o.applicableWanTiers.length
      ? uniq(o.applicableWanTiers) : uniq([o.wanTierLabel]);
    o.applicablePrimaryUses = Array.isArray(o.applicablePrimaryUses) && o.applicablePrimaryUses.length
      ? uniq(o.applicablePrimaryUses.concat(o.primaryUses)) : uniq(o.primaryUses);

    // access & price
    o.accessSupport = Array.isArray(o.accessSupport) && o.accessSupport.length ? o.accessSupport : ['Cable', 'Fiber'];
    o.priceUsd = num(o.priceUsd);
    o.priceBucket = o.priceBucket || priceToBucket(o.priceUsd);

    // reviews / rating
    o.reviewCount = num(o.reviewCount ?? o.reviews);
    o.reviews = o.reviewCount;
    o.rating = Number.isFinite(Number(o.rating)) ? Number(o.rating) : 0;

    // misc
    o.img = typeof o.img === 'string' ? o.img : (o.image || '');
    o.url = typeof o.url === 'string' ? o.url : '';
    o.updatedAt = o.updatedAt || '';

    // simple relevance
    o._score =
      (o.wifiStandard === '7' ? 5 : o.wifiStandard === '6E' ? 4 : o.wifiStandard === '6' ? 3 : 1) +
      (o.meshReady ? 1 : 0) +
      (wanRank(o) >= 3 ? 1 : 0) +
      (o.priceUsd > 0 ? 1 : 0);

    return o;
  }

  const num = (v) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : 0; };
  const guessBrand = (m) => (m || '').split(' ')[0] || 'Unknown';
  const normWifi = (w) => {
    const s = String(w).toUpperCase().replace(/\s+/g, '');
    if (s.includes('7')) return '7';
    if (s.includes('6E')) return '6E';
    if (s.includes('6')) return '6';
    if (s.includes('5')) return '5';
    return '6';
  };
  const guessBands = (wifiStandard) => (/6E|7/.test(String(wifiStandard)) ? ['2.4','5','6'] : ['2.4','5']);

  const coverageToBucket = (sq) => {
    if (!sq) return '';
    if (sq < 1800) return 'Apartment/Small';
    if (sq <= 3200) return '2–3 Bedroom';
    return 'Large/Multi-floor';
  };

  const wanLabelFromMbps = (mbps) => {
    if (!mbps) return '';
    if (mbps >= 10000) return '10G';
    if (mbps >= 5000) return '5G';
    if (mbps >= 2500) return '2.5G';
    return '≤1G';
  };
  const wanNumericFromLabel = (label) => {
    switch (label) {
      case '10G': return 10000;
      case '5G': return 5000;
      case '2.5G': return 2500;
      case '≤1G': return 1000;
      default: return 0;
    }
  };
  const wanRank = (o) => {
    const l = o.wanTierLabel || wanLabelFromMbps(o.maxWanSpeedMbps) || '';
    return l === '10G' ? 4 : l === '5G' ? 3 : l === '2.5G' ? 2 : l === '≤1G' ? 1 : 0;
  };

  const priceToBucket = (p) => {
    if (!p) return 'N/A';
    if (p < 150) return '<150';
    if (p < 300) return '150–299';
    if (p < 600) return '300–599';
    return '600+';
  };

  const capacityToLoad = (n) => {
    if (!n) return '';
    if (n <= 8) return '1–5';
    if (n <= 20) return '6–15';
    if (n <= 40) return '16–30';
    if (n <= 80) return '31–60';
    if (n <= 120) return '61–100';
    return '100+';
  };

  // ---------- URL sync ----------
  const syncUrl = () => {
    const qs2 = new URLSearchParams();
    if (state.sort !== 'relevance') qs2.set('sort', state.sort);
    if (state.page > 1) qs2.set('page', String(state.page));
    if (state.pageSize !== 12) qs2.set('ps', String(state.pageSize));
    if (!state.showRecos) qs2.set('recos', '0');
    if (state.search) qs2.set('q', state.search);
    for (const [k, vals] of Object.entries(state.facets)) {
      if (vals.size) qs2.set(k, [...vals].join(','));
    }
    const qStr = qs2.toString();
    history.replaceState(null, '', qStr ? `?${qStr}` : location.pathname);
  };

  // ---------- Facets ----------
  function buildFacetDefs() {
    state.facetDefs = {
      brand: { id: 'brand', label: 'Brand', el: el.facet_brand, badge: el.badge_brand, getValues: (o) => [o.brand].filter(Boolean) },
      wifi:  { id: 'wifi',  label: 'Wi-Fi', el: el.facet_wifiGen, badge: el.badge_wifi, getValues: (o) => [o.wifiStandard].filter(Boolean), order: ['7','6E','6','5'] },
      bands: { id: 'bands', label: 'Bands', el: el.facet_wifiBands, getValues: (o) => Array.isArray(o.wifiBands) ? o.wifiBands.filter(Boolean) : [], order: ['2.4','5','6'] },
      mesh:  {
        id: 'mesh', label: 'Mesh', el: el.facet_meshReady, badge: el.badge_mesh,
        getValues: (o) => [o.meshReady ? 'Mesh-ready' : 'Standalone'],
        map: { 'Mesh-ready': (o) => !!o.meshReady, 'Standalone': (o) => !o.meshReady },
        order: ['Mesh-ready','Standalone'],
      },
      wan:   {
        id: 'wan', label: 'WAN Tier', el: el.facet_wanTier, badge: el.badge_wan,
        getValues: (o) => (Array.isArray(o.applicableWanTiers) && o.applicableWanTiers.length ? o.applicableWanTiers : [o.wanTierLabel].filter(Boolean)),
        order: ['10G','5G','2.5G','≤1G'],
      },
      lanCount: { id: 'lanCount', label: 'LAN Ports', el: el.facet_lanCount, getValues: (o) => Number.isFinite(o.lanCount) ? [String(o.lanCount)] : [] },
      multiGigLan: { id: 'multiGigLan', label: 'Multi-Gig LAN', el: el.facet_multiGigLan, getValues: (o) => [o.multiGigLan ? 'Yes' : 'No'], order: ['Yes','No'] },
      usb:   { id: 'usb', label: 'USB', el: el.facet_usb, getValues: (o) => [o.usb ? 'Yes' : 'No'], order: ['Yes','No'] },
      coverage: {
        id: 'coverage', label: 'Coverage', el: el.facet_coverageBucket, badge: el.badge_cov,
        getValues: (o) => (Array.isArray(o.applicableCoverageBuckets) && o.applicableCoverageBuckets.length ? o.applicableCoverageBuckets : [o.coverageBucket].filter(Boolean)),
        order: ['Apartment/Small','2–3 Bedroom','Large/Multi-floor'],
      },
      device: {
        id: 'device', label: 'Device Load', el: el.facet_deviceLoad, badge: el.badge_dev,
        getValues: (o) => (Array.isArray(o.applicableDeviceLoads) && o.applicableDeviceLoads.length ? o.applicableDeviceLoads : [o.deviceLoad].filter(Boolean)),
        order: ['1–5','6–15','16–30','31–60','61–100','100+'],
      },
      use:   { id: 'use', label: 'Primary Use', el: el.facet_primaryUse, badge: el.badge_use, getValues: (o) => uniq([...(o.primaryUses || []), ...(o.applicablePrimaryUses || []), o.primaryUse]).filter(Boolean) },
      access:{ id: 'access', label: 'Access', el: el.facet_access, getValues: (o) => Array.isArray(o.accessSupport) ? o.accessSupport.filter(Boolean) : [], order: ['Cable','Fiber','FixedWireless5G','Satellite','DSL'] },
      price: { id: 'price', label: 'Price', el: el.facet_priceBucket, badge: el.badge_price, getValues: (o) => [o.priceBucket].filter(Boolean).filter(x => x !== 'N/A'), order: ['<150','150–299','300–599','600+'] },
    };
    for (const key of Object.keys(state.facetDefs)) {
      const val = qs.get(key);
      state.facets[key] = new Set(val ? val.split(',') : []);
    }
  }

  function facetOptionsFromData() {
    const setmap = {};
    for (const key of Object.keys(state.facetDefs)) setmap[key] = new Set();
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
        opts[key] = ordered.map(v => ({ value: v, label: v }));
      } else {
        opts[key] = values.map(v => ({ value: v, label: v }));
      }
    }
    return opts;
  }

  function renderFacet(def, options) {
    if (!def.el) return;
    const selected = state.facets[def.id];
    def.el.innerHTML = '';
    for (const opt of options) {
      const raw = typeof opt === 'string' ? opt : opt.value;
      const labelText = typeof opt === 'string' ? opt : opt.label;
      const id = `f_${def.id}_${raw.replace(/\W+/g,'')}`;
      const label = document.createElement('label');
      label.innerHTML = `
        <input type="checkbox" id="${id}" value="${raw}">
        <span>${labelText}</span>
      `;
      const input = label.querySelector('input');
      input.checked = selected.has(raw);
      input.addEventListener('change', () => {
        if (input.checked) selected.add(raw); else selected.delete(raw);
        state.page = 1;
        onStateChanged({ focusAfter: label });
      });
      def.el.appendChild(label);
    }
    if (def.badge) {
      const n = selected.size;
      def.badge.textContent = String(n);
      def.badge.style.visibility = n ? 'visible' : 'hidden';
    }
  }

  function renderAllFacets() {
    const opts = facetOptionsFromData();
    for (const [key, def] of Object.entries(state.facetDefs)) {
      renderFacet(def, opts[key] || []);
      const details = document.querySelector(`details.facet[data-facet="${key}"]`);
      if (details && typeof state.openDetails[key] === 'boolean') details.open = state.openDetails[key];
      details?.addEventListener('toggle', () => {
        state.openDetails[key] = details.open;
        LS.set('rh.details', state.openDetails);
      });
    }
  }

  // ---------- Filtering / search ----------
  function applyFilters() {
    const selected = state.facets;
    const anyFacet = Object.values(selected).some(s => s.size);
    const term = state.search;

    const out = state.data.filter(o => {
      if (term) {
        const hayRaw = [
          o.brand, o.model,
          'wifi', `wifi-${o.wifiStandard}`, `wifi ${o.wifiStandard}`, `wifi${o.wifiStandard}`,
          o.wifiStandard,
          o.wanTierLabel,
          o.meshReady ? 'mesh mesh-ready' : 'standalone non-mesh',
          ...(o.primaryUses || []),
          ...(o.applicablePrimaryUses || []),
          ...(o.useTags || []),
        ].join(' ').toLowerCase();

        const hayComp = nopunct(hayRaw);
        const tokens = term.split(/\s+/).filter(Boolean);
        for (const t of tokens) {
          const tComp = nopunct(t);
          if (!(hayRaw.includes(t) || hayComp.includes(tComp))) return false;
        }
      }

      for (const [key, def] of Object.entries(state.facetDefs)) {
        const sel = selected[key];
        if (!sel || sel.size === 0) continue;

        if (def.map) {
          const any = [...sel].some(v => !!def.map[v]?.(o));
          if (!any) return false;
          continue;
        }

        const vals = new Set(def.getValues(o).map(String));
        let any = false;
        for (const v of sel) { if (vals.has(v)) { any = true; break; } }
        if (!any) return false;
      }
      return true;
    });

    state.filtered = out;
    el.emptyState.classList.toggle('hide', !(anyFacet && out.length === 0));
    return out;
  }

  // ---------- Sorting ----------
  const comparators = {
    relevance: (a, b) => (b._score - a._score) || cmpPriceAsc(a, b),
    'wifi-desc': (a, b) => rankWifi(b) - rankWifi(a) || cmpPriceAsc(a, b),
    'price-asc': (a, b) => cmpPriceAsc(a, b),
    'price-desc': (a, b) => (b.priceUsd - a.priceUsd),
    'coverage-desc': (a, b) => (b.coverageSqft - a.coverageSqft) || cmpPriceAsc(a, b),
    'wan-desc': (a, b) => (wanRank(b) - wanRank(a)) || cmpPriceAsc(a, b),
    'reviews-desc': (a, b) => (b.reviews - a.reviews) || cmpPriceAsc(a, b),
    'rating-desc': (a, b) => (b.rating - a.rating) || (b.reviews - a.reviews) || cmpPriceAsc(a, b),
  };
  function cmpPriceAsc(a, b) { return (a.priceUsd || Infinity) - (b.priceUsd || Infinity); }
  function rankWifi(o) { return o.wifiStandard === '7' ? 4 : o.wifiStandard === '6E' ? 3 : o.wifiStandard === '6' ? 2 : 1; }

  function sortResults() {
    state.filtered.sort(comparators[state.sort] || comparators.relevance);
  }

  // ---------- Pagination ----------
  function paginate() {
    const total = state.filtered.length;
    const pageCount = Math.max(1, Math.ceil(total / state.pageSize));
    state.page = clamp(state.page, 1, pageCount);
    const start = (state.page - 1) * state.pageSize;
    const end = start + state.pageSize;
    const slice = state.filtered.slice(start, end);
    renderPagination(el.paginationTop, pageCount);
    renderPagination(el.paginationBottom, pageCount);
    return slice;
  }

  function renderPagination(container, pageCount) {
    if (!container) return;
    container.innerHTML = '';
    if (pageCount <= 1) return;

    const makeBtn = (label, page, cls = 'page') => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = cls;
      b.textContent = label;
      b.setAttribute('data-page', String(page));
      b.disabled = page === state.page;
      if (cls === 'page' && page === state.page) b.setAttribute('aria-current', 'page');
      b.addEventListener('click', () => {
        state.page = page;
        onStateChanged({ scrollToTop: true });
      });
      b.addEventListener('keyup', (e) => { if (e.key === 'Enter' || e.key === ' ') b.click(); });
      return b;
    };

    const prev = makeBtn('Prev', clamp(state.page - 1, 1, pageCount), 'page prev');
    prev.classList.toggle('disabled', state.page === 1);
    prev.disabled = state.page === 1;

    const next = makeBtn('Next', clamp(state.page + 1, 1, pageCount), 'page next');
    next.classList.toggle('disabled', state.page === pageCount);
    next.disabled = state.page === pageCount;

    container.appendChild(prev);

    const pages = numberedPages(state.page, pageCount);
    for (const p of pages) {
      if (p === '…') {
        const span = document.createElement('span');
        span.className = 'page disabled';
        span.textContent = '…';
        container.appendChild(span);
      } else {
        container.appendChild(makeBtn(String(p), p));
      }
    }
    container.appendChild(next);
  }

  function numberedPages(current, total) {
    const arr = [];
    const push = (x) => arr.push(x);
    const windowSize = 2;
    const start = Math.max(1, current - windowSize);
    const end = Math.min(total, current + windowSize);

    if (start > 1) {
      push(1);
      if (start > 2) push('…');
    }
    for (let i = start; i <= end; i++) push(i);
    if (end < total) {
      if (end < total - 1) push('…');
      push(total);
    }
    return arr;
  }

  // ---------- Chips (active filters) ----------
  function renderActiveChips() {
    el.activeChips.innerHTML = '';
    let any = false;
    for (const [key, def] of Object.entries(state.facetDefs)) {
      const sel = state.facets[key];
      if (!sel || sel.size === 0) continue;
      any = true;
      for (const v of sel) {
        const chipBtn = document.createElement('button');
        chipBtn.type = 'button';
        chipBtn.className = 'chip';
        chipBtn.setAttribute('role','listitem');
        chipBtn.setAttribute('aria-label', `Remove ${def.label}: ${v}`);
        chipBtn.textContent = `${def.label}: ${v} ✕`;
        chipBtn.addEventListener('click', () => {
          sel.delete(v);
          state.page = 1;
          onStateChanged({ focusAfter: el.activeChips });
        });
        el.activeChips.appendChild(chipBtn);
      }
    }
    el.activeChips.style.display = any ? '' : 'none';
    const activeCount = Object.values(state.facets).reduce((n, s) => n + (s?.size || 0), 0);
    if (el.activeCountBadge) el.activeCountBadge.textContent = String(activeCount);
  }

  // Esc quick-clear
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const searchInput = byId('searchInput');
    if (document.activeElement === searchInput && state.search) {
      searchInput.value = '';
      state.search = '';
      state.page = 1;
      onStateChanged({});
      return;
    }
    const keys = Object.keys(state.facetDefs);
    for (let i = keys.length - 1; i >= 0; i--) {
      const sel = state.facets[keys[i]];
      if (sel && sel.size) {
        const first = sel.values().next().value;
        sel.delete(first);
        state.page = 1;
        onStateChanged({});
        break;
      }
    }
  });

  // ---------- Compare ----------
  const MAX_COMPARE = 4;
  function toggleCompare(id) {
    if (state.compare.has(id)) state.compare.delete(id);
    else {
      if (state.compare.size >= MAX_COMPARE) { alert(`You can compare up to ${MAX_COMPARE}.`); return; }
      state.compare.add(id);
    }
    updateCompareUI();
  }
  function clearCompareAll() { state.compare.clear(); updateCompareUI(); }
  function updateCompareUI() {
    const items = [...state.compare].map(id => state.data.find(x => x.id === id)).filter(Boolean);

    el.compareItemsPanel.innerHTML = '';
    for (const it of items) el.compareItemsPanel.appendChild(compareBadge(it));

    el.compareItems.innerHTML = '';
    for (const it of items) el.compareItems.appendChild(compareBadge(it));

    el.compareCount.textContent = String(items.length);
    el.compareSticky.hidden = items.length === 0;

    el.clearCompare?.addEventListener('click', clearCompareAll);
    el.clearCompareMobile?.addEventListener('click', clearCompareAll);

    $$('.compare-btn').forEach(btn => {
      const id = btn.closest('.product')?.dataset?.id;
      btn.setAttribute('aria-pressed', state.compare.has(id) ? 'true' : 'false');
    });

    if (items.length === 0) el.compareDrawer.hidden = true;
  }
  function compareBadge(it) {
    const span = document.createElement('span');
    span.className = 'item';
    span.textContent = it.model;
    span.title = it.model;
    span.addEventListener('click', () => { toggleCompare(it.id); });
    return span;
  }
  el.compareSticky?.addEventListener('click', () => {
    el.compareDrawer.hidden = !el.compareDrawer.hidden;
  });

  // ---------- Recommendations ----------
  function quizMatch(o, q) {
    const covOK = !q.coverage || (o.applicableCoverageBuckets || [o.coverageBucket]).includes(q.coverage);
    const devOK = !q.devices  || (o.applicableDeviceLoads || [o.deviceLoad]).includes(q.devices);
    const useOK = !q.use      || (uniq([...(o.primaryUses||[]), ...(o.applicablePrimaryUses||[]), o.primaryUse])).includes(q.use);
    return covOK && devOK && useOK;
  }
  function computeRecommendations() {
    if (!state.showRecos) return [];
    if (!state.quiz) return state.data
      .slice()
      .sort((a,b) => (rankWifi(b)-rankWifi(a)) || (wanRank(b)-wanRank(a)) || (b._score-a._score))
      .slice(0,8);

    const q = state.quiz;
    return state.data
      .filter(o => quizMatch(o, q))
      .sort((a,b) => (rankWifi(b)-rankWifi(a)) || (wanRank(b)-wanRank(a)) || (b._score-a._score))
      .slice(0, 8);
  }
  function renderRecommendations() {
    const rec = computeRecommendations();
    el.recommendations.style.display = rec.length ? '' : 'none';
    el.recoGrid.innerHTML = '';
    el.recoNote.textContent = state.quiz ? 'Based on your quiz answers' : 'Top picks right now';
    for (const o of rec) el.recoGrid.appendChild(renderCard(o));
  }

  // ---------- Your Picks ----------
  function renderYourPicks() {
    if (!state.quiz || state.optOut) {
      el.yourPicks && (el.yourPicks.hidden = true);
      return;
    }
    const picks = state.data
      .filter(o => quizMatch(o, state.quiz))
      .sort((a,b) => b._score - a._score)
      .slice(0, 4);
    if (!el.yourPicks) return;
    el.yourPicks.hidden = picks.length === 0;
    el.picksGrid.innerHTML = '';
    picks.forEach(o => el.picksGrid.appendChild(renderCard(o)));
  }

  // ---------- Results rendering ----------
  function renderSkeletons(n = state.pageSize) {
    if (!el.skeletonGrid || !el.skeletonTpl) return;
    el.skeletonGrid.innerHTML = '';
    el.skeletonGrid.style.display = '';
    for (let i = 0; i < n; i++) el.skeletonGrid.appendChild(el.skeletonTpl.content.cloneNode(true));
  }
  function hideSkeletons() { if (el.skeletonGrid) el.skeletonGrid.style.display = 'none'; }

  function renderResults(items) {
    el.resultsGrid.innerHTML = '';
    const frag = document.createDocumentFragment();
    for (const o of items) frag.appendChild(renderCard(o));
    el.resultsGrid.appendChild(frag);
  }

  function renderCard(o) {
    const node = el.cardTpl.content.cloneNode(true);
    const art = node.querySelector('article');
    art.dataset.id = o.id;

    const img = node.querySelector('img');
    if (o.img) { img.src = o.img; img.alt = o.model || 'Router image'; }
    else { img.remove(); }

    node.querySelector('.title').textContent = o.model;

    const chips = node.querySelector('.chips.line');
    const chipTexts = Array.isArray(o.chipsOverride) && o.chipsOverride.length
      ? o.chipsOverride.slice(0, 3)
      : [ `Wi-Fi ${o.wifiStandard}`, o.meshReady ? 'Mesh-ready' : null, wanChip(o) || null ].filter(Boolean);
    chipTexts.forEach(t => chips.appendChild(chip(t)));
    if (chipTexts.length < 3 && o.coverageBucket) chips.appendChild(chip(o.coverageBucket));

    const specs = node.querySelector('.specs');
    const bullets = (Array.isArray(o.fitBullets) && o.fitBullets.length >= 3) ? o.fitBullets.slice(0,4) : buildBullets(o);
    bullets.forEach(t => specs.appendChild(li(t)));

    node.querySelector('.price').textContent = fmtMoney(o.priceUsd);
    const buy = node.querySelector('.ctaRow a');
    if (o.url) { buy.href = o.url; buy.removeAttribute('aria-disabled'); buy.classList.remove('disabled'); buy.textContent = 'Buy'; }
    else { buy.href = '#'; buy.setAttribute('aria-disabled','true'); buy.classList.add('disabled'); buy.textContent = 'Details'; }

    const cmpBtn = node.querySelector('.compare-btn');
    cmpBtn.setAttribute('aria-pressed', state.compare.has(o.id) ? 'true' : 'false');
    cmpBtn.addEventListener('click', () => toggleCompare(o.id));

    return node;

    function chip(t) { const s = document.createElement('span'); s.className = 'chip'; s.textContent = t; return s; }
    function li(t) { const li = document.createElement('li'); li.textContent = t; return li; }
  }
  function wanChip(o) {
    const l = o.wanTierLabel || wanLabelFromMbps(o.maxWanSpeedMbps);
    if (!l) return '';
    return l === '≤1G' ? 'Up to 1G WAN' : `${l} WAN`;
  }
  function buildBullets(o) {
    const out = [];
    if (o.coverageBucket) out.push(`Home size: ${o.coverageBucket}`);
    if (o.deviceLoad) out.push(`Devices: ${o.deviceLoad}`);
    const l = o.wanTierLabel || wanLabelFromMbps(o.maxWanSpeedMbps);
    if (l) out.push(`Internet: ${l === '≤1G' ? 'up to 1 Gbps' : l + 'bps'}`);
    if (o.primaryUse) out.push(`Best for: ${o.primaryUse}`);
    if (out.length < 3 && Array.isArray(o.wifiBands) && o.wifiBands.length) out.push(`${o.wifiBands.join(' / ')} GHz`);
    if (out.length < 3 && o.multiGigLan) out.push('Multi-Gig LAN');
    if (out.length < 3 && Number.isFinite(o.lanCount)) out.push(`${o.lanCount} LAN ports`);
    return out.slice(0,4);
  }

  // ---------- Toolbar / Search ----------
  function wireToolbar() {
    if (el.sortSelect) {
      el.sortSelect.value = state.sort;
      el.sortSelect.addEventListener('change', () => { state.sort = el.sortSelect.value; state.page = 1; onStateChanged({}); });
    }
    if (el.pageSizeSelect) {
      el.pageSizeSelect.value = String(state.pageSize);
      el.pageSizeSelect.addEventListener('change', () => { state.pageSize = Number(el.pageSizeSelect.value); state.page = 1; onStateChanged({}); });
    }
    if (el.toggleRecos) {
      el.toggleRecos.checked = state.showRecos;
      el.toggleRecos.addEventListener('change', () => {
        state.showRecos = el.toggleRecos.checked;
        syncUrl();
        renderRecommendations();
      });
    }

    if (el.lowDataToggle) {
      el.lowDataToggle.checked = state.lowDataMode;
      el.lowDataToggle.addEventListener('change', () => {
        state.lowDataMode = el.lowDataToggle.checked;
        LS.set('rh.lowData', state.lowDataMode);
        document.body.classList.toggle('low-data', state.lowDataMode);
        onStateChanged({});
      });
    }
    document.body.classList.toggle('low-data', state.lowDataMode);

    el.openFiltersHeader?.addEventListener('click', openDrawer);
    el.filtersFab?.addEventListener('click', () => { openDrawer(); el.filtersFab.setAttribute('aria-expanded', 'true'); });

    wireSearch();
    wireCommandBarCondense();
    wireProgressBar();
  }

  function wireSearch() {
    const input = byId('searchInput');
    const btn   = byId('searchBtn');
    if (!input) return;

    const wrap = input.closest('.search');
    let clearBtn = null;
    if (wrap && !wrap.querySelector('[data-clear]')) {
      clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'icon-btn';
      clearBtn.setAttribute('data-clear', '');
      clearBtn.setAttribute('aria-label', 'Clear search');
      clearBtn.textContent = '✕';
      clearBtn.style.marginLeft = '8px';
      wrap.appendChild(clearBtn);
      const updateClear = () => clearBtn.style.display = input.value ? '' : 'none';
      updateClear();
      input.addEventListener('input', updateClear);
      clearBtn.addEventListener('click', () => {
        input.value = '';
        state.search = '';
        state.page = 1;
        onStateChanged({ scrollToTop: true });
        input.focus();
      });
    }

    input.value = state.search;

    const applySearch = () => {
      state.search = (input.value || '').trim().toLowerCase();
      state.page = 1;
      onStateChanged({ scrollToTop: true });
    };

    const onType = debounce(() => applySearch(), 220);
    input.addEventListener('input', onType);

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); applySearch(); }
      if (e.key === 'Escape' && input.value) {
        e.preventDefault();
        input.value = '';
        applySearch();
      }
    });

    if (btn) btn.addEventListener('click', applySearch);

    // Voice search
    if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SpeechRec();
      rec.lang = "en-US";
      const micBtn = wrap ? $('.mic', wrap) : null;
      if (micBtn) {
        micBtn.style.display = "inline-flex";
        micBtn.addEventListener("click", () => { rec.start(); micBtn.classList.add("active"); });
        rec.onresult = (e) => {
          const transcript = e.results[0][0].transcript;
          input.value = transcript;
          applySearch();
          micBtn.classList.remove("active");
        };
        rec.onend = () => micBtn.classList.remove("active");
        rec.onerror = () => { showToast("Voice recognition error", "error"); micBtn.classList.remove("active"); };
      }
    }
  }

  function wireCommandBarCondense() {
    const bar = $('.command-bar');
    if (!bar) return;
    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop;
      bar.classList.toggle('is-condensed', y > 50);
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function wireProgressBar() {
    if (!el.progressFill) return; // guard
    const update = () => {
      const h = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      el.progressFill.style.width = `${(scrollY / h * 100)}%`;
    };
    addEventListener('scroll', update, { passive: true });
    update();
  }

  // ---------- Drawer (mobile filters) ----------
  function openDrawer() {
    el.drawerFormMount.innerHTML = '';
    const clone = el.filtersForm.cloneNode(true);
    el.drawerFormMount.appendChild(clone);
    el.filtersDrawer.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('scroll-lock');

    $$('[data-close-drawer]').forEach(b => b.addEventListener('click', closeDrawer, { once: true }));
    el.applyDrawer.onclick = () => {
      syncChecks(clone, el.filtersForm);
      closeDrawer();
      onStateChanged({});
    };

    function syncChecks(src, dst) {
      const map = new Map();
      $$('input[type="checkbox"]', src).forEach(i => map.set(i.value + '::' + i.closest('.facet')?.dataset?.facet, i.checked));
      $$('input[type="checkbox"]', dst).forEach(i => {
        const key = i.value + '::' + i.closest('.facet')?.dataset?.facet;
        if (map.has(key)) i.checked = map.get(key);
      });
      rebuildFacetSelectionsFromDOM();
    }
  }
  function closeDrawer() {
    el.filtersDrawer.setAttribute('aria-hidden', 'true');
    el.filtersFab?.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('scroll-lock');
  }

  // ---------- Form-wide controls ----------
  function wireFacetsControls() {
    $$('.facet-clear,[class*="facet__clear"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.clear;
        if (!key) return;
        (state.facets[key] || new Set()).clear();
        const boxen = $$(`details.facet[data-facet="${key}"] input[type="checkbox"]`);
        boxen.forEach(b => { b.checked = false; });
        state.page = 1;
        onStateChanged({ focusAfter: btn });
      });
    });

    el.expandAll?.addEventListener('click', () => {
      $$('details.facet').forEach(d => { d.open = true; state.openDetails[d.dataset.facet] = true; });
      LS.set('rh.details', state.openDetails);
    });
    el.collapseAll?.addEventListener('click', () => {
      $$('details.facet').forEach(d => { d.open = false; state.openDetails[d.dataset.facet] = false; });
      LS.set('rh.details', state.openDetails);
    });

    el.clearAllFacets?.addEventListener('click', () => {
      for (const k of Object.keys(state.facets)) state.facets[k].clear();
      $$('input[type="checkbox"]', el.filtersForm).forEach(i => { i.checked = false; });
      state.page = 1;
      onStateChanged({});
    });
  }

  function rebuildFacetSelectionsFromDOM() {
    for (const [key] of Object.entries(state.facetDefs)) {
      const sel = new Set();
      $$(`details.facet[data-facet="${key}"] input[type="checkbox"]`).forEach(i => { if (i.checked) sel.add(i.value); });
      state.facets[key] = sel;
    }
  }

  // ---------- Status / A11y ----------
  function updateCounts() {
    const total = state.filtered.length;
    const all = state.data.length;
    el.matchCount.textContent = `${total} match${total === 1 ? '' : 'es'} / ${all}`;
    const start = (state.page - 1) * state.pageSize + 1;
    const end = Math.min(total, state.page * state.pageSize);
    el.kitsStatus.textContent = total ? `Showing ${start}-${end} of ${total}` : `No results`;
  }

  // ---------- Quick chips (unified) ----------
  function renderQuickChips() {
    const make = (label, fn) => {
      const c = document.createElement('button');
      c.type = 'button'; c.className = 'chip';
      c.textContent = label;
      c.addEventListener('click', () => { fn(); state.page = 1; onStateChanged({}); });
      return c;
    };
    const picks = [
      ['Best for Families', () => { state.facets.use.add('Family Streaming'); state.facets.device.add('16–30'); }],
      ['Budget-Friendly', () => state.facets.price.add('<150')],
      ['Gaming Ready', () => { state.facets.use.add('Gaming'); state.facets.wan.add('2.5G'); }],
      ['Whole-Home Wi-Fi', () => state.facets.mesh.add('Mesh-ready')],
      ['Fast Internet', () => state.facets.wifi.add('7')],
      ['Work from Home', () => state.facets.use.add('Work-From-Home')],
    ];
    if (el.quickChips) {
      el.quickChips.innerHTML = '';
      for (const [l, fn] of picks) el.quickChips.appendChild(make(l, fn));
    }
    if (el.emptyQuickChips) {
      el.emptyQuickChips.innerHTML = '';
      for (const [l, fn] of picks) el.emptyQuickChips.appendChild(make(l, fn));
    }
  }

  // ---------- Copy link / Reset ----------
  el.copyLink?.addEventListener('click', async () => {
    syncUrl();
    try {
      await navigator.clipboard.writeText(location.href);
      el.copyLink.textContent = 'Copied!';
      setTimeout(() => el.copyLink.textContent = 'Copy link', 1200);
    } catch {}
  });

  el.resetAll?.addEventListener('click', () => {
    for (const k of Object.keys(state.facets)) state.facets[k].clear();
    state.sort = 'relevance';
    state.page = 1;
    state.pageSize = 12;
    state.showRecos = true;
    state.quiz = null;
    state.search = '';
    state.compare.clear();
    $$('input[type="checkbox"]', el.filtersForm).forEach(i => { i.checked = false; });
    const searchInput = byId('searchInput'); if (searchInput) searchInput.value = '';
    if (el.sortSelect) el.sortSelect.value = state.sort;
    if (el.pageSizeSelect) el.pageSizeSelect.value = String(state.pageSize);
    if (el.toggleRecos) el.toggleRecos.checked = state.showRecos;
    onStateChanged({});
  });

  // ---------- Quiz wiring ----------
  window.RH_APPLY_QUIZ = (answers) => {
    state.quiz = answers;
    if (answers.coverage) { state.facets.coverage.clear(); state.facets.coverage.add(answers.coverage); }
    if (answers.devices)  { state.facets.device.clear(); state.facets.device.add(answers.devices); }
    if (answers.use)      { state.facets.use.clear(); state.facets.use.add(answers.use); }
    state.showRecos = true;
    if (el.toggleRecos) el.toggleRecos.checked = true;
    onStateChanged({ scrollToRecos: true });

    const editBtn = byId('editQuiz');
    if (editBtn) editBtn.removeAttribute('hidden');
  };

  function wireHeaderQuizBridges() {
    document.addEventListener('click', (e) => {
      const openBtn = e.target.closest('[data-open-quiz]');
      if (openBtn) {
        const t = document.getElementById('openQuiz');
        if (t) t.click();
        else document.dispatchEvent(new CustomEvent('quiz:open'));
      }
    });

    document.addEventListener('click', (e) => {
      const editBtn = e.target.closest('[data-edit-quiz]');
      if (editBtn) {
        const t = document.getElementById('editQuiz');
        if (t && !t.hasAttribute('hidden')) t.click();
      }
    });

    const editHeader = document.getElementById('editQuiz');
    const editMobile = document.querySelector('[data-edit-quiz]');
    if (editHeader && editMobile) {
      const sync = () => { editMobile.hidden = editHeader.hasAttribute('hidden'); };
      new MutationObserver(sync).observe(editHeader, { attributes: true, attributeFilter: ['hidden'] });
      sync();
    }
  }

  // ---------- Immersive Interactions ----------
  function tiltCards() {
    const cards = $$('.product');
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion || !cards.length) return;
    cards.forEach((card) => {
      let rAF = 0;
      const onMove = (e) => {
        const rect = card.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) / rect.width;
        const dy = (e.clientY - cy) / rect.height;
        cancelAnimationFrame(rAF);
        rAF = requestAnimationFrame(() => {
          card.style.transform =
            `perspective(800px) rotateX(${(-dy * 6).toFixed(2)}deg) ` +
            `rotateY(${(dx * 6).toFixed(2)}deg) translateY(-6px)`;
        });
      };
      const reset = () => { cancelAnimationFrame(rAF); card.style.transform = ""; };
      card.addEventListener("mousemove", onMove);
      card.addEventListener("mouseleave", reset);
      card.addEventListener("blur", reset, true);
    });
  }

  function revealify() {
    const els = $$(".reveal");
    if (!els.length || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("in-view");
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.1 });
    els.forEach((el) => io.observe(el));
  }

  // ---------- AI Chat Widget ----------
  function wireChat() {
    if (!el.chatBtn || !el.chatModal || !el.chatMessages || !el.chatInputForm || !el.chatInput) return;

    // hydrate past (optional)
    if (!state.optOut) {
      const prev = LS.get(LS_KEY_CHAT, []);
      prev.forEach(m => addMessage(m.text, m.type));
    }

    el.chatBtn.addEventListener("click", () => {
      el.chatModal.classList.add("active");
      el.chatModal.setAttribute("aria-hidden", "false");
    });

    $('.close', el.chatModal).addEventListener("click", () => {
      el.chatModal.classList.remove("active");
      el.chatModal.setAttribute("aria-hidden", "true");
    });

    el.chatOptOut?.addEventListener("click", (e) => {
      e.preventDefault();
      LS.del(LS_KEY_CHAT);
      state.optOut = true;
      LS.set('rh.optOut', true);
      showToast("Data persistence opted out and cleared", "info");
    });

    el.chatInputForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = el.chatInput.value.trim();
      if (!q) return;
      addMessage(q, "user");
      el.chatInput.value = "";

      let response = "Based on your query, explore our kits for tailored recommendations.";
      const t = q.toLowerCase();
      if (t.includes("3-floor") || t.includes("large home") || t.includes("multi-floor")) {
        response = 'For multi-floor homes, mesh systems provide optimal coverage. <a href="kits.html?coverage=Large/Multi-floor&mesh=Mesh-ready&recos=1">View large home options</a>.';
      } else if (t.includes("gaming")) {
        response = 'Gaming setups benefit from high-speed WAN. <a href="kits.html?use=Gaming&wan=2.5G&recos=1">View gaming kits</a>.';
      } else if (t.includes("apartment") || t.includes("small")) {
        response = 'Compact spaces need efficient routers. <a href="kits.html?coverage=Apartment/Small&recos=1">View apartment options</a>.';
      }
      setTimeout(() => addMessage(response, "ai"), 400);
    });

    // Voice input
    if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SpeechRec();
      rec.lang = "en-US";
      const micBtn = el.chatMic;
      if (micBtn) {
        micBtn.style.display = "inline-flex";
        micBtn.addEventListener("click", () => { rec.start(); micBtn.classList.add("active"); });
        rec.onresult = (e) => {
          const transcript = e.results[0][0].transcript;
          el.chatInput.value = transcript;
          el.chatInputForm.dispatchEvent(new Event("submit"));
          micBtn.classList.remove("active");
        };
        rec.onend = () => micBtn.classList.remove("active");
        rec.onerror = () => { showToast("Voice recognition error", "error"); micBtn.classList.remove("active"); };
      }
    }

    function addMessage(text, type) {
      const div = document.createElement("div");
      div.classList.add("message", type);
      div.innerHTML = text;
      el.chatMessages.appendChild(div);
      el.chatMessages.scrollTop = el.chatMessages.scrollHeight;

      if (!state.optOut) {
        const prev = LS.get(LS_KEY_CHAT, []);
        prev.push({ text, type });
        if (prev.length > MAX_CHAT_MSGS) prev.splice(0, prev.length - MAX_CHAT_MSGS);
        LS.set(LS_KEY_CHAT, prev);
      }
    }
  }

  // ---------- Lifecycle ----------
  async function init() {
    await Promise.all([mountPartial(el.headerMount), mountPartial(el.footerMount)]);
    wireHeaderQuizBridges();

    renderSkeletons(12);

    try {
      state.data = await fetchData();
      hideSkeletons();
    } catch (e) {
      hideSkeletons();
      el.kitsError.classList.remove('hide');
      el.kitsError.textContent = 'Failed to load kits. Please try again later.';
      return;
    }

    buildFacetDefs();
    renderAllFacets();
    wireFacetsControls();
    wireToolbar();
    renderQuickChips();
    wireChat();

    // Apply initial URL to controls
    for (const [key] of Object.entries(state.facetDefs)) {
      const details = document.querySelector(`details.facet[data-facet="${key}"]`);
      if (!details) continue;
      $$('input[type="checkbox"]', details).forEach(i => { if (state.facets[key]?.has(i.value)) i.checked = true; });
    }

    onStateChanged({ initial: true });

    if (state.search) byId('searchInput')?.focus();

    tiltCards();
    revealify();
    renderYourPicks();
  }

  function onStateChanged(opts) {
    syncUrl();
    renderActiveChips();

    for (const [key, def] of Object.entries(state.facetDefs)) {
      if (!def.badge) continue;
      const n = state.facets[key]?.size || 0;
      def.badge.textContent = String(n);
      def.badge.style.visibility = n ? 'visible' : 'hidden';
    }

    applyFilters();
    sortResults();
    updateCounts();

    const pageItems = paginate();
    renderResults(pageItems);
    renderRecommendations();
    renderYourPicks();
    updateCompareUI();

    el.emptyState.classList.toggle('hide', state.filtered.length > 0);

    if (opts?.focusAfter?.focus) requestAnimationFrame(() => opts.focusAfter.focus());
    if (opts?.scrollToTop) window.scrollTo({ top: 0, behavior: 'smooth' });
    if (opts?.scrollToRecos) el.recommendations?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  document.addEventListener('DOMContentLoaded', init);
})();

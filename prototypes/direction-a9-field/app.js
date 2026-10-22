// Direction A, "The field" — all pages. Plain JS, no build step, works from file://.
// Everything is rendered FROM window.SITE / window.WORKS (../shared/content.js).
(function () {
  'use strict';
  var S = window.SITE, W = window.WORKS;
  var qs = new URLSearchParams(location.search);
  var root = document.documentElement;

  /* ------------------------------------------------------------ helpers */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function on(el, ev, fn, opt) { el.addEventListener(ev, fn, opt); }
  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function isMobile() { return window.matchMedia('(max-width: 760px), (hover: none)').matches; }

  /* ------------------------------------------------------------ ground (round 9) */
  // PROTOTYPE: the visitor only sees a sun/moon toggle (mode = dark | light). The prototype chooser decides WHICH dark ground
  // (black | purple | red) and WHICH light ground (white | yellow). data-ground carries the active one, data-light is derived
  // (work = dark text on a light ground). ?ground= wins, then ?mode=, then ?light= (old links), then memory (iv-a9-*), then page default.
  var DARKS = ['black', 'purple', 'red'], LIGHTS = ['white', 'yellow'];
  var PREF = { mode: 'dark', dark: 'black', light: 'white' };
  function lsGet(k) { try { return localStorage.getItem('iv-a9-' + k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem('iv-a9-' + k, v); } catch (e) {} }
  (function readPrefs() {
    var d = lsGet('dark'), l = lsGet('light'), m = lsGet('mode');
    if (DARKS.indexOf(d) >= 0) PREF.dark = d; if (LIGHTS.indexOf(l) >= 0) PREF.light = l;
    PREF.mode = (m === 'dark' || m === 'light') ? m : (root.getAttribute('data-default-light') === 'work' ? 'light' : 'dark');
    var q = qs.get('ground');
    if (DARKS.indexOf(q) >= 0) { PREF.dark = q; PREF.mode = 'dark'; } else if (LIGHTS.indexOf(q) >= 0) { PREF.light = q; PREF.mode = 'light'; }
    else if (qs.get('mode') === 'light' || qs.get('mode') === 'dark') PREF.mode = qs.get('mode');
    else if (qs.get('light') === 'work') PREF.mode = 'light'; else if (qs.get('light') === 'show') PREF.mode = 'dark';
  })();
  function applyGround(persist) {
    var g = PREF.mode === 'dark' ? PREF.dark : PREF.light;
    root.setAttribute('data-ground', g);
    root.setAttribute('data-light', PREF.mode === 'light' ? 'work' : 'show');
    $$('.sunmoon').forEach(function (b) { b.setAttribute('aria-label', PREF.mode === 'dark' ? 'Switch to the light ground' : 'Switch to the dark ground'); });
    $$('.opts [data-g]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-g') === g ? 'true' : 'false'); });
    if (persist) { lsSet('mode', PREF.mode); lsSet('dark', PREF.dark); lsSet('light', PREF.light); }
  }
  applyGround(false); // runs in <head>, before first paint: no flash
  var SUN = '<svg class="sm-sun" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/></svg>';
  var MOON = '<svg class="sm-moon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><path d="M20 14.2A8.2 8.2 0 0 1 9.8 4 8.2 8.2 0 1 0 20 14.2z"/></svg>';
  function toggleMode() { PREF.mode = PREF.mode === 'dark' ? 'light' : 'dark'; applyGround(true); }

  /* ------------------------------------------------------------ menu options (round 4) */
  // PROTOTYPE: five menu layouts to choose from; html[data-menu=N] drives all of it in CSS. ?menu=N wins, then localStorage.
  function readMenu() {
    var q = parseInt(qs.get('menu'), 10); if (q >= 1 && q <= 5) return q;
    try { var v = parseInt(localStorage.getItem('iv-a9-menu'), 10); if (v >= 1 && v <= 5) return v; } catch (e) {}
    return 4; // round 5: wings are the default
  }
  function setMenu(n, persist) {
    root.setAttribute('data-menu', n);
    $$('.opts [data-m]').forEach(function (b) { b.setAttribute('aria-pressed', +b.getAttribute('data-m') === n ? 'true' : 'false'); });
    if (persist) { try { localStorage.setItem('iv-a9-menu', n); } catch (e) {} }
  }
  setMenu(readMenu(), false);
  // Round 9: footer-controls style 1..4, ?controls=N, remembered.
  function readControls() {
    var q = parseInt(qs.get('controls'), 10); if (q >= 1 && q <= 4) return q;
    var v = parseInt(lsGet('controls'), 10); return v >= 1 && v <= 4 ? v : 1;
  }
  function setControls(n, persist) {
    root.setAttribute('data-controls', n);
    $$('.opts [data-c]').forEach(function (b) { b.setAttribute('aria-pressed', +b.getAttribute('data-c') === n ? 'true' : 'false'); });
    if (persist) lsSet('controls', n);
  }
  setControls(readControls(), false);
  function chrome() { return getComputedStyle(document.body); }
  function cv(name) { return parseFloat(chrome().getPropertyValue(name)) || 0; }

  /* ------------------------------------------------------------ content helpers */
  // PROTOTYPE: cover rule. Many first images are boards/sketches. Prefer the first clean landscape
  // photo at least 600 px wide, else the first landscape image, else the first image.
  // COVER_OVERRIDE lets a specific cover be pinned by slug -> image index.
  // Round 2: reviewed every work's images; these covers were boards, composites, renders or sketches.
  var COVER_OVERRIDES = {
    'beautiful-day-2014': 0, 'burlesque-about-a-greek-2007': 4, 'prometheus-bound-2006': 3, 'space-kite-1999': 1,
    'master-peter-s-puppet-show-1997': 1, 'requiem-for-nikola-tesla-2007': 2, 'thirteen-2005': 2,
    'blasted-2005': 3, 'if-this-would-be-a-show-2005': 3
    // hapy-prince-1998 has only two sketches; the first is kept. a-streetcar-named-desire-2014 has only composites/renders.
  };
  // Round 3: crop to one panel of a composite (object-view-box inset: top right bottom left, as fractions).
  // Beautiful Day's first image is a 4-panel board; the top-left panel is a real stage photo.
  var COVER_CROPS = { 'beautiful-day-2014': [0, 0.4, 0.675, 0] };
  function cover(w) {
    if (COVER_OVERRIDES[w.slug] != null) return w.images[COVER_OVERRIDES[w.slug]];
    var im = w.images;
    return im.filter(function (i) { return i.w >= 600 && i.w / i.h >= 1.2 && i.w / i.h <= 2.2; })[0] ||
      im.filter(function (i) { return i.w / i.h >= 1.15 && i.w / i.h <= 2.2; })[0] || im[0];
  }
  function genreOf(w) { return w.genre === 'puppet play' ? 'puppet' : w.genre; }
  function meta(w) { return [w.year, w.director, w.theatre].filter(Boolean).join(' · '); }
  function totalPhotos() { return W.reduce(function (a, w) { return a + w.images.length; }, 0); }
  function cap1(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function creditRows(w) {
    var r = [];
    function add(k, v) { if (v) r.push([k, v]); }
    add('Author', w.author); add('Director', w.director); add('Choreography', w.choreography);
    add('Conductor', w.conductor); add('Costumes', w.costumes);
    if (w.otherCredits) Object.keys(w.otherCredits).forEach(function (k) {
      var v = w.otherCredits[k]; v = Array.isArray(v) ? v.join(', ') : v;
      add(k === 'other' ? 'Also' : cap1(k), v);
    });
    add('Theatre', w.theatre + (w.city ? ', ' + w.city : ''));
    add('Year', w.year); add('Role', w.role);
    return r;
  }

  /* ------------------------------------------------------------ header */
  function renderHeader() {
    var page = document.body.className.replace('page-', '');
    var items = [['works', 'Works', 'index.html', page === 'index' || page === 'work'], ['about', 'About', 'about.html', page === 'about'],
      ['students', 'Students', 'students.html', page === 'students'], ['contact', 'Contact', 'contact.html', page === 'contact']];
    function a(i) { var n = items[i]; return '<a data-k="' + n[0] + '" href="' + n[2] + '"' + (n[3] ? ' aria-current="page"' : '') + '>' + n[1] + '</a>'; }
    // PROTOTYPE: every piece is positioned by CSS per menu option. Active page = lit (full), others dimmed; no accent colour.
    $('#hdr').innerHTML =
      '<div class="strip t"></div><div class="strip b"></div><div class="strip l"></div><div class="strip r"></div>' +
      '<nav class="nl" aria-label="Main">' + a(0) + a(1) + '</nav>' +
      '<a class="mark" href="index.html">Igor Vasiljev</a>' +
      '<nav class="nr">' + a(2) + a(3) + '</nav>' +
      // one small sun/moon toggle (thin line icons, no box): the icon shows the ground you get on click
      '<div class="lightsw"><button type="button" class="sunmoon" title="Light / dark">' + SUN + MOON + '</button></div>' +
      // PROTOTYPE OPTIONS: designer-only choosers, collapsed by default so they do not read as part of the site
      '<div class="opts"><button type="button" class="opts-tab" aria-expanded="false">Prototype options <b>+</b></button><div class="opts-panel">' +
      '<div class="row"><span>Menu</span>' + [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" data-m="' + n + '">' + n + '</button>'; }).join('') + '</div>' +
      '<div class="row"><span>Dark ground</span>' + DARKS.map(function (g) { return '<button type="button" class="sw" data-g="' + g + '" title="' + g + '" aria-label="' + g + '"></button>'; }).join('') + '</div>' +
      '<div class="row"><span>Light ground</span>' + LIGHTS.map(function (g) { return '<button type="button" class="sw" data-g="' + g + '" title="' + g + '" aria-label="' + g + '"></button>'; }).join('') + '</div>' +
      (page === 'index' ? '<div class="row"><span>Controls</span>' + [1, 2, 3, 4].map(function (n) { return '<button type="button" data-c="' + n + '">' + n + '</button>'; }).join('') + '</div>' : '') +
      '</div></div>';
    on($('.sunmoon'), 'click', toggleMode);
    on($('.opts-tab'), 'click', function () { var o = $('.opts'); o.classList.toggle('open'); this.setAttribute('aria-expanded', o.classList.contains('open')); this.querySelector('b').textContent = o.classList.contains('open') ? '–' : '+'; });
    $$('.opts [data-g]').forEach(function (b) { on(b, 'click', function () { var g = b.getAttribute('data-g'); if (DARKS.indexOf(g) >= 0) { PREF.dark = g; PREF.mode = 'dark'; } else { PREF.light = g; PREF.mode = 'light'; } applyGround(true); }); });
    $$('.opts [data-m]').forEach(function (b) { on(b, 'click', function () { setMenu(+b.getAttribute('data-m'), true); window.dispatchEvent(new Event('resize')); }); });
    $$('.opts [data-c]').forEach(function (b) { on(b, 'click', function () { setControls(+b.getAttribute('data-c'), true); window.dispatchEvent(new Event('iv-controls')); }); });
    applyGround(false); setControls(+root.getAttribute('data-controls'), false); setMenu(+root.getAttribute('data-menu'), false);
  }

  /* ============================================================ HOME: the field */
  function initIndex() {
    var view = $('#view'), dock = $('#dock');
    // Round 5: "All photos" is the default home view; Shuffled (seeded, ?seed=N) is the default order.
    var st = { view: qs.get('view') === 'list' ? 'list' : 'field', density: qs.get('density') === 'works' ? 'works' : 'all',
      order: qs.get('order') === 'ordered' ? 'ordered' : 'shuffled', seed: parseInt(qs.get('seed'), 10) || (1 + Math.floor(Math.random() * 99999)) };
    var grid = null, cells = [], items = [], cols = 1, rows = 1, cur = -1, curW = null, clr = null, mobile = false, scrollRaf = 0;

    // Round 9: ONE choice Photos / Works / List, Ordered / Shuffled (Photos and Works only). Four visual styles (html[data-controls]).
    function ic(p) { return '<svg class="ic" viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>'; }
    var ICONS = {
      photos: ic('<rect x="2" y="2" width="4" height="4"/><rect x="8" y="2" width="4" height="4"/><rect x="14" y="2" width="4" height="4"/><rect x="2" y="8" width="4" height="4"/><rect x="8" y="8" width="4" height="4"/><rect x="14" y="8" width="4" height="4"/><rect x="2" y="14" width="4" height="4"/><rect x="8" y="14" width="4" height="4"/><rect x="14" y="14" width="4" height="4"/>'),
      works: ic('<rect x="2" y="2" width="7" height="7"/><rect x="11" y="2" width="7" height="7"/><rect x="2" y="11" width="7" height="7"/><rect x="11" y="11" width="7" height="7"/>'),
      list: ic('<path d="M3 5h14M3 10h14M3 15h14"/>'),
      ordered: ic('<path d="M3 10h13M12 6l4 4-4 4"/>'),
      shuffled: ic('<path d="M2 6h3c5 0 5 8 10 8h3M15 11l3 3-3 3M2 14h3c1.5 0 2.6-.8 3.5-1.9M11.5 7.9C12.4 6.8 13.5 6 15 6h3M15 3l3 3-3 3"/>')
    };
    function gb(attr, val, label) { return '<button type="button" data-' + attr + '="' + val + '" data-label="' + label + '" aria-label="' + label + '">' + ICONS[val] + '<span class="tx">' + label + '</span></button>'; }
    dock.innerHTML =
      '<div class="dk-cap" id="cap" aria-live="polite"></div>' +
      '<div class="dk-ctl">' +
      '<div class="grp g-show" role="group" aria-label="Show">' + gb('show', 'photos', 'Photos') + '<i class="sep">/</i>' + gb('show', 'works', 'Works') + '<i class="sep">/</i>' + gb('show', 'list', 'List') + '<span class="dot"></span></div>' +
      '<div class="grp g-order" role="group" aria-label="Order">' + gb('order', 'ordered', 'Ordered') + '<i class="sep">/</i>' + gb('order', 'shuffled', 'Shuffled') + '<span class="dot"></span></div>' +
      '<div class="sentence" id="sentence"></div>' +
      '</div><div class="dk-hint" id="hint"></div>';
    var capEl = $('#cap'), keysUsed = false;
    function curShow() { return st.view === 'list' ? 'list' : st.density === 'works' ? 'works' : 'photos'; }
    function setShow(v) { if (v === 'list') st.view = 'list'; else { st.view = 'field'; st.density = v === 'works' ? 'works' : 'all'; } render(); }
    function setOrder(o) { if (o === 'shuffled') st.seed = 1 + Math.floor(Math.random() * 99999); st.order = o; render(); } // Shuffled again = reshuffle
    $$('[data-show]', dock).forEach(function (b) { on(b, 'click', function () { setShow(b.getAttribute('data-show')); }); });
    $$('[data-order]', dock).forEach(function (b) { on(b, 'click', function () { setOrder(b.getAttribute('data-order')); }); });
    // C3 cue line: one sentence whose variable words are the controls
    function paintSentence() {
      var sh = curShow(), n = sh === 'photos' ? totalPhotos() : W.length;
      $('#sentence').innerHTML = (sh === 'list' ? W.length + ' works, as a <button type="button" data-cycle="show">list</button>'
        : n + ' <button type="button" data-cycle="show">' + sh + '</button>, <button type="button" data-cycle="order">' + st.order + '</button>') +
        ' <button type="button" class="sunmoon" aria-label="Light / dark">' + SUN + MOON + '</button>';
      $$('#sentence [data-cycle]').forEach(function (b) { on(b, 'click', function () {
        if (b.getAttribute('data-cycle') === 'show') setShow({ photos: 'works', works: 'list', list: 'photos' }[curShow()]); else setOrder(st.order === 'shuffled' ? 'ordered' : 'shuffled'); }); });
      on($('#sentence .sunmoon'), 'click', toggleMode);
    }
    // C2 cue-light dot glides under the active word
    function placeDots() {
      $$('.grp', dock).forEach(function (g) {
        var a = g.querySelector('button[aria-pressed="true"]'), d = g.querySelector('.dot'); if (!a || !d || !g.offsetWidth) return;
        d.style.transform = 'translateX(' + (a.offsetLeft + a.offsetWidth / 2 - 2.5) + 'px)';
      });
    }
    on(window, 'iv-controls', placeDots); if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeDots);
    function setHint() { $('#hint').textContent = keysUsed && st.view === 'field' && !mobile ? '← ↑ → ↓ move  ·  Enter open' : ''; }

    function url() {
      try {
        var p = new URLSearchParams(location.search);
        st.view === 'list' ? p.set('view', 'list') : p.delete('view');
        st.density === 'works' ? p.set('density', 'works') : p.delete('density');
        if (st.order === 'ordered') { p.set('order', 'ordered'); p.delete('seed'); } else { p.delete('order'); p.set('seed', st.seed); }
        var s = p.toString(); history.replaceState(null, '', location.pathname + (s ? '?' + s : ''));
      } catch (e) {}
    }

    function defaultCap() {
      return st.view === 'list' ? W.length + ' works · sort by column, filter by genre and year'
        : (st.density === 'works' ? W.length + ' works · 1996–2014' : totalPhotos() + ' photographs · hover one');
    }
    function showCap(it) {
      if (!it) { capEl.innerHTML = '<span class="legend">' + esc(defaultCap()) + '</span>'; return; }
      var w = it.w;
      capEl.innerHTML = '<b class="t">' + esc(w.title) + '</b><span class="m">' + esc(meta(w)) + '</span>';
    }
    // The dock caption carries the placard when the in-cell placard is not shown (all photos, mobile).
    function capNeeded() { return mobile; }

    function render() {
      mobile = isMobile();
      cur = -1; curW = null; litCell = null;
      document.body.classList.toggle('view-list', st.view === 'list');
      document.body.classList.toggle('view-field', st.view === 'field');
      $$('[data-show]', dock).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-show') === curShow()); });
      $$('[data-order]', dock).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-order') === st.order); });
      $('.g-order', dock).classList.toggle('off', st.view === 'list');
      paintSentence(); setHint(); placeDots(); setTimeout(placeDots, 250);
      showCap(null);
      url();
      if (st.view === 'list') buildList(); else buildField();
    }

    /* ---------- field ---------- */
    // PROTOTYPE: seeded spread. Each work's photos get evenly spaced random keys (so a work is spread across the whole field),
    // then a repair pass swaps neighbours until no two photos of one work touch horizontally or vertically.
    function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
    function clashes(arr, p, cols) {
      var w = arr[p].w, n = 0, c = p % cols;
      if (c > 0 && arr[p - 1].w === w) n++; if (c < cols - 1 && p + 1 < arr.length && arr[p + 1].w === w) n++;
      if (p >= cols && arr[p - cols].w === w) n++; if (p + cols < arr.length && arr[p + cols].w === w) n++;
      return n;
    }
    function spread(base, cols, seed) {
      var best = null, bestN = 1e9;
      for (var attempt = 0; attempt < 12 && bestN > 0; attempt++) {
        var r = rng(seed + attempt * 7919), keyed = [], byW = {};
        base.forEach(function (it) { (byW[it.w.slug] = byW[it.w.slug] || []).push(it); });
        Object.keys(byW).forEach(function (k) {
          var g = byW[k]; for (var i = g.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = g[i]; g[i] = g[j]; g[j] = t; }
          g.forEach(function (it, i) { keyed.push({ k: (i + r()) / g.length, it: it }); });
        });
        keyed.sort(function (a, b) { return a.k - b.k; });
        var arr = keyed.map(function (x) { return x.it; });
        for (var pass = 0; pass < 6; pass++) {
          var any = false;
          for (var p = 0; p < arr.length; p++) {
            if (!clashes(arr, p, cols)) continue;
            any = true;
            for (var tries = 0; tries < 80; tries++) {
              var q = Math.floor(r() * arr.length); if (q === p) continue;
              var before = clashes(arr, p, cols) + clashes(arr, q, cols);
              var t = arr[p]; arr[p] = arr[q]; arr[q] = t;
              if (clashes(arr, p, cols) + clashes(arr, q, cols) < before) break;
              t = arr[p]; arr[p] = arr[q]; arr[q] = t; // undo
            }
          }
          if (!any) break;
        }
        var bad = 0; for (var z = 0; z < arr.length; z++) bad += clashes(arr, z, cols);
        if (bad < bestN) { bestN = bad; best = arr; }
      }
      return best;
    }
    function buildField() {
      var all = st.density === 'all';
      var base = all ? W.reduce(function (a, w) { return a.concat(w.images.map(function (img, k) { return { w: w, img: img, idx: k }; })); }, [])
        : W.map(function (w) { var c = cover(w); return { w: w, img: c, idx: w.images.indexOf(c), crop: COVER_CROPS[w.slug] || null }; });
      R = null; lit = null; plac = null;
      var n = base.length;
      var hh = cv('--hh'), dh = cv('--dh'), lm = cv('--lm'), rm = cv('--rm');
      if (mobile) { cols = all ? 4 : 2; rows = Math.ceil(n / cols); }
      else {
        // PROTOTYPE: pick the column count so a cell is roughly 4:3. All photos: ~26 columns, tight gaps.
        var gw = innerWidth - 40 - lm - rm, gh = innerHeight - hh - dh - 8, target = all ? 1.3 : 1.45;
        cols = Math.max(4, Math.round(Math.sqrt(n * (gw / gh) / target)));
        rows = Math.ceil(n / cols);
      }
      items = st.order === 'ordered' ? base : spread(base, cols, st.seed);
      grid = document.createElement('div');
      grid.className = 'field mode-' + st.density + (mobile ? ' is-scroll' : '');
      grid.style.setProperty('--cols', cols); grid.style.setProperty('--rows', rows);
      if (!mobile) { grid.style.gridTemplateColumns = rep(cols, '1fr'); grid.style.gridTemplateRows = rep(rows, '1fr'); } // fixed tracks
      else if (!all) { grid.style.gridTemplateColumns = rep(cols, '1fr'); }
      else { grid.style.gridTemplateColumns = rep(cols, '1fr'); }
      grid.innerHTML = items.map(function (it, i) {
        var w = it.w, src = all && !mobile ? it.img.thumb : it.img.src; // desktop all-photos rests on the 70 px thumbs; the full image loads on focus (phones use the files, lazily)
        return '<a class="cell" href="work.html?w=' + esc(w.slug) + '#' + (it.idx + 1) + '" data-i="' + i + '" tabindex="' + (i === 0 ? 0 : -1) + '" aria-label="' + esc(w.title + ', ' + w.year) + '">' +
          '<img src="' + esc(src) + '" alt=""' + (it.crop ? ' style="object-view-box:' + viewBox(it.crop) + '"' : '') + ' loading="' + (i < 90 ? 'eager' : 'lazy') + '" decoding="async">' +
          (true ? '' : '<span class="plac"><b class="t">' + esc(w.title) + '</b><span class="m">' + esc(meta(w)) + '</span></span>') + '</a>';
      }).join('');
      view.innerHTML = ''; view.appendChild(grid);
      cells = $$('.cell', grid);
      bindField();
      if (mobile) scrollFocus();
    }
    function rep(n, v) { var a = []; for (var i = 0; i < n; i++) a.push(v); return a.join(' '); }

    /* PROTOTYPE (round 3): grid tracks never change. Focus = transforms only:
       - a floating copy of the cover grows in place (~2.4x, full uncropped photo, clamped inside the viewport),
         done as a FLIP: the overlay sits at its final size and is animated from the cell's rect and crop (transform + clip-path);
       - every other cover keeps its 4:3 shape, shrinks to .85 and is pushed radially away, the push falling off with distance. */
    var R = null, lit = null, plac = null, placT = 0;
    function cellRects() {
      if (R) return R;
      R = cells.map(function (c) { var r = c.querySelector('img').getBoundingClientRect(); return { w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; });
      return R;
    }
    function effDims(it) { var cr = it.crop || [0, 0, 0, 0]; return { w: it.img.w * (1 - cr[1] - cr[3]), h: it.img.h * (1 - cr[0] - cr[2]) }; }
    var EASE = 'cubic-bezier(.45,0,.15,1)', DUR = reduceMotion ? 0 : 520;
    function retire(l) {
      if (!l) return;
      l.el.style.pointerEvents = 'none'; l.el.style.zIndex = 9;
      l.anim.onfinish = function () { l.el.remove(); }; l.anim.reverse();
    }
    function floatFocus(i) {
      var rs = cellRects(), r = rs[i], it = items[i];
      var hh = cv('--hh'), dh = cv('--dh'), lm = cv('--lm'), rm = cv('--rm'), PL = st.density === 'all' ? 0 : 84, m = 12;
      var e = effDims(it), K = 2.4, allm = st.density === 'all';
      var s = allm ? Math.min(260 / e.w, 280 / e.h, 1.3) : Math.min(K * r.w / e.w, K * r.h * 1.25 / e.h, 1.3), FW = e.w * s, FH = e.h * s;
      var maxH = innerHeight - hh - dh - PL - 2 * m; if (FH > maxH) { FH *= maxH / FH * 1; s = FH / e.h; FW = e.w * s; }
      var cx = Math.max(lm + m + FW / 2, Math.min(innerWidth - rm - m - FW / 2, r.cx));
      var cy = Math.max(hh + m + FH / 2, Math.min(innerHeight - dh - m - PL - FH / 2 + 0, r.cy));
      // start state = exactly the resting crop of the cell (object-fit: cover, centre)
      var sc = Math.max(r.w / e.w, r.h / e.h), s0 = sc / s, vw = r.w / s0, vh = r.h / s0;
      var ix = (FW - vw) / 2, iy = (FH - vh) / 2;
      var el = document.createElement('a'); el.className = 'lit'; el.href = 'work.html?w=' + it.w.slug + '#' + (it.idx + 1);
      el.setAttribute('aria-label', it.w.title); el.tabIndex = -1;
      el.style.cssText = 'left:' + (cx - FW / 2) + 'px;top:' + (cy - FH / 2) + 'px;width:' + FW + 'px;height:' + FH + 'px';
      el.innerHTML = '<img src="' + esc(it.img.src) + '" alt=""' + (it.crop ? ' style="object-view-box:' + viewBox(it.crop) + '"' : '') + '>';
      grid.appendChild(el);
      var from = { transform: 'translate(' + (r.cx - cx) + 'px,' + (r.cy - cy) + 'px) scale(' + s0 + ')', clipPath: 'inset(' + iy + 'px ' + ix + 'px)' };
      var to = { transform: 'translate(0,0) scale(1)', clipPath: 'inset(0px 0px)' };
      var anim = el.animate([from, to], { duration: DUR, easing: EASE, fill: 'both' });
      var l = { el: el, anim: anim }; if (lit) retire(lit); lit = l;
      // others: shrink + radial push that falls off with distance (all photos: only cells within ~460 px are touched)
      var cw = r.w, P = allm ? 95 : 0.9 * cw, sig = allm ? 130 : 1.6 * cw, sc2 = allm ? .22 : .15;
      cells.forEach(function (c, k) {
        var img = c.firstElementChild, val = '';
        if (k !== i) {
          var vx = rs[k].cx - cx, vy = rs[k].cy - cy, d = Math.max(1, Math.hypot(vx, vy));
          if (!allm || d < 460) {
            var p = P * Math.exp(-d / sig), sk = 1 - sc2 * Math.exp(-d / (allm ? 170 : 1e9)) * 1;
            if (!allm) sk = .85;
            var tx = vx / d * p, ty = vy / d * p, hw = rs[k].w / 2 * sk, hhh = rs[k].h / 2 * sk;
            tx = Math.max(lm + 6 + hw - rs[k].cx, Math.min(innerWidth - rm - 6 - hw - rs[k].cx, tx)); // keep pushed covers inside the viewport
            ty = Math.max(hh + 4 + hhh - rs[k].cy, Math.min(innerHeight - dh - 4 - hhh - rs[k].cy, ty));
            val = 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px) scale(' + sk.toFixed(3) + ')';
          }
        }
        if (c._t !== val) { img.style.transform = val; c._t = val; }
      });
      // placard: works mode directly under the image; all photos: small, beside it (right, or left near the right edge)
      if (!plac) { plac = document.createElement('div'); plac.className = 'placard-float'; grid.appendChild(plac); }
      clearTimeout(placT); plac.style.opacity = 0;
      placT = setTimeout(function () {
        plac.classList.toggle('side', allm);
        if (allm) {
          var PW = 168, right = cx + FW / 2 + 12 + PW <= innerWidth - rm - 8;
          plac.innerHTML = '<b class="t">' + esc(it.w.title) + '</b><span class="m">' + esc(it.w.year) + '</span>';
          plac.style.width = PW + 'px'; plac.style.top = (cy - FH / 2) + 'px';
          plac.style.left = (right ? cx + FW / 2 + 12 : cx - FW / 2 - 12 - PW) + 'px'; plac.style.textAlign = right ? 'left' : 'right';
        } else {
          plac.innerHTML = '<b class="t">' + esc(it.w.title) + '</b><span class="m">' + esc(meta(it.w)) + '</span>';
          plac.style.left = (cx - FW / 2) + 'px'; plac.style.top = (cy + FH / 2 + 10) + 'px'; plac.style.width = Math.max(FW, 260) + 'px'; plac.style.textAlign = 'left';
        }
        plac.style.opacity = 1;
      }, 160);
    }
    function viewBox(cr) { return 'inset(' + cr.map(function (v) { return (v * 100) + '%'; }).join(' ') + ')'; }
    function floatClear() {
      if (lit) { retire(lit); lit = null; }
      clearTimeout(placT); if (plac) plac.style.opacity = 0;
      cells.forEach(function (c) { if (c._t) { c.firstElementChild.style.transform = ''; c._t = ''; } });
    }
    function floating() { return !mobile; }

    var litCell = null;
    function setFocus(i) {
      clearTimeout(clr);
      if (i === cur || i < 0 || i >= items.length) return;
      var it = items[i];
      cur = i;
      // round 5: only the focused photo is lit (no whole-work lighting)
      if (litCell) litCell.classList.remove('is-lit');
      litCell = cells[i]; litCell.classList.add('is-lit');
      grid.classList.add('has-focus');
      if (mobile && st.density === 'all') { /* phones already use full files */ }
      if (floating()) floatFocus(i);
      if (capNeeded()) showCap(it);
    }
    function clearFocus() {
      cur = -1; curW = null;
      if (!grid) return;
      if (litCell) { litCell.classList.remove('is-lit'); litCell = null; }
      grid.classList.remove('has-focus');
      if (floating()) floatClear();
      showCap(null);
    }
    function bindField() {
      if (mobile) {
        // PROTOTYPE: touch has no hover. The work nearest the middle of the screen is "lit"; the rest dim as you scroll.
        return;
      }
      // PROTOTYPE: while the tracks are moving a cell can slide under a resting pointer; hold the focus for 260 ms,
      // then re-read what is under the pointer. This prevents flicker between neighbours.
      var lock = false, px = 0, py = 0;
      function settle() { lock = false; var el = document.elementFromPoint(px, py), c = el && el.closest && el.closest('.cell'); if (c) setFocus(+c.getAttribute('data-i')); }
      on(grid, 'pointermove', function (e) { px = e.clientX; py = e.clientY; });
      on(grid, 'pointerover', function (e) {
        if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
        px = e.clientX; py = e.clientY;
        if (lock) return;
        var c = e.target.closest && e.target.closest('.cell');
        if (c) { var i = +c.getAttribute('data-i'); if (i !== cur) { setFocus(i); lock = true; setTimeout(settle, 150); } }
      });
      // leaving the grid (or resting in a gap) lets the light come back up after a short beat
      on(grid, 'pointerleave', function () { clearTimeout(clr); clr = setTimeout(clearFocus, 160); });
      on(grid, 'focusin', function (e) { var c = e.target.closest && e.target.closest('.cell'); if (c) setFocus(+c.getAttribute('data-i')); });
      on(grid, 'focusout', function () { clearTimeout(clr); clr = setTimeout(clearFocus, 160); });
    }

    function scrollFocus() {
      scrollRaf = 0;
      if (!grid || !mobile || st.view !== 'field') return;
      var top = cv('--hh'), bot = innerHeight - cv('--dh');
      var mid = (top + bot) / 2, best = -1, bd = 1e9;
      for (var i = 0; i < cells.length; i++) {
        var r = cells[i].getBoundingClientRect();
        if (r.bottom < top || r.top > bot) continue;
        var d = Math.abs((r.top + r.bottom) / 2 - mid) + Math.abs((r.left + r.right) / 2 - innerWidth / 2) * 0.35;
        if (d < bd) { bd = d; best = i; }
      }
      if (best >= 0) setFocus(best);
    }
    on(window, 'scroll', function () { if (mobile && !scrollRaf) scrollRaf = requestAnimationFrame(scrollFocus); }, { passive: true });

    // keyboard: arrows move through the field, Enter opens (native: the focused cell is a link)
    on(document, 'keydown', function (e) {
      if (st.view !== 'field' || !cells.length || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Escape') { clearFocus(); if (document.activeElement) document.activeElement.blur(); return; }
      var d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }[e.key];
      if (d == null) return;
      if (!keysUsed) { keysUsed = true; setHint(); } // the keyboard hint appears only after the first arrow-key press
      e.preventDefault();
      var i = cur < 0 ? 0 : cur + d;
      if (cur >= 0 && i >= items.length && d === cols) i = items.length - 1;
      i = Math.max(0, Math.min(items.length - 1, i));
      // all photos: left/right across a work boundary is fine; the lit work simply changes
      cells[i].focus({ preventScroll: !mobile });
      setFocus(i);
      if (mobile) cells[i].scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    });

    var rz; on(window, 'resize', function () {
      clearTimeout(rz); rz = setTimeout(function () { if (st.view === 'field' || mobile !== isMobile()) render(); }, 120);
    });

    /* ---------- list ---------- */
    var L = { sort: 'year', dir: -1, genre: 'all', years: 'all' };
    var YEARS = { all: ['All years'], a: ['1996–99', 1996, 1999], b: ['2000–04', 2000, 2004], c: ['2005–09', 2005, 2009], d: ['2010–14', 2010, 2014] };
    function buildList() {
      grid = null; cells = [];
      var genres = ['drama', 'opera', 'dance', 'puppet', 'musical', 'singspiel'].filter(function (g) { return W.some(function (w) { return genreOf(w) === g; }); });
      var html = '<div class="list"><div class="filters">' +
        '<div class="chips" data-f="genre"><span class="lbl">Genre</span><button data-v="all">All</button>' + genres.map(function (g) { return '<button data-v="' + g + '">' + cap1(g) + '</button>'; }).join('') + '</div>' +
        '<div class="chips" data-f="years"><span class="lbl">Year</span>' + Object.keys(YEARS).map(function (k) { return '<button data-v="' + k + '">' + YEARS[k][0] + '</button>'; }).join('') + '</div>' +
        '<div class="count" id="lcount"></div></div>' +
        '<div class="lhead" role="row">' + [['title', 'Title'], ['year', 'Year'], ['director', 'Director'], ['theatre', 'Theatre'], ['genre', 'Genre']].map(function (c) {
          return '<button data-s="' + c[0] + '" class="c-' + c[0] + '">' + c[1] + '<span class="ar"></span></button>'; }).join('') + '</div>' +
        '<div id="rows"></div></div>';
      view.innerHTML = html;
      $$('.chips button', view).forEach(function (b) { on(b, 'click', function () { L[b.parentNode.getAttribute('data-f')] = b.getAttribute('data-v'); paintList(); }); });
      $$('.lhead button', view).forEach(function (b) { on(b, 'click', function () {
        var k = b.getAttribute('data-s'); if (L.sort === k) L.dir *= -1; else { L.sort = k; L.dir = k === 'year' ? -1 : 1; } paintList(); }); });
      paintList();
    }
    function paintList() {
      var list = W.filter(function (w) {
        if (L.genre !== 'all' && genreOf(w) !== L.genre) return false;
        if (L.years !== 'all') { var y = YEARS[L.years]; if (w.year < y[1] || w.year > y[2]) return false; }
        return true;
      });
      list.sort(function (a, b) {
        var x = a[L.sort], y = b[L.sort];
        if (L.sort === 'genre') { x = genreOf(a); y = genreOf(b); }
        if (L.sort === 'year') return (x - y) * L.dir || a.title.localeCompare(b.title);
        return String(x || '').localeCompare(String(y || '')) * L.dir || b.year - a.year;
      });
      $('#rows', view).innerHTML = list.map(function (w) {
        var c = cover(w);
        return '<a class="row" href="work.html?w=' + esc(w.slug) + '"><span class="c-thumb"><img src="' + esc(c.thumb) + '" alt="" loading="lazy"></span>' +
          '<span class="c-title">' + esc(w.title) + '</span><span class="c-year">' + w.year + '</span>' +
          '<span class="c-director">' + esc(w.director || '') + '</span><span class="c-theatre">' + esc(w.theatre || '') + '</span>' +
          '<span class="c-genre">' + esc(genreOf(w)) + '</span></a>';
      }).join('') || '<p class="empty">No works match.</p>';
      $$('.chips button', view).forEach(function (b) { b.setAttribute('aria-pressed', L[b.parentNode.getAttribute('data-f')] === b.getAttribute('data-v')); });
      $$('.lhead button', view).forEach(function (b) {
        var a = L.sort === b.getAttribute('data-s'); b.setAttribute('aria-pressed', a); b.querySelector('.ar').textContent = a ? (L.dir > 0 ? ' ↑' : ' ↓') : ''; });
      $('#lcount', view).textContent = list.length + ' of ' + W.length + ' works';
    }

    render();
  }

  /* ============================================================ WORK page */
  function initWork() {
    var slug = qs.get('w'), idx = -1, i;
    for (i = 0; i < W.length; i++) if (W[i].slug === slug) idx = i;
    var main = $('#work');
    if (idx < 0) { main.innerHTML = '<div class="info"><h1 class="placard">Work not found</h1><p><a href="index.html">All works</a></p></div>'; return; }
    var w = W[idx], prev = W[(idx - 1 + W.length) % W.length], next = W[(idx + 1) % W.length];
    document.title = w.title + ' — Igor Vasiljev';
    var rows = creditRows(w);
    main.innerHTML =
      '<aside class="info"><div class="head">' +
      '<a class="back" href="index.html">← All works</a>' +
      '<h1 class="placard">' + esc(w.title) + '</h1>' +
      '<p class="sub">' + esc([w.year, w.theatre].filter(Boolean).join(' · ')) + '</p></div><div class="rest">' +
      '<dl class="credits">' + rows.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl>' +
      (w.description ? '<p class="desc">' + esc(w.description) + '</p>' : '<p class="desc ph">[description to come from Igor]</p>') +
      (w.note ? '<p class="note">Open question: ' + esc(w.note) + '</p>' : '') +
      '<nav class="pn" aria-label="Previous and next work">' +
      '<a href="work.html?w=' + esc(prev.slug) + '" rel="prev"><i>← Previous</i><span>' + esc(prev.title) + '</span></a>' +
      '<a href="work.html?w=' + esc(next.slug) + '" rel="next"><i>Next →</i><span>' + esc(next.title) + '</span></a></nav>' +
      '</div></aside>' +
      '<section class="stage" aria-label="Photographs">' +
      '<figure class="viewer"><button class="step prev" aria-label="Previous photo">←</button>' +
      '<div class="frame"><img id="vimg" alt="' + esc(w.title) + '"></div>' +
      '<button class="step next" aria-label="Next photo">→</button></figure>' +
      '<div class="vcap"><span id="vn"></span><span id="vc"></span><span class="hint">← → photos · [ ] works</span></div>' +
      '<div class="thumbs" role="list">' + w.images.map(function (im, k) {
        return '<button role="listitem" data-k="' + k + '" aria-label="Photo ' + (k + 1) + '"><img src="' + esc(im.thumb) + '" alt="" loading="lazy"></button>'; }).join('') + '</div>' +
      '</section>';

    var cur = 0, vimg = $('#vimg');
    function show(k) {
      cur = (k + w.images.length) % w.images.length;
      var im = w.images[cur];
      // PROTOTYPE: real size or smaller. The frame never upscales: max-width is the image's own pixel width.
      vimg.style.setProperty('--mw', im.w + 'px'); vimg.style.setProperty('--mh', im.h + 'px');
      vimg.width = im.w; vimg.height = im.h; vimg.src = im.src;
      $('#vn').textContent = String(cur + 1).padStart(2, '0') + ' / ' + String(w.images.length).padStart(2, '0');
      $('#vc').textContent = im.credit ? 'Photo: ' + im.credit : '';
      $$('.thumbs button').forEach(function (b, j) { b.setAttribute('aria-current', j === cur ? 'true' : 'false'); });
      var nx = w.images[(cur + 1) % w.images.length]; (new Image()).src = nx.src;
      try { history.replaceState(null, '', location.pathname + location.search + '#' + (cur + 1)); } catch (e) {}
    }
    $$('.thumbs button').forEach(function (b) { on(b, 'click', function () { show(+b.getAttribute('data-k')); }); });
    on($('.step.prev'), 'click', function () { show(cur - 1); });
    on($('.step.next'), 'click', function () { show(cur + 1); });
    on(vimg, 'click', function () { show(cur + 1); });
    on(document, 'keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowLeft') show(cur - 1); else if (e.key === 'ArrowRight') show(cur + 1);
      else if (e.key === '[') location.href = 'work.html?w=' + prev.slug; else if (e.key === ']') location.href = 'work.html?w=' + next.slug;
    });
    var sx = null; // swipe on touch
    on(vimg, 'touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    on(vimg, 'touchend', function (e) { if (sx == null) return; var dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 40) show(cur + (dx < 0 ? 1 : -1)); });
    var h = parseInt((location.hash || '').slice(1), 10);
    show(h > 0 && h <= w.images.length ? h - 1 : 0);
  }

  /* ============================================================ ABOUT / STUDENTS */
  function band(title, list, id) {
    return '<section class="band" id="' + id + '"><div class="wrap"><h2 class="lbl-h">' + title + ' <span class="n">' + list.length + '</span></h2>' +
      '<div class="reel">' + list.map(function (p) { return '<a href="' + esc(p.src) + '" target="_blank" rel="noopener"><img src="' + esc(p.src) + '" width="' + p.w + '" height="' + p.h + '" alt="" loading="lazy"></a>'; }).join('') + '</div></div></section>';
  }
  function initAbout() {
    var q = S.quote;
    $('#about').innerHTML =
      '<div class="wrap"><section class="intro"><h1 class="placard">' + esc(S.name) + '</h1><p class="line">' + esc(S.role) + '</p></section>' +
      '<section class="cols"><h2 class="lbl-h">Biography</h2><div class="prose">' + S.bio.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div></section>' +
      '<section class="cols"><h2 class="lbl-h">Awards</h2><ul class="awards">' + S.awards.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul></section>' +
      '<section class="cols"><h2 class="lbl-h">Press</h2><blockquote class="quote"><p>' + esc(q.text) + '</p><footer><a href="' + esc(q.url) + '" target="_blank" rel="noopener">' + esc(q.source) + ' ↗</a></footer></blockquote></section>' +
      '</div>' +
      band('Photography', S.photography, 'photography') + band('Drawings', S.drawings, 'drawings');
  }
  function initStudents() {
    var s = S.students;
    // Round 4: no principles (Ivan: awkward for students). Title, marked placeholder intro, playground entry only.
    $('#students').innerHTML =
      '<div class="wrap"><section class="intro"><h1 class="placard sm">Students</h1></section>' +
      '<section class="cols"><h2 class="lbl-h">Course <span class="draft">draft</span></h2><div class="prose"><p class="ph">' + esc(s.intro) + '</p></div></section>' +
      '<section class="cols"><h2 class="lbl-h">Playground</h2><div class="prose"><p>Build a new stage design from elements of Igor\'s past work.</p>' +
      '<p><a class="btn" href="../direction-d2-collage/playground.html?back=' + encodeURIComponent(location.href) + '">Open the playground →</a></p></div></section></div>';
  }
  function initContact() {
    $('#contact').innerHTML = '<div class="wrap"><section class="intro"><h1 class="placard sm">Contact</h1></section>' +
      '<section class="cols"><h2 class="lbl-h">Email</h2><p class="mail"><a href="mailto:' + esc(S.email) + '">' + esc(S.email) + '</a></p></section></div>';
  }

  /* ------------------------------------------------------------ boot */
  function boot() {
    renderHeader();
    var p = document.body.className;
    if (/page-index/.test(p)) initIndex(); else if (/page-work/.test(p)) initWork();
    else if (/page-about/.test(p)) initAbout(); else if (/page-students/.test(p)) initStudents(); else if (/page-contact/.test(p)) initContact();
    if (location.hash && /page-about/.test(p)) { var t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
  }
  if (document.readyState === 'loading') on(document, 'DOMContentLoaded', boot); else boot();
})();

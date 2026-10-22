/* Direction C, "Light plot". Vanilla JS, no build. Content comes from ../shared/content.js */
(function () {
  'use strict';
  var SITE = window.SITE, WORKS = window.WORKS;
  var root = document.documentElement;
  var page = document.body.dataset.page;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // PROTOTYPE: phones have no cursor. See NOTES.md: the spot parks itself on the work nearest the middle of the screen.
  var coarse = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  function $(s, r) { return (r || document).querySelector(s); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function frac(x) { return x - Math.floor(x); }

  /* ---------- data helpers ---------- */
  // PROTOTYPE: cover rule. Prefer the first landscape photo >= 600 px wide (not a portrait board or a sketch strip),
  // else the first landscape one, else the first image. COVER_OVERRIDE maps slug -> image index for known poor covers.
  var COVER_OVERRIDE = { // PROTOTYPE: chosen by eye from the photos. Round 2.
    'beautiful-day-2014': 0,            // only boards/models exist; 0 is the one with production photos
    'a-streetcar-named-desire-2014': 0, // photo triptych, cropped to its middle panel (COVER_CROPS)
    'hapy-prince-1998': 0,              // only sketches exist for this work
    'space-kite-1999': 1,               // 0 is a grey-framed board; 1 is the lit scene
    'master-peter-s-puppet-show-1997': 1, // 0 is a drawing; 1 is the lit scene
    'burlesque-about-a-greek-2007': 5,  // 0-3 are white 3D renders
    'prometheus-bound-2006': 3          // 0-2 are renders and a sketch
  };
  // Round 3: crop to one panel of a composite board (object-view-box inset: top right bottom left, as fractions).
  // Same approach as A3. Beautiful Day: top-left panel of the 4-panel board. Streetcar: middle panel of the triptych.
  var COVER_CROPS = { 'beautiful-day-2014': [0, 0.4, 0.675, 0], 'a-streetcar-named-desire-2014': [0, 0.345, 0, 0.345] };
  function viewBox(cr) { return 'inset(' + cr.map(function (v) { return (v * 100) + '%'; }).join(' ') + ')'; }
  function cropOf(w) { return COVER_CROPS[w.slug] || null; }
  function cropDims(c, cr) { return { w: c.w * (1 - (cr ? cr[1] + cr[3] : 0)), h: c.h * (1 - (cr ? cr[0] + cr[2] : 0)) }; }
  function cover(w) {
    if (COVER_OVERRIDE[w.slug] != null) return w.images[COVER_OVERRIDE[w.slug]];
    var r = function (i) { return i.w / i.h; };
    return w.images.find(function (i) { return i.w >= 600 && r(i) >= 1.25 && r(i) <= 2.2; }) ||
      w.images.find(function (i) { return r(i) >= 1.25 && r(i) <= 2.2; }) || w.images[0];
  }
  function url(w) { return 'work.html?w=' + encodeURIComponent(w.slug); }
  function where(w) { return [w.theatre, w.city].filter(Boolean).join(', '); }

  /* ---------- round 4: explore panel (accent / spot colour / outline) ---------- */
  // PROTOTYPE: choices live on <html data-accent data-spot data-outline>, remembered in localStorage, overridable by URL params for screenshots.
  var XP = { accent: ['none', 'cold', 'exit', 'red', 'ultraviolet'], spot: ['warm', 'white', 'cool'], outline: ['none', 'thick', 'frame'] };
  var XD = { accent: 'none', spot: 'white', outline: 'none' };
  var xs = {}; try { xs = JSON.parse(store.get('igor-explore') || '{}') || {}; } catch (e) { xs = {}; }
  var qp = new URLSearchParams(location.search);
  Object.keys(XP).forEach(function (k) {
    var v = qp.get(k) || xs[k]; if (XP[k].indexOf(v) < 0) v = XD[k]; xs[k] = v; root.dataset[k] = v;
  });
  var xOpen = qp.get('panel') ? qp.get('panel') === 'open' : store.get('igor-explore-open') === '1';
  /* ---------- scaffolding: header, spot, blackout ---------- */
  var navItems = [['home', 'index.html', 'Works'], ['about', 'about.html', 'About'], ['students', 'students.html', 'Students'], ['contact', 'about.html#contact', 'Contact']];
  var hd = el('header', 'hd',
    '<a class="mark" href="index.html">' + esc(SITE.name) + '<small>' + esc(SITE.role) + '</small></a>' +
    '<nav class="nav" aria-label="Main">' + navItems.map(function (n) {
      return '<a href="' + n[1] + '"' + (n[0] === page ? ' aria-current="page"' : '') + '>' + n[2] + '</a>';
    }).join('') + '</nav>' +
    '<div class="sw" role="group" aria-label="House light"><span class="sw-l">House light</span><span class="seg">' +
    '<button type="button" data-l="show" title="Show light (L)">Show</button><button type="button" data-l="work" title="Work light (L)">Work</button></span></div>');
  document.body.insertBefore(hd, document.body.firstChild);
  var pool = el('div', 'pool'); pool.setAttribute('aria-hidden', 'true');
  var spot = el('div', 'spot'); spot.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(pool, document.body.firstChild);
  document.body.insertBefore(spot, document.body.firstChild); // DOM order: spot first, then pool (pool glows over the dimmed layer)
  document.body.insertBefore(pool, spot.nextSibling);
  var xp = el('div', 'xp');
  xp.innerHTML = '<button type="button" class="xp-t" aria-expanded="false">Explore</button><div class="xp-b">' +
    [['accent', 'Accent colour'], ['spot', 'Spot colour'], ['outline', 'Outline on lit photo']].map(function (g) {
      return '<div class="xp-g"><span>' + g[1] + '</span><div>' + XP[g[0]].map(function (v) { return '<button type="button" data-k="' + g[0] + '" data-v="' + v + '">' + (v === 'ultraviolet' ? 'UV' : v) + '</button>'; }).join('') + '</div></div>';
    }).join('') + '</div>';
  document.body.appendChild(xp);
  function paintXp() {
    xp.classList.toggle('open', xOpen); xp.querySelector('.xp-t').setAttribute('aria-expanded', xOpen ? 'true' : 'false');
    xp.querySelectorAll('.xp-b button').forEach(function (b) { b.setAttribute('aria-pressed', xs[b.dataset.k] === b.dataset.v ? 'true' : 'false'); });
  }
  xp.querySelector('.xp-t').addEventListener('click', function () { xOpen = !xOpen; store.set('igor-explore-open', xOpen ? '1' : '0'); paintXp(); });
  xp.querySelectorAll('.xp-b button').forEach(function (b) {
    b.addEventListener('click', function () { xs[b.dataset.k] = b.dataset.v; root.dataset[b.dataset.k] = b.dataset.v; store.set('igor-explore', JSON.stringify(xs)); paintXp(); });
  });
  paintXp();
  var blackout = el('div', 'blackout'); blackout.setAttribute('aria-hidden', 'true');
  document.body.appendChild(blackout);

  /* ---------- scene change ---------- */
  // PROTOTYPE: every internal link = blackout (--out, 300 ms), then the next page fades up (--in). Stage-craft, not a transition library.
  function lightsUp() { requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.remove('leaving'); root.classList.add('lit'); }); }); }
  lightsUp();
  window.addEventListener('pageshow', function (e) { if (e.persisted) lightsUp(); });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
    var h = a.getAttribute('href');
    if (/^(mailto:|tel:|https?:)/.test(h) || h.charAt(0) === '#') return;
    var u = new URL(a.href, location.href);
    if (u.pathname === location.pathname && u.search === location.search && u.hash) return; // same-page anchor
    e.preventDefault();
    root.classList.add('leaving'); root.classList.remove('lit');
    var ms = parseFloat(getComputedStyle(root).getPropertyValue('--out')) || 300;
    setTimeout(function () { location.href = a.href; }, ms);
  });

  /* ---------- house lights ---------- */
  var light = root.dataset.light || 'show';
  function paintSwitch() { hd.querySelectorAll('.sw button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.l === light ? 'true' : 'false'); }); }
  function setLight(l, persist) {
    light = l; root.dataset.light = l; if (persist !== false) store.set('igor-light', l);
    paintSwitch(); document.dispatchEvent(new Event('lightchange')); kick();
  }
  hd.querySelectorAll('.sw button').forEach(function (b) { b.addEventListener('click', function () { setLight(b.dataset.l); }); });
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'l' || e.key === 'L') && !e.metaKey && !e.ctrlKey && !e.altKey) setLight(light === 'work' ? 'show' : 'work');
  });
  paintSwitch();

  /* ---------- frame loop + the spot ---------- */
  var raf = 0, hooks = [];
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  function frame() { raf = 0; var more = false; for (var i = 0; i < hooks.length; i++) if (hooks[i]()) more = true; if (more) kick(); }
  var S = { x: innerWidth * .62, y: innerHeight * .45, tx: innerWidth * .62, ty: innerHeight * .45, scale: 1, k: .13 };
  S.set = function (x, y) { S.tx = x; S.ty = y; kick(); };
  S.pr = 400;
  // PROTOTYPE: core radius, soft-edge width, darkness outside. Round 2: darker outside, warm bright pool inside.
  S.shape = function (c0, w, dim) {
    spot.style.setProperty('--c0', c0 + 'px'); spot.style.setProperty('--w', w + 'px'); spot.style.setProperty('--dim', dim);
    S.pr = c0 + w * .75; kick();
  };
  S.shape(110, 300, .76);
  hooks.push(function () {
    var k = reduce ? 1 : S.k;
    S.x += (S.tx - S.x) * k; S.y += (S.ty - S.y) * k;
    spot.style.transform = 'translate3d(' + (S.x - 2200) + 'px,' + (S.y - 2200) + 'px,0) scale(' + S.scale + ')';
    pool.style.transform = 'translate3d(' + (S.x - 500) + 'px,' + (S.y - 500) + 'px,0) scale(' + (S.pr / 500 * S.scale) + ')';
    return Math.abs(S.tx - S.x) + Math.abs(S.ty - S.y) > .4;
  });
  S.set(S.x, S.y);
  var P = { x: 0, y: 0, tx: 0, ty: 0, px: innerWidth * .5, py: innerHeight * .5 }; // pointer, normalised -.5..+.5 for parallax
  var onPointer = null; // page hook
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    P.px = e.clientX; P.py = e.clientY; P.tx = e.clientX / innerWidth - .5; P.ty = e.clientY / innerHeight - .5;
    if (onPointer) onPointer(e); else if (page !== 'home') S.set(e.clientX, e.clientY);
    kick();
  }, { passive: true });
  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', function () { if (page === 'home') Home.layout(); if (page === 'work') Work.layout(); kick(); });

  /* ======================= HOME ======================= */
  var Home = {};
  function initHome() {
    var stage = $('#stage'), list = $('#list');
    var years = WORKS.map(function (w) { return w.year; });
    var yMin = Math.min.apply(null, years), yMax = Math.max.apply(null, years);
    var items = [], yrEls = [], cur = null, lastIdx = 0, tapUntil = 0;

    /* --- stage --- */
    var hero = el('div', 'hero', '<h1>' + esc(SITE.name) + '</h1><p>' + esc(SITE.role) + ' · ' + WORKS.length + ' works · ' + yMin + '–' + yMax + '</p>');
    stage.appendChild(hero);
    var zs = [1, .6, .82, .55, .92, .7, .64, .98, .76, .58]; // PROTOTYPE: depth of each plane; 1 = downstage (closest), .55 = far back
    WORKS.forEach(function (w, i) {
      var c = cover(w), z = zs[(i * 3 + 1) % zs.length];
      var cr = cropOf(w), cd = cropDims(c, cr), img = el('img', 'pl'); img.src = c.src; if (cr) img.style.objectViewBox = viewBox(cr); img.alt = ''; img.decoding = 'async'; img.loading = i < 6 ? 'eager' : 'lazy';
      img.style.zIndex = Math.round(z * 4); img.style.filter = 'brightness(' + (.82 + .18 * z).toFixed(2) + ')'; // round 3: others sit at ~25% (spot overlay); only a slight depth difference here
      var a = el('a', 'cap'); a.href = url(w); a.style.zIndex = 6 + Math.round(z * 4);
      a.setAttribute('aria-label', w.title + ', ' + w.year);
      
      var it = { w: w, c: c, cw: cd.w, ch: cd.h, z: z, base: img.style.filter, bz: Math.round(z * 4), i: i, img: img, cap: a, ox: 0, oy: 0 };
      a.addEventListener('focus', function () { setCurrent(it); });
      items.push(it); stage.appendChild(img); stage.appendChild(a);
    });
    var order = items.slice().sort(function (a, b) { return b.z - a.z || a.i - b.i; });

    Home.layout = function () {
      var W = innerWidth, mob = W < 720;
      var margin = mob ? 14 : 36, gapY = mob ? 64 : 120, top = mob ? 330 : 420, right = mob ? 22 : 56, gc = 110;
      // PROTOTYPE: no overlaps. Desktop = two columns, each work goes under the shorter column with a fixed gap, loose x inside its column.
      // Mobile = one column with a loose x. Parallax offsets are clamped so neighbours can never meet.
      var colW = mob ? W - margin - right : (W - margin - right - gc) / 2;
      var colX = [margin, margin + colW + gc], colY = [top, top + 200];
      items.forEach(function (it) {
        var r = it.cw / it.ch;
        // PROTOTYPE (round 3): on phones each photo is wide (78-90% of the screen), one per row, with a small x offset for depth
        var bh = (mob ? 400 : 330) * it.z, bw = bh * r, maxW = mob ? Math.min(colW, W * (.78 + .12 * it.z)) : Math.min(colW, 520 * it.z);
        if (mob) { bw = maxW; bh = bw / r; }
        if (bw > maxW) { bw = maxW; bh = bw / r; }
        bw = Math.min(bw, it.cw * 1.3); bh = bw / r; // never above ~1.3x real size
        it.bw = Math.round(bw); it.bh = Math.round(bh);
        var c = mob ? 0 : (colY[0] <= colY[1] ? 0 : 1);
        it.bx = Math.round(colX[c] + frac(it.i * 0.6180339 + .17) * Math.max(0, colW - it.bw));
        it.by = Math.round(colY[c]); colY[c] += it.bh + gapY + Math.round(frac(it.i * .37) * 50);
        [it.img, it.cap].forEach(function (e) { e.style.width = it.bw + 'px'; e.style.height = it.bh + 'px'; });
        var t0 = 'translate3d(' + it.bx + 'px,' + it.by + 'px,0)'; it.img.style.transform = t0; it.cap.style.transform = t0;
      });
      stage.style.height = (Math.max(colY[0], colY[1]) + 320) + 'px';
      kick();
    };

    function setCurrent(it) {
      if (cur === it) return;
      if (cur) { cur.cap.classList.remove('on'); cur.img.style.zIndex = cur.bz; cur.img.style.filter = cur.base; }
      cur = it;
      // PROTOTYPE (round 3): the work in the spot is lifted above the dark overlay = full brightness, the rest stay at ~25%
      if (it) { it.cap.classList.add('on'); lastIdx = it.i; it.img.style.zIndex = 6; it.img.style.filter = 'none'; }
      projShow(it);
      cue.textContent = 'Cue ' + String((lastIdx + 1)).padStart(2, '0') + ' / ' + WORKS.length;
    }
    // projected title: large plain type on the dark, with a little light bleed
    var proj = el('div', null); proj.id = 'proj'; proj.setAttribute('aria-hidden', 'true'); document.body.appendChild(proj);
    var projTimer = 0;
    function projShow(it) {
      clearTimeout(projTimer);
      if (!it) { proj.classList.remove('show'); return; }
      proj.classList.remove('show');
      projTimer = setTimeout(function () {
        var t = it.w.title, n = t.length, cls = n > 34 ? 's' : n > 18 ? 'm' : '';
        proj.innerHTML = '<b class="' + cls + '">' + esc(t) + '</b><span>' + it.w.year + ' · ' + esc(where(it.w)) + '</span>';
        proj.classList.add('show');
      }, reduce ? 0 : 160);
    }
    var dock = el('div', 'dock', '<span class="cue">Cue 00 / ' + WORKS.length + '</span><span class="seg" role="group" aria-label="View"><button type="button" data-v="stage">Stage</button><button type="button" data-v="list">List</button></span>');
    document.body.appendChild(dock);
    var cue = dock.querySelector('.cue');
    var band = el('div', 'band'); band.setAttribute('aria-hidden', 'true'); document.body.appendChild(band);
    var depth = el('div', 'depth', '<em>Downstage</em><i></i><em>Upstage</em>'); document.body.appendChild(depth);

    hooks.push(function () {
      if (root.dataset.view !== 'stage' || light === 'work') return false;
      var sy = scrollY, vh = innerHeight, mob = innerWidth < 720;
      var pk = reduce ? 1 : .08;
      P.x += (P.tx - P.x) * pk; P.y += (P.ty - P.y) * pk;
      var best = null, bd = 1e9;
      items.forEach(function (it) {
        var cyc = Math.max(-320, Math.min(320, it.by + it.bh / 2 - sy - vh / 2)), d = 1 - it.z;
        // PROTOTYPE: depth parallax. Far planes lag behind the scroll, near ones follow it; pointer shifts planes by depth.
        it.oy = reduce ? 0 : (-cyc * d * .32 - (mob ? 0 : P.y * it.z * 50));
        it.ox = reduce || mob ? 0 : -P.x * it.z * 80;
        var sx0 = it.bx + it.ox, sy0 = it.by + it.oy - sy;
        it.sx = sx0; it.sy = sy0;
        if (sy0 > vh + 320 || sy0 + it.bh < -320) return;
        var t = 'translate3d(' + sx0 + 'px,' + (it.by + it.oy) + 'px,0)';
        it.img.style.transform = t; it.cap.style.transform = t;
      });
      var cy = null, moved = false;
      if (mob || coarse) {
        // phones/touch: the spot parks on the work nearest the middle of the screen, unless the finger just tapped somewhere
        items.forEach(function (it) {
          var d = Math.abs(it.sy + it.bh / 2 - vh * .4); if (d < bd && it.sy + it.bh > 0 && it.sy < vh) { bd = d; best = it; }
        });
        if (best && Date.now() > tapUntil) { S.tx = best.sx + best.bw / 2; S.ty = best.sy + best.bh / 2; moved = true; }
        cy = best;
      } else {
        // PROTOTYPE (round 3): the spot is drawn to the nearest work. Within 150 px of a work (190 px once it holds the spot,
        // so it does not flicker) the spot eases to that work's centre; further away it follows the pointer.
        var px = P.px, py = P.py;
        items.forEach(function (it) {
          if (it.sy > vh + 200 || it.sy + it.bh < -200) return;
          var dx = Math.max(it.sx - px, 0, px - (it.sx + it.bw)), dy = Math.max(it.sy - py, 0, py - (it.sy + it.bh));
          var d = Math.hypot(dx, dy) - (it === cur ? 40 : 0); if (d < bd) { bd = d; best = it; }
        });
        var nx = px, ny = py;
        if (best && bd <= 150) { cy = best; nx = best.sx + best.bw / 2; ny = best.sy + best.bh / 2; }
        if (Math.abs(S.tx - nx) + Math.abs(S.ty - ny) > .5) { S.tx = nx; S.ty = ny; moved = true; }
      }
      setCurrent(cy);
      var max = Math.max(1, document.documentElement.scrollHeight - vh);
      depth.querySelector('i').style.top = (Math.min(1, sy / max) * (depth.clientHeight - 7)) + 'px';
      return moved || Math.abs(P.tx - P.x) + Math.abs(P.ty - P.y) > .0008;
    });
    if (coarse || innerWidth < 720) S.scale = .8;
    window.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') { tapUntil = Date.now() + 1800; S.set(e.clientX, e.clientY); }
    }, { passive: true });

    /* --- list --- */
    var genres = Array.from(new Set(WORKS.map(function (w) { return w.genre; })));
    var sort = { k: 'year', dir: -1 }, gen = 'all';
    list.innerHTML = '<h1>Works</h1><p class="mono count"></p><div class="filters" role="group" aria-label="Filter by genre"></div>' +
      '<div class="cols" role="group" aria-label="Sort"></div><div class="rows"></div>';
    var cols = [['', ''], ['title', 'Title'], ['year', 'Year'], ['director', 'Director'], ['theatre', 'Theatre'], ['genre', 'Genre']];
    var colsEl = list.querySelector('.cols');
    cols.forEach(function (c) {
      var b = el('button', null, c[1]); b.type = 'button'; b.dataset.k = c[0];
      if (!c[0]) { b.disabled = true; b.tabIndex = -1; b.setAttribute('aria-hidden', 'true'); }
      b.addEventListener('click', function () { if (sort.k === c[0]) sort.dir *= -1; else { sort.k = c[0]; sort.dir = c[0] === 'year' ? -1 : 1; } renderList(); });
      colsEl.appendChild(b);
    });
    var fEl = list.querySelector('.filters');
    ['all'].concat(genres).forEach(function (g) {
      var b = el('button', 'chip', g === 'all' ? 'All' : g); b.type = 'button'; b.dataset.g = g;
      b.addEventListener('click', function () { gen = g; renderList(); }); fEl.appendChild(b);
    });
    function renderList() {
      var rows = WORKS.filter(function (w) { return gen === 'all' || w.genre === gen; });
      rows.sort(function (a, b) {
        var x = a[sort.k], y = b[sort.k]; x = x == null ? '' : x; y = y == null ? '' : y;
        var c = typeof x === 'number' ? x - y : String(x).localeCompare(String(y));
        return (c || a.title.localeCompare(b.title)) * sort.dir;
      });
      fEl.querySelectorAll('.chip').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.g === gen ? 'true' : 'false'); });
      colsEl.querySelectorAll('button').forEach(function (b) { var on = b.dataset.k === sort.k; b.dataset.on = on ? 1 : 0; b.dataset.dir = sort.dir > 0 ? '↑' : '↓'; });
      list.querySelector('.count').textContent = rows.length + (gen === 'all' ? ' works · ' + yMin + '–' + yMax : ' of ' + WORKS.length + ' works · ' + gen);
      list.querySelector('.rows').innerHTML = rows.map(function (w) {
        var c = cover(w);
        return '<a class="row" href="' + url(w) + '"><span class="th"><img src="' + c.src + '" alt="" loading="lazy"' + (cropOf(w) ? ' style="object-view-box:' + viewBox(cropOf(w)) + '"' : '') + '></span>' +
          '<span class="tt lit">' + esc(w.title) + '</span><span class="x y">' + w.year + '</span><span class="x">' + esc(w.director || '—') + '</span>' +
          '<span class="x">' + esc(where(w) || '—') + '</span><span class="x">' + esc(w.genre || '') + '</span></a>';
      }).join('') || '<p class="empty ph">No works in this genre.</p>';
    }
    renderList();

    /* --- view: stage / list. Work light always shows the list (the rehearsal version). --- */
    var view = store.get('igor-view') || 'stage';
    var qv = (location.search.match(/[?&]view=(stage|list)/) || [])[1]; if (qv) view = qv;
    function applyView() {
      root.dataset.view = light === 'work' ? 'list' : view;
      dock.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.v === view ? 'true' : 'false'); });
      Home.layout(); kick();
    }
    dock.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { view = b.dataset.v; store.set('igor-view', view); applyView(); window.scrollTo(0, 0); }); });
    document.addEventListener('lightchange', function () { applyView(); window.scrollTo(0, 0); });
    applyView();
  }

  /* ======================= WORK ======================= */
  var Work = { layout: function () {} };
  function initWork() {
    var slug = new URLSearchParams(location.search).get('w');
    var idx = WORKS.findIndex(function (w) { return w.slug === slug; }); if (idx < 0) idx = 0;
    var w = WORKS[idx], imgs = w.images, n = imgs.length, cur = 0;
    document.title = w.title + ' · ' + SITE.name;
    var labels = [['Author', w.author], ['Director', w.director], ['Choreography', w.choreography], ['Conductor', w.conductor], ['Costumes', w.costumes]];
    Object.keys(w.otherCredits || {}).forEach(function (k) {
      var v = w.otherCredits[k]; labels.push([k.charAt(0).toUpperCase() + k.slice(1), Array.isArray(v) ? v.join(', ') : v]);
    });
    labels.push(['Theatre', where(w)], ['Year', w.year], ['Role', w.role]);
    var credits = labels.filter(function (l) { return l[1]; }).map(function (l) { return '<div><dt>' + esc(l[0]) + '</dt><dd>' + esc(l[1]) + '</dd></div>'; }).join('');
    var prev = WORKS[(idx - 1 + WORKS.length) % WORKS.length], next = WORKS[(idx + 1) % WORKS.length];
    var main = $('main');
    main.innerHTML =
      '<div class="work"><div class="placard lit"><h1>' + esc(w.title) + '</h1><p class="mono sub">' + w.year + (w.genre ? ' · ' + esc(w.genre) : '') + '</p>' +
      '<dl class="credits">' + credits + '</dl>' +
      '<p class="desc ph">' + (w.description ? esc(w.description) : '[description to come from Igor]') + '</p>' +
      (w.note ? '<p class="note">Note for Igor: ' + esc(w.note) + '</p>' : '') + '</div>' +
      '<div class="scene"><div class="frame" id="frame"><img id="ph" alt=""></div>' +
      '<div class="step"><button type="button" id="pv" aria-label="Previous photo">← Prev</button><span class="n" id="cn"></span><button type="button" id="nx" aria-label="Next photo">Next →</button><span class="pc" id="pc"></span></div>' +
      '<div class="strip" id="strip"></div>' +
      '<nav class="pn" aria-label="Works"><a href="' + url(prev) + '"><span class="mono">← Previous work</span><b>' + esc(prev.title) + '</b></a><a href="' + url(next) + '"><span class="mono">Next work →</span><b>' + esc(next.title) + '</b></a></nav></div></div>';
    var frame = $('#frame'), ph = $('#ph'), strip = $('#strip');
    imgs.forEach(function (im, i) {
      var b = el('button', null); b.type = 'button'; b.setAttribute('aria-label', 'Photo ' + (i + 1));
      b.innerHTML = '<img src="' + im.src + '" alt="" loading="lazy">'; b.addEventListener('click', function () { go(i); }); strip.appendChild(b);
    });
    var sizes = [];
    Work.layout = function () {
      var box = $('.scene').clientWidth, availW = box, availH = Math.max(320, innerHeight - (innerWidth < 900 ? 240 : 250));
      if (innerWidth < 900) availH = Math.min(availH, innerHeight * .62);
      var mw = 0, mh = 0;
      sizes = imgs.map(function (im) {
        var s = Math.min(1, availW / im.w, availH / im.h); // PROTOTYPE: real size or smaller, never upscaled
        var o = { w: Math.round(im.w * s), h: Math.round(im.h * s) }; mw = Math.max(mw, o.w); mh = Math.max(mh, o.h); return o;
      });
      frame.style.width = mw + 'px'; frame.style.height = mh + 'px';
      // PROTOTYPE: the spot is wide and soft here: the lit pool covers the frame, the rest of the page stays in the dark
      S.shape(Math.hypot(mw, mh) / 2 + 40, 300, .88);
      show(cur, true); kick();
    };
    function show(i, instant) {
      var s = sizes[i]; ph.style.width = s.w + 'px'; ph.style.height = s.h + 'px';
      var done = function () { ph.src = imgs[i].src; ph.classList.remove('dim'); };
      if (instant || reduce) { done(); } else { ph.classList.add('dim'); setTimeout(done, 230); }
      $('#cn').textContent = (i + 1) + ' / ' + n;
      $('#pc').textContent = imgs[i].credit ? 'Photo: ' + imgs[i].credit : '';
      strip.querySelectorAll('button').forEach(function (b, k) { b.setAttribute('aria-current', k === i ? 'true' : 'false'); });
    }
    function go(i) { cur = (i + n) % n; show(cur); }
    $('#pv').addEventListener('click', function () { go(cur - 1); });
    $('#nx').addEventListener('click', function () { go(cur + 1); });
    document.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') go(cur - 1); if (e.key === 'ArrowRight') go(cur + 1); });
    var sx = null;
    frame.addEventListener('pointerdown', function (e) { sx = e.clientX; });
    frame.addEventListener('pointerup', function (e) { if (sx != null && Math.abs(e.clientX - sx) > 40) go(cur + (e.clientX < sx ? 1 : -1)); else if (sx != null && Math.abs(e.clientX - sx) < 6) go(cur + 1); sx = null; });
    // the spot rests on the frame; the cursor can nudge it a little (gentle), scrolling keeps it on the photo
    S.k = .08;
    onPointer = function () { kick(); };
    hooks.push(function () {
      var r = frame.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var ox = coarse ? 0 : Math.max(-50, Math.min(50, (P.px - cx) * .1)), oy = coarse ? 0 : Math.max(-50, Math.min(50, (P.py - cy) * .1));
      S.tx = cx + ox; S.ty = cy + oy; return false;
    });
    S.x = innerWidth / 2; S.y = innerHeight / 2;
    Work.layout();
    window.addEventListener('load', function () { Work.layout(); });
  }

  /* ======================= ABOUT ======================= */
  function gallery(title, arr, id) {
    return '<section class="gal" id="' + id + '"><h2>' + title + ' <span class="mono">' + arr.length + '</span></h2><div class="grid">' +
      arr.map(function (p) { return '<figure><img src="' + p.src + '" width="' + p.w + '" height="' + p.h + '" alt="" loading="lazy"></figure>'; }).join('') + '</div></section>';
  }
  function initAbout() {
    $('main').innerHTML = '<div class="page"><div class="lit"><h1>About</h1><p class="mono lead">' + esc(SITE.name) + ' · ' + esc(SITE.role) + '</p>' +
      '<div class="cols2"><div class="bio">' + SITE.bio.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div>' +
      '<div><h2>Awards</h2><ul class="plain">' + SITE.awards.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul></div></div>' +
      '<figure class="quote"><blockquote>' + esc(SITE.quote.text) + '</blockquote><cite><a href="' + esc(SITE.quote.url) + '" target="_blank" rel="noopener">' + esc(SITE.quote.source) + ' ↗</a></cite></figure>' +
      '<section class="contact" id="contact"><h2>Contact</h2><a class="mail" href="mailto:' + esc(SITE.email) + '">' + esc(SITE.email) + '</a></section></div>' +
      gallery('Photography', SITE.photography, 'photography') + gallery('Drawings', SITE.drawings, 'drawings') + '</div>';
    if (location.hash === '#contact') setTimeout(function () { var c = $('#contact'); if (c) c.scrollIntoView(); }, 50);
    // PROTOTYPE: wide soft spot over the galleries so they read as dim stage until the spot arrives
    S.shape(60, 320, .78);
  }

  /* ======================= STUDENTS ======================= */
  function initStudents() {
    var st = SITE.students;
    $('main').innerHTML = '<div class="page"><div class="lit"><h1>Students</h1><p class="mono lead">Draft<span class="tag">placeholder</span></p>' +
      '<p class="ph" style="margin-top:36px;font-size:20px;max-width:50ch">' + esc(st.intro) + '</p>' +
      '<ol class="princ">' + st.principles.map(function (p, i) {
        var k = p.indexOf(':'), head = k > 0 ? p.slice(0, k) : p, rest = k > 0 ? p.slice(k + 1).trim() : ''; rest = rest.charAt(0).toUpperCase() + rest.slice(1);
        return '<li><span>' + String(i + 1).padStart(2, '0') + '</span><p>' + esc(head) + (rest ? '<small>' + esc(rest) + '</small>' : '') + '</p></li>';
      }).join('') + '</ol><p class="mono" style="margin-top:12px">Principles: draft, for Igor to rewrite</p>' +
      '<a class="btn" href="../direction-d2-collage/playground.html?back=' + encodeURIComponent(location.href) + '">Open the playground →</a></div></div>';
    S.shape(60, 320, .78);
  }

  if (page === 'home') initHome();
  else if (page === 'work') initWork();
  else if (page === 'about') initAbout();
  else if (page === 'students') initStudents();
  kick();
})();

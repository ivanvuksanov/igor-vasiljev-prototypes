/* Direction D, "Collage": shared chrome + home / work / about / students.
   The playground has its own file (playground.js). Everything renders from window.SITE / WORKS / ELEMENTS. */
(function () {
  'use strict';
  var SITE = window.SITE, WORKS = window.WORKS;
  var BY = {}; WORKS.forEach(function (w) { BY[w.slug] = w; });
  var page = document.body.getAttribute('data-page');

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function $(s, r) { return (r || document).querySelector(s); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // PROTOTYPE: cover rule. Some first images are composite boards or sketches (46, 07, 03).
  // Prefer the first landscape photo that is 1.3-1.9 wide-to-high and at least 500 px wide; a small override map wins first.
  var COVER_OVERRIDE = { 'beautiful-day-2014': 1, 'master-peter-s-puppet-show-1997': 1 };
  function cover(w) {
    var im = w.images;
    if (COVER_OVERRIDE[w.slug] != null && im[COVER_OVERRIDE[w.slug]]) return im[COVER_OVERRIDE[w.slug]];
    for (var i = 0; i < im.length; i++) { var r = im[i].w / im[i].h; if (im[i].w >= 500 && r >= 1.3 && r <= 1.9) return im[i]; }
    return im[0];
  }
  function workLine(w) { return w.title + ' (' + w.year + ')'; }
  function wlink(w, txt) { return '<a href="../direction-a9-field/work.html?w=' + encodeURIComponent(w.slug) + '">' + esc(txt || workLine(w)) + '</a>'; }

  /* ---------- header + house-light switch ---------- */
  function header() {
    var cur = { index: 'works', work: 'works', about: 'about', students: 'students', playground: 'playground' }[page];
    var items = [['works', 'Works', 'index.html#list'], ['about', 'About', 'about.html'], ['students', 'Students', 'students.html'], ['playground', 'Playground', 'playground.html'], ['contact', 'Contact', 'about.html#contact']];
    var nav = items.map(function (n) { return '<a href="' + n[2] + '"' + (n[0] === cur ? ' aria-current="page"' : '') + '>' + n[1] + '</a>'; }).join('');
    var h = document.createElement('header'); h.className = 'hdr';
    h.innerHTML = '<a class="mark" href="index.html">' + esc(SITE.name) + '</a><div class="hdr-r"><nav class="nav" aria-label="Main">' + nav + '</nav>' +
      '<button class="switch" type="button" aria-label="House light"><i></i><span class="sw-t"></span></button></div>';
    document.body.insertBefore(h, document.body.firstChild);
    var b = $('.switch', h), t = $('.sw-t', h);
    function label() { t.textContent = document.documentElement.getAttribute('data-light') === 'work' ? 'Work light' : 'Show light'; }
    b.addEventListener('click', function () {
      var n = document.documentElement.getAttribute('data-light') === 'work' ? 'show' : 'work';
      document.documentElement.setAttribute('data-light', n); store('iv-d2-light', n); label();
    });
    label();
  }
  function footer() {
    var f = document.createElement('footer'); f.className = 'foot';
    f.innerHTML = '<span class="mono">' + esc(SITE.name) + ' · ' + esc(SITE.role) + '</span><span class="mono">Prototype D, Collage · <a href="mailto:' + esc(SITE.email) + '">' + esc(SITE.email) + '</a></span>';
    document.body.appendChild(f);
  }

  /* ---------- the collage: assemble a scene from his elements ---------- */
  function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function cw(e) { return e.crop.w * e.natW; }
  function ch(e) { return e.crop.h * e.natH; }
  var EL = window.ELEMENTS || []; // only loaded on pages that need it
  var WORDS = ['orph-words', 'godot-words', 'grimm-note', 'selferase-floor'];
  var POOLS = {
    anchor: EL.filter(function (e) { return /^(frame|facade)$/.test(e.type) && cw(e) >= 250 && cw(e) / ch(e) < 2.2; }),
    plane: EL.filter(function (e) { return /^(frame|facade)$/.test(e.type) && cw(e) >= 130 && cw(e) / ch(e) < 2.6; }),
    floor: EL.filter(function (e) { return e.type === 'surface' && e.id !== 'kadbi-wall' && cw(e) / ch(e) > 2.5; }),
    obj: EL.filter(function (e) { return e.type === 'object' && cw(e) / ch(e) < 4; }),
    light: EL.filter(function (e) { return e.type === 'light' && WORDS.indexOf(e.id) < 0; }),
    words: EL.filter(function (e) { return WORDS.indexOf(e.id) >= 0; })
  };
  var GLOWS = ['#ffb347', '#3a6bff', '#2fd27a', '#ff3b30'];

  // PROTOTYPE: the staging rule (round 2). A scene is a stage, not a row of photos:
  //  1. one large anchor (facade or frame) upstage, near the centre
  //  2. 1-2 objects standing on the floor line, left and right of it (optionally a carpet under them)
  //  3. one light (a beam, spots, a wash from a photo) plus a soft colour glow behind the anchor
  //  4. at most one projected word piece, high up
  //  5. optionally a second, smaller plane beside the anchor. Never more than 6 pieces; each from a different work.
  // The seed (?seed=N) makes a scene reproducible.
  function plan(seed, W, H) {
    var r = rng(Math.imul(seed + 1, 2654435761) >>> 0), used = {}, out = [];
    r(); r(); r();
    function pick(pool, avoidId) {
      var c = pool.filter(function (e) { return !used[e.workSlug] && e.id !== avoidId; });
      if (!c.length) c = pool.filter(function (e) { return e.id !== avoidId; });
      var e = c[Math.floor(r() * c.length)]; used[e.workSlug] = 1; return e;
    }
    var Wc = Math.min(W, 1200), x0 = (W - Wc) / 2, narrow = W < 720, floorY = Math.round(H * (narrow ? 0.68 : 0.76)), boost = narrow ? 1.5 : 1;
    function add(e, tw, cx, bottom, z) {
      var s = Math.min(1.3, tw * boost / cw(e)), w = cw(e) * s;
      out.push({ e: e, s: s, w: w, h: ch(e) * s, cx: Math.max(w / 2 + 4, Math.min(W - w / 2 - 4, x0 + cx)), bottom: bottom, z: z });
    }
    var a = pick(POOLS.anchor), acx = Wc * (0.5 + (r() - 0.5) * 0.16), aw = Wc * (0.4 + 0.08 * r());
    add(a, aw, acx, floorY, 2);
    var glow = { color: GLOWS[Math.floor(r() * GLOWS.length)], cx: x0 + acx, cy: floorY - 0.35 * aw, size: aw * 1.5 * boost };
    var left = r() < 0.5, o1 = pick(POOLS.obj);
    add(o1, Wc * (0.15 + 0.06 * r()), Wc * (left ? 0.16 + 0.1 * r() : 0.74 + 0.1 * r()), floorY + 8 + r() * 18, 4);
    if (r() < 0.7) { var o2 = pick(POOLS.obj, o1.id); add(o2, Wc * (0.13 + 0.06 * r()), Wc * (left ? 0.72 + 0.1 * r() : 0.18 + 0.1 * r()), floorY + 6 + r() * 18, 4); }
    if (r() < 0.5) add(pick(POOLS.floor), Wc * (0.4 + 0.1 * r()), acx + (r() - 0.5) * Wc * 0.1, floorY + 58 + r() * 14, 3);
    if (r() < 0.4 && out.length < 5) { var pl = pick(POOLS.plane, a.id); add(pl, Wc * (0.2 + 0.06 * r()), acx + (left ? 1 : -1) * Wc * (0.3 + 0.06 * r()), floorY - r() * 8, 1); }
    if (r() < 0.75 && out.length < 6) {
      var l = pick(POOLS.light), beam = /beam|spots/.test(l.id), lw = Wc * (beam ? 0.22 + 0.06 * r() : 0.34 + 0.06 * r()), ls = Math.min(1.3, lw * boost / cw(l));
      add(l, lw, beam ? Wc * (left ? 0.78 : 0.22) : acx, beam ? floorY - 4 : floorY - 0.1 * ch(l) * ls, beam ? 3 : 0);
    }
    if (r() < 0.5 && out.length < 6) {
      var wd = pick(POOLS.words), ww = Wc * (0.26 + 0.06 * r()), ws = Math.min(1.3, ww * boost / cw(wd));
      add(wd, ww, Wc * (left ? 0.74 : 0.26) + (r() - 0.5) * Wc * 0.06, H * (0.1 + 0.06 * r()) + ch(wd) * ws, 5);
    }
    out.sort(function (p, q) { return p.z - q.z; });
    return { items: out, floorY: floorY, glow: glow };
  }

  // mode "work": each element links to its work page. mode "playground": links to the playground with that element added.
  function compose(host, seed, mode) {
    host.querySelectorAll('.cv-el,.cv-floor,.cv-glow').forEach(function (n) { n.remove(); });
    var W = host.clientWidth, H = host.clientHeight, P = plan(seed, W, H);
    var gl = document.createElement('div'); gl.className = 'cv-glow'; gl.style.cssText = 'left:' + (P.glow.cx - P.glow.size / 2) + 'px;top:' + (P.glow.cy - P.glow.size * 0.3) + 'px;width:' + P.glow.size + 'px;height:' + (P.glow.size * 0.6) + 'px;z-index:1;background:radial-gradient(closest-side,' + P.glow.color + ',rgba(0,0,0,0))';
    host.insertBefore(gl, host.firstChild); requestAnimationFrame(function () { requestAnimationFrame(function () { gl.classList.add('on'); }); });
    var fl = document.createElement('div'); fl.className = 'cv-floor'; fl.style.top = P.floorY + 'px'; host.insertBefore(fl, host.firstChild);
    var placard = $('.placard', host), cap = $('.cv-cap', host), caps = [];
    P.items.forEach(function (it, i) {
      var e = it.e, w = BY[e.workSlug], a = document.createElement('a');
      a.className = 'cv-el'; a.style.cssText = 'left:' + (it.cx - it.w / 2) + 'px;top:' + (it.bottom - it.h) + 'px;width:' + it.w + 'px;height:' + it.h + 'px;z-index:' + (it.z + 1) + ';transition-delay:' + (reduce ? 0 : 0.15 * i) + 's;mix-blend-mode:' + (e.blend === 'normal' ? 'normal' : 'screen');
      a.href = mode === 'playground' ? 'playground.html?add=' + e.id : 'work.html?w=' + w.slug;
      a.setAttribute('aria-label', e.label + ', from ' + workLine(w));
      var px = document.createElement('div'); px.className = 'px';
      px.style.backgroundImage = 'url("' + e.src + '")'; px.style.backgroundSize = (e.natW * it.s) + 'px ' + (e.natH * it.s) + 'px';
      px.style.backgroundPosition = (-e.crop.x * e.natW * it.s) + 'px ' + (-e.crop.y * e.natH * it.s) + 'px';
      a.appendChild(px); host.appendChild(a);
      requestAnimationFrame(function () { requestAnimationFrame(function () { a.classList.add('on'); }); });
      caps.push('<a href="work.html?w=' + w.slug + '">' + esc(e.label.toLowerCase()) + ', ' + esc(w.title) + ' ' + w.year + '</a>');
      function show() { host.classList.add('hov'); host.querySelectorAll('.cv-el').forEach(function (n) { n.classList.toggle('hot', n === a); }); if (placard) {
        placard.innerHTML = '<h2>' + esc(w.title) + '</h2><p>' + esc([w.year, w.theatre, w.director && 'dir. ' + w.director].filter(Boolean).join(' · ')) + (mode === 'playground' ? '' : '') + '</p>'; placard.classList.add('on'); } }
      function hide() { host.classList.remove('hov'); a.classList.remove('hot'); if (placard) placard.classList.remove('on'); }
      var touched = false; // emulated mouseenter after a touch must not count as a hover
      a.addEventListener('mouseenter', function () { if (!touched) show(); }); a.addEventListener('mouseleave', hide); a.addEventListener('focus', function () { if (a.matches(':focus-visible') && !touched) show(); }); a.addEventListener('blur', hide);
      // PROTOTYPE: touch has no hover, so the first tap shows the placard and the second tap opens the work.
      a.addEventListener('pointerdown', function (ev) { touched = ev.pointerType === 'touch'; });
      a.addEventListener('click', function (ev) {
        if (mode !== 'playground' && (touched || matchMedia('(hover: none)').matches) && !a.classList.contains('hot')) { ev.preventDefault(); show(); if (placard) placard.innerHTML += '<p class="tapnote">Tap again to open</p>'; }
      });
    });
    if (cap) cap.innerHTML = '<span>' + P.items.length + ' elements:</span>' + caps.join('');
    var n = $('.scene-n', host); if (n) n.textContent = 'Scene ' + seed + ' · ' + P.items.length + ' elements';
    host.addEventListener('pointerdown', function (ev) { if (ev.pointerType === 'touch' && !ev.target.closest('.cv-el') && !ev.target.closest('a,button')) { host.classList.remove('hov'); if (placard) placard.classList.remove('on'); host.querySelectorAll('.hot').forEach(function (n2) { n2.classList.remove('hot'); }); } });
    return P;
  }
  function seedFromUrl() { var m = location.search.match(/seed=(\d+)/); return m ? +m[1] : Math.floor(Math.random() * 1e9); }
  function mountCover(host, seed, mode) {
    var lastW = 0, cur = seed;
    function go(s) { cur = s; compose(host, cur, mode); lastW = host.clientWidth; }
    go(seed);
    window.addEventListener('resize', function () { if (Math.abs(host.clientWidth - lastW) > 40) go(cur); });
    return { next: function () { go(Math.floor(Math.random() * 1e9)); return cur; }, seed: function () { return cur; } };
  }

  /* ---------- pages ---------- */
  function home() {
    var host = $('#cover'), seed = seedFromUrl();
    host.innerHTML = '<div class="cv-top"><div><div class="cv-name">' + esc(SITE.name) + ', ' + esc(SITE.role.toLowerCase()) + '</div><div class="lbl scene-n"></div></div><button class="chip" type="button" id="again" style="color:#ececec;border-color:#555">↻ Another scene</button></div>' +
      '<div class="placard" aria-live="polite"></div><div class="cv-cap"></div>' +
      '<div class="cv-cta"><a class="btn sig" href="playground.html">Build your own → Playground</a><a class="btn" href="#list">All works, list view ↓</a></div>';
    var c = mountCover(host, seed, 'work');
    $('#again').addEventListener('click', function () { var s = c.next(); try { history.replaceState(null, '', '?seed=' + s); } catch (e) {} });
    list();
  }

  function list() {
    var host = $('#list'); if (!host) return;
    var genres = []; WORKS.forEach(function (w) { if (genres.indexOf(w.genre) < 0) genres.push(w.genre); });
    var st = { g: 'all', k: 'year', d: -1 };
    host.innerHTML = '<div class="list-head"><h2>All works <span class="mono">' + WORKS.length + ' · 1996–2014</span></h2><div class="ctl" id="genres"></div></div>' +
      '<div class="rowh" id="rowh"><span></span></div><div class="rows" id="rows"></div>';
    var cols = [['title', 'Title'], ['year', 'Year'], ['director', 'Director'], ['theatre', 'Theatre'], ['genre', 'Genre']];
    $('#rowh').innerHTML = '<span></span>' + cols.map(function (c) { return '<button type="button" data-k="' + c[0] + '">' + c[1] + '</button>'; }).join('');
    $('#genres').innerHTML = ['all'].concat(genres).map(function (g) { return '<button class="chip" type="button" data-g="' + esc(g) + '" aria-pressed="' + (g === 'all') + '">' + esc(g) + '</button>'; }).join('');
    function draw() {
      var a = WORKS.filter(function (w) { return st.g === 'all' || w.genre === st.g; });
      a.sort(function (x, y) { var p = x[st.k] || '', q = y[st.k] || ''; if (st.k === 'year') return (p - q) * st.d || x.title.localeCompare(y.title); return String(p).localeCompare(String(q)) * st.d || (y.year - x.year); });
      $('#rows').innerHTML = a.map(function (w) {
        return '<a class="row" href="work.html?w=' + w.slug + '"><span class="th" style="background-image:url(\'' + cover(w).thumb + '\')"></span><span class="t">' + esc(w.title) + '</span><span class="y">' + w.year + '</span>' +
          '<span class="m">' + esc(w.director || '') + '</span><span class="m">' + esc(w.theatre || '') + '</span><span class="g">' + esc(w.genre) + '</span><span class="m dir">' + esc([w.director, w.theatre].filter(Boolean).join(' · ')) + '</span></a>';
      }).join('');
      document.querySelectorAll('#rowh button').forEach(function (b) { var on = b.getAttribute('data-k') === st.k; if (on) { b.setAttribute('data-on', ''); b.setAttribute('data-dir', st.d > 0 ? '↑' : '↓'); } else { b.removeAttribute('data-on'); b.removeAttribute('data-dir'); } });
      document.querySelectorAll('#genres .chip').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-g') === st.g); });
    }
    $('#genres').addEventListener('click', function (e) { var b = e.target.closest('[data-g]'); if (b) { st.g = b.getAttribute('data-g'); draw(); } });
    $('#rowh').addEventListener('click', function (e) { var b = e.target.closest('[data-k]'); if (!b) return; var k = b.getAttribute('data-k'); if (st.k === k) st.d *= -1; else { st.k = k; st.d = k === 'year' ? -1 : 1; } draw(); });
    draw();
  }

  function work() {
    var slug = (location.search.match(/[?&]w=([^&]+)/) || [])[1], w = BY[decodeURIComponent(slug || '')], main = $('#main');
    if (!w) { main.innerHTML = '<div class="wrap"><h1 class="page-t">Work not found</h1><p><a href="index.html#list">All works</a></p></div>'; return; }
    document.title = w.title + ' · ' + SITE.name;
    var i = WORKS.indexOf(w), prev = WORKS[i + 1], next = WORKS[i - 1]; // list is newest first, so "previous" = older
    var rows = [['Author', w.author], ['Director', w.director], ['Choreography', w.choreography], ['Conductor', w.conductor], ['Costumes', w.costumes], ['Other', w.otherCredits], ['Theatre', w.theatre], ['City', w.city], ['Year', w.year], ['Role', w.role]]
      .filter(function (r) { return r[1]; }).map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('');
    var shots = w.images.map(function (im) {
      return '<figure class="shot" style="margin:0;width:' + im.w + 'px"><img src="' + im.src + '" width="' + im.w + '" height="' + im.h + '" alt="' + esc(w.title) + '" loading="lazy">' + (im.credit ? '<figcaption>Photo: ' + esc(im.credit) + '</figcaption>' : '') + '</figure>';
    }).join('');
    main.innerHTML = '<div class="wrap"><div class="w-top"><a class="mono" href="index.html#list">← All works</a><a class="mono" href="playground.html?work=' + w.slug + '">Use its elements in the playground →</a></div>' +
      '<div class="w-grid"><aside class="w-side"><p class="lbl w-meta">' + esc(w.genre) + ' · ' + w.year + '</p><h1 class="placard-t">' + esc(w.title) + '</h1><dl class="creds">' + rows + '</dl>' +
      '<div class="ph w-desc">[description to come from Igor]</div>' + (w.note ? '<p class="mono w-note">Note to confirm: ' + esc(w.note) + '</p>' : '') + '</aside><div class="shots">' + shots + '</div></div>' +
      '<nav class="pn" aria-label="Previous and next work">' + (prev ? '<a href="work.html?w=' + prev.slug + '"><span class="lbl">← Previous</span><span class="t">' + esc(prev.title) + ' (' + prev.year + ')</span></a>' : '<span></span>') +
      (next ? '<a class="r" href="work.html?w=' + next.slug + '"><span class="lbl">Next →</span><span class="t">' + esc(next.title) + ' (' + next.year + ')</span></a>' : '') + '</nav></div>';
  }

  function about() {
    var q = SITE.quote;
    $('#main').innerHTML = '<div class="wrap"><h1 class="page-t">About</h1><div class="cols"><div class="prose">' + SITE.bio.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div>' +
      '<div><div class="sect" style="margin-top:0"><h3>Awards</h3><ul class="plain-list">' + SITE.awards.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul></div>' +
      '<div class="sect"><h3>Press</h3><blockquote class="quote"><p>' + esc(q.text) + '</p><a class="mono" href="' + esc(q.url) + '" target="_blank" rel="noopener">' + esc(q.source) + ' ↗</a></blockquote></div>' +
      '<div class="sect" id="contact"><h3>Contact</h3><a href="mailto:' + esc(SITE.email) + '" style="font-size:20px">' + esc(SITE.email) + '</a></div></div></div>' +
      '<div class="sect"><h2>Photography</h2><div class="gal">' + SITE.photography.map(function (p) { return '<img src="' + p.src + '" width="' + p.w + '" height="' + p.h + '" alt="Photograph by Igor Vasiljev" loading="lazy">'; }).join('') + '</div></div>' +
      '<div class="sect"><h2>Drawings</h2><div class="gal">' + SITE.drawings.map(function (p) { return '<img src="' + p.src + '" width="' + p.w + '" height="' + p.h + '" alt="Drawing by Igor Vasiljev" loading="lazy">'; }).join('') + '</div></div></div>';
  }

  function students() {
    var S = SITE.students;
    $('#main').innerHTML = '<div class="wrap"><h1 class="page-t">Students</h1><p class="mono">Draft text<span class="tag">draft</span></p>' +
      '<div class="cols"><div class="prose"><p class="ph">' + esc(S.intro) + '</p></div><div></div></div>' +
      '<div class="sect"><h2>Principles<span class="tag">draft</span></h2><ol class="pr-list">' + S.principles.map(function (p) { return '<li><span>' + esc(p) + '</span></li>'; }).join('') + '</ol></div>' +
      '<div class="pg-entry"><div><h2 class="big">Playground</h2><p class="prose" style="max-width:44ch">An empty stage and a drawer of pieces cut from Igor\'s productions. Layer them, light them, and print the scene with a credit for every piece.</p>' +
      '<a class="btn sig" href="playground.html">Open the playground →</a></div><div class="cover" id="cover"><div class="placard"></div></div></div></div>';
    mountCover($('#cover'), seedFromUrl(), 'playground');
  }

  if (page !== 'playground') header(); // the playground has its own plain top bar
  if (page === 'index') home(); else if (page === 'work') work(); else if (page === 'about') about(); else if (page === 'students') students();
  if (page !== 'playground') footer();
  window.IV = { SITE: SITE, WORKS: WORKS, BY: BY, esc: esc, $: $, store: store, workLine: workLine, wlink: wlink, reduce: reduce };
})();

/* Playground: an empty black box + a drawer of elements cut from Igor's photos.
   PROTOTYPE: his photos are shot on black, so every element is drawn with mix-blend-mode: screen and the black simply
   falls away; elements layer like light. Crops with a light background switch to "normal" (per-element toggle too).
   The stage is a fixed 960 x 600 logical space scaled by CSS, so a saved scene is the same on every screen. */
(function () {
  'use strict';
  var IV = window.IV, $ = IV.$, esc = IV.esc, BY = IV.BY;
  var W = 960, H = 600, FLOOR = 420;
  var DEF = {}; window.ELEMENTS.forEach(function (e) { DEF[e.id] = e; }); window.CSS_LIGHTS.forEach(function (e) { DEF[e.id] = e; });
  var COLORS = ['#ffffff', '#ffb347', '#2fd27a', '#3a6bff', '#ff3b30'];
  var WASHES = ['#ffb347', '#3a6bff', '#2fd27a', '#ff3b30'];
  var KEY = 'iv-d2-playground-scene-v1';

  var stage = $('#stage'), inner = $('#inner'), itemsEl = $('#items'), selEl = $('#sel');
  var S = { items: [], light: { dim: 0, wash: null, amt: 0.6 }, grid: true };
  var sel = null, uid = 1, k = 1, tab = 'surface', onlyWork = null;

  /* ---------- sizes, nodes ---------- */
  function cssSize(d) { return d.css === 'wash' ? [520, 340] : d.css === 'spot' ? [260, 260] : [200, 420]; }
  function sizeOf(it) {
    var d = DEF[it.ref];
    if (it.kind === 'photo') return [d.crop.w * d.natW, d.crop.h * d.natH];
    if (it.kind === 'css') return cssSize(d);
    return [it.node.offsetWidth, it.node.offsetHeight];
  }
  function alpha(hex, a) { var n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; }
  function paintLight(node, d, color) {
    if (d.css === 'wash') node.style.background = 'radial-gradient(closest-side, ' + color + ', ' + alpha(color, 0.45) + ' 55%, ' + alpha(color, 0) + ')';
    else if (d.css === 'spot') node.style.background = 'radial-gradient(closest-side, ' + color + ' 0%, ' + color + ' 50%, ' + alpha(color, 0) + ' 100%)';
    else { node.style.background = 'linear-gradient(to bottom, ' + alpha(color, 0.9) + ', ' + alpha(color, 0) + ')'; node.style.clipPath = 'polygon(46% 0, 54% 0, 100% 100%, 0 100%)'; }
  }
  function build(it) {
    var n = document.createElement('div'); n.className = 'it'; n.setAttribute('data-uid', it.uid); it.node = n;
    var d = DEF[it.ref];
    if (it.kind === 'photo') {
      n.classList.add('feather');
      n.style.width = d.crop.w * d.natW + 'px'; n.style.height = d.crop.h * d.natH + 'px';
      n.style.backgroundImage = 'url("' + d.src + '")'; n.style.backgroundSize = d.natW + 'px ' + d.natH + 'px';
      n.style.backgroundPosition = (-d.crop.x * d.natW) + 'px ' + (-d.crop.y * d.natH) + 'px';
    } else if (it.kind === 'css') { var z = cssSize(d); n.style.width = z[0] + 'px'; n.style.height = z[1] + 'px'; paintLight(n, d, it.color); }
    else { n.innerHTML = '<div class="tx"></div>'; }
    itemsEl.appendChild(n); paint(it);
  }
  function paint(it) {
    var n = it.node, d = DEF[it.ref];
    n.style.mixBlendMode = it.blend;
    if (it.kind === 'css') paintLight(n, d, it.color);
    if (it.kind === 'text') { var t = n.firstChild; t.textContent = it.text; t.style.color = it.color; }
    place(it);
  }
  function place(it) {
    it.node.style.transform = 'translate(' + it.x + 'px,' + it.y + 'px) rotate(' + it.r + 'deg) scale(' + (it.s * it.flip) + ',' + it.s + ') translate(-50%,-50%)';
    if (it === sel) overlay();
  }
  function overlay() {
    if (!sel) { selEl.style.display = 'none'; return; }
    var z = sizeOf(sel); selEl.style.display = 'block';
    selEl.style.width = z[0] + 'px'; selEl.style.height = z[1] + 'px';
    selEl.style.setProperty('--inv', 1 / (sel.s * k));
    selEl.style.transform = 'translate(' + sel.x + 'px,' + sel.y + 'px) rotate(' + sel.r + 'deg) scale(' + sel.s + ') translate(-50%,-50%)';
  }
  function fit() { var w = stage.clientWidth; k = w / W; inner.style.transform = 'scale(' + k + ')'; overlay(); }
  new ResizeObserver(fit).observe(stage); window.addEventListener('beforeprint', fit);

  /* ---------- scene model ---------- */
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ items: S.items.map(strip), light: S.light, grid: S.grid })); $('#msg').textContent = 'Saved in this browser'; } catch (e) { $('#msg').textContent = ''; } }
  function strip(it) { var o = {}; for (var p in it) if (p !== 'node') o[p] = it[p]; return o; }
  var saveT; function changed() { clearTimeout(saveT); saveT = setTimeout(save, 250); credits(); $('#empty').style.display = S.items.length ? 'none' : ''; $('#count').textContent = S.items.length + (S.items.length === 1 ? ' element' : ' elements') + ' on stage'; }
  function lightApply() {
    $('#dim').style.opacity = S.light.dim; var w = $('#wash'); w.style.background = S.light.wash || 'transparent'; w.style.opacity = S.light.wash ? S.light.amt : 0;
    $('#r-dim').value = S.light.dim; $('#o-dim').textContent = Math.round(S.light.dim * 100) + '%';
    $('#r-wash').value = S.light.amt; $('#o-wash').textContent = Math.round(S.light.amt * 100) + '%';
    document.querySelectorAll('#sw-wash button').forEach(function (b) { b.setAttribute('aria-pressed', (b.getAttribute('data-c') || '') === (S.light.wash || '')); });
    stage.classList.toggle('no-grid', !S.grid); $('#c-grid').checked = S.grid;
  }
  function add(refId, x, y) {
    var d = DEF[refId], kind = d.css ? 'css' : 'photo';
    var it = { uid: uid++, ref: refId, kind: kind, x: 0, y: 0, s: 1, r: 0, flip: 1, blend: d.blend || 'screen', color: d.color || '#ffffff' };
    var z = kind === 'photo' ? [d.crop.w * d.natW, d.crop.h * d.natH] : cssSize(d);
    if (z[0] > 520) it.s = Math.round(520 / z[0] * 100) / 100;
    var jx = (Math.random() - 0.5) * 60, jy = (Math.random() - 0.5) * 40;
    it.x = Math.round(x == null ? W / 2 + jx : x); it.y = Math.round(y == null ? (d.type === 'object' ? FLOOR + 20 - z[1] * it.s / 2 : H / 2 - 40 + jy) : y);
    S.items.push(it); build(it); select(it); changed(); return it;
  }
  function addText(txt) {
    txt = (txt || '').trim(); if (!txt) return;
    var it = { uid: uid++, ref: 'text', kind: 'text', x: W / 2, y: 180 + Math.random() * 40, s: 1, r: 0, flip: 1, blend: 'screen', color: '#ffffff', text: txt };
    S.items.push(it); build(it); select(it); changed();
  }
  function remove(it) { if (!it) return; it.node.remove(); S.items.splice(S.items.indexOf(it), 1); if (sel === it) select(null); changed(); }
  function dup(it) { if (!it) return; var c = strip(it); c.uid = uid++; c.x += 24; c.y += 24; S.items.push(c); build(c); select(c); changed(); }
  function order(it, dir) { var i = S.items.indexOf(it), j = i + dir; if (!it || j < 0 || j >= S.items.length) return; S.items.splice(i, 1); S.items.splice(j, 0, it); S.items.forEach(function (o) { itemsEl.appendChild(o.node); }); changed(); }
  function clearAll() { S.items.forEach(function (o) { o.node.remove(); }); S.items = []; select(null); S.light = { dim: 0, wash: null, amt: 0.6 }; lightApply(); changed(); }

  /* ---------- selection + tools ---------- */
  function label(it) {
    if (it.kind === 'text') return 'Words: “' + it.text + '”';
    var d = DEF[it.ref]; return d.label + (d.workSlug ? ' · ' + BY[d.workSlug].title + ' (' + BY[d.workSlug].year + ')' : ' · made here');
  }
  function select(it) {
    sel = it; document.querySelectorAll('.it').forEach(function (n) { n.classList.remove('drag'); }); overlay(); sync();
  }
  function sync() {
    var on = !!sel;
    ['b-fwd', 'b-back', 'b-dup', 'b-flip', 'b-del', 'r-scale', 'r-rot'].forEach(function (id) { $('#' + id).disabled = !on; });
    $('#sel-name').textContent = on ? label(sel) : 'Nothing selected';
    $('#r-scale').value = on ? sel.s : 1; $('#o-scale').textContent = (on ? sel.s : 1).toFixed(2);
    $('#r-rot').value = on ? sel.r : 0; $('#o-rot').textContent = on ? Math.round(sel.r) : 0;
    document.querySelectorAll('#blend button').forEach(function (b) { b.disabled = !on; b.setAttribute('aria-pressed', on && b.getAttribute('data-b') === sel.blend); });
    $('#row-col').style.display = on && sel.kind !== 'photo' ? '' : 'none';
    document.querySelectorAll('#sw-col button').forEach(function (b) { b.setAttribute('aria-pressed', on && b.getAttribute('data-c') === sel.color); });
    $('#row-text').hidden = !(on && sel.kind === 'text'); if (on && sel.kind === 'text' && document.activeElement !== $('#text-in')) $('#text-in').value = sel.text;
  }
  function bindTools() {
    $('#b-fwd').onclick = function () { order(sel, 1); }; $('#b-back').onclick = function () { order(sel, -1); };
    $('#b-dup').onclick = function () { dup(sel); }; $('#b-del').onclick = function () { remove(sel); };
    $('#b-flip').onclick = function () { if (sel) { sel.flip *= -1; place(sel); changed(); } };
    $('#r-scale').oninput = function (e) { if (sel) { sel.s = +e.target.value; place(sel); $('#o-scale').textContent = sel.s.toFixed(2); changed(); } };
    $('#r-rot').oninput = function (e) { if (sel) { sel.r = +e.target.value; place(sel); $('#o-rot').textContent = Math.round(sel.r); changed(); } };
    $('#blend').onclick = function (e) { var b = e.target.closest('[data-b]'); if (b && sel) { sel.blend = b.getAttribute('data-b'); paint(sel); sync(); changed(); } };
    $('#sw-col').innerHTML = COLORS.map(function (c) { return '<button type="button" data-c="' + c + '" style="background:' + c + '" aria-label="Colour ' + c + '" aria-pressed="false"></button>'; }).join('');
    $('#sw-col').onclick = function (e) { var b = e.target.closest('[data-c]'); if (b && sel) { sel.color = b.getAttribute('data-c'); paint(sel); sync(); changed(); } };
    $('#text-in').oninput = function (e) { if (sel && sel.kind === 'text') { sel.text = e.target.value || ' '; paint(sel); overlay(); $('#sel-name').textContent = label(sel); changed(); } };
    $('#sw-wash').innerHTML = '<button type="button" class="none" data-c="" aria-label="No wash" aria-pressed="true"></button>' + WASHES.map(function (c) { return '<button type="button" data-c="' + c + '" style="background:' + c + '" aria-label="Wash ' + c + '" aria-pressed="false"></button>'; }).join('');
    $('#sw-wash').onclick = function (e) { var b = e.target.closest('button'); if (!b) return; S.light.wash = b.getAttribute('data-c') || null; lightApply(); changed(); };
    $('#r-dim').oninput = function (e) { S.light.dim = +e.target.value; lightApply(); changed(); };
    $('#r-wash').oninput = function (e) { S.light.amt = +e.target.value; lightApply(); changed(); };
    $('#c-grid').onchange = function (e) { S.grid = e.target.checked; lightApply(); changed(); };
    $('#b-new').onclick = function () { if (!S.items.length || confirm('Clear the stage and start a new scene?')) clearAll(); };
    $('#b-print').onclick = function () { fit(); window.print(); };
  }

  /* ---------- pointer interaction on the stage ---------- */
  var ptrs = {}, mode = null, g = null;
  function pt(e) { var r = stage.getBoundingClientRect(); return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k }; }
  function npt() { return Object.keys(ptrs).length; }
  stage.addEventListener('pointerdown', function (e) {
    var p = pt(e); ptrs[e.pointerId] = p;
    try { stage.setPointerCapture(e.pointerId); } catch (x) {}
    if (npt() === 2 && sel) { // pinch: scale + rotate the selected element with two fingers
      var a = Object.keys(ptrs).map(function (id) { return ptrs[id]; });
      g = { d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), a: Math.atan2(a[1].y - a[0].y, a[1].x - a[0].x), s: sel.s, r: sel.r }; mode = 'pinch'; return;
    }
    if (npt() > 1) return;
    var t = e.target;
    if (t.closest('#h-sc') && sel) { mode = 'scale'; g = { d: Math.hypot(p.x - sel.x, p.y - sel.y) || 1, s: sel.s }; return; }
    if (t.closest('#h-rt') && sel) { mode = 'rot'; return; }
    var n = t.closest('.it');
    if (n) { var it = S.items.filter(function (o) { return o.node === n; })[0]; select(it); n.classList.add('drag'); mode = 'drag'; g = { dx: it.x - p.x, dy: it.y - p.y }; }
    else { select(null); mode = null; }
  });
  stage.addEventListener('pointermove', function (e) {
    if (!ptrs[e.pointerId]) return; var p = pt(e); ptrs[e.pointerId] = p;
    if (!sel || !mode) return;
    if (mode === 'drag') { sel.x = Math.round(p.x + g.dx); sel.y = Math.round(p.y + g.dy); place(sel); }
    else if (mode === 'scale') { sel.s = Math.max(0.15, Math.min(3, g.s * Math.hypot(p.x - sel.x, p.y - sel.y) / g.d)); place(sel); sync(); }
    else if (mode === 'rot') { sel.r = Math.round(Math.atan2(p.y - sel.y, p.x - sel.x) * 180 / Math.PI + 90); if (sel.r > 180) sel.r -= 360; place(sel); sync(); }
    else if (mode === 'pinch' && npt() >= 2) {
      var a = Object.keys(ptrs).map(function (id) { return ptrs[id]; });
      sel.s = Math.max(0.15, Math.min(3, g.s * Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) / g.d));
      sel.r = Math.round(g.r + (Math.atan2(a[1].y - a[0].y, a[1].x - a[0].x) - g.a) * 180 / Math.PI); place(sel); sync();
    }
  });
  function up(e) {
    delete ptrs[e.pointerId];
    if (npt() === 0) { if (mode) changed(); mode = null; document.querySelectorAll('.it.drag').forEach(function (n) { n.classList.remove('drag'); }); }
    else if (mode === 'pinch') mode = null;
  }
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
  // wheel over an element scales it (shift = rotate); elsewhere the page scrolls as usual
  stage.addEventListener('wheel', function (e) {
    var n = e.target.closest('.it'), it = n ? S.items.filter(function (o) { return o.node === n; })[0] : (e.target.closest('#sel') ? sel : null);
    if (!it) return; e.preventDefault(); if (it !== sel) select(it);
    if (e.shiftKey) it.r = Math.round(((it.r + (e.deltaY > 0 ? 5 : -5) + 540) % 360) - 180); else it.s = Math.max(0.15, Math.min(3, it.s * Math.exp(-e.deltaY * 0.0015)));
    place(it); sync(); changed();
  }, { passive: false });
  document.addEventListener('keydown', function (e) {
    if (/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '') && document.activeElement.type !== 'range' && document.activeElement.type !== 'checkbox') return;
    if (!sel) return; var st = e.shiftKey ? 10 : 2, used = true;
    if (e.key === 'Delete' || e.key === 'Backspace') remove(sel);
    else if (e.key === 'Escape') select(null);
    else if (e.key === ']') order(sel, 1); else if (e.key === '[') order(sel, -1);
    else if (e.key === 'ArrowLeft') sel.x -= st; else if (e.key === 'ArrowRight') sel.x += st; else if (e.key === 'ArrowUp') sel.y -= st; else if (e.key === 'ArrowDown') sel.y += st;
    else if (e.key === '+' || e.key === '=') sel.s = Math.min(3, sel.s * 1.05); else if (e.key === '-') sel.s = Math.max(0.15, sel.s / 1.05);
    else used = false;
    if (used) { e.preventDefault(); if (sel) { place(sel); sync(); } changed(); }
  });

  /* ---------- the drawer ---------- */
  function pool(type) {
    var l = (type === 'light' ? window.CSS_LIGHTS : []).concat(window.ELEMENTS.filter(function (e) { return e.type === type; }));
    return onlyWork ? l.filter(function (e) { return e.workSlug === onlyWork; }) : l;
  }
  function tabs() {
    $('#tabs').innerHTML = window.ELEMENT_TYPES.map(function (t) { return '<button class="chip" role="tab" type="button" data-t="' + t.id + '" aria-pressed="' + (t.id === tab) + '">' + t.name + ' ' + pool(t.id).length + '</button>'; }).join('');
    var T = window.ELEMENT_TYPES.filter(function (t) { return t.id === tab; })[0]; $('#hint').textContent = T.name + ': ' + T.hint;
    $('#words').hidden = tab !== 'light';
  }
  function thumbHtml(d) {
    var pv;
    if (d.css) { var z = cssSize(d), sc = Math.min(70 / z[0], 56 / z[1]); pv = '<div style="width:' + z[0] * sc + 'px;height:' + z[1] * sc + 'px;" data-l="' + d.id + '"></div>'; }
    else { var w = d.crop.w * d.natW, h = d.crop.h * d.natH, s = Math.min(76 / w, 56 / h, 1.5); pv = '<div style="width:' + w * s + 'px;height:' + h * s + 'px;background:url(\'' + d.src + '\') ' + (-d.crop.x * d.natW * s) + 'px ' + (-d.crop.y * d.natH * s) + 'px / ' + d.natW * s + 'px ' + d.natH * s + 'px no-repeat;' + (d.blend === 'normal' ? '' : 'mix-blend-mode:screen') + '"></div>'; }
    return '<button class="thb" type="button" data-id="' + d.id + '" title="' + esc(d.label + (d.workSlug ? ' · ' + BY[d.workSlug].title : '')) + '"><div class="pv">' + pv + '</div><span>' + esc(d.label) + '</span></button>';
  }
  function thumbs() {
    $('#thumbs').innerHTML = pool(tab).map(thumbHtml).join('') || '<p class="msg">No ' + tab + ' elements from this work.</p>';
    document.querySelectorAll('#thumbs [data-l]').forEach(function (n) { paintLight(n, DEF[n.getAttribute('data-l')], DEF[n.getAttribute('data-l')].color); });
    var o = $('#only'); o.innerHTML = onlyWork ? '<button class="chip" id="unfilter" type="button">Only ' + esc(BY[onlyWork].title) + ' ✕</button>' : '';
  }
  var drag = null, suppress = false;
  $('#tabs').addEventListener('click', function (e) { var b = e.target.closest('[data-t]'); if (b) { tab = b.getAttribute('data-t'); tabs(); thumbs(); } });
  $('#only').addEventListener('click', function (e) { if (e.target.closest('#unfilter')) { onlyWork = null; tabs(); thumbs(); } });
  $('#thumbs').addEventListener('click', function (e) {
    var b = e.target.closest('.thb'); if (!b) return; if (suppress) { suppress = false; return; }
    add(b.getAttribute('data-id'));
    // PROTOTYPE: on phones the sheet folds away after a tap so the stage and the sliders are visible; reopen it to add more.
    if (matchMedia('(max-width: 900px)').matches) { shut(true); $('#msg').textContent = 'Added. Drag it, or use the sliders below. Reopen Elements for more.'; }
  });
  // mouse/pen: drag a thumbnail onto the stage. Touch keeps native scrolling in the drawer and uses tap-to-add.
  $('#thumbs').addEventListener('pointerdown', function (e) {
    var b = e.target.closest('.thb'); if (!b || e.pointerType === 'touch') return;
    drag = { b: b, x: e.clientX, y: e.clientY, ghost: null };
    try { $('#thumbs').setPointerCapture(e.pointerId); } catch (x) {}
  });
  $('#thumbs').addEventListener('pointermove', function (e) {
    if (!drag) return;
    if (!drag.ghost && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) { drag.ghost = drag.b.cloneNode(true); drag.ghost.classList.add('ghost'); drag.ghost.style.width = drag.b.offsetWidth + 'px'; document.body.appendChild(drag.ghost); }
    if (drag.ghost) { drag.ghost.style.left = e.clientX - drag.b.offsetWidth / 2 + 'px'; drag.ghost.style.top = e.clientY - 40 + 'px'; }
  });
  function drop(e) {
    if (!drag) return; var d = drag; drag = null;
    if (d.ghost) { d.ghost.remove(); suppress = true; setTimeout(function () { suppress = false; }, 50);
      var r = stage.getBoundingClientRect();
      if (e.type === 'pointerup' && e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom) {
        var it = add(d.b.getAttribute('data-id'), (e.clientX - r.left) / k, (e.clientY - r.top) / k); // drop point = element centre
        place(it); }
    }
  }
  $('#thumbs').addEventListener('pointerup', drop); $('#thumbs').addEventListener('pointercancel', drop);
  $('#word-add').onclick = function () { var i = $('#word-in'); addText(i.value); i.value = ''; };
  $('#word-in').addEventListener('keydown', function (e) { if (e.key === 'Enter') { addText(e.target.value); e.target.value = ''; } });
  function shut(s) { $('#drawer').classList.toggle('shut', s); $('#handle').setAttribute('aria-expanded', !s); $('#handle-i').textContent = s ? '▲' : '▼'; document.body.style.paddingBottom = s ? '60px' : ''; }
  $('#handle').onclick = function () { shut(!$('#drawer').classList.contains('shut')); };

  /* ---------- credits: the lesson (every piece comes from a real production) ---------- */
  function credits() {
    var b = $('#credits-body');
    if (!S.items.length) { b.innerHTML = '<p class="sm">Nothing on the stage yet. Each piece you add is credited here to the production it was cut from.</p>'; return; }
    var seen = {}, parts = [], made = [], words = [];
    S.items.forEach(function (it) {
      if (it.kind === 'text') { words.push('“' + esc(it.text.trim()) + '”'); return; }
      var d = DEF[it.ref]; if (!d.workSlug) { var l = d.label.toLowerCase(); if (made.indexOf(l) < 0) made.push(l); return; }
      var key = d.label + '|' + d.workSlug; if (seen[key]) return; seen[key] = 1;
      parts.push(esc(d.label.toLowerCase()) + ' from ' + IV.wlink(BY[d.workSlug]));
    });
    var h = '';
    if (parts.length) h += '<p>This scene uses: ' + parts.join(', ') + '.</p>';
    if (made.length) h += '<p class="sm">Light made here (no photo): ' + made.join(', ') + '.</p>';
    if (words.length) h += '<p class="sm">Words projected: ' + words.join(' · ') + '</p>';
    b.innerHTML = h;
  }

  /* ---------- PNG export ---------- */
  // PROTOTYPE: images loaded from file:// taint the canvas, so toDataURL throws. We probe once and only show the button if it works (it does over http).
  function probe() {
    var im = new Image(); im.onload = function () {
      try { var c = document.createElement('canvas'); c.width = c.height = 4; c.getContext('2d').drawImage(im, 0, 0); c.toDataURL(); $('#b-png').hidden = false; } catch (e) { $('#b-png').hidden = true; }
    }; im.onerror = function () { $('#b-png').hidden = true; }; im.src = window.ELEMENTS[0].src;
  }
  var imgs = {}; function img(src) { return imgs[src] || (imgs[src] = new Promise(function (res) { var i = new Image(); i.onload = function () { res(i); }; i.src = src; })); }
  function exportPng() {
    var c = document.createElement('canvas'); c.width = W * 2; c.height = H * 2; var x = c.getContext('2d'); x.scale(2, 2); x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
    var ops = { screen: 'screen', normal: 'source-over', multiply: 'multiply' };
    Promise.all(S.items.map(function (it) { return it.kind === 'photo' ? img(DEF[it.ref].src) : null; })).then(function (ims) {
      S.items.forEach(function (it, i) {
        var d = DEF[it.ref]; x.save(); x.translate(it.x, it.y); x.rotate(it.r * Math.PI / 180); x.scale(it.s * it.flip, it.s); x.globalCompositeOperation = ops[it.blend];
        if (it.kind === 'photo') {
          var w = d.crop.w * d.natW, h = d.crop.h * d.natH, t = document.createElement('canvas'); t.width = Math.ceil(w); t.height = Math.ceil(h); var c2 = t.getContext('2d');
          c2.drawImage(ims[i], d.crop.x * d.natW, d.crop.y * d.natH, w, h, 0, 0, w, h); c2.globalCompositeOperation = 'destination-in'; // feather like the CSS mask
          var gx = c2.createLinearGradient(0, 0, w, 0), gy = c2.createLinearGradient(0, 0, 0, h);
          [gx, gy].forEach(function (g) { g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.11, '#000'); g.addColorStop(0.89, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)'); });
          c2.fillStyle = gx; c2.fillRect(0, 0, w, h); c2.fillStyle = gy; c2.fillRect(0, 0, w, h);
          x.drawImage(t, -w / 2, -h / 2, w, h); }
        else if (it.kind === 'css') {
          var z = cssSize(d), gr;
          if (d.css === 'beam') { gr = x.createLinearGradient(0, -z[1] / 2, 0, z[1] / 2); gr.addColorStop(0, alpha(it.color, 0.9)); gr.addColorStop(1, alpha(it.color, 0)); x.fillStyle = gr; x.beginPath(); x.moveTo(-z[0] * 0.04, -z[1] / 2); x.lineTo(z[0] * 0.04, -z[1] / 2); x.lineTo(z[0] / 2, z[1] / 2); x.lineTo(-z[0] / 2, z[1] / 2); x.fill(); }
          else { x.scale(z[0] / 2, z[1] / 2); gr = x.createRadialGradient(0, 0, 0, 0, 0, 1); gr.addColorStop(0, it.color); gr.addColorStop(d.css === 'spot' ? 0.5 : 0.55, d.css === 'spot' ? it.color : alpha(it.color, 0.45)); gr.addColorStop(1, alpha(it.color, 0)); x.fillStyle = gr; x.fillRect(-1, -1, 2, 2); }
        } else { x.font = '700 44px "Familjen Grotesk", sans-serif'; x.textBaseline = 'middle'; x.textAlign = 'center'; x.fillStyle = it.color; x.fillText(it.text, 0, 0); }
        x.restore();
      });
      if (S.light.wash) { x.globalCompositeOperation = 'multiply'; x.globalAlpha = S.light.amt; x.fillStyle = S.light.wash; x.fillRect(0, 0, W, H); x.globalAlpha = 1; }
      x.globalCompositeOperation = 'source-over'; x.fillStyle = 'rgba(0,0,0,' + S.light.dim + ')'; x.fillRect(0, 0, W, H);
      try { var a = document.createElement('a'); a.download = 'scene.png'; a.href = c.toDataURL('image/png'); a.click(); } catch (e) { $('#msg').textContent = 'PNG export is blocked here. Use Print scene.'; $('#b-png').hidden = true; }
    });
  }
  $('#b-png').onclick = exportPng;

  /* ---------- start ---------- */
  var sw = $('#sw-col'); bindTools(); // swatches are created inside bindTools
  var q = location.search, mw = q.match(/[?&]work=([^&]+)/), ma = q.match(/[?&]add=([^&]+)/);
  if (mw && BY[decodeURIComponent(mw[1])]) { onlyWork = decodeURIComponent(mw[1]); var f = window.ELEMENTS.filter(function (e) { return e.workSlug === onlyWork; })[0]; if (f) tab = f.type; }
  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && saved.items) { S.light = saved.light || S.light; S.grid = saved.grid !== false; saved.items.forEach(function (o) { if (!DEF[o.ref] && o.kind !== 'text') return; o.uid = uid++; S.items.push(o); build(o); }); }
  } catch (e) {}
  tabs(); thumbs(); lightApply(); fit(); sync(); changed();
  if (ma && DEF[decodeURIComponent(ma[1])]) { add(decodeURIComponent(ma[1])); try { history.replaceState(null, '', 'playground.html'); } catch (e) {} }
  probe();
  window.PG = { S: S, add: add, select: select, addText: addText, get sel() { return sel; } };
})();

// E2, the archive. As E1, plus: the home page is one sideways strip of the selected works that moves on its
// own, no intro line, and the work page has four layouts to choose from (?work=1..4, remembered per browser).
(function () {
  var S = window.SITE, W = window.WORKS;
  var page = document.body.dataset.page;
  var q = new URLSearchParams(location.search);

  // FEATURED: the home selection. [work slug, photo index]. Order = order on the page. Edit freely.
  // Six come from A8's highlights; the other four were picked from a contact sheet of 2007-2008 work.
  var FEATURED = [
    ['the-visit-2014', 5], ['in-the-sign-of-libra-part-iii-2013', 0], ['uncle-vanya-2012', 0],
    ['sweeney-todd-2011', 27], ['blue-rabbit-2010', 0], ['spring-s-awakening-2009', 6],
    ['the-three-sisters-2008', 13], ['the-cherry-orchard-2008', 7], ['face-of-glass-2008', 6],
    ['grimm-tales-2007', 3]
  ];

  var bySlug = {};
  W.forEach(function (w, i) { w.no = pad(W.length - i); bySlug[w.slug] = w; });

  function pad(n) { return ('00' + n).slice(-3); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function el(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
  function workUrl(w) { return 'work.html?w=' + encodeURIComponent(w.slug); }
  function theatre(w) { return w.theatre || w.city || ''; }
  // Stage design is always Igor's, so it gets no row. His other roles on a work (video, costumes, ...) each get
  // their own row with his name. The rest are the other people's credits.
  function igorRoles(w) {
    var out = [];
    String(w.role || '').toLowerCase().split(/,|&| and /).forEach(function (t) {
      t = t.trim();
      var label = /stage/.test(t) ? null : /video anim/.test(t) ? 'Video animations' : /video/.test(t) ? 'Video' :
        /costume/.test(t) ? 'Costumes' : /graphic/.test(t) ? 'Graphic design' : /music/.test(t) ? 'Music' : /puppet/.test(t) ? 'Puppets' : null;
      if (label && !(label === 'Costumes' && w.costumes) && !out.some(function (o) { return o[0] === label; })) out.push([label, S.name]);
    });
    return out;
  }
  function credits(w) {
    return [['Text', w.author], ['Director', w.director], ['Choreography', w.choreography], ['Conductor', w.conductor],
      ['Costumes', w.costumes]].concat(igorRoles(w), [['Also', w.otherCredits]])
      .filter(function (c) { return c[1]; });
  }
  function dl(w) { return credits(w).map(function (c) { return '<dt>' + c[0] + '</dt><dd>' + esc(c[1]) + '</dd>'; }).join(''); }

  // ---- frame
  var nav = [['index', 'Featured', 'index.html'], ['archive', 'Archive', 'archive.html'], ['about', 'About', 'about.html']];
  // how the name in the header is set: five fonts to choose from (prototype switch, remembered per browser)
  var NAMES = [['1', 'Times'], ['2', 'Grotesk'], ['3', 'Garamond'], ['4', 'Condensed'], ['5', 'Mono']];
  var nameSaved = null; try { nameSaved = localStorage.getItem('iv-e2-name'); } catch (e) {}
  document.body.dataset.name = /^[1-5]$/.test(q.get('name')) ? q.get('name') : (/^[1-5]$/.test(nameSaved) ? nameSaved : '5');  // Mono by default (Ivan's pick)
  document.body.insertBefore(el('<header class="top"><a class="name" href="index.html">' + esc(S.name) + '</a><nav>' +
    nav.map(function (n) { return '<a href="' + n[2] + '"' + (n[0] === page ? ' aria-current="page"' : '') + '>[' + n[1] + ']</a>'; }).join('') +
    '</nav></header>'), document.body.firstChild);
  var main = document.createElement('main');
  document.body.insertBefore(main, document.querySelector('script'));
  document.body.insertBefore(el('<footer class="foot"><span>&copy; ' + esc(S.name) + ' ' + new Date().getFullYear() + '</span>' +
    '<span>Website by <a href="https://ivanvuksanov.com" target="_blank" rel="noopener">Ivan Vuksanov</a></span></footer>'), document.querySelector('script'));

  // ---- pages
  var panel = el('<div class="opts"></div>');
  document.body.appendChild(panel);
  if (page === 'index') home();
  if (page === 'archive') archive();
  if (page === 'work') work();
  if (page === 'about') about();

  function home() {
    main.appendChild(el('<h1 class="title">Featured projects</h1>'));
    var items = FEATURED.map(function (f) { var w = bySlug[f[0]]; return w && { w: w, img: w.images[f[1]] || w.images[0] }; }).filter(Boolean);
    var mode = q.get('home') === '1' ? '1' : '2';  // 2 Split is the default
    if (mode === '1') {
      var s = strip(items.map(function (it, i) {
        return { href: workUrl(it.w), img: it.img, cap: '<span class="no">' + pad(i + 1) + '</span><span class="t">' + esc(it.w.title) + '</span><span class="no">' + it.w.year + '</span>' };
      }), { auto: true });
      s.classList.add('home-strip');
      main.appendChild(s);
      main.appendChild(el('<div class="to-archive"><a class="box" href="archive.html">All ' + W.length + ' works &nbsp;&gt;</a></div>'));
    } else split(items);
    options('home', mode, [['1', 'Strip'], ['2', 'Split']]);
  }

  // Home 2, split: the selection as a list on the left, photos on the right (main photo, thumbnails under it,
  // Prev/Next). Hovering a title previews that work and steps through its photos; using the thumbnails or
  // Prev/Next stops the stepping. Clicking a title opens its row in place with the description and credits,
  // and the right side returns to that work whenever the mouse leaves the list. On a phone: photo + title per work; a tap opens the row.
  var STEP = 1800;
  function split(items) {
    var v = el('<section class="split"><ol class="sel"></ol><div class="view">' +
      '<div class="vbar"><span class="vcap"></span><span class="ctl"><button data-d="-1">&lt; Prev</button><button data-d="1">Next &gt;</button></span></div>' +
      '<div class="pic"><img alt=""><button class="hit l" aria-label="Previous photo"></button><button class="hit r" aria-label="Next photo"></button></div>' +
      '<div class="thumbs"></div></div></section>');
    var ol = v.querySelector('.sel'), im = v.querySelector('.pic img'), cap = v.querySelector('.vcap'), th = v.querySelector('.thumbs');
    items.forEach(function (it, i) {
      var w = it.w;
      ol.appendChild(el('<li data-i="' + i + '"><button class="head" aria-expanded="false"><img class="m" src="' + it.img.src + '" alt="" loading="lazy">' +
        '<span class="no">' + pad(i + 1) + '</span><span class="t">' + esc(w.title) + '</span><span class="meta">' + esc(theatre(w)) + ', ' + w.year + '</span></button>' +
        '<div class="row-body"><div class="in"><div class="desc">' +
        (w.description ? '<p>' + esc(w.description) + '</p>' : '') +
        '<dl class="credits">' + dl(w) + '</dl><a class="open-work" href="' + workUrl(w) + '">[Open work page]</a></div></div></div></li>'));
    });
    ol.appendChild(el('<li class="all"><a href="archive.html">All ' + W.length + ' works &nbsp;&gt;</a></li>'));

    var cur = -1, k = 0, timer = null;
    function show(i, photo) {
      var w = items[i].w;
      if (i !== cur) {
        cur = i;
        th.innerHTML = w.images.map(function (x, n) { return '<button data-k="' + n + '"><img src="' + (x.thumb || x.src) + '" alt=""></button>'; }).join('');
      }
      k = photo == null ? Math.max(0, w.images.indexOf(items[i].img)) : (photo + w.images.length) % w.images.length;
      im.src = w.images[k].src;
      cap.textContent = w.title + '  ' + pad(k + 1) + ' / ' + pad(w.images.length);
      th.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', +b.dataset.k === k); });
      var on = th.querySelector('.on'); if (on) th.scrollTo({ left: on.offsetLeft - th.clientWidth / 2 + on.offsetWidth / 2, behavior: 'smooth' });
      ol.querySelectorAll('li[data-i]').forEach(function (li) { li.classList.toggle('on', +li.dataset.i === i); });
    }
    function stop() { clearInterval(timer); timer = null; }
    function step(d) { stop(); show(cur, k + d); }
    function run() { stop(); timer = setInterval(function () { show(cur, k + 1); }, STEP); }

    ol.addEventListener('mouseover', function (e) {
      var li = e.target.closest('li[data-i]'); if (!li || +li.dataset.i === cur) return;
      show(+li.dataset.i); run();
    });
    // leaving the list: stop stepping; if a row is open, the right side returns to it, else it stays on the last hovered work
    ol.addEventListener('mouseleave', function () { stop(); var o = ol.querySelector('li.open'); if (o && +o.dataset.i !== cur) show(+o.dataset.i); });
    ol.addEventListener('click', function (e) {
      var b = e.target.closest('.head'); if (!b) return;
      var li = b.parentNode, open = !li.classList.contains('open');
      ol.querySelectorAll('li.open').forEach(function (o) { o.classList.remove('open'); o.querySelector('.head').setAttribute('aria-expanded', 'false'); });
      li.classList.toggle('open', open); b.setAttribute('aria-expanded', open);
      if (+li.dataset.i !== cur) show(+li.dataset.i);
      stop();
    });
    v.querySelectorAll('[data-d]').forEach(function (b) { b.addEventListener('click', function () { step(+b.dataset.d); }); });
    v.querySelector('.hit.l').addEventListener('click', function () { step(-1); });
    v.querySelector('.hit.r').addEventListener('click', function () { step(1); });
    th.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { stop(); show(cur, +b.dataset.k); } });
    document.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') step(-1); if (e.key === 'ArrowRight') step(1); });
    show(0);
    main.appendChild(v);
  }

  // A sideways row of large photos. The wheel moves it sideways until its end. With auto: it moves on its own
  // every AUTO ms; a thin line under the counter fills up until the next move, so you can see it is running.
  // Hovering the photos holds it; Pause stops it; any manual move restarts the wait.
  var AUTO = 4000;
  function strip(list, o) {
    var wrap = el('<section class="strip-wrap"><div class="strip-hint"><span class="count">001 / ' + pad(list.length) + '</span>' +
      '<span class="ctl">' + (o.auto ? '<button data-a="pause">Pause</button>' : '') + '<button data-d="-1">&lt; Prev</button><button data-d="1">Next &gt;</button></span></div>' +
      (o.auto ? '<div class="prog"><span></span></div>' : '') + '<div class="strip"></div></section>');
    var row = wrap.querySelector('.strip');
    list.forEach(function (it) {
      row.appendChild(el('<' + (it.href ? 'a href="' + it.href + '"' : 'div') + ' class="item"><img src="' + it.img.src + '" width="' + it.img.w + '" height="' + it.img.h + '" alt="">' +
        (it.cap ? '<span class="cap">' + it.cap + '</span>' : '') + '</' + (it.href ? 'a' : 'div') + '>'));
    });
    row.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) { waited = 0; return; }
      var max = row.scrollWidth - row.clientWidth;
      if ((e.deltaY > 0 && row.scrollLeft < max - 1) || (e.deltaY < 0 && row.scrollLeft > 0)) { e.preventDefault(); row.scrollLeft += e.deltaY; waited = 0; }
    }, { passive: false });
    var kids = [].slice.call(row.children), count = wrap.querySelector('.count');
    function padL() { return parseFloat(getComputedStyle(row).paddingLeft); }
    function current() {
      var x = row.scrollLeft, k = 0;
      kids.forEach(function (c, i) { if (c.offsetLeft - padL() <= x + 40) k = i; });
      if (row.scrollLeft >= row.scrollWidth - row.clientWidth - 2) k = kids.length - 1;
      return k;
    }
    function go(k) {
      k = (k + kids.length) % kids.length;
      row.scrollTo({ left: kids[k].offsetLeft - padL(), behavior: 'smooth' });
    }
    row.addEventListener('scroll', function () { count.textContent = pad(current() + 1) + ' / ' + pad(list.length); });
    wrap.querySelectorAll('[data-d]').forEach(function (b) {
      b.addEventListener('click', function () { waited = 0; go(current() + +b.dataset.d); });
    });
    var waited = 0;
    if (o.auto) {
      var bar = wrap.querySelector('.prog span'), paused = false, held = false, last = performance.now();
      var pb = wrap.querySelector('[data-a="pause"]');
      pb.addEventListener('click', function () { paused = !paused; pb.textContent = paused ? 'Play' : 'Pause'; wrap.classList.toggle('paused', paused); });
      row.addEventListener('mouseenter', function () { held = true; });
      row.addEventListener('mouseleave', function () { held = false; });
      row.addEventListener('touchstart', function () { waited = 0; }, { passive: true });
      if (q.get('still') !== '1') requestAnimationFrame(function tick(t) {
        if (!paused && !held && !document.hidden) waited += Math.min(t - last, 100);
        last = t;
        if (waited >= AUTO) { waited = 0; go(current() + 1); }
        bar.style.transform = 'scaleX(' + (waited / AUTO) + ')';
        requestAnimationFrame(tick);
      });
    }
    return wrap;
  }

  // Archive list, three looks (?list=1..3, remembered per browser):
  // 1 Objects: E1's list, close to Objects of Common Interest (boxed period labels, dashed rules, caps, +).
  // 2 Years: the year leads each row, titles in larger mixed-case serif, quiet hairlines, period as a big
  //   serif heading on the left; hovering a row shows one of its photos next to the cursor.
  // 3 Catalogue: each row carries a small photo, the title with director and theatre under it, year at the end.
  function archive() {
    var saved = null; try { saved = localStorage.getItem('iv-e2-list'); } catch (e) {}
    var mode = /^[1-3]$/.test(q.get('list')) ? q.get('list') : (/^[1-3]$/.test(saved) ? saved : '2');
    try { localStorage.setItem('iv-e2-list', mode); } catch (e) {}
    main.classList.add('list-' + mode);
    main.appendChild(el('<h1 class="title">Archive</h1>'));
    var groups = [['2014 – 2010', 2010, 2099], ['2009 – 2000', 2000, 2009], ['1999 – 1990', 0, 1999]];
    groups.forEach(function (g) {
      var ws = W.filter(function (w) { return w.year >= g[1] && w.year <= g[2]; });
      if (!ws.length) return;
      var label = mode === '1' ? '<span class="box">' + g[0] + '</span>' : '<h2 class="period">' + g[0] + '</h2>';
      var sec = el('<section class="group">' + label + '<div class="rows"></div></section>');
      var rows = sec.querySelector('.rows');
      ws.forEach(function (w) {
        var who = esc(w.director || w.author || ''), where = esc(theatre(w));
        var inner = mode === '1'
          ? '<span>' + w.no + '</span><span class="ti">' + esc(w.title) + '</span><span class="di">' + who + '</span><span class="th">' + where + '</span><span>' + w.year + '</span><span class="pm">+</span>'
          : mode === '2'
          ? '<span class="yr">' + w.year + '</span><span class="ti">' + esc(w.title) + '</span><span class="meta">' + [who, where].filter(Boolean).join(' · ') + '</span><span class="pm">+</span>'
          : '<span class="cv"><img src="' + cover(w).thumb + '" alt="" loading="lazy"></span><span class="tx"><span class="ti">' + esc(w.title) + '</span><span class="meta">' + [who, where].filter(Boolean).join(' · ') + '</span></span><span class="yr">' + w.year + '</span><span class="pm">+</span>';
        var r = el('<div class="row" id="' + w.slug + '"><button class="row-main" aria-expanded="false">' + inner + '</button><div class="row-body"><div class="in"></div></div></div>');
        r.querySelector('.row-main').addEventListener('click', function () { toggle(r, w); });
        rows.appendChild(r);
      });
      main.appendChild(sec);
    });
    if (mode === '2' && matchMedia('(hover: hover)').matches) peek();
    options('list', mode, [['1', 'Objects'], ['2', 'Years'], ['3', 'Catalogue']]);
    var lb = el('<div class="lb"><img alt=""><span class="lb-cap"></span></div>');
    document.body.appendChild(lb);
    lb.addEventListener('click', function () { lb.classList.remove('on'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') lb.classList.remove('on'); });
    main.addEventListener('click', function (e) {
      var im = e.target.closest('.photos img'); if (!im) return;
      lb.querySelector('img').src = im.src; lb.querySelector('.lb-cap').textContent = im.alt; lb.classList.add('on');
    });
    if (location.hash && document.getElementById(location.hash.slice(1))) {
      var r0 = document.getElementById(location.hash.slice(1)); toggle(r0, bySlug[r0.id]);
      // wait for the web font and the opening animation, so the row lands right under the header
      setTimeout(function () { window.scrollTo(0, r0.getBoundingClientRect().top + scrollY - document.querySelector('.top').offsetHeight - 8); }, 600);
    }
  }

  function cover(w) { return w.images.filter(function (i) { return i.w > i.h * 1.2; })[0] || w.images[0]; }

  // list 2: a closed row shows one of its photos beside the cursor while hovered
  function peek() {
    var p = el('<img class="peek" alt="">'); document.body.appendChild(p);
    main.addEventListener('mousemove', function (e) {
      var rm = e.target.closest('.row-main'), r = rm && rm.parentNode;
      if (!rm || r.classList.contains('open')) { p.classList.remove('on'); return; }
      var src = cover(bySlug[r.id]).src;
      if (p.getAttribute('src') !== src) p.src = src;
      // in the left margin, level with the row
      var b = rm.getBoundingClientRect();
      p.style.left = '20px';
      p.style.top = (b.top + b.height / 2 - 66) + 'px';
      p.classList.add('on');
    });
    main.addEventListener('mouseleave', function () { p.classList.remove('on'); });
  }

  // one row open at a time; photos load only when a row opens
  function toggle(r, w) {
    var open = !r.classList.contains('open');
    document.querySelectorAll('.row.open').forEach(function (o) { if (o !== r) setOpen(o, false); });
    if (open && !r.dataset.filled) {
      r.querySelector('.in').innerHTML = '<div class="row-in"><div class="photos">' +
        w.images.map(function (im, i) { return '<img src="' + im.src + '" width="' + im.w + '" height="' + im.h + '" alt="' + esc(w.title) + ', ' + (i + 1) + ' / ' + w.images.length + '">'; }).join('') +
        '</div><dl class="credits">' + dl(w) + '<a class="open-work" href="' + workUrl(w) + '">[Open work page]</a></dl></div>';
      r.dataset.filled = '1';
    }
    setOpen(r, open);
    history.replaceState(null, '', open ? '#' + w.slug : location.pathname + location.search);
  }
  function setOpen(r, on) {
    r.classList.toggle('open', on);
    r.querySelector('.row-main').setAttribute('aria-expanded', on);
    r.querySelector('.pm').textContent = on ? '–' : '+';
  }

  // Work page, four layouts to choose from (?work=1..4):
  // 1 Slideshow: one large photo at a time, small photos underneath to jump; credits in a column on the left.
  // 2 Side by side: title and credits stay put on the left while the photos scroll on the right.
  // 3 Strip: the home page's sideways row, with this work's photos; credits underneath.
  // 4 Editorial: photos in a changing rhythm (one wide, then a pair), credits after the first photo.
  function work() {
    var w = bySlug[q.get('w')] || W[0];
    var saved = null; try { saved = localStorage.getItem('iv-e2-work'); } catch (e) {}
    var mode = /^[1-4]$/.test(q.get('work')) ? q.get('work') : (/^[1-4]$/.test(saved) ? saved : '1');
    try { localStorage.setItem('iv-e2-work', mode); } catch (e) {}
    var i = W.indexOf(w), prev = W[i - 1], next = W[i + 1];
    document.title = w.title + ' · ' + S.name;
    var head = '<h1 class="w-title">' + esc(w.title) + '</h1><p class="w-sub">' + esc(theatre(w)) + (theatre(w) ? ', ' : '') + w.year + '</p>';
    var creds = '<dl class="w-dl">' + dl(w) + '</dl>';
    var imgs = w.images;
    function img(im, cls) { return '<img src="' + im.src + '" width="' + im.w + '" height="' + im.h + '" alt="' + esc(w.title) + '"' + (cls ? ' class="' + cls + '"' : '') + ' loading="lazy">'; }

    if (mode === '1') {
      var v = el('<section class="w1"><aside>' + head + creds + '</aside><div class="stage"><div class="big"><img alt=""><button class="hit l" aria-label="Previous photo"></button><button class="hit r" aria-label="Next photo"></button></div>' +
        '<div class="w1-bar"><span class="count"></span></div><div class="thumbs">' +
        imgs.map(function (im, k) { return '<button data-k="' + k + '"><img src="' + (im.thumb || im.src) + '" alt=""></button>'; }).join('') + '</div></div></section>');
      var big = v.querySelector('.big img'), cnt = v.querySelector('.count'), cur = 0;
      function show(k) {
        cur = (k + imgs.length) % imgs.length;
        big.src = imgs[cur].src; cnt.textContent = pad(cur + 1) + ' / ' + pad(imgs.length);
        v.querySelectorAll('.thumbs button').forEach(function (b) { b.classList.toggle('on', +b.dataset.k === cur); });
      }
      v.querySelector('.hit.l').addEventListener('click', function () { show(cur - 1); });
      v.querySelector('.hit.r').addEventListener('click', function () { show(cur + 1); });
      v.querySelectorAll('.thumbs button').forEach(function (b) { b.addEventListener('click', function () { show(+b.dataset.k); }); });
      document.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') show(cur - 1); if (e.key === 'ArrowRight') show(cur + 1); });
      show(0);
      main.appendChild(v);
    }
    if (mode === '2') {
      main.appendChild(el('<section class="w2"><aside>' + head + creds + '</aside><div class="ph">' + imgs.map(function (im) { return img(im, im.h > im.w ? 'tall' : ''); }).join('') + '</div></section>'));
    }
    if (mode === '3') {
      main.appendChild(el('<div class="w3-head">' + head + '</div>'));
      main.appendChild(strip(imgs.map(function (im) { return { img: im }; }), { auto: false }));
      main.appendChild(el('<div class="w3-credits">' + creds + '</div>'));
    }
    if (mode === '4') {
      // rhythm: wide, pair, wide, pair... ; tall photos always go in pairs
      var html = '<section class="w4"><div class="w4-head">' + head + '</div>', k = 0, n = 0;
      while (k < imgs.length) {
        var a = imgs[k], b = imgs[k + 1];
        var wide = n % 2 === 0 && a.w > a.h;
        if (wide || !b) { html += '<div class="one">' + img(a) + '</div>'; k += 1; }
        else { html += '<div class="two">' + img(a) + img(b) + '</div>'; k += 2; }
        if (n === 0) html += '<div class="w4-credits">' + creds + '</div>';
        n++;
      }
      main.appendChild(el(html + '</section>'));
    }
    main.appendChild(el('<nav class="w-nav"><span>' + (prev ? '<a href="' + workUrl(prev) + '">&lt; ' + esc(prev.title) + '</a>' : '') + '</span>' +
      '<span>' + (next ? '<a href="' + workUrl(next) + '">' + esc(next.title) + ' &gt;</a>' : '') + '</span></nav>'));
    options('work', mode, [['1', 'Slideshow'], ['2', 'Side by side'], ['3', 'Strip'], ['4', 'Editorial']], 'w=' + encodeURIComponent(w.slug) + '&');
  }

  function about() {
    main.appendChild(el('<h1 class="title">About</h1>'));
    var a = el('<section class="about"><div class="bio">' + S.bio.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div>' +
      '<div class="cols"><div><h2>Awards</h2>' + S.awards.map(function (x) { return '<p>' + esc(x) + '</p>'; }).join('') + '</div>' +
      '<blockquote><h2>Press</h2>' + esc(S.quote.text) + '<cite>' + esc(S.quote.source) + '</cite></blockquote>' +
      '<div><h2>Contact</h2><p><a href="mailto:' + esc(S.email) + '">' + esc(S.email) + '</a></p></div></div></section>');
    main.appendChild(a);
  }

  // prototype-only switch between options, bottom left
  // prototype switches, bottom left: one row per choice. The name row is on every page and switches in place.
  function options(key, cur, list, keep) {
    var o = el('<div class="opt-row"><span>Option:</span></div>');
    list.forEach(function (x) { o.appendChild(el('<a href="?' + (keep || '') + key + '=' + x[0] + '"' + (x[0] === cur ? ' aria-current="true"' : '') + '>' + x[1] + '</a>')); });
    panel.insertBefore(o, panel.firstChild);
  }
  var nr = el('<div class="opt-row"><span>Name:</span></div>');
  NAMES.forEach(function (x) {
    var b = el('<button data-n="' + x[0] + '"' + (x[0] === document.body.dataset.name ? ' aria-current="true"' : '') + '>' + x[1] + '</button>');
    b.addEventListener('click', function () {
      document.body.dataset.name = x[0];
      try { localStorage.setItem('iv-e2-name', x[0]); } catch (e) {}
      nr.querySelectorAll('button').forEach(function (o) { o.toggleAttribute('aria-current', o === b); });
    });
    nr.appendChild(b);
  });
  panel.appendChild(nr);
})();

// E5, works. E3 with one period bar at the top of the list: it stays stuck under the header and names the period
// in view (2014 – 2010, ...), with back / next arrows to jump between periods. The works run under each other with no
// period headings in between; the bar's label changes as you scroll or use the arrows. A test variation of E3.
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
  var nav = [['index', 'Works', 'index.html'], ['about', 'About', 'about.html']];
  // how the name in the header is set: five fonts to choose from (prototype switch, remembered per browser)
  var NAMES = [['1', 'Times'], ['2', 'Grotesk'], ['3', 'Garamond'], ['4', 'Condensed'], ['5', 'Mono']];
  var nameSaved = null; try { nameSaved = localStorage.getItem('iv-e5-name'); } catch (e) {}
  document.body.dataset.name = /^[1-5]$/.test(q.get('name')) ? q.get('name') : (/^[1-5]$/.test(nameSaved) ? nameSaved : '5');
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
  if (page === 'work') work();
  if (page === 'about') about();

  // the photo a work shows first: its FEATURED pick if it has one, else its first wide photo
  function lead(w) {
    var f = FEATURED.filter(function (x) { return x[0] === w.slug; })[0];
    return (f && w.images[f[1]]) || cover(w);
  }

  function home() {
    main.appendChild(el('<h1 class="title works-title">Works</h1>'));
    split(W.map(function (w) { return { w: w, img: lead(w) }; }));
  }

  // Hovering a work previews it on the right and steps through its photos; the thumbnails, Prev/Next, the photo's
  // left/right half or the arrow keys step by hand (and stop the stepping). Leaving the list returns the right side
  // to the open work, if any. On a phone: photo + title per work; a tap opens the row.
  // (inside the function: the page is drawn before later var lines run)
  function period(y) { return y >= 2010 ? '2014 – 2010' : y >= 2000 ? '2009 – 2000' : '1999 – 1990'; }
  function split(items) {
    var v = el('<section class="split"><ol class="sel"></ol><div class="view">' +
      '<div class="vbar"><span class="vcap"></span><span class="ctl"><button data-d="-1">&lt; Prev</button><button data-d="1">Next &gt;</button></span></div>' +
      '<div class="pic"><img alt=""><button class="hit l" aria-label="Previous photo"></button><button class="hit r" aria-label="Next photo"></button></div>' +
      '<div class="thumbs"></div></div></section>');
    var ol = v.querySelector('.sel'), im = v.querySelector('.pic img'), cap = v.querySelector('.vcap'), th = v.querySelector('.thumbs');
    var last = null;
    items.forEach(function (it, i) {
      var w = it.w, p = period(w.year);
      if (p !== last) { ol.appendChild(el('<li class="period" id="p-' + p.slice(0, 4) + '"><span>' + p + '</span></li>')); last = p; }
      ol.appendChild(el('<li data-i="' + i + '" data-p="' + p + '" id="' + w.slug + '"><button class="head" aria-expanded="false"><img class="m" src="' + it.img.src + '" alt="" loading="lazy">' +
        '<span class="yr">' + w.year + '</span><span class="t">' + esc(w.title) + '</span><span class="meta">' + esc(theatre(w)) + '</span></button>' +
        '<div class="row-body"><div class="in"><div class="desc">' +
        (w.description ? '<p>' + esc(w.description) + '</p>' : '') +
        '<dl class="credits">' + dl(w) + '</dl><a class="open-work" href="' + workUrl(w) + '">[Open work page]</a></div></div></div></li>'));
    });

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
    function run() { stop(); timer = setInterval(function () { show(cur, k + 1); }, 1800); }
    function open(li, on) {
      ol.querySelectorAll('li.open').forEach(function (o) { o.classList.remove('open'); o.querySelector('.head').setAttribute('aria-expanded', 'false'); });
      li.classList.toggle('open', on); li.querySelector('.head').setAttribute('aria-expanded', on);
      history.replaceState(null, '', on ? '#' + li.id : location.pathname + location.search);
    }

    ol.addEventListener('mouseover', function (e) {
      var li = e.target.closest('li[data-i]'); if (!li || +li.dataset.i === cur) return;
      show(+li.dataset.i); run();
    });
    ol.addEventListener('mouseleave', function () { stop(); var o = ol.querySelector('li.open'); if (o && +o.dataset.i !== cur) show(+o.dataset.i); });
    ol.addEventListener('click', function (e) {
      var b = e.target.closest('.head'); if (!b) return;
      var li = b.parentNode;
      open(li, !li.classList.contains('open'));
      if (+li.dataset.i !== cur) show(+li.dataset.i);
      stop();
    });
    v.querySelectorAll('[data-d]').forEach(function (b) { b.addEventListener('click', function () { step(+b.dataset.d); }); });
    v.querySelector('.hit.l').addEventListener('click', function () { step(-1); });
    v.querySelector('.hit.r').addEventListener('click', function () { step(1); });
    th.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { stop(); show(cur, +b.dataset.k); } });
    document.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') step(-1); if (e.key === 'ArrowRight') step(1); });
    main.appendChild(v);
    years(ol);
    stickyPeriods(ol);
    // index.html#<slug> opens that work
    var h = location.hash && document.getElementById(location.hash.slice(1));
    if (h && h.dataset.i) {
      open(h, true); show(+h.dataset.i);
      setTimeout(function () { window.scrollTo(0, h.getBoundingClientRect().top + scrollY - document.querySelector('.top').offsetHeight - 8); }, 600);
    } else {
      // open on the first featured work (Beautiful Day, the newest, only has model boards)
      var first = 0; items.forEach(function (it, i) { if (it.w.slug === FEATURED[0][0]) first = i; });
      show(first);
    }
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

  function cover(w) { return w.images.filter(function (i) { return i.w > i.h * 1.2; })[0] || w.images[0]; }

  // Phone only (CSS): the periods as a row in the fixed header, to jump between them; the one in view is marked.
  function years(ol) {
    var top = document.querySelector('.top'), ps = [].slice.call(ol.querySelectorAll('.period'));
    var bar = el('<nav class="years"></nav>');
    ps.forEach(function (p) {
      var a = el('<a href="#' + p.id + '">' + p.firstChild.textContent.replace(' – ', '–') + '</a>');
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var pb = document.querySelector('.pbar'), th = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--title-h')) || 0; window.scrollTo({ top: p.getBoundingClientRect().top + scrollY - top.offsetHeight - th - (pb ? pb.offsetHeight : 0) - 4, behavior: 'smooth' });
      });
      bar.appendChild(a);
    });
    top.appendChild(bar);
    function mark() {
      var line = top.offsetHeight + 40, k = 0;
      ps.forEach(function (p, i) { if (p.getBoundingClientRect().top <= line) k = i; });
      bar.querySelectorAll('a').forEach(function (a, i) { a.toggleAttribute('aria-current', i === k); });
    }
    addEventListener('scroll', mark, { passive: true }); mark();
  }

  // One bar, stuck under the header (CSS sticky; --top-h = header height, kept in sync here). It names the period of the
  // work row just under it; the arrows jump to the first work of the previous / next period (off at the ends).
  function stickyPeriods(ol) {
    var top = document.querySelector('.top'), rows = [].slice.call(ol.querySelectorAll('li[data-i]'));
    var names = rows.map(function (r) { return r.dataset.p; }).filter(function (p, i, a) { return a.indexOf(p) === i; });
    var bar = el('<li class="pbar"><span class="lbl"></span><span class="go">' +
      '<button data-go="-1" aria-label="Previous period">&uarr;</button><button data-go="1" aria-label="Next period">&darr;</button></span></li>');
    ol.insertBefore(bar, ol.firstChild);
    var lbl = bar.querySelector('.lbl'), back = bar.querySelector('[data-go="-1"]'), next = bar.querySelector('[data-go="1"]'), cur = 0;
    function sync() { document.documentElement.style.setProperty('--top-h', top.offsetHeight + 'px'); }
    // "Works" shrinks once the page scrolls and stays stuck above the bar (its small height: --title-h in CSS)
    var title = document.querySelector('.works-title');
    function titleH() { return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--title-h')) || 0; }
    function shrink() { title.classList.toggle('small', scrollY > 24); }
    addEventListener('scroll', shrink, { passive: true }); shrink();
    function mark() {
      var line = bar.getBoundingClientRect().bottom + 12, k = 0;
      rows.forEach(function (r) { if (r.getBoundingClientRect().top <= line) k = names.indexOf(r.dataset.p); });
      cur = k; lbl.textContent = names[k]; back.disabled = k === 0; next.disabled = k === names.length - 1;
    }
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-go]'); if (!b) return;
      var p = names[cur + +b.dataset.go]; if (!p) return;
      var first = rows.filter(function (r) { return r.dataset.p === p; })[0];
      var to = cur + +b.dataset.go === 0 ? 0 : first.getBoundingClientRect().top + scrollY - top.offsetHeight - titleH() - bar.offsetHeight;
      window.scrollTo({ top: to, behavior: 'smooth' });
    });
    sync(); addEventListener('resize', sync);
    addEventListener('scroll', mark, { passive: true }); mark();
  }

  // Work page, four layouts to choose from (?work=1..4):
  // 1 Slideshow: one large photo at a time, small photos underneath to jump; credits in a column on the left.
  // 2 Side by side: title and credits stay put on the left while the photos scroll on the right.
  // 3 Strip: the home page's sideways row, with this work's photos; credits underneath.
  // 4 Editorial: photos in a changing rhythm (one wide, then a pair), credits after the first photo.
  function work() {
    var w = bySlug[q.get('w')] || W[0];
    var saved = null; try { saved = localStorage.getItem('iv-e5-work'); } catch (e) {}
    var mode = /^[1-4]$/.test(q.get('work')) ? q.get('work') : (/^[1-4]$/.test(saved) ? saved : '1');
    try { localStorage.setItem('iv-e5-work', mode); } catch (e) {}
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
      try { localStorage.setItem('iv-e5-name', x[0]); } catch (e) {}
      nr.querySelectorAll('button').forEach(function (o) { o.toggleAttribute('aria-current', o === b); });
    });
    nr.appendChild(b);
  });
  panel.appendChild(nr);
})();

// PROTOTYPE: small fixed link back to the hub (prototypes/index.html), added to every page of every version.
// Shows which version you're on (e.g. "B2"). A vertical tab on the right edge, mid-height (the left edge holds B's running order;
// the phone's bottom corners hold controls). On phones it's a smaller arrow-only tab.
(function () {
  var m = location.pathname.match(/direction-([a-z])(\d?)-/);
  var ver = m ? m[1].toUpperCase() + (m[2] || '1') : '';
  var narrow = window.matchMedia('(max-width: 700px)').matches;
  var a = document.createElement('a');
  a.href = '../index.html';
  a.title = 'Overview';
  a.textContent = narrow ? '←' : '← Overview';
  var base = [
    'position:fixed', 'z-index:2147483647', 'background:#111', 'color:#fff',
    'font:600 11px/1 -apple-system,Helvetica,Arial,sans-serif', 'letter-spacing:.06em',
    'text-decoration:none', 'border:1px solid #fff'
  ];
  var place = narrow
    ? ['top:50%', 'right:0', 'transform:translateY(-50%)', 'width:26px', 'height:44px', 'display:flex', 'align-items:center', 'justify-content:center', 'font-size:16px', 'border-right:0']
    : ['top:50%', 'right:0', 'transform:translateY(-50%) rotate(180deg)', 'writing-mode:vertical-rl', 'padding:12px 5px', 'border-right:0'];
  a.setAttribute('style', base.concat(place).join(';'));
  document.body.appendChild(a);
})();

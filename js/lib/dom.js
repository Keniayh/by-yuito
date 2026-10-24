/* Utilidades de DOM seguras: todo texto del catálogo entra por textContent. */
window.Yuito = window.Yuito || {};
(function (Y) {
  function el(tag, props, kids) {
    var n = document.createElement(tag);
    if (props) Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'style') n.setAttribute('style', v);
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  // Solo rutas relativas del sitio o https: (evita javascript:, data:, etc.).
  function safeUrl(u) {
    if (typeof u !== 'string') return '';
    if (/^https:\/\//i.test(u)) return u;
    if (/^[a-z0-9_\-./%]+$/i.test(u) && u.indexOf('..') < 0 && u.charAt(0) !== '/') return u;
    return '';
  }
  function hex(c) { return typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c) ? c : ''; }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); return n; }
  function price(cop) {
    if (cop === null || cop === undefined) return 'Consultar precio';
    return '$ ' + Number(cop).toLocaleString('es-CO');
  }
  function svgUse(id, cls) {
    var ns = 'http://www.w3.org/2000/svg', s = document.createElementNS(ns, 'svg'), u = document.createElementNS(ns, 'use');
    s.setAttribute('aria-hidden', 'true'); if (cls) s.setAttribute('class', cls);
    u.setAttribute('href', '#' + id); s.appendChild(u); return s;
  }
  Y.dom = { svgUse: svgUse, el: el, safeUrl: safeUrl, hex: hex, clear: clear, price: price };
})(window.Yuito);

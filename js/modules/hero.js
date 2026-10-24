/* Lista de piezas en la portada: al señalar una, el sello del logo toma su color. */
window.Yuito = window.Yuito || {};
(function (Y) {
  Y.hero = {
    render: function (products) {
      var wrap = document.getElementById('roll'), list = document.getElementById('roll-list');
      Y.dom.clear(list);
      var show = products.filter(function (p) { return p.kind === 'pieza'; }).slice(0, 8);
      wrap.hidden = !show.length;
      show.forEach(function (p) {
        var c = Y.dom.hex(p.tile_color);
        var a = Y.dom.el('a', { href: '#p-' + p.slug, text: p.name });
        if (c) {
          a.style.setProperty('--dot', c);
          ['pointerenter', 'focus'].forEach(function (ev) { a.addEventListener(ev, function () { Y.palette.hold(c); }); });
          ['pointerleave', 'blur'].forEach(function (ev) { a.addEventListener(ev, function () { Y.palette.hold(null); }); });
        }
        list.appendChild(Y.dom.el('li', null, [a]));
      });
    }
  };
})(window.Yuito);

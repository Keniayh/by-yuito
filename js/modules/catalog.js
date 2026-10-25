/* Vista del catálogo: carga, filtros por categoría, tarjetas ("láminas") y estados. */
window.Yuito = window.Yuito || {};
(function (Y) {
  var el = Y.dom.el, grid, state, chips, pager, products = [], active = 'todo', page = 1;
  var PER_PAGE = 9;   // productos por página (3 filas de 3 en computador)
  // Colores de respaldo (cuando la pieza no tiene color propio) e íconos de categoría.
  var PASTEL = ['#d9cffa', '#bfeedb', '#fbe9a8', '#cfe0f5', '#f5c9d6', '#e6d2c2'];
  var ICON = { bolsos: '👜', amigurumis: '🧸', otros: '🧶' };

  function message(p) { return p.whatsapp_message || ('Hola, quisiera información sobre ' + p.name + '.'); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function plate(p) {
    var cls = 'plate' + (p.kind === 'servicio' ? ' ball' : '');
    var kids = [];
    if (p.kind === 'servicio') {
      kids.push(Y.dom.svgUse('ballsym', 'ballsvg'));
    } else if (p.images.length) {
      var img = el('img', { src: p.images[0].url, alt: p.images[0].alt || p.name, loading: 'lazy', decoding: 'async', class: p.image_mode === 'foto' ? 'cover' : 'cut' });
      kids.push(img);
    } else {
      kids.push(el('span', { class: 'noimg', text: 'Fotografía próximamente' }));
    }
    var box = el('div', { class: cls }, kids);
    if (p.availability === 'agotado') box.appendChild(el('span', { class: 'tag out', text: 'Agotado' }));
    else if (p.featured) box.appendChild(el('span', { class: 'tag', text: 'Destacado' }));
    return box;
  }

  function thumbs(p, box) {
    if (p.images.length < 2 || p.kind === 'servicio') return null;
    var row = el('div', { class: 'thumbs', role: 'group', 'aria-label': 'Fotografías de ' + p.name });
    p.images.forEach(function (im, i) {
      var b = el('button', { type: 'button', 'aria-label': 'Ver fotografía ' + (i + 1), 'aria-pressed': i === 0 ? 'true' : 'false',
        onclick: function () {
          var main = box.querySelector('img'); main.src = im.url; main.alt = im.alt || p.name;
          Array.prototype.forEach.call(row.children, function (c, j) { c.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
        } }, [el('img', { src: im.url, alt: '', loading: 'lazy' })]);
      row.appendChild(b);
    });
    return row;
  }

  function card(p, i) {
    var box = plate(p), th = thumbs(p, box);
    var out = p.availability === 'agotado';
    var cta = el('a', { class: 'btn sm wa', href: Y.links.whatsapp(message(p)), target: '_blank', rel: 'noopener',
      text: out ? 'Consultar por encargo' : (p.cta_label || 'Consultar disponibilidad') });
    var color = Y.dom.hex(p.tile_color) || PASTEL[i % PASTEL.length];
    return el('article', { class: 'piece' + (p.kind === 'servicio' ? ' service' : '') + (out ? ' is-out' : ''), id: 'p-' + p.slug, 'data-cat': p.category ? p.category.slug : '', style: '--tile:' + color }, [
      box, th,
      el('p', { class: 'meta', text: 'N.º ' + pad(i + 1) + (p.kind === 'servicio' ? ' · Por encargo' : (p.category ? ' · ' + p.category.name : '')) }),
      el('h3', { text: p.name }),
      el('p', { class: 'desc', text: p.description }),
      el('p', { class: 'price' + (p.price_cop === null ? ' ask' : ''), text: Y.dom.price(p.price_cop) }),
      cta
    ]);
  }

  // Números visibles: primera, última, la actual y sus vecinas; el resto se resume con «…».
  function pageNumbers(cur, total) {
    var out = [], last = 0;
    for (var n = 1; n <= total; n++) {
      if (n === 1 || n === total || Math.abs(n - cur) <= 1) { if (last && n - last > 1) out.push('…'); out.push(n); last = n; }
    }
    return out;
  }

  function goTo(n, scroll) {
    page = n; renderGrid();
    if (scroll) document.getElementById('catalogo').scrollIntoView({ behavior: Y.env.reducedMotion ? 'auto' : 'smooth' });
  }

  function renderPager(total) {
    Y.dom.clear(pager); pager.hidden = total < 2;
    if (total < 2) return;
    pager.appendChild(el('button', { type: 'button', class: 'pg nav', disabled: page === 1, 'aria-label': 'Página anterior', onclick: function () { goTo(page - 1, true); } }, [el('span', { 'aria-hidden': 'true', text: '‹' }), el('span', { class: 'lbl', text: ' Anterior' })]));
    pageNumbers(page, total).forEach(function (n) {
      if (n === '…') { pager.appendChild(el('span', { class: 'pg gap', 'aria-hidden': 'true', text: '…' })); return; }
      pager.appendChild(el('button', { type: 'button', class: 'pg', text: String(n), 'aria-label': 'Página ' + n, 'aria-current': n === page ? 'page' : null, onclick: function () { goTo(n, true); } }));
    });
    pager.appendChild(el('button', { type: 'button', class: 'pg nav', disabled: page === total, 'aria-label': 'Página siguiente', onclick: function () { goTo(page + 1, true); } }, [el('span', { class: 'lbl', text: 'Siguiente ' }), el('span', { 'aria-hidden': 'true', text: '›' })]));
  }

  function renderGrid() {
    Y.dom.clear(grid);
    var list = products.map(function (p, i) { return { p: p, i: i }; })
      .filter(function (x) { return active === 'todo' || (x.p.category && x.p.category.slug === active); });
    var total = Math.max(1, Math.ceil(list.length / PER_PAGE));
    if (page > total) page = total;
    list.slice((page - 1) * PER_PAGE, page * PER_PAGE).forEach(function (x) { grid.appendChild(card(x.p, x.i)); });
    renderPager(Math.ceil(list.length / PER_PAGE));
    Y.tilt.bind(grid.querySelectorAll('.piece'));
    state.hidden = list.length > 0;
    if (!list.length) state.textContent = products.length ? 'No hay piezas en esta categoría por ahora.' : 'Por ahora no hay piezas publicadas. Escríbanos por WhatsApp y le contamos qué podemos tejer para usted.';
  }

  function choose(slug) {
    active = slug; page = 1;
    Array.prototype.forEach.call(chips.children, function (b) { b.setAttribute('aria-pressed', b.dataset.slug === slug ? 'true' : 'false'); });
    renderGrid();
  }

  function renderCategories(cats) {
    var sec = document.getElementById('categorias'), box = document.getElementById('cat-grid');
    Y.dom.clear(box); sec.hidden = !cats.length;
    cats.forEach(function (c, i) {
      var b = el('button', { type: 'button', class: 'card cat', style: '--tile:' + PASTEL[i % PASTEL.length], 'aria-label': 'Ver ' + c.name + ' en el catálogo',
        onclick: function () { choose(c.slug); document.getElementById('catalogo').scrollIntoView({ behavior: Y.env.reducedMotion ? 'auto' : 'smooth' }); } }, [
        el('span', { class: 'ico', 'aria-hidden': 'true', text: ICON[c.slug] || '🧶' }),
        el('span', { class: 'cat-name', text: c.name }),
        c.description ? el('span', { class: 'cat-desc', text: c.description }) : null]);
      box.appendChild(b);
    });
    Y.tilt.bind(box.querySelectorAll('.card'));
  }

  function renderChips(cats) {
    Y.dom.clear(chips);
    if (cats.length < 2) { chips.hidden = true; return; }
    chips.hidden = false;
    [{ slug: 'todo', name: 'Todo' }].concat(cats).forEach(function (c) {
      chips.appendChild(el('button', { type: 'button', class: 'chip', 'data-slug': c.slug, 'aria-pressed': c.slug === active ? 'true' : 'false', text: c.name,
        onclick: function () { choose(c.slug); } }));
    });
  }

  function showError() {
    state.hidden = false; Y.dom.clear(state);
    state.appendChild(document.createTextNode('No pudimos cargar el catálogo. '));
    state.appendChild(el('button', { type: 'button', class: 'linkbtn', text: 'Intentar de nuevo', onclick: load }));
  }

  function load() {
    state.hidden = false; state.textContent = 'Cargando catálogo…';
    return Y.catalogService.load().then(function (data) {
      products = data.products; Y.catalog.products = products;
      var cats = Y.catalogService.categoriesOf(products, data.order);
      renderChips(cats); renderCategories(cats);
      renderGrid();
      if (Y.hero) Y.hero.render(products);
      if (Y.order) Y.order.fill(products);
      if (data.source === 'cache') { state.hidden = false; state.textContent = 'Sin conexión con el servidor: se muestra la última copia guardada en este dispositivo.'; }
    }, showError).catch(showError);
  }

  // Muestra la página que contiene la pieza (lo usan los enlaces de la portada).
  function reveal(slug) {
    active = 'todo';
    Array.prototype.forEach.call(chips.children, function (b) { b.setAttribute('aria-pressed', b.dataset.slug === 'todo' ? 'true' : 'false'); });
    var i = -1; products.forEach(function (p, k) { if (p.slug === slug) i = k; });
    if (i >= 0) { page = Math.floor(i / PER_PAGE) + 1; renderGrid(); }
  }

  Y.catalog = {
    reveal: reveal,
    products: [],
    init: function () {
      grid = document.getElementById('sheet'); state = document.getElementById('state'); chips = document.getElementById('chips'); pager = document.getElementById('pager');
      return load();
    },
    message: message
  };
})(window.Yuito);

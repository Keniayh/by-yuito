/* Vista del catálogo: carga, filtros por categoría, tarjetas ("láminas") y estados. */
window.Yuito = window.Yuito || {};
(function (Y) {
  var el = Y.dom.el, grid, state, chips, products = [], active = 'todo';

  function message(p) { return p.whatsapp_message || ('Hola, quisiera información sobre ' + p.name + '.'); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function plate(p) {
    var color = Y.dom.hex(p.tile_color);
    var cls = 'plate' + (p.kind === 'servicio' ? ' ball' : '');
    var style = color ? '--tile:' + color : null;
    var kids = [];
    if (p.kind === 'servicio') {
      kids.push(Y.dom.svgUse('ballsym', 'ballsvg'));
    } else if (p.images.length) {
      var img = el('img', { src: p.images[0].url, alt: p.images[0].alt || p.name, loading: 'lazy', decoding: 'async', class: p.image_mode === 'foto' ? 'cover' : 'cut' });
      kids.push(img);
    } else {
      kids.push(el('span', { class: 'noimg', text: 'Fotografía próximamente' }));
    }
    var box = el('div', { class: cls, style: style }, kids);
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
    return el('article', { class: 'piece' + (p.kind === 'servicio' ? ' service' : '') + (out ? ' is-out' : ''), id: 'p-' + p.slug, 'data-cat': p.category ? p.category.slug : '' }, [
      box, th,
      el('p', { class: 'meta', text: 'N.º ' + pad(i + 1) + (p.kind === 'servicio' ? ' · Por encargo' : (p.category ? ' · ' + p.category.name : '')) }),
      el('h3', { text: p.name }),
      el('p', { class: 'desc', text: p.description }),
      el('p', { class: 'price' + (p.price_cop === null ? ' ask' : ''), text: Y.dom.price(p.price_cop) }),
      cta
    ]);
  }

  function renderGrid() {
    Y.dom.clear(grid);
    var list = products.map(function (p, i) { return { p: p, i: i }; })
      .filter(function (x) { return active === 'todo' || (x.p.category && x.p.category.slug === active); });
    list.forEach(function (x) { grid.appendChild(card(x.p, x.i)); });
    state.hidden = list.length > 0;
    if (!list.length) state.textContent = products.length ? 'No hay piezas en esta categoría por ahora.' : 'Por ahora no hay piezas publicadas. Escríbanos por WhatsApp y le contamos qué podemos tejer para usted.';
  }

  function renderChips(cats) {
    Y.dom.clear(chips);
    if (cats.length < 2) { chips.hidden = true; return; }
    chips.hidden = false;
    [{ slug: 'todo', name: 'Todo' }].concat(cats).forEach(function (c) {
      chips.appendChild(el('button', { type: 'button', class: 'chip', 'aria-pressed': c.slug === active ? 'true' : 'false', text: c.name,
        onclick: function () {
          active = c.slug;
          Array.prototype.forEach.call(chips.children, function (b) { b.setAttribute('aria-pressed', b === this ? 'true' : 'false'); }, this);
          renderGrid();
        } }));
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
      renderChips(Y.catalogService.categoriesOf(products, data.order));
      renderGrid();
      if (Y.hero) Y.hero.render(products);
      if (Y.order) Y.order.fill(products);
      if (data.source === 'cache') { state.hidden = false; state.textContent = 'Sin conexión con el servidor: se muestra la última copia guardada en este dispositivo.'; }
    }, showError).catch(showError);
  }

  Y.catalog = {
    products: [],
    init: function () {
      grid = document.getElementById('sheet'); state = document.getElementById('state'); chips = document.getElementById('chips');
      return load();
    },
    message: message
  };
})(window.Yuito);

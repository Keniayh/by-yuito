/* Lectura pública del catálogo.
   Orden de fuentes: red (Supabase) → copia local (localStorage) → catálogo inicial.
   Solo usa la clave pública con fetch; no necesita librerías. */
window.Yuito = window.Yuito || {};
(function (Y) {
  var CACHE_KEY = 'yuito.catalog.v1', TIMEOUT_MS = 8000;

  function cfg() { return Y.config.supabase || {}; }
  function configured() { return !!(cfg().url && cfg().publishableKey); }
  function base() { return cfg().url.replace(/\/+$/, ''); }

  function publicImageUrl(path) {
    return base() + '/storage/v1/object/public/' + Y.config.bucket + '/' +
      String(path).split('/').map(encodeURIComponent).join('/');
  }

  function rest(query) {
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, TIMEOUT_MS) : null;
    return fetch(base() + '/rest/v1/' + query, {
      headers: { apikey: cfg().publishableKey, Accept: 'application/json' },
      signal: ctl ? ctl.signal : undefined
    }).then(function (r) {
      if (timer) clearTimeout(timer);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }, function (e) { if (timer) clearTimeout(timer); throw e; });
  }

  function normProduct(p, cat, images) {
    return {
      slug: String(p.slug), name: String(p.name), description: String(p.description || ''),
      price_cop: typeof p.price_cop === 'number' ? p.price_cop : null,
      category: cat ? { slug: String(cat.slug), name: String(cat.name), description: String(cat.description || '') } : null,
      kind: p.kind === 'servicio' ? 'servicio' : 'pieza',
      availability: p.availability === 'agotado' ? 'agotado' : 'disponible',
      featured: !!p.featured, tile_color: Y.dom.hex(p.tile_color) || null,
      image_mode: p.image_mode === 'foto' ? 'foto' : 'recorte',
      cta_label: p.cta_label || null, whatsapp_message: p.whatsapp_message || null,
      sort_order: +p.sort_order || 0,
      images: images.filter(function (i) { return i.url; })
    };
  }

  function fromRemote(rows) {
    var products = rows.map(function (r) {
      var imgs = (r.product_images || []).slice().sort(function (a, b) { return a.position - b.position; })
        .map(function (i) { return { url: Y.dom.safeUrl(publicImageUrl(i.storage_path)), alt: i.alt || '' }; });
      return normProduct(r, r.categories, imgs);
    });
    return products;
  }

  function fromSeed(seed) {
    var cats = {};
    (seed.categories || []).forEach(function (c) { cats[c.slug] = c; });
    return (seed.products || []).filter(function (p) { return p.status === 'publicado'; }).map(function (p) {
      return normProduct(p, cats[p.category], (p.images || []).map(function (i) { return { url: Y.dom.safeUrl(i.src), alt: i.alt || '' }; }));
    });
  }

  function categoriesOf(products, order) {
    var seen = {}, out = [];
    products.forEach(function (p) { if (p.category && !seen[p.category.slug]) { seen[p.category.slug] = 1; out.push(p.category); } });
    out.sort(function (a, b) { return (order[a.slug] || 99) - (order[b.slug] || 99); });
    return out;
  }

  function readCache() {
    try { var c = JSON.parse(localStorage.getItem(CACHE_KEY)); return c && Array.isArray(c.products) ? c : null; } catch (e) { return null; }
  }
  function writeCache(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), products: data.products, order: data.order })); } catch (e) { /* sin almacenamiento: se ignora */ }
  }
  function loadSeed() {
    return fetch('js/data/seed-catalog.json').then(function (r) { if (!r.ok) throw new Error('seed'); return r.json(); }).then(function (seed) {
      var order = {}; (seed.categories || []).forEach(function (c) { order[c.slug] = c.sort_order; });
      return { products: fromSeed(seed).sort(function (a, b) { return a.sort_order - b.sort_order; }), order: order, source: 'seed' };
    });
  }

  function load() {
    if (!configured()) return loadSeed();
    return Promise.all([
      rest('products?select=slug,name,description,price_cop,kind,availability,featured,tile_color,image_mode,cta_label,whatsapp_message,sort_order,categories(slug,name,description,sort_order),product_images(storage_path,alt,position)&status=eq.publicado&order=sort_order.asc'),
      rest('categories?select=slug,sort_order&order=sort_order.asc')
    ]).then(function (res) {
      var order = {}; res[1].forEach(function (c) { order[c.slug] = c.sort_order; });
      var data = { products: fromRemote(res[0]), order: order, source: 'network' };
      writeCache(data);
      return data;
    }).catch(function () {
      var c = readCache();
      if (c) return { products: c.products, order: c.order || {}, source: 'cache' };
      return loadSeed();
    });
  }

  Y.catalogService = { load: load, configured: configured, categoriesOf: categoriesOf, publicImageUrl: publicImageUrl };
})(window.Yuito);

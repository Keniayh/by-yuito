/* Formato de respaldo del catálogo: validación estricta, planificación de la
   importación y utilidades. Funciona en el navegador y en Node (para pruebas). */
(function (root) {
  var SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/, HEX = /^#[0-9a-fA-F]{6}$/, DATA = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+\/]+={0,2})$/;
  var MAX_IMG = 5 * 1024 * 1024, MAX_PRODUCTS = 500, MAX_IMAGES = 8;
  var KIND = ['pieza', 'servicio'], STATUS = ['publicado', 'oculto'], AVAIL = ['disponible', 'agotado'], MODE = ['recorte', 'foto'];

  function slugify(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/g, '');
  }
  function isInt(n) { return typeof n === 'number' && isFinite(n) && Math.floor(n) === n; }
  function str(v, min, max) { return typeof v === 'string' && v.trim().length >= min && v.length <= max; }
  function dataInfo(s) {
    var m = typeof s === 'string' ? DATA.exec(s) : null; if (!m) return null;
    var b64 = m[2], pad = (b64.match(/=+$/) || [''])[0].length;
    return { mime: m[1], bytes: Math.floor(b64.length * 3 / 4) - pad };
  }
  function safeSrc(u) { return typeof u === 'string' && /^[a-z0-9_\-./%]+$/i.test(u) && u.indexOf('..') < 0 && u.charAt(0) !== '/'; }

  function validate(doc) {
    var errors = [], cats = [], prods = [];
    function err(m) { if (errors.length < 30) errors.push(m); }
    if (!doc || typeof doc !== 'object' || doc.format !== 'yuito-catalog') { return { ok: false, errors: ['El archivo no es un respaldo de catálogo de YÜITO (falta format: "yuito-catalog").'] }; }
    if (doc.version !== 1) err('Versión de respaldo no compatible: ' + doc.version + '.');
    if (!Array.isArray(doc.categories) || !Array.isArray(doc.products)) { return { ok: false, errors: errors.concat(['Faltan las listas "categories" o "products".']) }; }
    if (doc.products.length > MAX_PRODUCTS) err('Demasiados productos (máximo ' + MAX_PRODUCTS + ').');
    var seenC = {}, seenP = {};
    doc.categories.forEach(function (c, i) {
      var w = 'Categoría #' + (i + 1) + ': ';
      if (!c || typeof c.slug !== 'string' || !SLUG.test(c.slug) || c.slug.length > 60) return err(w + 'slug inválido.');
      if (seenC[c.slug]) return err(w + 'slug repetido (' + c.slug + ').'); seenC[c.slug] = 1;
      if (!str(c.name, 1, 60)) return err(w + 'nombre inválido.');
      if (c.description != null && (typeof c.description !== 'string' || c.description.length > 300)) return err(w + 'descripción inválida.');
      cats.push({ slug: c.slug, name: c.name.trim(), description: c.description || '', sort_order: isInt(c.sort_order) ? c.sort_order : i + 1 });
    });
    doc.products.forEach(function (p, i) {
      var w = 'Producto #' + (i + 1) + (p && p.slug ? ' (' + p.slug + ')' : '') + ': ', n = errors.length;
      if (!p || typeof p !== 'object') return err(w + 'no es un objeto.');
      if (typeof p.slug !== 'string' || !SLUG.test(p.slug) || p.slug.length > 80) err(w + 'slug inválido.');
      else if (seenP[p.slug]) err(w + 'slug repetido.'); else seenP[p.slug] = 1;
      if (!str(p.name, 1, 120)) err(w + 'nombre inválido (1 a 120 caracteres).');
      if (p.description != null && (typeof p.description !== 'string' || p.description.length > 2000)) err(w + 'descripción inválida (máx. 2000).');
      if (p.price_cop != null && !(isInt(p.price_cop) && p.price_cop >= 0 && p.price_cop <= 100000000)) err(w + 'precio inválido.');
      if (typeof p.category !== 'string' || !seenC[p.category]) err(w + 'categoría inexistente en el archivo (' + p.category + ').');
      if (KIND.indexOf(p.kind) < 0) err(w + 'kind inválido.');
      if (STATUS.indexOf(p.status) < 0) err(w + 'status inválido.');
      if (AVAIL.indexOf(p.availability) < 0) err(w + 'availability inválido.');
      if (typeof p.featured !== 'boolean') err(w + 'featured debe ser verdadero o falso.');
      if (p.tile_color != null && !(typeof p.tile_color === 'string' && HEX.test(p.tile_color))) err(w + 'tile_color inválido.');
      if (MODE.indexOf(p.image_mode) < 0) err(w + 'image_mode inválido.');
      if (p.cta_label != null && !str(p.cta_label, 1, 60)) err(w + 'cta_label inválido.');
      if (p.whatsapp_message != null && !str(p.whatsapp_message, 1, 400)) err(w + 'whatsapp_message inválido.');
      var imgs = [];
      if (p.images != null && !Array.isArray(p.images)) err(w + 'images debe ser una lista.');
      else (p.images || []).forEach(function (im, j) {
        var x = w + 'imagen #' + (j + 1) + ': ';
        if (imgs.length >= MAX_IMAGES) return err(w + 'máximo ' + MAX_IMAGES + ' imágenes.');
        if (!im || typeof im !== 'object') return err(x + 'inválida.');
        if (im.alt != null && (typeof im.alt !== 'string' || im.alt.length > 200)) return err(x + 'alt inválido.');
        var out = { alt: im.alt || '', position: isInt(im.position) ? im.position : j };
        if (im.data != null) { var d = dataInfo(im.data); if (!d) return err(x + 'datos de imagen inválidos (solo JPEG, PNG o WebP en base64).'); if (d.bytes > MAX_IMG) return err(x + 'supera 5 MB.'); out.data = im.data; }
        else if (im.src != null) { if (!safeSrc(im.src)) return err(x + 'ruta no permitida.'); out.src = im.src; }
        else return err(x + 'sin "data" ni "src".');
        imgs.push(out);
      });
      if (errors.length > n) return;
      prods.push({ slug: p.slug, name: p.name.trim(), description: p.description || '', price_cop: p.price_cop == null ? null : p.price_cop,
        category: p.category, kind: p.kind, status: p.status, availability: p.availability, featured: p.featured,
        tile_color: p.tile_color || null, image_mode: p.image_mode, cta_label: p.cta_label || null, whatsapp_message: p.whatsapp_message || null,
        sort_order: isInt(p.sort_order) ? p.sort_order : i + 1, images: imgs });
    });
    return { ok: errors.length === 0, errors: errors, catalog: { categories: cats, products: prods } };
  }

  /* existing = { categories: [slug...], products: { slug: {imageCount} } }; mode: 'crear' | 'actualizar' */
  function plan(catalog, existing, mode) {
    var haveC = {}; existing.categories.forEach(function (s) { haveC[s] = 1; });
    var out = { createCategories: [], createProducts: [], updateProducts: [], skipProducts: [], fillImages: [] };
    catalog.categories.forEach(function (c) { if (!haveC[c.slug]) out.createCategories.push(c); });
    catalog.products.forEach(function (p) {
      if (!existing.products[p.slug]) out.createProducts.push(p);
      else if (mode === 'actualizar') out.updateProducts.push(p);
      else if (!existing.products[p.slug].imageCount && p.images.length) out.fillImages.push(p);  // recupera una importación interrumpida
      else out.skipProducts.push(p);
    });
    return out;
  }

  var api = { validate: validate, plan: plan, slugify: slugify, dataInfo: dataInfo, MAX_IMG: MAX_IMG, MIMES: ['image/jpeg', 'image/png', 'image/webp'] };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.Yuito = root.Yuito || {}; root.Yuito.format = api; }
})(typeof window !== 'undefined' ? window : globalThis);

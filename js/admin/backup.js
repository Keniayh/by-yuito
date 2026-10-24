/* Exportación, vista previa e importación idempotente del catálogo. */
window.Yuito = window.Yuito || {};
(function (Y) {
  var A = Y.adminApi, F = Y.format, I = Y.imaging;

  function exportAll(progress) {
    return Promise.all([A.categories(), A.products()]).then(function (res) {
      var cats = res[0], prods = res[1], byId = {}, warnings = [], done = 0;
      cats.forEach(function (c) { byId[c.id] = c; });
      var total = prods.reduce(function (n, p) { return n + p.product_images.length; }, 0);
      var chain = Promise.resolve(), out = [];
      prods.forEach(function (p) {
        var item = { slug: p.slug, name: p.name, description: p.description, price_cop: p.price_cop, category: byId[p.category_id] ? byId[p.category_id].slug : null,
          kind: p.kind, status: p.status, availability: p.availability, featured: p.featured, tile_color: p.tile_color, image_mode: p.image_mode,
          cta_label: p.cta_label, whatsapp_message: p.whatsapp_message, sort_order: p.sort_order, images: [] };
        out.push(item);
        p.product_images.forEach(function (im) {
          chain = chain.then(function () {
            return fetch(A.imageUrl(im.storage_path)).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); })
              .then(function (b) { return I.toDataUrl(b); })
              .then(function (d) { item.images.push({ data: d, alt: im.alt, position: im.position }); })
              .catch(function (e) { warnings.push(p.name + ': no se pudo incluir una foto (' + e.message + ').'); })
              .then(function () { done++; if (progress) progress(done, total); });
          });
        });
      });
      return chain.then(function () {
        return { doc: { format: 'yuito-catalog', version: 1, exported_at: new Date().toISOString(),
          categories: cats.map(function (c) { return { slug: c.slug, name: c.name, description: c.description, sort_order: c.sort_order }; }), products: out }, warnings: warnings };
      });
    });
  }

  function download(doc) {
    var blob = new Blob([JSON.stringify(doc)], { type: 'application/json' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'yuito-catalogo-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
  }

  function readFile(file) {
    if (file.size > 200 * 1024 * 1024) return Promise.reject(new Error('El archivo es demasiado grande.'));
    return file.text().then(function (t) { var j; try { j = JSON.parse(t); } catch (e) { throw new Error('El archivo no es un JSON válido.'); } return F.validate(j); });
  }

  function existingState() {
    return Promise.all([A.categories(), A.products()]).then(function (r) {
      var ex = { categories: r[0].map(function (c) { return c.slug; }), products: {}, cats: r[0], prods: r[1] };
      r[1].forEach(function (p) { ex.products[p.slug] = { id: p.id, imageCount: p.product_images.length }; });
      return ex;
    });
  }

  function preview(catalog, mode) { return existingState().then(function (ex) { return { plan: F.plan(catalog, ex, mode), existing: ex }; }); }

  function imageBlob(im) {
    if (im.data) return I.fromDataUrl(im.data);
    return fetch('../' + im.src).then(function (r) { if (!r.ok) throw new Error('no se encontró ' + im.src); return r.blob(); });
  }
  function uploadAll(productId, slug, images, startPos) {
    var chain = Promise.resolve();
    images.forEach(function (im, i) {
      chain = chain.then(function () { return imageBlob(im); }).then(function (blob) {
        var path = 'products/' + slug + '/' + I.randomName(blob.type);
        return A.uploadImage(path, blob).then(function () { return A.addImageRow(productId, path, im.alt, startPos + i); });
      });
    });
    return chain;
  }

  function apply(catalog, mode, progress) {
    return existingState().then(function (ex) {
      var plan = F.plan(catalog, ex, mode), result = { created: 0, updated: 0, filled: 0, skipped: plan.skipProducts.length, categories: 0, failed: [] };
      var catId = {}; ex.cats.forEach(function (c) { catId[c.slug] = c.id; });
      var steps = plan.createCategories.length + plan.createProducts.length + plan.updateProducts.length + plan.fillImages.length, n = 0;
      function tick() { n++; if (progress) progress(n, steps); }
      var chain = Promise.resolve();
      plan.createCategories.forEach(function (c) {
        chain = chain.then(function () { return A.saveCategory(c); }).then(function (row) { catId[c.slug] = row.id; result.categories++; tick(); })
          .catch(function (e) { result.failed.push('Categoría ' + c.name + ': ' + e.message); tick(); });
      });
      function body(p) { var b = Object.assign({}, p, { category_id: catId[p.category] }); delete b.category; delete b.images; return b; }
      plan.createProducts.forEach(function (p) {
        chain = chain.then(function () {
          if (!catId[p.category]) throw new Error('su categoría no está disponible');
          return A.saveProduct(body(p));
        }).then(function (row) { result.created++; return uploadAll(row.id, p.slug, p.images, 0); })
          .then(tick, function (e) { result.failed.push(p.name + ': ' + e.message); tick(); });
      });
      plan.updateProducts.forEach(function (p) {
        chain = chain.then(function () {
          var cur = ex.prods.filter(function (x) { return x.slug === p.slug; })[0], b = body(p); b.id = cur.id;
          return A.saveProduct(b).then(function () { result.updated++; return cur.product_images.length ? null : uploadAll(cur.id, p.slug, p.images, 0); });
        }).then(tick, function (e) { result.failed.push(p.name + ': ' + e.message); tick(); });
      });
      plan.fillImages.forEach(function (p) {
        chain = chain.then(function () { return uploadAll(ex.products[p.slug].id, p.slug, p.images, 0); })
          .then(function () { result.filled++; tick(); }, function (e) { result.failed.push(p.name + ': ' + e.message); tick(); });
      });
      return chain.then(function () { return result; });
    });
  }

  function loadSeed() { return fetch('../js/data/seed-catalog.json').then(function (r) { if (!r.ok) throw new Error('No se encontró el catálogo inicial.'); return r.json(); }).then(F.validate); }

  Y.backup = { exportAll: exportAll, download: download, readFile: readFile, preview: preview, apply: apply, loadSeed: loadSeed };
})(window.Yuito);

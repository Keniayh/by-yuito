/* Panel · Productos: lista, acciones rápidas y editor. */
window.Yuito = window.Yuito || {};
(function (Y) {
  var el = Y.dom.el, A = Y.adminApi, U = Y.ui, F = Y.format, I = Y.imaging;
  var root, cats = [], prods = [], q = '', filter = 'todos';

  function thumb(p) {
    var box = el('div', { class: 'thumb' });
    var im = p.product_images[0];
    if (im) box.appendChild(el('img', { src: A.imageUrl(im.storage_path), alt: '', loading: 'lazy' }));
    else box.appendChild(Y.dom.svgUse('ballsym', 'ballsvg'));
    if (Y.dom.hex(p.tile_color)) U.swatch(box, p.tile_color);
    return box;
  }
  function badge(text, cls) { return el('span', { class: 'badge ' + (cls || ''), text: text }); }

  function quick(p, patch, okMsg) {
    return A.patchProduct(p.id, patch).then(function () { U.toast(okMsg); return refresh(); }, function (e) { U.toast(e.message, 'error'); });
  }
  function move(p, dir) {
    var i = prods.indexOf(p), j = i + dir; if (j < 0 || j >= prods.length) return;
    var order = prods.slice(); order[i] = prods[j]; order[j] = p;
    var jobs = []; order.forEach(function (x, k) { if (x.sort_order !== k + 1) jobs.push(A.patchProduct(x.id, { sort_order: k + 1 })); });
    Promise.all(jobs).then(function () { U.toast('Orden actualizado.'); return refresh(); }, function (e) { U.toast(e.message, 'error'); });
  }
  function remove(p) {
    U.confirm('Eliminar «' + p.name + '»', 'Se borrarán el producto y sus fotos. Esta acción no se puede deshacer. Si solo quiere dejar de mostrarlo, use «Ocultar».', 'Eliminar definitivamente').then(function (yes) {
      if (!yes) return;
      A.removeFiles(p.product_images.map(function (i) { return i.storage_path; })).then(function () { return A.deleteProduct(p.id); })
        .then(function () { U.toast('Producto eliminado.'); return refresh(); }, function (e) { U.toast(e.message, 'error'); });
    });
  }

  function row(p) {
    var cat = cats.filter(function (c) { return c.id === p.category_id; })[0];
    var btn = function (label, fn, cls) { return el('button', { type: 'button', class: 'btn sm alt ' + (cls || ''), text: label, onclick: fn }); };
    var i = prods.indexOf(p);
    return el('li', { class: 'prow', 'data-slug': p.slug }, [
      thumb(p),
      el('div', { class: 'pinfo' }, [
        el('h3', { text: p.name }),
        el('p', { class: 'pmeta', text: (cat ? cat.name : 'Sin categoría') + ' · ' + Y.dom.price(p.price_cop) + (p.kind === 'servicio' ? ' · Servicio' : '') }),
        el('p', { class: 'badges' }, [badge(p.status === 'publicado' ? 'Publicado' : 'Oculto', p.status === 'publicado' ? 'ok' : 'off'),
          badge(p.availability === 'agotado' ? 'Agotado' : 'Disponible', p.availability === 'agotado' ? 'warn' : ''), p.featured ? badge('Destacado') : null])]),
      el('div', { class: 'pactions' }, [
        btn('Editar', function () { openEditor(p); }),
        btn(p.status === 'publicado' ? 'Ocultar' : 'Publicar', function () { quick(p, { status: p.status === 'publicado' ? 'oculto' : 'publicado' }, p.status === 'publicado' ? 'Producto oculto de la tienda.' : 'Producto publicado.'); }),
        btn(p.availability === 'agotado' ? 'Marcar disponible' : 'Marcar agotado', function () { quick(p, { availability: p.availability === 'agotado' ? 'disponible' : 'agotado' }, 'Disponibilidad actualizada.'); }),
        el('button', { type: 'button', class: 'btn sm alt icon', 'aria-label': 'Subir ' + p.name, disabled: i === 0, text: '↑', onclick: function () { move(p, -1); } }),
        el('button', { type: 'button', class: 'btn sm alt icon', 'aria-label': 'Bajar ' + p.name, disabled: i === prods.length - 1, text: '↓', onclick: function () { move(p, 1); } }),
        btn('Eliminar', function () { remove(p); }, 'danger-o')])]);
  }

  function renderList() {
    var list = root.querySelector('#plist'), empty = root.querySelector('#pempty'); Y.dom.clear(list);
    var shown = prods.filter(function (p) {
      if (filter === 'publicado' && p.status !== 'publicado') return false; if (filter === 'oculto' && p.status !== 'oculto') return false;
      if (filter === 'agotado' && p.availability !== 'agotado') return false;
      return !q || p.name.toLowerCase().indexOf(q) >= 0;
    });
    shown.forEach(function (p) { list.appendChild(row(p)); });
    empty.hidden = shown.length > 0;
    empty.textContent = prods.length ? 'Ningún producto coincide con la búsqueda.' : 'Aún no hay productos. Cree uno nuevo o cargue el catálogo inicial desde la pestaña Respaldo.';
  }

  function refresh() {
    var st = root.querySelector('#pstate'); st.hidden = false; st.textContent = 'Cargando productos…'; st.className = 'state';
    return Promise.all([A.categories(), A.products()]).then(function (r) { cats = r[0]; prods = r[1]; st.hidden = true; renderList(); },
      function (e) { st.className = 'state errtxt'; st.textContent = e.message; });
  }

  /* ---------- Editor ---------- */
  function openEditor(p) {
    if (!cats.length) { U.toast('Primero cree al menos una categoría.', 'error'); return; }
    var d = document.getElementById('dlg-edit'); d.textContent = '';
    var isNew = !p;
    var imgs = (p ? p.product_images : []).map(function (i) { return { id: i.id, path: i.storage_path, url: A.imageUrl(i.storage_path), alt: i.alt || '' }; });
    var removed = [];
    var f = {};
    function inp(id, type, extra) { var n = el('input', Object.assign({ id: id, type: type }, extra || {})); f[id] = n; return n; }
    function sel(id, opts, val) { var n = el('select', { id: id }, opts.map(function (o) { return el('option', { value: o[0], text: o[1] }); })); n.value = val; f[id] = n; return n; }
    var name = inp('e-name', 'text', { maxlength: 120, required: true, autocomplete: 'off' }); name.value = p ? p.name : '';
    var slug = inp('e-slug', 'text', { maxlength: 80, autocomplete: 'off', spellcheck: 'false' }); slug.value = p ? p.slug : ''; if (p) slug.readOnly = true;
    var desc = el('textarea', { id: 'e-desc', rows: 5, maxlength: 2000 }); desc.value = p ? p.description : ''; f['e-desc'] = desc;
    var descCount = el('p', { class: 'hint', text: desc.value.length + '/2000' }); desc.addEventListener('input', function () { descCount.textContent = desc.value.length + '/2000'; });
    var price = inp('e-price', 'text', { inputmode: 'numeric', autocomplete: 'off', placeholder: 'Vacío = «Consultar precio»' }); price.value = p && p.price_cop !== null ? String(p.price_cop) : '';
    var catSel = sel('e-cat', cats.map(function (c) { return [c.id, c.name]; }), p ? p.category_id : cats[0].id);
    var kind = sel('e-kind', [['pieza', 'Pieza física'], ['servicio', 'Servicio por encargo (sin foto de producto)']], p ? p.kind : 'pieza');
    var status = sel('e-status', [['publicado', 'Publicado (visible en la tienda)'], ['oculto', 'Oculto (solo usted lo ve)']], p ? p.status : 'oculto');
    var avail = sel('e-avail', [['disponible', 'Disponible'], ['agotado', 'Agotado']], p ? p.availability : 'disponible');
    var feat = inp('e-feat', 'checkbox'); feat.checked = !!(p && p.featured);
    var useColor = inp('e-usecolor', 'checkbox'); useColor.checked = !!(p && p.tile_color);
    var color = inp('e-color', 'color'); color.value = (p && p.tile_color) || '#cfe0f5'; color.disabled = !useColor.checked;
    useColor.addEventListener('change', function () { color.disabled = !useColor.checked; });
    var mode = sel('e-mode', [['recorte', 'Pieza recortada sobre el color'], ['foto', 'Fotografía completa']], p ? p.image_mode : 'recorte');
    var cta = inp('e-cta', 'text', { maxlength: 60, placeholder: 'Consultar disponibilidad' }); cta.value = p && p.cta_label || '';
    var wam = el('textarea', { id: 'e-wam', rows: 2, maxlength: 400, placeholder: 'Hola, quisiera información sobre …' }); wam.value = p && p.whatsapp_message || ''; f['e-wam'] = wam;
    var errBox = el('p', { class: 'err', role: 'alert', hidden: true });

    if (isNew) name.addEventListener('input', function () { if (!slug.dataset.touched) slug.value = F.slugify(name.value); });
    slug.addEventListener('input', function () { slug.dataset.touched = '1'; });

    var gallery = el('ul', { class: 'gal' });
    function drawGallery() {
      Y.dom.clear(gallery);
      imgs.forEach(function (im, i) {
        var alt = el('input', { type: 'text', maxlength: 200, placeholder: 'Descripción de la foto (para accesibilidad)', 'aria-label': 'Descripción de la foto ' + (i + 1), value: im.alt });
        alt.addEventListener('input', function () { im.alt = alt.value; });
        gallery.appendChild(el('li', { class: 'gitem' }, [
          el('img', { src: im.url, alt: '' }),
          el('div', { class: 'gctl' }, [alt, el('div', { class: 'row' }, [
            el('button', { type: 'button', class: 'btn sm alt icon', 'aria-label': 'Mover foto antes', disabled: i === 0, text: '←', onclick: function () { imgs.splice(i - 1, 0, imgs.splice(i, 1)[0]); drawGallery(); } }),
            el('button', { type: 'button', class: 'btn sm alt icon', 'aria-label': 'Mover foto después', disabled: i === imgs.length - 1, text: '→', onclick: function () { imgs.splice(i + 1, 0, imgs.splice(i, 1)[0]); drawGallery(); } }),
            el('button', { type: 'button', class: 'btn sm alt danger-o', text: 'Quitar', onclick: function () { if (im.id) removed.push(im); else URL.revokeObjectURL(im.url); imgs.splice(i, 1); drawGallery(); } })])])]));
      });
      if (!imgs.length) gallery.appendChild(el('li', { class: 'state', text: 'Sin fotos todavía.' }));
    }
    var file = el('input', { id: 'e-files', type: 'file', accept: 'image/jpeg,image/png,image/webp', multiple: true });
    var fileMsg = el('p', { class: 'hint left', role: 'status' });
    file.addEventListener('change', function () {
      var chosen = Array.prototype.slice.call(file.files); file.value = ''; fileMsg.textContent = '';
      var room = 8 - imgs.length; if (chosen.length > room) { fileMsg.textContent = 'Máximo 8 fotos por producto; se tomarán las primeras ' + Math.max(room, 0) + '.'; chosen = chosen.slice(0, Math.max(room, 0)); }
      chosen.reduce(function (pr, f0) {
        return pr.then(function () { return I.prepare(f0).then(function (blob) { imgs.push({ blob: blob, url: URL.createObjectURL(blob), alt: '' }); drawGallery(); },
          function (e) { fileMsg.textContent = (fileMsg.textContent ? fileMsg.textContent + ' ' : '') + e.message; }); });
      }, Promise.resolve());
    });
    drawGallery();

    var save = el('button', { type: 'submit', class: 'btn', text: isNew ? 'Crear producto' : 'Guardar cambios' });
    var form = el('form', { class: 'dlg-body form editor', novalidate: true }, [
      el('div', { class: 'row between' }, [el('h2', { text: isNew ? 'Nuevo producto' : 'Editar producto' }), el('button', { type: 'button', class: 'btn sm alt', text: 'Cerrar', onclick: function () { tryClose(); } })]),
      U.field('e-name', 'Nombre', name), U.field('e-cat', 'Categoría', catSel), U.field('e-kind', 'Tipo', kind),
      U.field('e-desc', 'Descripción', desc), descCount,
      U.field('e-price', 'Precio en pesos colombianos (opcional)', price, 'Solo números, sin puntos. Si lo deja vacío, la tienda muestra «Consultar precio».'),
      U.field('e-status', 'Estado en la tienda', status), U.field('e-avail', 'Disponibilidad', avail),
      el('div', { class: 'fld chk' }, [feat, el('label', { for: 'e-feat', text: 'Marcar como destacado' })]),
      el('div', { class: 'fld chk' }, [useColor, el('label', { for: 'e-usecolor', text: 'Usar un color propio para la lámina' }), color]),
      U.field('e-mode', 'Cómo mostrar la foto', mode),
      el('fieldset', { class: 'fld' }, [el('legend', { text: 'Fotografías' }), gallery,
        el('label', { for: 'e-files', class: 'btn sm alt filebtn', text: 'Añadir fotos' }), file, fileMsg,
        el('p', { class: 'hint left', text: 'JPEG, PNG o WebP. Se optimizan a un máximo de 1600 px. La primera foto es la principal. Para fondo transparente use PNG o WebP.' })]),
      U.field('e-cta', 'Texto del botón (opcional)', cta), U.field('e-wam', 'Mensaje de WhatsApp (opcional)', wam, 'Si lo deja vacío se usa «Hola, quisiera información sobre …».'),
      U.field('e-slug', 'Identificador interno', slug, isNew ? 'Se genera del nombre; solo letras minúsculas, números y guiones.' : 'No se puede cambiar: sirve para recuperar copias de seguridad sin duplicados.'),
      errBox, el('div', { class: 'row end sticky' }, [el('button', { type: 'button', class: 'btn alt', text: 'Cancelar', onclick: function () { tryClose(); } }), save])]);
    d.appendChild(form);

    var dirty = false; form.addEventListener('input', function () { dirty = true; }); form.addEventListener('change', function () { dirty = true; });
    function cleanup() { imgs.forEach(function (i) { if (i.blob) URL.revokeObjectURL(i.url); }); }
    function tryClose() {
      if (!dirty) { cleanup(); d.close(); return; }
      U.confirm('¿Descartar los cambios?', 'Hay cambios sin guardar en este producto.', 'Descartar').then(function (y) { if (y) { cleanup(); d.close(); } });
    }
    d.oncancel = function (e) { e.preventDefault(); tryClose(); };

    function fail(msg, node) { errBox.textContent = msg; errBox.hidden = false; if (node) { node.setAttribute('aria-invalid', 'true'); node.focus(); } return false; }
    function validate() {
      Object.keys(f).forEach(function (k) { f[k].removeAttribute('aria-invalid'); }); errBox.hidden = true;
      if (!name.value.trim()) return fail('El nombre es obligatorio.', name);
      if (name.value.length > 120) return fail('El nombre admite hasta 120 caracteres.', name);
      var s = slug.value.trim(); if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s) || s.length > 80) return fail('El identificador solo admite minúsculas, números y guiones (por ejemplo: bolso-lila).', slug);
      if (isNew && prods.some(function (x) { return x.slug === s; })) return fail('Ya existe un producto con ese identificador. Cámbielo.', slug);
      var pr = price.value.replace(/[\s.$]/g, ''); if (pr !== '' && !/^\d+$/.test(pr)) return fail('El precio debe ser un número entero, sin letras ni decimales.', price);
      if (pr !== '' && +pr > 100000000) return fail('El precio es demasiado alto.', price);
      if (cta.value.length > 60) return fail('El texto del botón admite hasta 60 caracteres.', cta);
      return true;
    }

    form.addEventListener('submit', function (ev) {
      ev.preventDefault(); if (!validate()) return;
      var pr = price.value.replace(/[\s.$]/g, '');
      var maxOrder = prods.reduce(function (m, x) { return Math.max(m, x.sort_order); }, 0);
      var rec = { id: p ? p.id : null, slug: slug.value.trim(), name: name.value.trim(), description: desc.value, price_cop: pr === '' ? null : +pr,
        category_id: catSel.value, kind: kind.value, status: status.value, availability: avail.value, featured: feat.checked,
        tile_color: useColor.checked ? color.value : null, image_mode: mode.value, cta_label: cta.value.trim() || null,
        whatsapp_message: wam.value.trim() || null, sort_order: p ? p.sort_order : maxOrder + 1 };
      U.busy(save, true, 'Guardando…'); errBox.hidden = true;
      var step = 'guardar el producto', savedRow;
      A.saveProduct(rec).then(function (row) {
        savedRow = row; step = 'borrar fotos quitadas';
        var paths = removed.map(function (r) { return r.path; });
        return Promise.all(removed.map(function (r) { return A.deleteImageRow(r.id); })).then(function () { return A.removeFiles(paths); });
      }).then(function () {
        step = 'subir las fotos'; var chain = Promise.resolve();
        imgs.forEach(function (im, i) {
          chain = chain.then(function () {
            if (im.blob) { var path = 'products/' + savedRow.slug + '/' + I.randomName(im.blob.type);
              return A.uploadImage(path, im.blob).then(function () { return A.addImageRow(savedRow.id, path, im.alt, i); }); }
            var orig = p.product_images.filter(function (o) { return o.id === im.id; })[0];
            if (orig && (orig.alt !== im.alt || orig.position !== i)) return A.patchImageRow(im.id, { alt: im.alt, position: i });
          });
        });
        return chain;
      }).then(function () { cleanup(); d.close(); U.toast(isNew ? 'Producto creado.' : 'Cambios guardados.'); return refresh(); },
        function (e) {
          U.busy(save, false); fail('No se pudo ' + step + ': ' + e.message + (savedRow && step !== 'guardar el producto' ? ' El producto ya quedó guardado; revise sus fotos y vuelva a intentar.' : ''));
          if (savedRow) refresh();
        });
    });
    d.showModal(); name.focus();
  }

  Y.viewProducts = {
    mount: function (host) {
      root = host; Y.dom.clear(host);
      var search = el('input', { type: 'search', id: 'psearch', placeholder: 'Buscar por nombre', 'aria-label': 'Buscar producto', autocomplete: 'off' });
      search.addEventListener('input', function () { q = search.value.trim().toLowerCase(); renderList(); });
      var fsel = el('select', { id: 'pfilter', 'aria-label': 'Filtrar por estado' }, [['todos', 'Todos'], ['publicado', 'Publicados'], ['oculto', 'Ocultos'], ['agotado', 'Agotados']].map(function (o) { return el('option', { value: o[0], text: o[1] }); }));
      fsel.addEventListener('change', function () { filter = fsel.value; renderList(); });
      host.appendChild(el('div', { class: 'toolbar' }, [el('h2', { text: 'Productos' }), el('button', { type: 'button', class: 'btn', id: 'pnew', text: 'Nuevo producto', onclick: function () { openEditor(null); } })]));
      host.appendChild(el('div', { class: 'filters' }, [search, fsel]));
      host.appendChild(el('p', { id: 'pstate', class: 'state', role: 'status' }));
      host.appendChild(el('ul', { id: 'plist', class: 'plist' }));
      host.appendChild(el('p', { id: 'pempty', class: 'state', hidden: true }));
      return refresh();
    }
  };
})(window.Yuito);

/* Panel · Categorías y Respaldo */
window.Yuito = window.Yuito || {};
(function (Y) {
  var el = Y.dom.el, A = Y.adminApi, U = Y.ui, F = Y.format, B = Y.backup;

  /* ---------- Categorías ---------- */
  function mountCategories(host) {
    Y.dom.clear(host);
    var list = el('ul', { class: 'clist' }), st = el('p', { class: 'state', role: 'status' });
    host.appendChild(el('div', { class: 'toolbar' }, [el('h2', { text: 'Categorías' })]));
    host.appendChild(el('p', { class: 'sub', text: 'Las categorías agrupan los productos y aparecen como filtros en la tienda. Puede añadir las que necesite.' }));
    host.appendChild(st); host.appendChild(list);

    var name = el('input', { id: 'c-name', type: 'text', maxlength: 60, autocomplete: 'off' }), desc = el('input', { id: 'c-desc', type: 'text', maxlength: 300 });
    var err = el('p', { class: 'err', role: 'alert', hidden: true }), add = el('button', { type: 'submit', class: 'btn sm', text: 'Añadir categoría' });
    var form = el('form', { class: 'form box', novalidate: true }, [el('h3', { text: 'Nueva categoría' }), U.field('c-name', 'Nombre', name), U.field('c-desc', 'Descripción corta (opcional)', desc), err, add]);
    host.appendChild(form);

    var cats = [];
    function draw() {
      Y.dom.clear(list);
      cats.forEach(function (c, i) {
        var n = el('input', { type: 'text', maxlength: 60, value: c.name, 'aria-label': 'Nombre de la categoría ' + c.name });
        var d = el('input', { type: 'text', maxlength: 300, value: c.description, 'aria-label': 'Descripción de ' + c.name });
        var ok = el('button', { type: 'button', class: 'btn sm', text: 'Guardar', onclick: function () {
          if (!n.value.trim()) { U.toast('El nombre no puede estar vacío.', 'error'); n.focus(); return; }
          U.busy(ok, true, 'Guardando…');
          A.saveCategory({ id: c.id, slug: c.slug, name: n.value.trim(), description: d.value, sort_order: c.sort_order }).then(function () { U.toast('Categoría guardada.'); return load(); },
            function (e) { U.busy(ok, false); U.toast(e.message, 'error'); }); } });
        function swap(dir) {
          var o = cats[i + dir]; if (!o) return;
          Promise.all([A.saveCategory({ id: c.id, slug: c.slug, name: c.name, description: c.description, sort_order: i + dir + 1 }), A.saveCategory({ id: o.id, slug: o.slug, name: o.name, description: o.description, sort_order: i + 1 })])
            .then(load, function (e) { U.toast(e.message, 'error'); });
        }
        list.appendChild(el('li', { class: 'crow' }, [el('div', { class: 'cfields' }, [n, d, el('p', { class: 'hint left', text: 'Identificador: ' + c.slug })]), el('div', { class: 'pactions' }, [ok,
          el('button', { type: 'button', class: 'btn sm alt icon', 'aria-label': 'Subir ' + c.name, disabled: i === 0, text: '↑', onclick: function () { swap(-1); } }),
          el('button', { type: 'button', class: 'btn sm alt icon', 'aria-label': 'Bajar ' + c.name, disabled: i === cats.length - 1, text: '↓', onclick: function () { swap(1); } }),
          el('button', { type: 'button', class: 'btn sm alt danger-o', text: 'Eliminar', onclick: function () {
            U.confirm('Eliminar «' + c.name + '»', 'Solo se puede eliminar si no tiene productos.', 'Eliminar').then(function (y) { if (y) A.deleteCategory(c.id).then(function () { U.toast('Categoría eliminada.'); return load(); }, function (e) { U.toast(e.message, 'error'); }); }); } })])]));
      });
    }
    function load() { st.hidden = false; st.textContent = 'Cargando…'; return A.categories().then(function (r) { cats = r; st.hidden = true; draw(); }, function (e) { st.className = 'state errtxt'; st.textContent = e.message; }); }
    form.addEventListener('submit', function (ev) {
      ev.preventDefault(); err.hidden = true; name.removeAttribute('aria-invalid');
      var nm = name.value.trim(), slug = F.slugify(nm);
      if (!nm || !slug) { err.textContent = 'Escriba un nombre (con letras o números).'; err.hidden = false; name.setAttribute('aria-invalid', 'true'); name.focus(); return; }
      if (cats.some(function (c) { return c.slug === slug; })) { err.textContent = 'Ya existe una categoría con ese nombre.'; err.hidden = false; name.focus(); return; }
      U.busy(add, true, 'Añadiendo…');
      A.saveCategory({ slug: slug, name: nm, description: desc.value, sort_order: cats.length + 1 }).then(function () { name.value = ''; desc.value = ''; U.busy(add, false); U.toast('Categoría añadida.'); return load(); },
        function (e) { U.busy(add, false); err.textContent = e.message; err.hidden = false; });
    });
    return load();
  }

  /* ---------- Respaldo ---------- */
  function mountBackup(host) {
    Y.dom.clear(host);
    host.appendChild(el('div', { class: 'toolbar' }, [el('h2', { text: 'Respaldo y recuperación' })]));
    host.appendChild(el('p', { class: 'sub', text: 'Descargue una copia completa del catálogo (datos y fotos) en un solo archivo. Guárdela en su computador o en su Drive: es su plan de recuperación si algo se pierde.' }));

    var expBtn = el('button', { type: 'button', class: 'btn', id: 'bk-export', text: 'Descargar copia del catálogo' }), expMsg = el('p', { class: 'state', role: 'status' });
    host.appendChild(el('section', { class: 'box' }, [el('h3', { text: 'Exportar' }), expBtn, expMsg]));
    expBtn.addEventListener('click', function () {
      U.busy(expBtn, true, 'Preparando copia…'); expMsg.className = 'state'; expMsg.textContent = 'Reuniendo datos y fotos…';
      B.exportAll(function (d, t) { expMsg.textContent = 'Fotos incluidas: ' + d + ' de ' + t + '…'; }).then(function (r) {
        B.download(r.doc); U.busy(expBtn, false);
        expMsg.textContent = 'Copia descargada: ' + r.doc.products.length + ' productos.' + (r.warnings.length ? ' Atención: ' + r.warnings.join(' ') : '');
        if (r.warnings.length) expMsg.className = 'state errtxt';
      }, function (e) { U.busy(expBtn, false); expMsg.className = 'state errtxt'; expMsg.textContent = 'No se pudo exportar: ' + e.message; });
    });

    var pick = el('input', { id: 'bk-file', type: 'file', accept: 'application/json,.json' }), mode = el('select', { id: 'bk-mode' }, [
      el('option', { value: 'crear', text: 'Solo añadir lo que falta (no modifica lo existente)' }), el('option', { value: 'actualizar', text: 'Añadir y actualizar los textos de los productos existentes' })]);
    var seedBtn = el('button', { type: 'button', class: 'btn alt', id: 'bk-seed', text: 'Cargar catálogo inicial (6 productos)' });
    var out = el('div', { class: 'bk-out', 'aria-live': 'polite' });
    host.appendChild(el('section', { class: 'box' }, [el('h3', { text: 'Importar' }),
      el('p', { class: 'sub', text: 'Antes de aplicar nada verá una vista previa de qué se creará, qué se actualizará y qué se omitirá. Importar el mismo archivo dos veces no duplica productos.' }),
      U.field('bk-file', 'Archivo de copia (.json)', pick), U.field('bk-mode', 'Modo', mode), el('p', { class: 'or', text: 'o' }), seedBtn, out]));

    var current = null;
    function showPreview(res, label) {
      Y.dom.clear(out); current = null;
      if (!res.ok) {
        out.appendChild(el('p', { class: 'err', role: 'alert', text: 'No se puede importar: el archivo tiene errores.' }));
        out.appendChild(el('ul', { class: 'errs' }, res.errors.map(function (e) { return el('li', { text: e }); }))); return;
      }
      B.preview(res.catalog, mode.value).then(function (pv) {
        var p = pv.plan; current = res.catalog;
        function li(t, items) { return items.length ? el('li', {}, [el('strong', { text: t + ': ' + items.length }), el('span', { text: ' — ' + items.slice(0, 8).map(function (x) { return x.name; }).join(', ') + (items.length > 8 ? '…' : '') })]) : null; }
        var total = p.createProducts.length + p.updateProducts.length + p.fillImages.length + p.createCategories.length;
        var apply = el('button', { type: 'button', class: 'btn', id: 'bk-apply', text: 'Aplicar importación', disabled: !total });
        var prog = el('p', { class: 'state', role: 'status' });
        out.appendChild(el('h4', { text: 'Vista previa · ' + label }));
        out.appendChild(el('ul', { class: 'plan' }, [
          p.createCategories.length ? el('li', {}, [el('strong', { text: 'Categorías nuevas: ' + p.createCategories.length }), el('span', { text: ' — ' + p.createCategories.map(function (c) { return c.name; }).join(', ') })]) : null,
          li('Productos a crear', p.createProducts), li('Productos a actualizar', p.updateProducts), li('Productos a los que se añadirán fotos', p.fillImages), li('Productos omitidos (ya existen)', p.skipProducts)]));
        if (!total) out.appendChild(el('p', { class: 'state', text: 'No hay nada nuevo que importar: el catálogo ya contiene todo.' }));
        out.appendChild(apply); out.appendChild(prog);
        apply.addEventListener('click', function () {
          U.busy(apply, true, 'Importando…');
          B.apply(current, mode.value, function (n, t) { prog.textContent = 'Paso ' + n + ' de ' + t + '…'; }).then(function (r) {
            U.busy(apply, false); apply.disabled = true;
            prog.className = r.failed.length ? 'state errtxt' : 'state';
            prog.textContent = 'Listo. Creados: ' + r.created + ' · actualizados: ' + r.updated + ' · fotos completadas: ' + r.filled + ' · omitidos: ' + r.skipped + (r.failed.length ? ' · con error: ' + r.failed.join(' | ') + ' (puede volver a importar: no se duplicará nada)' : '');
            U.toast(r.failed.length ? 'Importación terminada con errores.' : 'Importación completada.', r.failed.length ? 'error' : 'ok');
          }, function (e) { U.busy(apply, false); prog.className = 'state errtxt'; prog.textContent = 'No se pudo importar: ' + e.message; });
        });
      }, function (e) { out.appendChild(el('p', { class: 'err', role: 'alert', text: e.message })); });
    }
    var last = null;
    pick.addEventListener('change', function () {
      var f0 = pick.files[0]; if (!f0) return; pick.value = '';  // permite volver a elegir el mismo archivo
      Y.dom.clear(out); out.appendChild(el('p', { class: 'state', text: 'Leyendo archivo…' }));
      B.readFile(f0).then(function (r) { last = { res: r, label: f0.name }; showPreview(r, f0.name); }, function (e) { Y.dom.clear(out); out.appendChild(el('p', { class: 'err', role: 'alert', text: e.message })); });
    });
    mode.addEventListener('change', function () { if (last) showPreview(last.res, last.label); });
    seedBtn.addEventListener('click', function () {
      Y.dom.clear(out); out.appendChild(el('p', { class: 'state', text: 'Cargando catálogo inicial…' }));
      B.loadSeed().then(function (r) { last = { res: r, label: 'catálogo inicial' }; showPreview(r, 'catálogo inicial'); }, function (e) { Y.dom.clear(out); out.appendChild(el('p', { class: 'err', role: 'alert', text: e.message })); });
    });
    return Promise.resolve();
  }

  Y.viewCategories = { mount: mountCategories };
  Y.viewBackup = { mount: mountBackup };
})(window.Yuito);

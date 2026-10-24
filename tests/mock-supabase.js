/* SOLO PARA PRUEBAS: imita la parte de supabase-js que usa el panel, en memoria.
   No prueba Supabase real. Reglas imitadas: slug único (23505), categoría con
   productos no se borra (23503), borrado en cascada de fotos, escritura solo
   para el administrador (42501), lectura de ocultos solo para el administrador. */
(function () {
  var cfg = window.__MOCK__ || { users: [] }, state = Object.assign({ categories: [], products: [], product_images: [], files: {} }, cfg.state || {}), session = null, listeners = [], uid = 1;
  function id() { return 'id-' + (uid++); }
  function isAdmin() { return !!(session && session.admin); }
  function err(code, message) { return { code: code, message: message }; }
  var ADMIN_ONLY_WRITE = true;
  var origFetch = window.fetch.bind(window), PUB = '/storage/v1/object/public/product-images/';
  window.fetch = function (u, o) {
    var s = String(u), i = s.indexOf(PUB);
    if (i >= 0) { var path = decodeURIComponent(s.slice(i + PUB.length)), b = state.files[path]; return Promise.resolve(b ? new Response(b, { status: 200 }) : new Response('', { status: 404 })); }
    return origFetch(u, o);
  };
  window.__mockState = state;

  function Query(table) {
    var q = { table: table, op: 'select', body: null, filters: [], sort: [], one: null, embed: false };
    var api = {
      select: function (cols) { if (q.op === 'select') q.cols = cols; q.embed = /product_images/.test(cols || ''); return api; },
      insert: function (b) { q.op = 'insert'; q.body = b; return api; },
      update: function (b) { q.op = 'update'; q.body = b; return api; },
      delete: function () { q.op = 'delete'; return api; },
      eq: function (c, v) { q.filters.push([c, v]); return api; },
      order: function (c) { q.sort.push(c); return api; },
      single: function () { q.one = 'single'; return api; },
      maybeSingle: function () { q.one = 'maybe'; return api; },
      then: function (res, rej) { return Promise.resolve().then(run).then(res, rej); }
    };
    function match(r) { return q.filters.every(function (f) { return r[f[0]] === f[1]; }); }
    function run() {
      var T = state[table], out, e = null;
      if (table === 'admins') return { data: isAdmin() ? [{ user_id: session.id }] : [], error: null };
      var write = q.op !== 'select';
      if (write && !isAdmin()) return { data: null, error: err('42501', 'new row violates row-level security policy') };
      if (q.op === 'insert') {
        var row = Object.assign({ id: id(), created_at: new Date().toISOString() }, q.body);
        if (table === 'products') { row = Object.assign({ description: '', kind: 'pieza', status: 'oculto', availability: 'disponible', featured: false, image_mode: 'recorte', sort_order: 0, price_cop: null, tile_color: null, cta_label: null, whatsapp_message: null }, row);
          if (!row.name || !String(row.name).trim()) e = err('23514', 'check constraint'); if (T.some(function (r) { return r.slug === row.slug; })) e = err('23505', 'duplicate key'); }
        if (table === 'categories' && T.some(function (r) { return r.slug === row.slug; })) e = err('23505', 'duplicate key');
        if (table === 'product_images' && !state.products.some(function (p) { return p.id === row.product_id; })) e = err('23503', 'fk');
        if (e) return { data: null, error: e };
        T.push(row); out = [row];
      } else if (q.op === 'update') {
        out = T.filter(match);
        if (table === 'products' && q.body.slug && T.some(function (r) { return r.slug === q.body.slug && out.indexOf(r) < 0; })) return { data: null, error: err('23505', 'duplicate key') };
        out.forEach(function (r) { Object.assign(r, q.body); });
      } else if (q.op === 'delete') {
        out = T.filter(match);
        if (table === 'categories' && out.some(function (c) { return state.products.some(function (p) { return p.category_id === c.id; }); })) return { data: null, error: err('23503', 'violates foreign key') };
        state[table] = T.filter(function (r) { return out.indexOf(r) < 0; });
        if (table === 'products') state.product_images = state.product_images.filter(function (i) { return !out.some(function (p) { return p.id === i.product_id; }); });
      } else {
        out = T.filter(match);
        if (table === 'products' && !isAdmin()) out = out.filter(function (r) { return r.status === 'publicado'; });
      }
      out = out.map(function (r) { return JSON.parse(JSON.stringify(r)); });
      if (q.embed) out.forEach(function (r) { r.product_images = state.product_images.filter(function (i) { return i.product_id === r.id; }).map(function (i) { return Object.assign({}, i); }); });
      if (q.sort.length) out.sort(function (a, b) { for (var k = 0; k < q.sort.length; k++) { var c = q.sort[k]; if (a[c] < b[c]) return -1; if (a[c] > b[c]) return 1; } return 0; });
      if (q.one) { if (out.length !== 1) return q.one === 'maybe' && out.length === 0 ? { data: null, error: null } : { data: null, error: err('PGRST116', 'JSON object requested, multiple (or no) rows returned') }; out = out[0]; }
      return { data: out, error: null };
    }
    return api;
  }
  window.supabase = { createClient: function () { return {
    auth: {
      signInWithPassword: function (c) { return Promise.resolve().then(function () {
        var u = cfg.users.filter(function (x) { return x.email === c.email && x.password === c.password; })[0];
        if (!u) return { data: null, error: { message: 'Invalid login credentials' } };
        session = { id: 'user-' + u.email, email: u.email, admin: !!u.admin }; return { data: { session: session }, error: null }; }); },
      getSession: function () { return Promise.resolve({ data: { session: session } }); },
      signOut: function () { session = null; listeners.forEach(function (l) { l('SIGNED_OUT', null); }); return Promise.resolve({ error: null }); },
      onAuthStateChange: function (cb) { listeners.push(cb); return { data: { subscription: {} } }; }
    },
    from: Query,
    storage: { from: function () { return {
      upload: function (path, blob, o) { return Promise.resolve().then(function () {
        if (!isAdmin()) return { data: null, error: { message: 'new row violates row-level security policy' } };
        if (['image/jpeg', 'image/png', 'image/webp'].indexOf(blob.type) < 0) return { data: null, error: { message: 'mime type not supported' } };
        if (blob.size > 5242880) return { data: null, error: { message: 'The object exceeded the maximum allowed size' } };
        if (state.files[path]) return { data: null, error: { message: 'The resource already exists' } };
        state.files[path] = blob; return { data: { path: path }, error: null }; }); },
      remove: function (paths) { return Promise.resolve().then(function () { if (!isAdmin()) return { data: null, error: { message: 'row-level security' } }; paths.forEach(function (p) { delete state.files[p]; }); return { data: [], error: null }; }); }
    }; } }
  }; } };
})();

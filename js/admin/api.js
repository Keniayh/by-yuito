/* Acceso a Supabase para el panel: autenticación, datos e imágenes.
   Solo usa la clave pública; los permisos reales los imponen las políticas RLS. */
window.Yuito = window.Yuito || {};
(function (Y) {
  var db = null;

  function friendly(e) {
    var m = (e && (e.message || e.error_description)) || '', c = e && e.code;
    if (/Invalid login credentials/i.test(m)) return 'Correo o contraseña incorrectos.';
    if (/Failed to fetch|NetworkError|Load failed|network/i.test(m)) return 'Sin conexión con el servidor. Revise su internet e intente de nuevo.';
    if (c === '23505') return 'Ya existe un registro con ese identificador. Cambie el nombre o el identificador.';
    if (c === '23503') return 'No se puede eliminar: todavía hay productos en esa categoría. Muévalos primero.';
    if (c === '42501' || /row-level security|permission denied|not authorized|JWT/i.test(m)) return 'Su sesión no tiene permiso para esta acción. Cierre sesión e ingrese de nuevo.';
    if (/Payload too large|exceeded the maximum/i.test(m)) return 'La imagen supera el tamaño permitido (5 MB).';
    if (/mime type/i.test(m)) return 'Tipo de archivo no permitido (solo JPEG, PNG o WebP).';
    return m || 'Ocurrió un error inesperado.';
  }
  function unwrap(r) { if (r.error) { var e = new Error(friendly(r.error)); e.raw = r.error; throw e; } return r.data; }

  Y.adminApi = {
    friendly: friendly,
    configured: function () { var s = Y.config.supabase; return !!(s && s.url && s.publishableKey && window.supabase && window.supabase.createClient); },
    init: function () {
      if (!this.configured()) return false;
      db = window.supabase.createClient(Y.config.supabase.url, Y.config.supabase.publishableKey,
        { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
      return true;
    },
    signIn: function (email, password) { return db.auth.signInWithPassword({ email: email, password: password }).then(function (r) { return unwrap(r); }); },
    signOut: function () { return db.auth.signOut(); },
    session: function () { return db.auth.getSession().then(function (r) { return r.data && r.data.session; }); },
    onAuth: function (cb) { db.auth.onAuthStateChange(function (ev, s) { cb(ev, s); }); },
    // true solo si la RLS deja ver la fila propia en "admins"
    isAdmin: function () { return db.from('admins').select('user_id').then(function (r) { return !r.error && r.data && r.data.length === 1; }); },

    categories: function () { return db.from('categories').select('*').order('sort_order').order('name').then(unwrap); },
    saveCategory: function (c) {
      var body = { slug: c.slug, name: c.name, description: c.description || '', sort_order: c.sort_order || 0 };
      return (c.id ? db.from('categories').update(body).eq('id', c.id) : db.from('categories').insert(body)).select().single().then(unwrap);
    },
    deleteCategory: function (id) { return db.from('categories').delete().eq('id', id).then(unwrap); },

    products: function () { return db.from('products').select('*, product_images(*)').order('sort_order').order('name').then(unwrap).then(function (rows) {
      rows.forEach(function (p) { p.product_images = (p.product_images || []).sort(function (a, b) { return a.position - b.position; }); }); return rows; }); },
    saveProduct: function (p) {
      var body = { slug: p.slug, name: p.name, description: p.description, price_cop: p.price_cop, category_id: p.category_id, kind: p.kind,
        status: p.status, availability: p.availability, featured: p.featured, tile_color: p.tile_color, image_mode: p.image_mode,
        cta_label: p.cta_label, whatsapp_message: p.whatsapp_message, sort_order: p.sort_order };
      return (p.id ? db.from('products').update(body).eq('id', p.id) : db.from('products').insert(body)).select().single().then(unwrap);
    },
    patchProduct: function (id, patch) { return db.from('products').update(patch).eq('id', id).select().single().then(unwrap); },
    deleteProduct: function (id) { return db.from('products').delete().eq('id', id).then(unwrap); },

    imageUrl: function (path) { return Y.catalogService.publicImageUrl(path); },
    uploadImage: function (path, blob) {
      return db.storage.from(Y.config.bucket).upload(path, blob, { contentType: blob.type, upsert: false, cacheControl: '31536000' }).then(unwrap);
    },
    removeFiles: function (paths) { if (!paths.length) return Promise.resolve(); return db.storage.from(Y.config.bucket).remove(paths).then(unwrap); },
    addImageRow: function (productId, path, alt, position) { return db.from('product_images').insert({ product_id: productId, storage_path: path, alt: alt || '', position: position }).select().single().then(unwrap); },
    patchImageRow: function (id, patch) { return db.from('product_images').update(patch).eq('id', id).then(unwrap); },
    deleteImageRow: function (id) { return db.from('product_images').delete().eq('id', id).then(unwrap); }
  };
})(window.Yuito);

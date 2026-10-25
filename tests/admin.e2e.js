/* Prueba de interfaz del panel con Supabase SIMULADO (tests/mock-supabase.js).
   Ejecutar: node tests/admin.e2e.js   (requiere playwright y un servidor en :8765) */
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), assert = require('assert');
const ROOT = path.join(__dirname, '..'), BASE = 'http://127.0.0.1:8765', FX = process.env.FX || '/tmp/claude-0/fx', SHOTS = process.env.SHOTS || '/tmp/claude-0/shots/admin';
fs.mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0; const errors = [];
async function t(name, fn) { try { await fn(); pass++; console.log('  ok  ', name); } catch (e) { fail++; console.log('  FALLA', name, '\n        ', e.message.split('\n')[0]); } }

async function newPage(browser, vp, opts = {}) {
  const ctx = await browser.newContext({ viewport: vp, acceptDownloads: true }), page = await ctx.newPage();
  const mock = fs.readFileSync(path.join(__dirname, 'mock-supabase.js'), 'utf8');
  await page.addInitScript('window.__MOCK__ = ' + JSON.stringify({ users: [{ email: 'duena@yuito.test', password: 'secreta123', admin: true }, { email: 'otra@yuito.test', password: 'otra12345', admin: false }], state: opts.state }));
  if (opts.injectMock) await page.addInitScript(mock);
  await page.route('**/vendor/supabase-js-*.js', r => r.fulfill({ contentType: 'text/javascript', body: mock }));
  await page.route('**/js/config.js', async r => { const res = await r.fetch(); let b = await res.text(); b = b.replace(/url: '[^']*'/, "url: 'https://mock.supabase.co'").replace(/publishableKey: '[^']*'/, "publishableKey: 'sb_publishable_test'"); r.fulfill({ response: res, body: b }); });
  await page.route('**/fonts.g*', r => r.abort());
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|ERR_TUNNEL|net::/.test(m.text())) errors.push('console: ' + m.text()); });
  return page;
}
const state = p => p.evaluate(() => JSON.parse(JSON.stringify({ c: window.__mockState.categories.length, p: window.__mockState.products.length, i: window.__mockState.product_images.length, f: Object.keys(window.__mockState.files).length })));
async function login(p, email = 'duena@yuito.test', pw = 'secreta123') { await p.fill('#l-email', email); await p.fill('#l-pass', pw); await p.click('button[type=submit]'); }

(async () => {
  const browser = await chromium.launch();
  const p = await newPage(browser, { width: 1280, height: 900 });
  await p.goto(BASE + '/admin/index.html');

  console.log('Autenticación');
  await t('sin sesión se muestra el login y no el panel', async () => { await p.waitForSelector('#l-email'); assert(await p.locator('#shell').isHidden()); });
  await t('contraseña incorrecta → mensaje claro', async () => { await login(p, 'duena@yuito.test', 'mala'); await p.waitForSelector('.err:not([hidden])'); assert.match(await p.textContent('.err'), /incorrectos/); });
  await t('usuario válido pero NO administrador → rechazado y sin acceso', async () => { await login(p, 'otra@yuito.test', 'otra12345'); await p.waitForFunction(() => /no tiene permiso/.test(document.body.textContent)); assert(await p.locator('#shell').isHidden()); });
  await t('administradora entra', async () => { await login(p); await p.waitForSelector('#shell:not([hidden])'); await p.waitForSelector('#pempty:not([hidden])'); });

  console.log('Catálogo inicial e idempotencia');
  await p.click('.tab:has-text("Respaldo")');
  await t('vista previa del catálogo inicial: 6 por crear, 3 categorías', async () => { await p.click('#bk-seed'); await p.waitForSelector('#bk-apply'); const tx = await p.textContent('.plan'); assert.match(tx, /Productos a crear: 6/); assert.match(tx, /Categorías nuevas: 3/); });
  await t('aplicar importación crea 6 productos con 5 fotos', async () => { await p.click('#bk-apply'); await p.waitForFunction(() => /Listo\./.test(document.querySelector('.bk-out').textContent), null, { timeout: 20000 }); const s = await state(p); assert.deepEqual(s, { c: 3, p: 6, i: 5, f: 5 }); });
  await t('segunda importación: nada que crear (sin duplicados)', async () => { await p.click('#bk-seed'); await p.waitForSelector('text=No hay nada nuevo'); const tx = await p.textContent('.plan'); assert.match(tx, /omitidos \(ya existen\): 6/); assert.equal(await p.locator('#bk-apply').isDisabled(), true); assert.equal((await state(p)).p, 6); });

  console.log('Productos');
  await p.click('.tab:has-text("Productos")'); await p.waitForSelector('.prow');
  await t('la lista muestra los 6 productos', async () => assert.equal(await p.locator('.prow').count(), 6));
  await t('ocultar y volver a publicar', async () => {
    const row = p.locator('.prow[data-slug=cenit]'); await row.getByRole('button', { name: 'Ocultar' }).click(); await p.waitForSelector('.prow[data-slug=cenit] .badge.off');
    assert.equal(await p.evaluate(() => window.__mockState.products.find(x => x.slug === 'cenit').status), 'oculto');
    await p.locator('.prow[data-slug=cenit]').getByRole('button', { name: 'Publicar' }).click(); await p.waitForSelector('.prow[data-slug=cenit] .badge.ok'); });
  await t('marcar agotado', async () => { await p.locator('.prow[data-slug=bruma]').getByRole('button', { name: 'Marcar agotado' }).click(); await p.waitForSelector('.prow[data-slug=bruma] .badge.warn'); });
  await t('mover un producto hacia abajo cambia el orden', async () => { await p.locator('.prow[data-slug=cenit]').getByRole('button', { name: 'Bajar Cenit' }).click(); await p.waitForFunction(() => document.querySelectorAll('.prow')[1].dataset.slug === 'cenit'); });
  await t('búsqueda y filtro', async () => { await p.fill('#psearch', 'cact'); assert.equal(await p.locator('.prow').count(), 1); await p.fill('#psearch', ''); await p.selectOption('#pfilter', 'agotado'); assert.equal(await p.locator('.prow').count(), 1); await p.selectOption('#pfilter', 'todos'); });

  console.log('Editor');
  await p.click('#pnew'); await p.waitForSelector('#e-name');
  await t('validación: nombre vacío', async () => { await p.click('.editor button[type=submit]'); assert.match(await p.textContent('.editor .err'), /nombre es obligatorio/); });
  await t('validación: identificador inválido y precio con letras', async () => { await p.fill('#e-name', 'Bolso Lila'); assert.equal(await p.inputValue('#e-slug'), 'bolso-lila'); await p.fill('#e-slug', 'Mal Slug!'); await p.click('.editor button[type=submit]'); assert.match(await p.textContent('.editor .err'), /identificador/); await p.fill('#e-slug', 'bolso-lila'); await p.fill('#e-price', '12abc'); await p.click('.editor button[type=submit]'); assert.match(await p.textContent('.editor .err'), /precio/); });
  await t('validación: identificador repetido', async () => { await p.fill('#e-price', ''); await p.fill('#e-slug', 'cenit'); await p.click('.editor button[type=submit]'); assert.match(await p.textContent('.editor .err'), /Ya existe/); await p.fill('#e-slug', 'bolso-lila'); });
  await t('archivo falso (.png con texto) y SVG rechazados con mensaje', async () => { await p.setInputFiles('#e-files', [FX + '/fake.png', FX + '/vector.svg']); await p.waitForFunction(() => /no es una imagen JPEG/.test(document.querySelector('.editor').textContent)); assert.equal(await p.locator('.gitem').count(), 0); });
  await t('subir foto grande: se optimiza y se previsualiza', async () => { await p.setInputFiles('#e-files', [FX + '/big.png', FX + '/small.jpg']); await p.waitForFunction(() => document.querySelectorAll('.gitem').length === 2); });
  await t('guardar crea producto, fotos y precio opcional', async () => {
    await p.fill('#e-desc', 'Bolso tejido en tonos lila.'); await p.fill('#e-price', '85.000'); await p.selectOption('#e-status', 'publicado'); await p.check('#e-usecolor'); await p.fill('#e-color', '#cfc3e8');
    await p.fill('.gitem input[type=text] >> nth=0', 'Bolso lila de frente');
    await p.click('.editor button[type=submit]'); await p.waitForSelector('#dlg-edit', { state: 'hidden' }); await p.waitForSelector('.prow[data-slug=bolso-lila]');
    const row = await p.evaluate(() => { const s = window.__mockState, pr = s.products.find(x => x.slug === 'bolso-lila'); return { pr, imgs: s.product_images.filter(i => i.product_id === pr.id).map(i => [i.position, i.alt, i.storage_path]), files: Object.keys(s.files).filter(f => f.startsWith('products/bolso-lila/')).length }; });
    assert.equal(row.pr.price_cop, 85000); assert.equal(row.pr.tile_color, '#cfc3e8'); assert.equal(row.pr.status, 'publicado'); assert.equal(row.imgs.length, 2); assert.equal(row.imgs[0][1], 'Bolso lila de frente'); assert.equal(row.files, 2); });
  await t('las fotos se redujeron a ≤1600 px y ≤5 MB', async () => { const dims = await p.evaluate(async () => { const s = window.__mockState, out = []; for (const [k, b] of Object.entries(s.files)) if (k.startsWith('products/bolso-lila/')) { const bm = await createImageBitmap(b); out.push([bm.width, bm.height, b.size, b.type]); } return out; }); dims.forEach(d => { assert(Math.max(d[0], d[1]) <= 1600); assert(d[2] <= 5242880); }); });
  await t('editar: precio vacío = «Consultar precio»; quitar una foto borra archivo y fila', async () => {
    await p.locator('.prow[data-slug=bolso-lila]').getByRole('button', { name: 'Editar' }).click(); await p.waitForSelector('#e-name');
    assert.equal(await p.inputValue('#e-slug') , 'bolso-lila'); assert.equal(await p.locator('#e-slug').getAttribute('readonly') !== null, true);
    await p.fill('#e-price', ''); await p.click('.gitem >> nth=1 >> text=Quitar'); await p.click('.editor button[type=submit]'); await p.waitForSelector('#dlg-edit', { state: 'hidden' });
    const r = await p.evaluate(() => { const s = window.__mockState, pr = s.products.find(x => x.slug === 'bolso-lila'); return [pr.price_cop, s.product_images.filter(i => i.product_id === pr.id).length, Object.keys(s.files).filter(f => f.startsWith('products/bolso-lila/')).length]; });
    assert.deepEqual(r, [null, 1, 1]); });
  await t('cerrar el editor con cambios pide confirmación', async () => { await p.locator('.prow[data-slug=bolso-lila]').getByRole('button', { name: 'Editar' }).click(); await p.fill('#e-name', 'Cambio sin guardar'); await p.click('.editor >> text=Cerrar'); await p.waitForSelector('#dlg-confirm[open]'); await p.click('#dlg-confirm button:has-text("Cancelar")'); assert(await p.locator('#dlg-edit[open]').count() === 1); await p.click('.editor >> text=Cerrar'); await p.click('#dlg-confirm button:has-text("Descartar")'); await p.waitForSelector('#dlg-edit', { state: 'hidden' }); assert.equal(await p.evaluate(() => window.__mockState.products.find(x => x.slug === 'bolso-lila').name), 'Bolso Lila'); });
  await t('eliminar pide confirmación y limpia fotos', async () => { await p.locator('.prow[data-slug=bolso-lila]').getByRole('button', { name: 'Eliminar' }).click(); await p.click('#dlg-confirm button:has-text("Eliminar definitivamente")'); await p.waitForFunction(() => !document.querySelector('.prow[data-slug=bolso-lila]')); const s = await state(p); assert.deepEqual(s, { c: 3, p: 6, i: 5, f: 5 }); });

  console.log('Categorías');
  await p.click('.tab:has-text("Categorías")'); await p.waitForSelector('.crow');
  await t('añadir categoría nueva y rechazar duplicada', async () => { await p.fill('#c-name', 'Accesorios de Verano'); await p.click('form.box button[type=submit]'); await p.waitForFunction(() => document.querySelectorAll('.crow').length === 4); assert.equal(await p.evaluate(() => window.__mockState.categories.at(-1).slug), 'accesorios-de-verano'); await p.fill('#c-name', 'accesorios de verano'); await p.click('form.box button[type=submit]'); assert.match(await p.textContent('form.box .err'), /Ya existe/); });
  await t('no se puede eliminar una categoría con productos', async () => { await p.locator('.crow >> nth=0').getByRole('button', { name: 'Eliminar' }).click(); await p.click('#dlg-confirm button:has-text("Eliminar")'); await p.waitForSelector('.toast.error.show'); assert.match(await p.textContent('#toast'), /todavía hay productos/); assert.equal(await p.locator('.crow').count(), 4); });
  await t('eliminar una categoría vacía', async () => { await p.locator('.crow >> nth=3').getByRole('button', { name: 'Eliminar' }).click(); await p.click('#dlg-confirm button:has-text("Eliminar")'); await p.waitForFunction(() => document.querySelectorAll('.crow').length === 3); });

  console.log('Exportar y recuperar');
  await p.click('.tab:has-text("Respaldo")');
  let exported;
  await t('exportar descarga un JSON válido con fotos embebidas', async () => { const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#bk-export')]); exported = await dl.path(); const doc = JSON.parse(fs.readFileSync(exported, 'utf8')); const F = require('../js/admin/catalog-format.js'); const v = F.validate(doc); assert(v.ok, v.errors.join('|')); assert.equal(doc.products.length, 6); assert.equal(doc.products.reduce((n, x) => n + x.images.length, 0), 5); assert(/yuito-catalogo-\d{4}-\d{2}-\d{2}\.json/.test(dl.suggestedFilename())); });
  await t('simular pérdida total y restaurar desde la copia', async () => {
    await p.evaluate(() => { const s = window.__mockState; s.products.length = 0; s.product_images.length = 0; s.categories.length = 0; for (const k of Object.keys(s.files)) delete s.files[k]; });
    await p.setInputFiles('#bk-file', exported); await p.waitForSelector('#bk-apply:not([disabled])'); assert.match(await p.textContent('.plan'), /Productos a crear: 6/);
    await p.click('#bk-apply'); await p.waitForFunction(() => /Listo\./.test(document.querySelector('.bk-out').textContent), null, { timeout: 20000 });
    assert.deepEqual(await state(p), { c: 3, p: 6, i: 5, f: 5 });
    const same = await p.evaluate(() => window.__mockState.products.map(x => [x.slug, x.name, x.status, x.tile_color, x.whatsapp_message]).sort().join('|')); const doc = JSON.parse(fs.readFileSync(exported, 'utf8')); assert.equal(same, doc.products.map(x => [x.slug, x.name, x.status, x.tile_color, x.whatsapp_message]).sort().join('|')); });
  await t('restaurar dos veces no duplica', async () => { await p.setInputFiles('#bk-file', exported); await p.waitForSelector('text=No hay nada nuevo'); assert.equal((await state(p)).p, 6); });
  await t('importación interrumpida: producto sin fotos se completa sin duplicar', async () => {
    await p.evaluate(() => { const s = window.__mockState; const pr = s.products.find(x => x.slug === 'cenit'); s.product_images = s.product_images.filter(i => i.product_id !== pr.id); });
    await p.setInputFiles('#bk-file', exported); await p.waitForSelector('#bk-apply:not([disabled])'); assert.match(await p.textContent('.plan'), /añadirán fotos: 1/); await p.click('#bk-apply'); await p.waitForFunction(() => /Listo\./.test(document.querySelector('.bk-out').textContent)); assert.equal((await state(p)).p, 6); assert.equal(await p.evaluate(() => window.__mockState.product_images.length), 5); });
  await t('archivos inválidos se rechazan con explicación', async () => {
    for (const [f, re] of [['bad.json', /JSON válido/], ['other.json', /no es un respaldo/], ['evil.json', /slug|precio|imagen/]]) { await p.setInputFiles('#bk-file', FX + '/' + f); await p.waitForFunction(() => /No se puede importar|JSON válido|no es un respaldo/.test(document.querySelector('.bk-out').textContent)); assert.match(await p.textContent('.bk-out'), re, f); assert.equal(await p.locator('#bk-apply').count(), 0); } });

  console.log('Sesión');
  await t('cerrar sesión vuelve al login', async () => { await p.click('#logout'); await p.waitForSelector('#l-email'); assert(await p.locator('#shell').isHidden()); });
  await p.context().close();

  console.log('Escritura sin ser administradora (defensa simulada)');
  const q = await newPage(browser, { width: 1280, height: 900 }); await q.goto(BASE + '/admin/index.html'); await q.waitForSelector('#l-email');
  await t('un usuario no admin no puede escribir ni subir (el mock aplica la regla; la RLS real se probó en Postgres)', async () => {
    const r = await q.evaluate(async () => { const c = window.supabase.createClient(); await c.auth.signInWithPassword({ email: 'otra@yuito.test', password: 'otra12345' }); const a = await c.from('products').insert({ slug: 'x', name: 'x', category_id: 'c' }).select().single(); const b = await c.storage.from('product-images').upload('products/x/a.png', new Blob(['a'], { type: 'image/png' })); return [a.error && a.error.code, b.error && b.error.message]; });
    assert.equal(r[0], '42501'); assert(/row-level/.test(r[1])); });
  await q.context().close();

  console.log('Tienda pública leyendo del origen simulado');
  const evilName = '<img src=x onerror="window.__xss=1">Bolso <b>negrita</b>';
  const pub = await newPage(browser, { width: 1280, height: 900 }, { injectMock: true, state: { categories: [{ id: 'c1', slug: 'bolsos', name: 'Bolsos', description: '', sort_order: 1 }, { id: 'c2', slug: 'otros', name: 'Otros', description: '', sort_order: 2 }],
    products: [{ id: 'p1', slug: 'visible', name: evilName, description: '<script>window.__xss=2</script>texto', price_cop: 120000, category_id: 'c1', kind: 'pieza', status: 'publicado', availability: 'disponible', featured: true, tile_color: '#cfc3e8', image_mode: 'recorte', cta_label: null, whatsapp_message: null, sort_order: 1 },
      { id: 'p2', slug: 'oculto', name: 'SECRETO-OCULTO', description: '', price_cop: null, category_id: 'c1', kind: 'pieza', status: 'oculto', availability: 'disponible', featured: false, tile_color: null, image_mode: 'recorte', sort_order: 2 },
      { id: 'p3', slug: 'agotado', name: 'Pieza agotada', description: '', price_cop: null, category_id: 'c2', kind: 'pieza', status: 'publicado', availability: 'agotado', featured: false, tile_color: 'url(javascript:1)', image_mode: 'foto', sort_order: 3 }],
    product_images: [{ id: 'i1', product_id: 'p1', storage_path: 'products/visible/a b.webp', alt: 'foto', position: 0 }], files: {} } });
  pub.on('request', r => { if (/mock\.supabase\.co\/rest/.test(r.url())) pub.__rest = (pub.__rest || []).concat(r.url()); });
  await pub.route('https://mock.supabase.co/rest/v1/**', async r => {
    const u = r.request().url(), body = await pub.evaluate(u => { const c = window.supabase.createClient(); const t = u.split('/rest/v1/')[1].split('?')[0]; return c.from(t).select(t === 'products' ? '*, product_images(*)' : '*').then(x => x.data); }, u);
    const rows = body.map(x => x.product_images ? Object.assign({}, x, { categories: JSON.parse(JSON.stringify([{ slug: x.category_id === 'c1' ? 'bolsos' : 'otros', name: x.category_id === 'c1' ? 'Bolsos' : 'Otros', description: '', sort_order: 1 }][0])) }) : x);
    r.fulfill({ contentType: 'application/json', body: JSON.stringify(rows.filter(x => x.status === undefined || x.status === 'publicado')) }); });
  await pub.goto(BASE + '/index.html'); await pub.waitForSelector('.piece');
  await t('solo se muestran los publicados (el oculto no aparece)', async () => { const tx = await pub.textContent('#sheet'); assert(!/SECRETO/.test(tx)); assert.equal(await pub.locator('.piece').count(), 2); });
  await t('texto con HTML se muestra literal y no ejecuta nada (XSS)', async () => { assert.equal(await pub.evaluate(() => window.__xss), undefined); assert(/<img src=x/.test(await pub.textContent('.piece h3'))); assert.equal(await pub.locator('.piece h3 img, .piece h3 b').count(), 0); });
  await t('precio con formato y «Consultar precio» cuando no hay', async () => { const pr = await pub.locator('.price').allTextContents(); assert(/120\.000/.test(pr[0])); assert.equal(pr[1], 'Consultar precio'); });
  await t('color inválido se ignora (usa pastel de respaldo); agotado se señala', async () => { assert(await pub.locator('.is-out .tag.out').count() === 1); const st = await pub.locator('.piece.is-out').evaluate(n => n.style.getPropertyValue('--tile').trim()); assert.match(st, /^#[0-9a-f]{6}$/i, st); assert.equal(await pub.locator('.piece >> nth=0').evaluate(n => n.style.getPropertyValue('--tile').trim()), '#cfc3e8'); });
  await t('URL de la foto con espacios se codifica', async () => { assert.match(await pub.locator('.plate img').first().getAttribute('src'), /product-images\/products\/visible\/a%20b\.webp$/); });
  await pub.context().close();

  console.log('Móvil');
  const m = await newPage(browser, { width: 390, height: 844 }); await m.goto(BASE + '/admin/index.html'); await m.waitForSelector('#l-email'); await login(m); await m.waitForSelector('#shell:not([hidden])');
  await m.click('.tab:has-text("Respaldo")'); await m.click('#bk-seed'); await m.click('#bk-apply'); await m.waitForFunction(() => /Listo\./.test(document.querySelector('.bk-out').textContent), null, { timeout: 20000 });
  await m.click('.tab:has-text("Productos")'); await m.waitForSelector('.prow');
  await m.screenshot({ path: SHOTS + '/movil-lista.png', fullPage: true });
  await t('móvil: sin desbordamiento horizontal en la lista', async () => assert.equal(await m.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0));
  await t('móvil: botones tocables ≥ 44 px', async () => { const small = await m.evaluate(() => [...document.querySelectorAll('.prow button, .tab, #pnew, #logout')].filter(b => b.offsetParent && (b.getBoundingClientRect().height < 43.5 || b.getBoundingClientRect().width < 43.5)).map(b => b.textContent + ':' + Math.round(b.getBoundingClientRect().width) + 'x' + Math.round(b.getBoundingClientRect().height))); assert.equal(small.length, 0, small.join(',')); });
  await m.click('#pnew'); await m.waitForSelector('#e-name'); await m.setInputFiles('#e-files', FX + '/small.jpg'); await m.waitForSelector('.gitem'); await m.fill('#e-name', 'Prueba móvil');
  await m.screenshot({ path: SHOTS + '/movil-editor.png' });
  await t('móvil: el editor ocupa la pantalla sin desbordar', async () => { const o = await m.evaluate(() => { const d = document.getElementById('dlg-edit'); return [d.scrollWidth - d.clientWidth, Math.round(d.getBoundingClientRect().width)]; }); assert.equal(o[0], 0); assert.equal(o[1], 390); });
  await m.context().close();

  console.log('Errores de consola/JS durante todas las pruebas:', errors.length, errors.slice(0, 5));
  if (errors.length) fail++;
  console.log(`\nResultado: ${pass} correctas, ${fail} fallidas`);
  await browser.close(); process.exit(fail ? 1 : 0);
})();

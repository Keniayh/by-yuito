/* Quitar fondo en el panel (Supabase simulado, modelo real en el navegador).
   node tests/bgremove.e2e.js FOTO.png [REFERENCIA_REMBG.png]   (servidor en :8765) */
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), assert = require('assert');
const FOTO = process.argv[2], REF = process.argv[3], SHOTS = process.env.SHOTS || '/tmp/claude-0/shots/bg';
fs.mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0; const t = async (n, f) => { try { await f(); pass++; console.log('  ok  ', n); } catch (e) { fail++; console.log('  FALLA', n, '—', e.message); } };
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }), p = await ctx.newPage();
  const errors = []; p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/net::|ERR_/.test(m.text())) errors.push(m.text()); });
  await p.addInitScript('window.__MOCK__=' + JSON.stringify({ users: [{ email: 'a@b.c', password: 'x', admin: true }], state: { categories: [{ id: 'c1', slug: 'bolsos', name: 'Bolsos', description: '', sort_order: 1 }], products: [], product_images: [], files: {} } }));
  await p.route('**/vendor/supabase-js-*.js', r => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(__dirname, 'mock-supabase.js'), 'utf8') }));
  await p.route('**/js/config.js', async r => { const res = await r.fetch(); r.fulfill({ response: res, body: (await res.text()).replace(/url: '[^']*'/, "url: 'https://mock.supabase.co'").replace(/publishableKey: '[^']*'/, "publishableKey: 'k'") }); });
  await p.route('**/fonts.g*', r => r.abort());
  await p.goto('http://127.0.0.1:8765/admin/index.html'); await p.fill('#l-email', 'a@b.c'); await p.fill('#l-pass', 'x'); await p.click('button[type=submit]');
  await p.waitForSelector('#pnew'); await p.click('#pnew'); await p.waitForSelector('#e-autocut');
  await t('la casilla «Quitar el fondo automáticamente» viene marcada', async () => assert(await p.isChecked('#e-autocut')));
  const t0 = Date.now();
  await p.setInputFiles('#e-files', FOTO);
  await p.waitForSelector('.gthumb.busy'); await p.waitForSelector('.gthumb:not(.busy)', { timeout: 120000 });
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  await t('se quita el fondo sin errores (' + secs + ' s, incluye descarga del modelo)', async () => { assert.match(await p.textContent('.editor'), /Fondo quitado/); });
  const info = await p.evaluate(async () => {
    const el = document.querySelector('.gthumb img'); await el.decode(); const bm = await createImageBitmap(el);
    const c = new OffscreenCanvas(bm.width, bm.height), x = c.getContext('2d'); x.drawImage(bm, 0, 0); const d = x.getImageData(0, 0, bm.width, bm.height).data;
    const a = (px, py) => d[(py * bm.width + px) * 4 + 3]; let transp = 0, opaque = 0; for (let i = 3; i < d.length; i += 4) { if (d[i] < 20) transp++; if (d[i] > 235) opaque++; }
    return { type: 'image', w: bm.width, h: bm.height, corners: [a(0, 0), a(bm.width - 1, 0), a(0, bm.height - 1), a(bm.width - 1, bm.height - 1)], opaque: opaque / (d.length / 4), transp: transp / (d.length / 4), dataUrl: c.convertToBlob ? null : null };
  });
  console.log('       resultado:', JSON.stringify(info));
  await t('resultado WebP/PNG con transparencia', async () => { assert(info.transp > 0.05); });
  await t('esquinas transparentes y pieza opaca', async () => { assert(info.corners.every(v => v < 30), info.corners); assert(info.opaque > 0.2, info.opaque); });
  await t('«Usar original» y «Usar sin fondo» alternan', async () => { const s1 = await p.getAttribute('.gthumb img', 'src'); await p.click('text=Usar original'); const s2 = await p.getAttribute('.gthumb img', 'src'); assert.notEqual(s1, s2); await p.click('text=Usar sin fondo'); assert.equal(await p.getAttribute('.gthumb img', 'src'), s1); });
  await t('al guardar se sube la versión sin fondo', async () => { await p.fill('#e-name', 'Prueba fondo'); await p.click('.editor button[type=submit]'); await p.waitForSelector('#dlg-edit', { state: 'hidden' });
    const up = await p.evaluate(() => { const f = Object.entries(window.__mockState.files)[0]; return f ? [f[0], f[1].type, f[1].size] : null; }); assert(up && /\.(webp|png)$/.test(up[0]) && /webp|png/.test(up[1]), JSON.stringify(up)); });
  const b64 = await p.evaluate(async () => { const f = Object.values(window.__mockState.files)[0]; const buf = new Uint8Array(await f.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000)); return [f.type, btoa(s)]; });
  fs.writeFileSync(SHOTS + '/recorte.' + (b64[0] === 'image/png' ? 'png' : 'webp'), Buffer.from(b64[1], 'base64')); console.log('       guardado', SHOTS + '/recorte', b64[0], Math.round(b64[1].length * 0.75 / 1024), 'KB');
  await t('segunda foto usa el modelo en caché (más rápido)', async () => { await p.click('text=Editar'); await p.waitForSelector('#e-autocut'); const t1 = Date.now(); await p.setInputFiles('#e-files', FOTO); await p.waitForSelector('.gitem:nth-child(2) .gthumb:not(.busy)', { timeout: 60000 }); console.log('       segunda vez:', ((Date.now() - t1) / 1000).toFixed(1), 's'); });
  await p.click('#dlg-edit >> text=Cerrar'); await p.click('#dlg-confirm button:has-text("Descartar")').catch(() => {});
  await t('foto YA guardada con fondo: botón «Quitar fondo» la reemplaza al guardar', async () => {
    await p.route('**/__fixture.png', r => r.fulfill({ path: FOTO, contentType: 'image/png' }));
    await p.evaluate(async () => { const s = window.__mockState, blob = await fetch('/__fixture.png').then(r => r.blob());
      s.products.push({ id: 'pv', slug: 'vieja', name: 'Foto vieja', description: '', price_cop: null, category_id: 'c1', kind: 'pieza', status: 'publicado', availability: 'disponible', featured: false, tile_color: null, image_mode: 'foto', cta_label: null, whatsapp_message: null, sort_order: 9 });
      s.product_images.push({ id: 'iv', product_id: 'pv', storage_path: 'products/vieja/original.png', alt: 'vieja', position: 0 }); s.files['products/vieja/original.png'] = blob; });
    await p.click('.tab:has-text("Categorías")'); await p.click('.tab:has-text("Productos")'); await p.waitForSelector('.prow[data-slug=vieja]');
    await p.locator('.prow[data-slug=vieja]').getByRole('button', { name: 'Editar' }).click(); await p.waitForSelector('.gitem');
    await p.click('.gitem >> text=Quitar fondo'); await p.waitForSelector('.gitem >> text=Usar original', { timeout: 60000 });
    assert.equal(await p.inputValue('#e-mode'), 'recorte');
    await p.click('.editor button[type=submit]'); await p.waitForSelector('#dlg-edit', { state: 'hidden' });
    const st = await p.evaluate(() => { const s = window.__mockState, im = s.product_images.filter(i => i.product_id === 'pv'); return { n: im.length, path: im[0].storage_path, alt: im[0].alt, old: !!s.files['products/vieja/original.png'], nuevo: !!s.files[im[0].storage_path], mode: s.products.find(x => x.id === 'pv').image_mode }; });
    assert.equal(st.n, 1, 'no debe duplicar'); assert(/\.(webp|png)$/.test(st.path) && st.path !== 'products/vieja/original.png', st.path); assert(st.nuevo); assert(!st.old, 'debe borrar el archivo viejo'); assert.equal(st.alt, 'vieja'); assert.equal(st.mode, 'recorte'); });
  await p.screenshot({ path: SHOTS + '/editor.png' });
  await t('sin errores de consola (incluida la política CSP)', async () => assert.equal(errors.length, 0, errors.join(' | ')));
  console.log(`Resultado: ${pass} correctas, ${fail} fallidas`); await b.close(); process.exit(fail ? 1 : 0);
})();

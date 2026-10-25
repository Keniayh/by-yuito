/* Paginación con 100 productos de prueba (Supabase simulado). node tests/pager.e2e.js con servidor en :8765 */
const { chromium } = require('playwright'), assert = require('assert');
const SHOTS = process.env.SHOTS || '/tmp/claude-0/shots/pager';
require('fs').mkdirSync(SHOTS, { recursive: true });
const photos = ['cenit', 'bruma', 'browni', 'bolso-de-mano', 'cactus-amigurumi'];
const cats = [{ slug: 'bolsos', name: 'Bolsos' }, { slug: 'amigurumis', name: 'Amigurumis' }, { slug: 'otros', name: 'Otros' }];
const rows = Array.from({ length: 100 }, (_, i) => ({ slug: 'pieza-' + (i + 1), name: 'Pieza ' + (i + 1), description: 'Producto de prueba número ' + (i + 1) + '.', price_cop: i % 3 ? null : 50000 + i * 1000,
  kind: 'pieza', availability: i % 7 ? 'disponible' : 'agotado', featured: false, tile_color: null, image_mode: 'recorte', cta_label: null, whatsapp_message: null, sort_order: i + 1,
  categories: Object.assign({ description: '', sort_order: 1 }, cats[i % 10 < 6 ? 0 : i % 10 < 9 ? 1 : 2]), product_images: [{ storage_path: 'x/' + photos[i % 5] + '.webp', alt: '', position: 0 }] }));
let pass = 0, fail = 0; const t = async (n, f) => { try { await f(); pass++; console.log('  ok  ', n); } catch (e) { fail++; console.log('  FALLA', n, '—', e.message); } };
(async () => {
  const b = await chromium.launch();
  async function open(vp) {
    const p = await b.newPage({ viewport: vp });
    await p.route('**/fonts.g*', r => r.abort());
    await p.route('**/js/config.js', async r => { const res = await r.fetch(); let s = await res.text(); s = s.replace(/url: '[^']*'/, "url: 'https://mock.supabase.co'").replace(/publishableKey: '[^']*'/, "publishableKey: 'k'"); r.fulfill({ response: res, body: s }); });
    await p.route('https://mock.supabase.co/rest/v1/**', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify(/categories\?/.test(r.request().url()) ? cats.map((c, i) => ({ slug: c.slug, sort_order: i + 1 })) : rows) }));
    await p.route('https://mock.supabase.co/storage/**', r => { const f = r.request().url().split('/').pop(); r.fulfill({ path: require('path').join(__dirname, '..', 'assets/images/products', f) }); });
    await p.goto('http://127.0.0.1:8765/index.html'); await p.waitForSelector('.piece'); return p;
  }
  const p = await open({ width: 1440, height: 900 });
  const names = () => p.$$eval('#sheet .piece h3', a => a.map(x => x.textContent));
  await t('página 1: 9 productos (Pieza 1 a 9)', async () => { const n = await names(); assert.equal(n.length, 9); assert.equal(n[0], 'Pieza 1'); assert.equal(n[8], 'Pieza 9'); });
  await t('12 páginas; se ve 1 2 … 12 y «Anterior» desactivado', async () => { const t = await p.$$eval('#pager .pg', a => a.map(x => x.textContent.trim())); assert.deepEqual(t, ['‹ Anterior', '1', '2', '…', '12', 'Siguiente ›']); assert(await p.locator('#pager .pg.nav').first().isDisabled()); });
  await t('«Siguiente» pasa a la página 2 (Pieza 10 a 18) y sube al catálogo', async () => { await p.click('text=Siguiente'); const n = await names(); assert.equal(n[0], 'Pieza 10'); assert.equal(n.length, 9); assert.equal(await p.getAttribute('#pager [aria-current=page]', 'aria-label'), 'Página 2'); });
  await t('última página tiene 1 producto (Pieza 100) y «Siguiente» desactivado', async () => { await p.click('#pager [aria-label="Página 12"]'); const n = await names(); assert.deepEqual(n, ['Pieza 100']); assert(await p.locator('#pager .pg.nav').last().isDisabled()); });
  await t('numeración N.º sigue el catálogo completo', async () => assert.match(await p.textContent('#sheet .meta'), /N\.º 100/));
  await t('filtrar categoría vuelve a la página 1 y recalcula páginas', async () => { await p.click('.chip[data-slug=amigurumis]'); const n = await names(); assert.equal(n.length, 9); assert.equal(n[0], 'Pieza 7'); const pages = await p.$$eval('#pager .pg:not(.nav):not(.gap)', a => a.length); assert(pages >= 2); });
  await t('Otros (10 piezas) → 2 páginas; con 9 o menos se oculta la paginación', async () => { await p.click('.chip[data-slug=otros]'); assert.equal((await names()).length, 9); assert.equal(await p.$$eval('#pager .pg:not(.nav):not(.gap)', a => a.length), 2); await p.evaluate(() => { const c = window.Yuito.catalog.products; window.__bak = c.splice(9); }); await p.click('.chip[data-slug=bolsos]'); assert(await p.isHidden('#pager')); await p.evaluate(() => { window.Yuito.catalog.products.push(...window.__bak); }); await p.click('.chip[data-slug=todo]'); assert(await p.isVisible('#pager')); });
  await t('enlace de la portada a una pieza lejana abre su página', async () => { await p.click('.chip[data-slug=todo]'); await p.click('#pager [aria-label="Página 12"]'); await p.click('#roll-list a >> nth=2'); await p.waitForTimeout(300); assert.equal(await p.getAttribute('#pager [aria-current=page]', 'aria-label'), 'Página 1'); assert(await p.isVisible('#p-pieza-3')); });
  await p.click('#pager [aria-label="Página 2"]'); await p.waitForTimeout(700);
  await p.screenshot({ path: SHOTS + '/escritorio.png', fullPage: false, clip: undefined });
  const m = await open({ width: 390, height: 844 });
  await t('móvil: sin desbordamiento y botones de página ≥ 44 px', async () => { assert.equal(await m.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0); const small = await m.$$eval('#pager .pg:not(.gap)', a => a.filter(x => x.getBoundingClientRect().height < 43.5 || x.getBoundingClientRect().width < 43.5).length); assert.equal(small, 0); });
  await m.locator('#pager').scrollIntoViewIfNeeded(); await m.waitForTimeout(700);
  await m.screenshot({ path: SHOTS + '/movil.png' });
  console.log(`Resultado: ${pass} correctas, ${fail} fallidas`); await b.close(); process.exit(fail ? 1 : 0);
})();

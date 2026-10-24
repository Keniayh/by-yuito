const { chromium } = require('playwright'), fs = require('fs');
(async () => {
  const b = await chromium.launch(); let ok = 0, bad = 0; const t = (n, c) => { c ? ok++ : bad++; console.log(c ? '  ok  ' : '  FALLA', n); };
  async function mk() { const ctx = await b.newContext(); const p = await ctx.newPage();
    await p.route('**/js/config.js', async r => { const res = await r.fetch(); let s = await res.text(); s = s.replace("url: ''", "url: 'https://mock.supabase.co'").replace("publishableKey: ''", "publishableKey: 'k'"); r.fulfill({ response: res, body: s }); });
    await p.route('**/fonts.g*', r => r.abort()); return [ctx, p]; }
  // 1) sin config: admin muestra aviso
  { const ctx = await b.newContext(), p = await ctx.newPage(); await p.route('**/fonts.g*', r => r.abort()); await p.goto('http://127.0.0.1:8765/admin/index.html'); await p.waitForSelector('h1');
    t('admin sin configurar muestra «Falta configurar Supabase»', /Falta configurar/.test(await p.textContent('h1'))); t('admin sin configurar no muestra el panel', await p.locator('#shell').isHidden()); await ctx.close(); }
  // 2) config pero red caída y sin copia → catálogo inicial
  { const [ctx, p] = await mk(); await p.route('https://mock.supabase.co/**', r => r.abort()); await p.goto('http://127.0.0.1:8765/index.html'); await p.waitForSelector('.piece', { timeout: 20000 });
    t('red caída sin copia local → muestra los 6 del catálogo inicial', await p.locator('.piece').count() === 6); await ctx.close(); }
  // 3) copia local previa + red caída → usa copia y avisa
  { const [ctx, p] = await mk(); await p.route('https://mock.supabase.co/**', r => r.abort());
    await p.addInitScript(() => { try { if (!localStorage.getItem('yuito.catalog.v1')) localStorage.setItem('yuito.catalog.v1', JSON.stringify({ at: 1, order: {}, products: [{ slug: 'x', name: 'Desde copia', description: '', price_cop: 5000, category: { slug: 'bolsos', name: 'Bolsos', description: '' }, kind: 'pieza', availability: 'disponible', featured: false, tile_color: null, image_mode: 'recorte', cta_label: null, whatsapp_message: null, sort_order: 1, images: [] }] })); } catch (e) {} });
    await p.goto('http://127.0.0.1:8765/index.html'); await p.waitForSelector('.piece', { timeout: 20000 });
    t('red caída con copia → usa la copia y lo avisa', (await p.textContent('#sheet')).includes('Desde copia') && /última copia guardada/.test(await p.textContent('#state'))); await ctx.close(); }
  // 4) respuesta válida pero vacía → mensaje de vacío (no cae al seed)
  { const [ctx, p] = await mk(); await p.route('https://mock.supabase.co/**', r => r.fulfill({ contentType: 'application/json', body: '[]' }));
    await p.goto('http://127.0.0.1:8765/index.html'); await p.waitForFunction(() => /no hay piezas publicadas/.test(document.getElementById('state').textContent), null, { timeout: 20000 });
    t('catálogo vacío en servidor → mensaje de vacío, no se resucita el inicial', await p.locator('.piece').count() === 0); await ctx.close(); }
  // 5) error 500 del servidor → cae a seed
  { const [ctx, p] = await mk(); await p.route('https://mock.supabase.co/**', r => r.fulfill({ status: 500, body: 'x' }));
    await p.goto('http://127.0.0.1:8765/index.html'); await p.waitForSelector('.piece', { timeout: 20000 }); t('HTTP 500 → catálogo inicial', await p.locator('.piece').count() === 6); await ctx.close(); }
  console.log(ok, 'correctas,', bad, 'fallidas'); await b.close(); process.exit(bad ? 1 : 0);
})();

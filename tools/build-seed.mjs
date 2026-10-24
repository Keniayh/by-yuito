// Genera js/data/seed-catalog.json a partir del content.js ORIGINAL (git HEAD de main),
// copiando textos, botones y mensajes de WhatsApp sin retipearlos.
import { execSync } from 'node:child_process';
import vm from 'node:vm';
import fs from 'node:fs';

const src = execSync('git show origin/main:js/data/content.js', { encoding: 'utf8' });
const sandbox = { window: {} };
vm.runInNewContext(src, sandbox);
const { products, categories } = sandbox.window.Yuito.data;

const meta = {
  'Cenit':              { slug: 'cenit',              cat: 'bolsos',     color: '#b8cdea', img: 'cenit.webp' },
  'Bruma':              { slug: 'bruma',              cat: 'bolsos',     color: '#cfc3e8', img: 'bruma.webp' },
  'Browni':             { slug: 'browni',             cat: 'bolsos',     color: '#e6d3b5', img: 'browni.webp' },
  'Bolso de mano':      { slug: 'bolso-de-mano',      cat: 'bolsos',     color: '#c9ccb4', img: 'bolso-de-mano.webp' },
  'Cactus amigurumi':   { slug: 'cactus-amigurumi',   cat: 'amigurumis', color: '#efe0a6', img: 'cactus-amigurumi.webp' },
  'Diseño a su medida': { slug: 'diseno-a-su-medida', cat: 'otros',      color: '#f1d2dc', img: null, kind: 'servicio' }
};
const catText = {
  bolsos: categories.find(c => c.title === 'Bolsos').text,
  amigurumis: categories.find(c => c.title === 'Amigurumis').text,
  otros: categories.find(c => c.title === 'Pedidos especiales').text
};

const out = {
  format: 'yuito-catalog', version: 1,
  note: 'Catálogo inicial: los seis productos originales. Se carga desde Admin > Respaldo > Cargar catálogo inicial.',
  categories: [
    { slug: 'bolsos',     name: 'Bolsos',     description: catText.bolsos,     sort_order: 1 },
    { slug: 'amigurumis', name: 'Amigurumis', description: catText.amigurumis, sort_order: 2 },
    { slug: 'otros',      name: 'Otros',      description: catText.otros,      sort_order: 3 }
  ],
  products: products.map((p, i) => {
    const m = meta[p.name];
    if (!m) throw new Error('Producto sin metadatos: ' + p.name);
    return {
      slug: m.slug, name: p.name, description: p.text, price_cop: null,
      category: m.cat, kind: m.kind || 'pieza', status: 'publicado', availability: 'disponible',
      featured: false, tile_color: m.color, image_mode: 'recorte',
      cta_label: p.cta, whatsapp_message: p.msg, sort_order: i + 1,
      images: m.img ? [{ src: 'assets/images/products/' + m.img, alt: p.alt, position: 0 }] : []
    };
  })
};
fs.writeFileSync('js/data/seed-catalog.json', JSON.stringify(out, null, 2) + '\n');
console.log('productos:', out.products.length, '| con foto:', out.products.filter(p => p.images.length).length);

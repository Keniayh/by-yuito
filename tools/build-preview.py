"""Genera un HTML autónomo de la tienda (CSS, JS, catálogo inicial y fotos embebidos) para vista previa.
Uso: python3 tools/build-preview.py salida.html"""
import re, json, base64, sys
html = open('index.html', encoding='utf-8').read()
html = re.sub(r'<link rel="stylesheet" href="(css/[^"]+)">', lambda m: '<style>\n' + open(m.group(1), encoding='utf-8').read() + '\n</style>', html)
seed = json.load(open('js/data/seed-catalog.json', encoding='utf-8'))
for p in seed['products']:
    for im in p['images']:
        im['src'] = 'data:image/webp;base64,' + base64.b64encode(open(im['src'], 'rb').read()).decode()
def js(path):
    src = open(path, encoding='utf-8').read()
    if path == 'js/services/catalog-service.js':
        a = "return fetch('js/data/seed-catalog.json').then(function (r) { if (!r.ok) throw new Error('seed'); return r.json(); }).then(function (seed) {"
        assert a in src; src = src.replace(a, "return Promise.resolve(window.__SEED__).then(function (seed) {")
    if path == 'js/lib/dom.js':
        a = "if (/^https:\\/\\//i.test(u)) return u;"
        assert a in src; src = src.replace(a, a + "\n    if (/^data:image\\/webp;base64,/.test(u)) return u; // solo en la vista previa")
    return '<script>\n' + src + '\n</script>'
scripts = re.findall(r'<script src="(js/[^"]+)" defer></script>', html)
html = re.sub(r'<script src="(js/[^"]+)" defer></script>\n?', '', html)
html = html.replace('</body>', '<script>window.__SEED__ = ' + json.dumps(seed, ensure_ascii=False) + ';</script>\n' + '\n'.join(js(s) for s in scripts) + '\n</body>')
html = html.replace('href="assets/favicon.svg"', 'href="data:image/svg+xml;base64,' + base64.b64encode(open('assets/favicon.svg', 'rb').read()).decode() + '"')
html = html.replace('<a href="admin/" rel="nofollow">Acceso</a>', '<span>Vista previa</span>')
open(sys.argv[1], 'w', encoding='utf-8').write(html)
print('ok', len(html) // 1024, 'KB')

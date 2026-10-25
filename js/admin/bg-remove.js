/* Quitar el fondo de una foto en el propio navegador.
   'una'    → modelo "silueta" (U²-Net reducido): mejor con UNA pieza por foto.
   'varias' → modelo ISNet (DIS, cuantizado a 8 bits): mejor con VARIAS piezas en la misma foto.
   Cada modelo pesa ≈44 MB; se descarga la primera vez que se usa y queda en la caché del navegador. */
window.Yuito = window.Yuito || {};
(function (Y) {
  var CACHE = 'yuito-modelos-v1';
  var MODELS = {
    una:    { url: new URL('../vendor/models/silueta.onnx', location.href).href, size: 320,  mean: [0.485, 0.456, 0.406], std: [0.229, 0.224, 0.225], bytes: 44173029 },
    varias: { url: new URL('../vendor/models/isnet-q8.onnx', location.href).href, size: 1024, mean: [0.5, 0.5, 0.5],       std: [1, 1, 1],             bytes: 45000000 }
  };
  var sessions = {};

  function fetchModel(M, progress) { var MODEL_URL = M.url;
    var cacheP = ('caches' in window) ? caches.open(CACHE).catch(function () { return null; }) : Promise.resolve(null);
    return cacheP.then(function (cache) {
      return (cache ? cache.match(MODEL_URL) : Promise.resolve(null)).then(function (hit) {
        if (hit) { if (progress) progress(1); return hit.arrayBuffer(); }
        return fetch(MODEL_URL).then(function (r) {
          if (!r.ok) throw new Error('No se pudo descargar el modelo (HTTP ' + r.status + ').');
          var total = +r.headers.get('content-length') || M.bytes, got = 0, chunks = [], reader = r.body.getReader();
          function pump() {
            return reader.read().then(function (x) {
              if (x.done) return;
              chunks.push(x.value); got += x.value.length; if (progress) progress(Math.min(got / total, 1));
              return pump();
            });
          }
          return pump().then(function () {
            var buf = new Uint8Array(got), o = 0; chunks.forEach(function (c) { buf.set(c, o); o += c.length; });
            if (cache) cache.put(MODEL_URL, new Response(buf.slice(0), { headers: { 'Content-Type': 'application/octet-stream' } })).catch(function () {});
            return buf.buffer;
          });
        });
      });
    });
  }

  function session(name, progress) {
    if (!window.ort) return Promise.reject(new Error('El quitado de fondo no está disponible en este navegador.'));
    var M = MODELS[name];
    if (!sessions[name]) {
      ort.env.wasm.numThreads = 1;              // GitHub Pages no permite hilos (sin aislamiento de origen)
      ort.env.wasm.wasmPaths = new URL('../vendor/ort/', location.href).href;  // ruta absoluta (si no, se resuelve desde el script)
      sessions[name] = fetchModel(M, progress).then(function (buf) { return ort.InferenceSession.create(buf, { executionProviders: ['wasm'] }); });
      sessions[name].catch(function () { sessions[name] = null; });
    }
    return sessions[name];
  }

  function loadImage(blob) {
    return createImageBitmap(blob);
  }

  function canvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  // Devuelve un Blob con fondo transparente, recortado al contorno de la pieza.
  function remove(blob, progress, opts) {
    var maxSide = (opts && opts.maxSide) || 1600, quality = (opts && opts.quality) || 0.95;
    var name = (opts && MODELS[opts.model]) ? opts.model : 'una', M = MODELS[name], SIZE = M.size, MEAN = M.mean, STD = M.std;
    return Promise.all([session(name, progress), loadImage(blob)]).then(function (r) {
      var s = r[0], bmp = r[1], k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
      var W = Math.round(bmp.width * k), H = Math.round(bmp.height * k);
      // 1) Entrada del modelo: 320×320, RGB normalizado como en rembg
      var c1 = canvas(SIZE, SIZE), x1 = c1.getContext('2d'); x1.imageSmoothingQuality = 'high';
      x1.drawImage(bmp, 0, 0, SIZE, SIZE);
      var px = x1.getImageData(0, 0, SIZE, SIZE).data, n = SIZE * SIZE, max = 1e-6;
      for (var i = 0; i < px.length; i += 4) { if (px[i] > max) max = px[i]; if (px[i + 1] > max) max = px[i + 1]; if (px[i + 2] > max) max = px[i + 2]; }
      var input = new Float32Array(3 * n);
      for (var p = 0; p < n; p++) for (var ch = 0; ch < 3; ch++) input[ch * n + p] = (px[p * 4 + ch] / max - MEAN[ch]) / STD[ch];
      var feeds = {}; feeds[s.inputNames[0]] = new ort.Tensor('float32', input, [1, 3, SIZE, SIZE]);
      return s.run(feeds).then(function (out) {
        var pred = out[s.outputNames[0]].data, mi = Infinity, ma = -Infinity;
        for (var k = 0; k < n; k++) { if (pred[k] < mi) mi = pred[k]; if (pred[k] > ma) ma = pred[k]; }
        // 2) Máscara 320×320 → tamaño original
        var cm = canvas(SIZE, SIZE), xm = cm.getContext('2d'), md = xm.createImageData(SIZE, SIZE);
        for (var q = 0; q < n; q++) { var v = Math.round(255 * (pred[q] - mi) / Math.max(ma - mi, 1e-6)); md.data[q * 4] = md.data[q * 4 + 1] = md.data[q * 4 + 2] = 255; md.data[q * 4 + 3] = v; }
        xm.putImageData(md, 0, 0);
        var big = canvas(W, H), xb = big.getContext('2d'); xb.imageSmoothingQuality = 'high';
        xb.drawImage(cm, 0, 0, W, H);
        var mask = xb.getImageData(0, 0, W, H).data;
        // 3) Foto con la máscara como transparencia
        var co = canvas(W, H), xo = co.getContext('2d'); xo.imageSmoothingQuality = 'high'; xo.drawImage(bmp, 0, 0, W, H); if (bmp.close) bmp.close();
        var img = xo.getImageData(0, 0, W, H), d = img.data, x0 = W, y0 = H, x2 = -1, y2 = -1;
        for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
          var j = (y * W + x) * 4, a = Math.max(0, Math.min(255, Math.round((mask[j + 3] - 38) * 255 / 179))); d[j + 3] = a;  // borde más limpio: curva 0,15–0,85
          if (a > 24) { if (x < x0) x0 = x; if (x > x2) x2 = x; if (y < y0) y0 = y; if (y > y2) y2 = y; }
        }
        if (x2 < 0) throw new Error('No se encontró una pieza en la foto. Use la foto original.');
        xo.putImageData(img, 0, 0);
        // 4) Recorte al contorno con un margen del 4 %
        var pad = Math.round(Math.max(x2 - x0, y2 - y0) * 0.04);
        x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x2 = Math.min(W - 1, x2 + pad); y2 = Math.min(H - 1, y2 + pad);
        var cw = x2 - x0 + 1, chh = y2 - y0 + 1, cc = canvas(cw, chh);
        cc.getContext('2d').drawImage(co, x0, y0, cw, chh, 0, 0, cw, chh);
        return new Promise(function (res) { cc.toBlob(res, 'image/webp', quality); }).then(function (b) {
          // Safari puede no generar WebP: en ese caso toBlob entrega PNG (también con transparencia).
          if (b && (b.type === 'image/webp' || b.type === 'image/png') && b.size <= 5 * 1024 * 1024) return b;
          return new Promise(function (res) { cc.toBlob(res, 'image/webp', 0.85); }).then(function (b2) {
            if (b2 && b2.type === 'image/webp' && b2.size <= 5 * 1024 * 1024) return b2;
            return new Promise(function (res) { cc.toBlob(res, 'image/png'); });
          });
        });
      });
    });
  }

  Y.bgRemove = { remove: remove, available: function () { return !!window.ort && typeof createImageBitmap === 'function'; } };
})(window.Yuito);

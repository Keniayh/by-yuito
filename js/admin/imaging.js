/* Validación y preparación de fotografías antes de subirlas. */
window.Yuito = window.Yuito || {};
(function (Y) {
  var OK = ['image/jpeg', 'image/png', 'image/webp'], MAX = 5 * 1024 * 1024, SIDE = 1600;

  // Comprueba la firma real del archivo, no solo la extensión o el tipo declarado.
  function sniff(file) {
    return file.slice(0, 12).arrayBuffer().then(function (buf) {
      var b = new Uint8Array(buf);
      if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'image/jpeg';
      if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return 'image/png';
      if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
      return null;
    });
  }
  function ext(mime) { return mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg'; }

  // Devuelve un Blob listo (≤ 1600 px, WebP cuando conviene) o lanza un Error en español.
  function prepare(file) {
    return sniff(file).then(function (real) {
      if (!real || OK.indexOf(real) < 0) throw new Error('«' + file.name + '» no es una imagen JPEG, PNG o WebP.');
      if (file.size > 25 * 1024 * 1024) throw new Error('«' + file.name + '» es demasiado grande (máximo 25 MB de origen).');
      return createImageBitmap(file).then(function (bmp) {
        var k = Math.min(1, SIDE / Math.max(bmp.width, bmp.height)), w = Math.round(bmp.width * k), h = Math.round(bmp.height * k);
        var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(bmp, 0, 0, w, h);
        if (bmp.close) bmp.close();
        return new Promise(function (res) { cv.toBlob(res, 'image/webp', .88); }).then(function (blob) {
          var best = blob && blob.type === 'image/webp' ? blob : null;
          if (!best || (k === 1 && best.size >= file.size)) best = file.slice(0, file.size, real);
          if (best.size > MAX) throw new Error('«' + file.name + '» sigue pesando más de 5 MB después de optimizarla. Use una imagen más pequeña.');
          return best;
        });
      }, function () { throw new Error('«' + file.name + '» no se pudo leer como imagen.'); });
    });
  }

  function randomName(mime) {
    var a = new Uint8Array(8); crypto.getRandomValues(a);
    return Array.prototype.map.call(a, function (x) { return x.toString(16).padStart(2, '0'); }).join('') + '.' + ext(mime);
  }
  function toDataUrl(blob) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r.readAsDataURL(blob); }); }
  // Decodifica "data:" sin fetch (la CSP del panel no permite conectar a data:).
  function fromDataUrl(url) {
    var m = /^data:([^;]+);base64,(.*)$/.exec(url), bin = atob(m[2]), a = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return Promise.resolve(new Blob([a], { type: m[1] }));
  }

  Y.imaging = { prepare: prepare, randomName: randomName, toDataUrl: toDataUrl, fromDataUrl: fromDataUrl, sniff: sniff };
})(window.Yuito);

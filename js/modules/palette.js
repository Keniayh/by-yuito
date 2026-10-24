/* Cambio gradual del color del logo: salvia, lila, celeste, marrón y amarillo pastel.
   Además, hero.js puede "sostener" el color de una pieza (hold) mientras se la señala. */
window.Yuito = window.Yuito || {};
(function (Y) {
  var STOPS = [
    { b: [133,132,111], d: [93,92,73],  k: [247,236,217] },  // salvia
    { b: [143,123,208], d: [105,84,168], k: [247,236,217] }, // lila
    { b: [111,147,194], d: [72,104,143], k: [247,236,217] }, // celeste
    { b: [107,59,44],   d: [74,38,27],   k: [247,236,217] }, // marrón
    { b: [240,208,120], d: [138,106,20], k: [58,42,20] }     // amarillo pastel
  ];
  var root = document.documentElement, held = null, f2 = 0;
  function mix(a, b, f) { return a.map(function (v, i) { return Math.round(v + (b[i] - v) * f); }); }
  function rgb(a) { return 'rgb(' + a.join(',') + ')'; }
  function parse(h) { return [1, 3, 5].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
  function lum(c) { return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; }

  function paint(ms) {
    var p = (ms / Y.config.colorStepMs) % STOPS.length, i = Math.floor(p);
    var f = Math.min(1, Math.max(0, (p - i - .3) / .7)); f = f * f * (3 - 2 * f);
    var A = STOPS[i], B = STOPS[(i + 1) % STOPS.length];
    var b = mix(A.b, B.b, f), d = mix(A.d, B.d, f), k = mix(A.k, B.k, f);
    f2 += ((held ? 1 : 0) - f2) * .12;
    if (f2 > .001) {
      var hb = held || Y.palette._last || b;
      Y.palette._last = hb;
      var hd = hb.map(function (v) { return Math.round(v * .62); });
      var hk = lum(hb) > .62 ? [58, 42, 20] : [247, 236, 217];
      b = mix(b, hb, f2); d = mix(d, hd, f2); k = mix(k, hk, f2);
    }
    root.style.setProperty('--brand', rgb(b));
    root.style.setProperty('--deep', rgb(d));
    root.style.setProperty('--logoink', rgb(k));
  }

  Y.palette = {
    init: function () { if (Y.env.reducedMotion) paint(0); else Y.loop.add(paint); },
    hold: function (hex) { held = hex ? parse(hex) : null; if (Y.env.reducedMotion) { f2 = held ? 1 : 0; paint(0); } },
    _last: null
  };
})(window.Yuito);

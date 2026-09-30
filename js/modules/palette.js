/* Cambio gradual del color del logo: salvia, lila, celeste, marrón y amarillo pastel */
window.Yuito = window.Yuito || {};
(function (Y) {
  var STOPS = [
    { b: [133,132,111], d: [93,92,73],  k: [247,236,217] },  // salvia
    { b: [143,123,208], d: [105,84,168], k: [247,236,217] }, // lila
    { b: [111,147,194], d: [72,104,143], k: [247,236,217] }, // celeste
    { b: [107,59,44],   d: [74,38,27],   k: [247,236,217] }, // marrón
    { b: [240,208,120], d: [138,106,20], k: [58,42,20] }     // amarillo pastel
  ];
  var root = document.documentElement;
  function mix(a, b, f) { return a.map(function (v, i) { return Math.round(v + (b[i] - v) * f); }); }
  function rgb(a) { return 'rgb(' + a.join(',') + ')'; }

  function paint(ms) {
    var p = (ms / Y.config.colorStepMs) % STOPS.length, i = Math.floor(p);
    var f = Math.min(1, Math.max(0, (p - i - .3) / .7)); f = f * f * (3 - 2 * f);
    var A = STOPS[i], B = STOPS[(i + 1) % STOPS.length], deep = mix(A.d, B.d, f);
    Y.palette.rgb = deep;
    root.style.setProperty('--brand', rgb(mix(A.b, B.b, f)));
    root.style.setProperty('--deep', rgb(deep));
    root.style.setProperty('--logoink', rgb(mix(A.k, B.k, f)));
  }

  Y.palette = {
    rgb: STOPS[0].d,
    init: function () { if (Y.env.reducedMotion) paint(0); else Y.loop.add(paint); }
  };
})(window.Yuito);

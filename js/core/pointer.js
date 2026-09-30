/* Posición del puntero (píxeles y normalizada de -0.5 a 0.5) */
window.Yuito = window.Yuito || {};
(function (Y) {
  var p = Y.pointer = { x: innerWidth / 2, y: innerHeight / 2, nx: 0, ny: 0 };
  addEventListener('pointermove', function (e) {
    p.x = e.clientX; p.y = e.clientY;
    p.nx = p.x / innerWidth - .5; p.ny = p.y / innerHeight - .5;
  });
})(window.Yuito);

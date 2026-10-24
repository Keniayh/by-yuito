/* Punto de entrada: inicializa los módulos en orden */
(function (Y) {
  function start() {
    Y.links.hydrate();
    Y.catalog.init();
    Y.order.init();
    Y.palette.init();
    Y.cursor.init();
    Y.parallax.init();
    Y.loop.start();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})(window.Yuito);

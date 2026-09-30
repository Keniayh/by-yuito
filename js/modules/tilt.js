/* Inclinación 3D suave de las tarjetas */
window.Yuito = window.Yuito || {};
(function (Y) {
  Y.tilt = {
    bind: function (cards) {
      if (Y.env.reducedMotion) return;
      cards.forEach(function (c) {
        c.addEventListener('pointermove', function (e) {
          var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
          c.style.setProperty('--rx', (-y * 10) + 'deg'); c.style.setProperty('--ry', (x * 10) + 'deg');
        });
        c.addEventListener('pointerleave', function () { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); });
      });
    }
  };
})(window.Yuito);

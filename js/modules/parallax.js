/* Profundidad: el logo gira suavemente según el puntero */
window.Yuito = window.Yuito || {};
(function (Y) {
  Y.parallax = {
    init: function () {
      var emblem = document.getElementById('emblem');
      if (Y.env.reducedMotion || !emblem || !Y.env.finePointer) return;
      Y.loop.add(function () {
        var p = Y.pointer;
        emblem.style.transform = 'rotateY(' + p.nx * 20 + 'deg) rotateX(' + (-p.ny * 16) + 'deg)';
      });
    }
  };
})(window.Yuito);

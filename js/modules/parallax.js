/* Profundidad: las formas flotantes y el logo reaccionan al puntero */
window.Yuito = window.Yuito || {};
(function (Y) {
  Y.parallax = {
    init: function () {
      if (Y.env.reducedMotion) return;
      var layers = document.querySelectorAll('[data-d]'), emblem = document.getElementById('emblem');
      Y.loop.add(function () {
        var p = Y.pointer;
        layers.forEach(function (el) { var d = +el.dataset.d; el.style.transform = 'translate(' + p.nx * d + 'px,' + p.ny * d + 'px)'; });
        emblem.style.transform = 'rotateY(' + p.nx * 20 + 'deg) rotateX(' + (-p.ny * 16) + 'deg)';
      });
    }
  };
})(window.Yuito);

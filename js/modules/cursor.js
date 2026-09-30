/* Cursor: gancho de crochet (punta arriba a la izquierda) */
window.Yuito = window.Yuito || {};
(function (Y) {
  var TIP_X = 11, TIP_Y = 6, hook, hx, hy;

  function frame() {
    var m = Y.pointer, k = Y.env.reducedMotion ? 1 : .3, vx = (m.x - hx) * k;
    hx += vx; hy += (m.y - hy) * k;
    hook.style.transform = 'translate(' + (hx - TIP_X) + 'px,' + (hy - TIP_Y) + 'px) rotate(' + Math.max(-22, Math.min(22, -vx * .7)) + 'deg)';
  }

  Y.cursor = {
    init: function () {
      if (!Y.env.finePointer) return;
      hook = document.getElementById('hook'); hx = Y.pointer.x; hy = Y.pointer.y;
      Y.loop.add(frame);
    }
  };
})(window.Yuito);

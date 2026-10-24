/* Entrada escalonada de las partes de cada sección al aparecer en pantalla */
window.Yuito = window.Yuito || {};
(function (Y) {
  var io;
  function watch(nodes) {
    nodes.forEach(function (n, i) {
      if (n.classList.contains('rv')) return;
      n.classList.add('rv'); n.style.transitionDelay = Math.min(i % 4, 3) * 70 + 'ms';
      io.observe(n);
    });
  }
  Y.reveal = {
    init: function () {
      if (Y.env.reducedMotion || !('IntersectionObserver' in window)) return;
      io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: .12 });
      watch([].slice.call(document.querySelectorAll('.head > *, .steps li, .order > *, .contact > *')));
      new MutationObserver(function () { watch([].slice.call(document.querySelectorAll('#sheet .piece'))); }).observe(document.getElementById('sheet'), { childList: true });
    }
  };
})(window.Yuito);

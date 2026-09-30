/* Bucle de animación único: los módulos registran sus tareas aquí */
window.Yuito = window.Yuito || {};
(function (Y) {
  var tasks = [];
  Y.loop = {
    add: function (fn) { tasks.push(fn); },
    start: function () {
      (function frame(ms) {
        for (var i = 0; i < tasks.length; i++) tasks[i](ms);
        requestAnimationFrame(frame);
      })(0);
    }
  };
})(window.Yuito);

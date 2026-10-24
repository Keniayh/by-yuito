/* Formulario de pedido: valida y abre WhatsApp con el mensaje ya redactado. */
window.Yuito = window.Yuito || {};
(function (Y) {
  Y.order = {
    fill: function (products) {
      var sel = document.getElementById('o-piece');
      while (sel.options.length > 1) sel.remove(1);
      products.filter(function (p) { return p.kind === 'pieza'; }).forEach(function (p) {
        sel.appendChild(Y.dom.el('option', { value: p.slug, text: p.name }));
      });
    },
    init: function () {
      var f = document.getElementById('order-form'), name = document.getElementById('o-name'),
          err = document.getElementById('o-name-err'), notes = document.getElementById('o-notes'),
          count = document.getElementById('o-count'), sel = document.getElementById('o-piece');
      notes.addEventListener('input', function () { count.textContent = notes.value.length; });
      name.addEventListener('input', function () { err.hidden = true; name.removeAttribute('aria-invalid'); });
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var n = name.value.trim();
        if (!n) { err.textContent = 'Indique su nombre para que podamos saludarle.'; err.hidden = false; name.setAttribute('aria-invalid', 'true'); name.focus(); return; }
        var piece = sel.value ? (sel.options[sel.selectedIndex].text) : '';
        var msg = 'Hola, soy ' + n + '. ' + (piece ? 'Me interesa la pieza ' + piece + '.' : 'Quisiera un diseño a mi medida.');
        if (notes.value.trim()) msg += ' Detalles: ' + notes.value.trim();
        window.open(Y.links.whatsapp(msg), '_blank', 'noopener');
      });
    }
  };
})(window.Yuito);

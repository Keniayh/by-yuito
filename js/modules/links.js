/* Enlaces de contacto (WhatsApp e Instagram) a partir de la configuración */
window.Yuito = window.Yuito || {};
(function (Y) {
  Y.links = {
    whatsapp: function (msg) {
      return 'https://wa.me/' + Y.config.whatsapp + (msg ? '?text=' + encodeURIComponent(msg) : '');
    },
    hydrate: function () {
      document.querySelectorAll('a.wa').forEach(function (a) {
        a.href = Y.links.whatsapp(a.dataset.msg); a.target = '_blank'; a.rel = 'noopener';
      });
      document.querySelectorAll('[data-instagram]').forEach(function (a) {
        a.href = 'https://instagram.com/' + Y.config.instagram; a.textContent = 'Instagram @' + Y.config.instagram;
        a.target = '_blank'; a.rel = 'noopener';
      });
    }
  };
})(window.Yuito);

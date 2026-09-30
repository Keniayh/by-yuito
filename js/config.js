/* Configuración general del sitio */
window.Yuito = window.Yuito || {};
(function (Y) {
  Y.config = {
    whatsapp: '573232203614',   // indicativo + número, sin "+" ni espacios
    instagram: 'by.yuito',
    colorStepMs: 6500           // duración de cada cambio de color del logo
  };
  Y.env = {
    finePointer: matchMedia('(pointer:fine)').matches,
    reducedMotion: matchMedia('(prefers-reduced-motion:reduce)').matches
  };
})(window.Yuito);

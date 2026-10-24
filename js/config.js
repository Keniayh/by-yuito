/* Configuración general del sitio.
   Los valores de "supabase" son PÚBLICOS por diseño (URL del proyecto y clave
   "publishable"): la seguridad la imponen las políticas RLS, no el secreto de
   esta clave. NUNCA pegue aquí la clave "secret" ni "service_role".
   Mientras estén vacíos, la tienda muestra el catálogo inicial (seed-catalog.json). */
window.Yuito = window.Yuito || {};
(function (Y) {
  Y.config = {
    whatsapp: '573232203614',   // indicativo + número, sin "+" ni espacios
    instagram: 'by.yuito',
    colorStepMs: 6500,          // duración de cada cambio de color del logo
    supabase: {
      url: '',                  // p. ej. https://abcdefgh.supabase.co
      publishableKey: ''        // p. ej. sb_publishable_...
    },
    bucket: 'product-images'
  };
  Y.env = {
    finePointer: matchMedia('(pointer:fine)').matches,
    reducedMotion: matchMedia('(prefers-reduced-motion:reduce)').matches
  };
})(window.Yuito);

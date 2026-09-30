/* Contenido editable: categorías y catálogo de productos */
window.Yuito = window.Yuito || {};
(function (Y) {
  Y.data = {
    categories: [
      { icon: '👜', title: 'Bolsos', text: 'Tejidos en el color, tamaño y punto que usted elija. Piezas únicas.', bg: '#d9cffa', rot: -2 },
      { icon: '🧸', title: 'Amigurumis', text: 'Muñecos y figuras tejidas, para regalar o para decorar.', bg: '#bfeedb', rot: 1.5 },
      { icon: '🧶', title: 'Pedidos especiales', text: 'Si cuenta con un tutorial o modelo de referencia, podemos elaborarlo para usted.', bg: '#fbe9a8', rot: -1 }
    ],
    products: [
      { name: 'Cenit', image: 'assets/images/products/cenit.jpg', alt: 'Bolso Cenit, tejido en rayas celeste y crema con lazo',
        text: 'Bolso de hombro en rayas celeste y crema, con lazo decorativo y asas largas trenzadas.',
        bg: '#cfe0f5', rot: -1.6, cta: 'Consultar disponibilidad', msg: 'Hola, quisiera información sobre el bolso Cenit.' },
      { name: 'Bruma', image: 'assets/images/products/bruma.jpg', alt: 'Bolso Bruma, tejido en café y celeste con corazón',
        text: 'Bandolera en café y celeste, con aplique de corazón y correa larga tejida.',
        bg: '#f3e2b0', rot: 1.2, cta: 'Consultar disponibilidad', msg: 'Hola, quisiera información sobre el bolso Bruma.' },
      { name: 'Browni', image: 'assets/images/products/browni.jpg', alt: 'Bolso Browni, tejido en café con flor beige',
        text: 'Bolso de mano en tono café, con asas integradas y una flor tejida en beige como detalle.',
        bg: '#e6d2c2', rot: -1, cta: 'Consultar disponibilidad', msg: 'Hola, quisiera información sobre el bolso Browni.' },
      { name: 'Bolso de mano', image: 'assets/images/products/bolso-de-mano.jpg', alt: 'Bolso de mano gris oscuro con cierre dorado',
        text: 'Bolso de mano tejido con cordón inca sobre canvas plástico, en gris oscuro con solapa y cierre metálico dorado.',
        bg: '#ddd6ee', rot: 1.4, cta: 'Consultar disponibilidad', msg: 'Hola, quisiera información sobre el bolso de mano con cierre dorado.' },
      { name: 'Cactus amigurumi', image: 'assets/images/products/cactus-amigurumi.jpg', alt: 'Dos cactus amigurumi en macetas grises',
        text: 'Cactus tejidos con macetas grises y pequeñas flores, ideales como detalle decorativo.',
        bg: '#cdeedd', rot: -1.3, cta: 'Consultar disponibilidad', msg: 'Hola, quisiera información sobre los cactus amigurumi.' },
      { name: 'Diseño a su medida', image: null,
        text: 'Bolsos, amigurumis y otras piezas según el modelo y los colores que usted indique.',
        bg: '#f7d6e2', rot: 1, cta: 'Solicitar cotización', msg: 'Hola, quisiera solicitar una cotización para un diseño personalizado.' }
    ]
  };
})(window.Yuito);

# Yüito · Handmade

Sitio web estático del emprendimiento. No requiere instalación: abra `index.html` en el navegador.

## Estructura

```
yuito-web/
├── index.html              # Estructura de la página
├── assets/
│   ├── favicon.svg
│   └── images/products/    # Fotos del catálogo
├── css/
│   ├── base.css            # Variables, reinicio y tipografía
│   ├── layout.css          # Secciones y cuadrículas
│   ├── components.css      # Botones, tarjetas, logo y cursor
│   └── responsive.css      # Pantallas pequeñas y movimiento reducido
└── js/
    ├── config.js           # Número de WhatsApp, Instagram y ajustes
    ├── data/content.js     # Categorías y productos (aquí se edita el catálogo)
    ├── core/               # Bucle de animación y posición del puntero
    ├── modules/            # palette, cursor, parallax, tilt, links, catalog
    └── main.js             # Punto de entrada
```

## Tareas frecuentes

- **Cambiar el número de WhatsApp:** `js/config.js`.
- **Agregar un producto:** copiar la foto a `assets/images/products/` y añadir un objeto en `Yuito.data.products` (`js/data/content.js`).
- **Ajustar los colores del logo:** lista `STOPS` en `js/modules/palette.js`.
- **Forma del cursor:** el SVG `#hook` en `index.html`; su suavidad está en `js/modules/cursor.js`.

## Publicación

Sirve directamente en GitHub Pages: suba la carpeta al repositorio y active Pages desde la rama principal.

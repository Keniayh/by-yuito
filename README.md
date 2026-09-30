# YÜITO · Handmade

<p align="center">
  <strong>YÜITO</strong><br>
  Handmade · Crochet · Hecho con intención
</p>

<p align="center">
  Sitio web oficial de <strong>YÜITO</strong>, un emprendimiento de productos tejidos a mano.
</p>

<p align="center">
  <a href="https://keniayh.github.io/by-yuito/">🌐 Ver sitio</a>
  ·
  <a href="https://www.instagram.com/by.yuito/">📷 Instagram</a>
</p>

---

## ✦ Sobre el proyecto

**YÜITO** es una tienda web estática creada para presentar el catálogo de productos hechos a mano del emprendimiento.

El sitio está diseñado para mostrar los productos de forma visual, facilitar el contacto con la marca y mantener el catálogo organizado sin depender de un backend o una base de datos.

### Características

- 🧶 Catálogo de productos handmade.
- 📱 Diseño responsive para dispositivos móviles y escritorio.
- 🎨 Interfaz visual con identidad propia de YÜITO.
- 🛍️ Información dinámica de productos y categorías.
- 💬 Enlaces directos a WhatsApp e Instagram.
- ✨ Animaciones, cursor personalizado, parallax y efectos de interacción.
- ⚡ Sitio completamente estático, sin backend.

## 🛠️ Tecnologías

- **HTML5** — estructura y contenido.
- **CSS3** — estilos, layout, responsive design y animaciones.
- **JavaScript** — lógica, catálogo e interacciones.
- **GitHub Pages** — despliegue del sitio.

## 📁 Estructura

```
by-yuito/
├── index.html
├── assets/
│   ├── favicon.svg
│   └── images/
│       └── products/
├── css/
│   ├── base.css
│   ├── layout.css
│   ├── components.css
│   └── responsive.css
└── js/
    ├── config.js
    ├── data/
    │   └── content.js
    ├── modules/
    │   ├── catalog.js
    │   ├── cursor.js
    │   ├── links.js
    │   ├── palette.js
    │   ├── parallax.js
    │   └── tilt.js
    ├── core/
    │   ├── loop.js
    │   └── pointer.js
    └── main.js
```

## ⚙️ Personalización

### WhatsApp e Instagram

Los datos de contacto y configuración principal se encuentran en:

```
js/config.js
```

### Catálogo

Los productos, categorías y contenido del catálogo se gestionan desde:

```
js/data/content.js
```

Para agregar un producto:

1. Añade la imagen en `assets/images/products/`.
2. Agrega el producto en `js/data/content.js`.
3. Abre el sitio para comprobar el resultado.

### Identidad visual

La paleta utilizada por los efectos visuales se puede ajustar desde:

```
js/modules/palette.js
```

## 🚀 Desarrollo local

No requiere Node.js, dependencias ni proceso de compilación.

Puedes abrir directamente:

```
index.html
```

en un navegador.

También puedes utilizar una extensión como **Live Server** en VS Code para trabajar con recarga automática.

## 🌐 Despliegue

El proyecto se publica mediante **GitHub Pages** directamente desde la rama `main`.

Sitio:

**https://keniayh.github.io/by-yuito/**

## 📌 Estado

**Activo** — proyecto en desarrollo y actualización continua del catálogo.

---

<p align="center">
  Hecho a mano con 🧶 · Hecho para YÜITO
</p>

# YÜITO · Handmade

Sitio web de **YÜITO**, tejidos a crochet hechos a mano en Bucaramanga
([Instagram @by.yuito](https://www.instagram.com/by.yuito/)).

Es un sitio estático (HTML, CSS y JavaScript sin paso de compilación) que se publica en
GitHub Pages. El catálogo se lee de **Supabase** (plan gratuito) y se administra desde un
panel privado en `/admin/`. Si Supabase no está configurado o no responde, la tienda muestra
el catálogo inicial incluido en `js/data/seed-catalog.json`.

> Para poner en marcha el panel: **[docs/ADMIN-SETUP.md](docs/ADMIN-SETUP.md)**.

## Estructura

```
index.html                 Tienda pública
admin/index.html           Panel privado (noindex, con política CSP)
css/                       base · layout · components · responsive · admin
js/
  config.js                WhatsApp, Instagram y datos PÚBLICOS de Supabase
  lib/dom.js               Construcción segura de DOM (todo texto entra por textContent)
  services/catalog-service.js   Lectura pública: Supabase → copia local → catálogo inicial
  modules/                 catalog · hero · order · palette · cursor · parallax · reveal · links
  core/                    loop · pointer
  admin/                   api · imaging · ui · backup · catalog-format · views-* · app
  data/seed-catalog.json   Los 6 productos originales (textos y mensajes de WhatsApp intactos)
assets/images/products/    Fotografías recortadas (WebP con transparencia)
supabase/migrations/       001 esquema+RLS · 002 almacenamiento · 003 registrar administradora
supabase/tests/            Pruebas de las políticas sobre un Postgres real
tests/                     Pruebas de formato, interfaz del panel (con Supabase simulado) y modo sin conexión
tools/build-seed.mjs       Regenera el catálogo inicial a partir del contenido original
vendor/                    supabase-js 2.118.0 (UMD, licencia MIT) para el panel
```

## Tipografía

- **Fredoka** (se conserva: es la voz de la marca) para el nombre, los títulos, los números y las etiquetas.
- **Nunito** para los textos de lectura.
- **Cormorant Garamond** solo dentro del logo (sello), como en el original.

El bordado (puntada discontinua) se conserva como detalle: marca cada lámina del catálogo y los
números de los pasos.

## Seguridad (resumen)

- La clave que va en `js/config.js` es la *publishable*: es pública por diseño. **Nunca** se
  publica la clave *secret* / *service_role*.
- Los permisos los imponen las políticas RLS de Postgres: el público solo lee lo publicado y
  únicamente la cuenta registrada en la tabla `admins` (una sola fila posible) puede escribir.
- El registro público de usuarios debe estar desactivado en Supabase (ver la guía).

## Pruebas

```
node tests/format.test.js                      # formato de respaldo (Node)
PGHOST=… PGUSER=postgres python3 supabase/tests/run_rls_tests.py   # políticas RLS (Postgres local)
python3 -m http.server 8765 &                  # y luego, con Playwright instalado:
node tests/admin.e2e.js                        # panel + tienda con Supabase SIMULADO
node tests/offline.e2e.js                      # tienda sin conexión / sin configurar
```

Las pruebas de interfaz usan un Supabase simulado (`tests/mock-supabase.js`); no prueban un
proyecto Supabase real.

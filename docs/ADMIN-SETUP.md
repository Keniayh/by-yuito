# Puesta en marcha del panel de administración

Tiempo estimado: 20–30 minutos. **Costo: $0** (plan gratuito de Supabase; no pida ningún plan
de pago). Los nombres de los menús de Supabase pueden cambiar con el tiempo; si algo no
coincide, busque el equivalente.

## 1. Crear el proyecto en Supabase (gratis)

1. Entre a <https://supabase.com> y cree una cuenta con su correo.
2. **New project** → nombre `yuito`, una contraseña de base de datos larga (guárdela en un
   gestor de contraseñas; este sitio no la usa), región cercana (por ejemplo *South America (São Paulo)*).
3. Deje el plan **Free**. No agregue tarjeta ni complementos.

## 2. Crear las tablas y los permisos

En el proyecto: **SQL Editor → New query**. Pegue y ejecute (Run), en este orden, el contenido de:

1. `supabase/migrations/001_schema.sql`
2. `supabase/migrations/002_storage.sql`

Son idempotentes: si los ejecuta dos veces no se duplica nada.

## 3. Crear su usuario y cerrar el registro público

1. **Authentication → Users → Add user → Create new user**: su correo y una contraseña larga y
   única. Marque confirmar el correo automáticamente.
2. **Authentication → Sign In / Providers**: desactive **Allow new users to sign up**
   (para que nadie más pueda crear cuentas). Revise también que ningún otro proveedor
   (Google, etc.) esté activo.
3. Abra `supabase/migrations/003_make_me_admin.sql`, **cambie el correo** por el suyo y ejecútelo.
   Debe mostrar una sola fila con su correo. Solo puede existir una administradora.

## 4. Conectar el sitio

**Project Settings → API Keys**: copie la **Project URL** y la clave **Publishable**
(`sb_publishable_…`; en proyectos antiguos puede llamarse *anon*). En `js/config.js`:

```js
supabase: {
  url: 'https://SU-PROYECTO.supabase.co',
  publishableKey: 'sb_publishable_…'
},
```

Estas dos cadenas son públicas por diseño. **No pegue nunca** la clave *secret* ni *service_role*.

## 5. Cargar los productos actuales

1. Abra `/admin/` (localmente o ya publicado), ingrese con su correo y contraseña.
2. Pestaña **Respaldo → Cargar catálogo inicial**. Revise la vista previa (6 productos, 3 categorías)
   y pulse **Aplicar importación**. Puede repetirlo sin riesgo: no duplica.
3. Revise en **Productos** que estén los seis y, en la tienda, que se vean con sus fotos y enlaces de WhatsApp.

## 6. Revisar antes de publicar

En su computador, desde la carpeta del proyecto: `python3 -m http.server 8000` y abra
<http://localhost:8000/> y <http://localhost:8000/admin/>. Cree un producto de prueba con foto,
ocúltelo, publíquelo, expórtelo y bórrelo. Compruebe además con una ventana privada que sin
iniciar sesión **no** puede ver productos ocultos.

## 7. Publicar (cuando usted lo autorice)

Fusione la rama `feature/admin-panel` en `main`; GitHub Pages (despliegue desde rama `main`, raíz)
publicará el sitio. No se necesita ningún secreto en GitHub.

## Fotos: quitar el fondo

Cada foto del editor tiene tres opciones: **Original** (tal cual), **Sin fondo · 1 pieza** y
**Sin fondo · varias piezas**. El recorte se hace en el propio dispositivo; la foto no se envía a
ningún servicio externo. Nada cambia en la tienda hasta pulsar **Guardar**.

- *1 pieza* (modelo «silueta»): mejor cuando la foto muestra una sola pieza.
- *Varias piezas* (modelo ISNet, cuantizado): mejor para collages o varias piezas juntas.
- Cada modelo descarga ≈ 44 MB la primera vez que se usa (mejor con wifi); luego queda guardado.
- La casilla «Quitar el fondo automáticamente» (1 pieza) viene desmarcada: es opcional.
- Si la imagen trae un cuadriculado «falso» de transparencia dibujado, puede quedar algún resto.

## Respaldos y límites del plan gratuito

- **Descargue una copia** (Respaldo → Descargar copia) después de cambios importantes y guárdela
  fuera de Supabase. Es su plan de recuperación: en el plan gratuito no hay copias de seguridad
  descargables automáticas.
- El plan gratuito pausa los proyectos tras aproximadamente una semana sin actividad; la tienda
  entonces muestra el catálogo inicial/última copia guardada hasta que reactive el proyecto
  desde el panel de Supabase. Entrar al panel o abrir la tienda con regularidad ayuda, pero no lo garantiza.
- Cupos gratuitos aproximados: 500 MB de base de datos, 1 GB de fotos, 5 GB de tráfico mensual.
  Las fotos se reducen a 1600 px al subirlas para ahorrar espacio. Verifique los límites vigentes en la página de precios de Supabase.

## Si pierde el acceso

- Contraseña olvidada: Supabase → Authentication → Users → su usuario → enviar enlace de recuperación o asignar una nueva.
- Proyecto perdido o pausado sin recuperación: cree uno nuevo, repita los pasos 1–4 y use
  **Respaldo → Importar** con su última copia (incluye las fotos).

## Qué es público y qué no

- Cualquiera puede leer los productos **publicados** y sus fotos.
- Las fotos están en un bucket público: quien conozca la dirección exacta de una foto de un
  producto *oculto* podría verla. No suba imágenes confidenciales.
- Solo su cuenta puede crear, editar o borrar (lo impone la base de datos, no solo el panel).

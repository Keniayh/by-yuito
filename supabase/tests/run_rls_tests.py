#!/usr/bin/env python3
"""
Pruebas de las migraciones y de las políticas RLS en un Postgres LOCAL.

Qué comprueba (con roles reales de Postgres, no simulados):
  - Las migraciones corren limpias y son idempotentes.
  - Visitantes (anon): solo leen lo publicado; no escriben nada.
  - Usuario autenticado que NO es admin: no crea, no modifica, no borra.
  - Administradora: puede todo; solo puede existir una.
  - Restricciones de datos (slug, precio, color, estado).
  - Políticas del bucket de fotos.

Qué NO comprueba: el servicio real de Supabase (GoTrue, Storage API, PostgREST).
auth y storage son versiones mínimas en tests/stubs.sql.

Uso:  PGHOST=127.0.0.1 PGPORT=54329 PGUSER=postgres python3 supabase/tests/run_rls_tests.py
"""
import os
import sys
import uuid
import psycopg
from psycopg import errors

HERE = os.path.dirname(os.path.abspath(__file__))
MIG = os.path.join(HERE, '..', 'migrations')
DB = 'yuito_rls_test'
conn_args = dict(host=os.environ.get('PGHOST', '127.0.0.1'),
                 port=int(os.environ.get('PGPORT', '5432')),
                 user=os.environ.get('PGUSER', 'postgres'))

passed, failed = [], []


def read(path):
    with open(path, encoding='utf8') as f:
        return f.read()


def check(name, ok, detail=''):
    (passed if ok else failed).append(name)
    print(('  PASS  ' if ok else '  FAIL  ') + name + ('' if ok else f'   -> {detail}'))


# --- base de datos limpia ----------------------------------------------------
with psycopg.connect(dbname='postgres', autocommit=True, **conn_args) as c:
    c.execute(f'drop database if exists {DB} with (force)')
    c.execute(f"create database {DB} encoding 'UTF8' template template0")

admin_conn = psycopg.connect(dbname=DB, autocommit=True, **conn_args)
admin_conn.execute(read(os.path.join(HERE, 'stubs.sql')))

print('\nMigraciones')
try:
    for n in ('001_schema.sql', '002_storage.sql'):
        admin_conn.execute(read(os.path.join(MIG, n)))
    check('001 y 002 se aplican sin errores', True)
    for n in ('001_schema.sql', '002_storage.sql'):
        admin_conn.execute(read(os.path.join(MIG, n)))
    check('001 y 002 son idempotentes (segunda ejecución sin errores)', True)
except Exception as e:
    check('migraciones', False, repr(e))
    sys.exit(1)

n_cat = admin_conn.execute('select count(*) from public.categories').fetchone()[0]
check('categorías iniciales: Bolsos, Amigurumis y Otros (sin duplicar)', n_cat == 3, n_cat)

# --- datos de prueba (como superusuario) -------------------------------------
ADMIN_ID, OTHER_ID = str(uuid.uuid4()), str(uuid.uuid4())
admin_conn.execute('insert into auth.users (id, email) values (%s,%s),(%s,%s)',
                   (ADMIN_ID, 'admin@test.local', OTHER_ID, 'otra@test.local'))
admin_conn.execute('insert into public.admins (user_id) values (%s)', (ADMIN_ID,))
cat_bolsos = admin_conn.execute("select id from public.categories where slug='bolsos'").fetchone()[0]
rows = [('pub-1', 'Publicado 1', 'publicado'), ('pub-2', 'Publicado 2', 'publicado'), ('oculto-1', 'Oculto 1', 'oculto')]
pids = {}
for slug, name, status in rows:
    pids[slug] = admin_conn.execute(
        'insert into public.products (slug,name,category_id,status) values (%s,%s,%s,%s) returning id',
        (slug, name, cat_bolsos, status)).fetchone()[0]
    admin_conn.execute('insert into public.product_images (product_id, storage_path, alt) values (%s,%s,%s)',
                       (pids[slug], f'products/{slug}/1.webp', 'foto'))


def run_as(role, uid, sql, params=None, fetch=False):
    """Ejecuta una sentencia como `role` con el JWT de `uid`, dentro de una
    transacción que se revierte. Devuelve (ok, resultado_o_error)."""
    with psycopg.connect(dbname=DB, **conn_args) as c:
        try:
            c.execute(f'set local role {role}')
            c.execute("select set_config('request.jwt.claim.sub', %s, true)", (uid or '',))
            cur = c.execute(sql, params)
            out = cur.fetchall() if fetch else cur.rowcount
            return True, out
        except Exception as e:  # noqa: BLE001
            return False, e
        finally:
            c.rollback()


def denied(res):
    return (not res[0]) and isinstance(res[1], errors.InsufficientPrivilege)


NEW_PRODUCT = ('insert into public.products (slug,name,category_id,status) values (%s,%s,%s,%s)',
               ('nuevo-x', 'Nuevo', cat_bolsos, 'publicado'))

print('\nVisitantes (anon)')
r = run_as('anon', None, 'select slug from public.products order by slug', fetch=True)
check('ven solo los productos publicados', r[0] and [x[0] for x in r[1]] == ['pub-1', 'pub-2'], r[1])
r = run_as('anon', None, 'select count(*) from public.products where slug=%s', ('oculto-1',), fetch=True)
check('no ven el producto oculto, ni pidiéndolo por nombre', r[0] and r[1][0][0] == 0, r[1])
r = run_as('anon', None, 'select count(*) from public.product_images', fetch=True)
check('ven solo las fotos de productos publicados (2 de 3)', r[0] and r[1][0][0] == 2, r[1])
r = run_as('anon', None, 'select slug from public.categories', fetch=True)
check('leen las categorías', r[0] and len(r[1]) == 3, r[1])
check('NO pueden insertar productos', denied(run_as('anon', None, *NEW_PRODUCT)))
check('NO pueden actualizar productos', denied(run_as('anon', None, "update public.products set name='x'")))
check('NO pueden borrar productos', denied(run_as('anon', None, 'delete from public.products')))
check('NO pueden insertar categorías', denied(run_as('anon', None, "insert into public.categories (slug,name) values ('x','X')")))
check('NO pueden insertar fotos', denied(run_as('anon', None, 'insert into public.product_images (product_id,storage_path) values (%s,%s)', (pids['pub-1'], 'products/x/2.webp'))))
check('NO pueden leer la tabla admins', denied(run_as('anon', None, 'select * from public.admins')))
check('NO pueden crear administradores', denied(run_as('anon', None, 'insert into public.admins (user_id) values (%s)', (OTHER_ID,))))
r = run_as('anon', None, 'select public.is_admin()', fetch=True)
check('is_admin() es falso para un visitante', r[0] and r[1][0][0] is False, r[1])

print('\nUsuaria autenticada que NO es la administradora')
r = run_as('authenticated', OTHER_ID, 'select slug from public.products order by slug', fetch=True)
check('ve solo lo publicado', r[0] and [x[0] for x in r[1]] == ['pub-1', 'pub-2'], r[1])
r = run_as('authenticated', OTHER_ID, *NEW_PRODUCT)
check('NO puede insertar productos (la política lo rechaza)', (not r[0]) and isinstance(r[1], errors.InsufficientPrivilege), r)
r = run_as('authenticated', OTHER_ID, "update public.products set name='hack'")
check('NO modifica ninguna fila (0 filas afectadas)', r[0] and r[1] == 0, r)
r = run_as('authenticated', OTHER_ID, 'delete from public.products')
check('NO borra ninguna fila (0 filas afectadas)', r[0] and r[1] == 0, r)
r = run_as('authenticated', OTHER_ID, "update public.categories set name='hack'")
check('NO modifica categorías', r[0] and r[1] == 0, r)
r = run_as('authenticated', OTHER_ID, 'delete from public.product_images')
check('NO borra fotos', r[0] and r[1] == 0, r)
check('NO puede crearse a sí misma como administradora', denied(run_as('authenticated', OTHER_ID, 'insert into public.admins (user_id) values (%s)', (OTHER_ID,))))
r = run_as('authenticated', OTHER_ID, 'select count(*) from public.admins', fetch=True)
check('no ve filas de admins que no son suyas', r[0] and r[1][0][0] == 0, r[1])
r = run_as('authenticated', OTHER_ID, 'select public.is_admin()', fetch=True)
check('is_admin() es falso para ella', r[0] and r[1][0][0] is False, r[1])

print('\nAdministradora')
r = run_as('authenticated', ADMIN_ID, 'select public.is_admin()', fetch=True)
check('is_admin() es verdadero', r[0] and r[1][0][0] is True, r[1])
r = run_as('authenticated', ADMIN_ID, 'select slug from public.products order by slug', fetch=True)
check('ve todos los productos, incluido el oculto', r[0] and len(r[1]) == 3, r[1])
r = run_as('authenticated', ADMIN_ID, *NEW_PRODUCT)
check('puede insertar productos', r[0] and r[1] == 1, r)
r = run_as('authenticated', ADMIN_ID, "update public.products set name='Editado' where slug='pub-1'")
check('puede actualizar productos', r[0] and r[1] == 1, r)
r = run_as('authenticated', ADMIN_ID, "delete from public.products where slug='oculto-1'")
check('puede borrar productos', r[0] and r[1] == 1, r)
r = run_as('authenticated', ADMIN_ID, "insert into public.categories (slug,name,sort_order) values ('accesorios','Accesorios',4)")
check('puede ampliar las categorías', r[0] and r[1] == 1, r)
r = run_as('authenticated', ADMIN_ID, 'insert into public.product_images (product_id,storage_path,alt) values (%s,%s,%s)', (pids['pub-1'], 'products/pub-1/2.webp', 'otra'))
check('puede añadir fotos', r[0] and r[1] == 1, r)
r = run_as('authenticated', ADMIN_ID, 'insert into public.admins (user_id) values (%s)', (OTHER_ID,))
check('NO puede crear un segundo administrador desde la API', not r[0], r)
# Incluso como superusuario, el índice único impide un segundo administrador.
try:
    admin_conn.execute('insert into public.admins (user_id) values (%s)', (OTHER_ID,))
    check('el índice único impide un segundo administrador (aun como superusuario)', False, 'se insertó')
except errors.UniqueViolation:
    check('el índice único impide un segundo administrador (aun como superusuario)', True)

print('\nIntegridad de datos (también se aplica a la administradora)')
def bad(sql, params):
    r = run_as('authenticated', ADMIN_ID, sql, params)
    return (not r[0]) and isinstance(r[1], errors.CheckViolation)

base = 'insert into public.products (slug,name,category_id,%s) values (%%s,%%s,%%s,%%s)'
check('rechaza slug con mayúsculas o espacios', bad(base % 'status', ('Mal Slug', 'x', cat_bolsos, 'oculto')))
check('rechaza nombre vacío', bad(base % 'status', ('ok-1', '   ', cat_bolsos, 'oculto')))
check('rechaza estado inválido', bad(base % 'status', ('ok-2', 'x', cat_bolsos, 'borrador')))
check('rechaza precio negativo', bad(base % 'price_cop', ('ok-3', 'x', cat_bolsos, -5)))
check('rechaza color mal formado', bad(base % 'tile_color', ('ok-4', 'x', cat_bolsos, 'rojo')))
check('rechaza disponibilidad inválida', bad(base % 'availability', ('ok-5', 'x', cat_bolsos, 'quizas')))
r = run_as('authenticated', ADMIN_ID, base % 'price_cop', ('ok-6', 'Con precio', cat_bolsos, 85000))
check('acepta un precio válido', r[0] and r[1] == 1, r)
r = run_as('authenticated', ADMIN_ID, 'insert into public.products (slug,name,category_id) values (%s,%s,%s)', ('sin-precio', 'Sin precio', cat_bolsos))
check('acepta precio vacío ("Consultar precio")', r[0] and r[1] == 1, r)
r = run_as('authenticated', ADMIN_ID, 'insert into public.product_images (product_id,storage_path) values (%s,%s)', (pids['pub-1'], '../escape.webp'))
check('rechaza rutas de foto con ".."', (not r[0]) and isinstance(r[1], errors.CheckViolation), r)
r = run_as('authenticated', ADMIN_ID, "delete from public.categories where slug='bolsos'")
check('no deja borrar una categoría que tiene productos', (not r[0]) and isinstance(r[1], errors.ForeignKeyViolation), r)
with psycopg.connect(dbname=DB, **conn_args) as c:
    c.execute('set local role authenticated')
    c.execute("select set_config('request.jwt.claim.sub', %s, true)", (ADMIN_ID,))
    c.execute("delete from public.products where slug='pub-2'")
    left = c.execute('select count(*) from public.product_images where product_id=%s', (pids['pub-2'],)).fetchone()[0]
    c.rollback()
check('borrar un producto no deja fotos huérfanas en la tabla (cascada)', left == 0, left)

print('\nBucket y políticas de fotografías')
b = admin_conn.execute("select public, file_size_limit, allowed_mime_types from storage.buckets where id='product-images'").fetchone()
check('bucket público, límite 5 MB, solo jpeg/png/webp', b == (True, 5242880, ['image/jpeg', 'image/png', 'image/webp']), b)
OBJ = "insert into storage.objects (bucket_id, name) values ('product-images', 'products/x/1.webp')"
check('visitante NO puede subir fotos', denied(run_as('anon', None, OBJ)))
r = run_as('authenticated', OTHER_ID, OBJ)
check('usuaria no administradora NO puede subir fotos', (not r[0]) and isinstance(r[1], errors.InsufficientPrivilege), r)
r = run_as('authenticated', ADMIN_ID, OBJ)
check('administradora SÍ puede subir fotos', r[0] and r[1] == 1, r)
admin_conn.execute("insert into storage.objects (bucket_id, name) values ('product-images','products/y/1.webp')")
r = run_as('anon', None, "select count(*) from storage.objects", fetch=True)
check('visitante NO puede listar los archivos del bucket', r[0] and r[1][0][0] == 0, r)
r = run_as('authenticated', OTHER_ID, "delete from storage.objects where bucket_id='product-images'")
check('usuaria no administradora NO puede borrar archivos', r[0] and r[1] == 0, r)
r = run_as('authenticated', ADMIN_ID, "delete from storage.objects where bucket_id='product-images'")
check('administradora SÍ puede borrar archivos', r[0] and r[1] == 1, r)

print(f'\nResultado: {len(passed)} correctas, {len(failed)} fallidas')
sys.exit(1 if failed else 0)

-- ============================================================================
-- YÜITO · 001 · Esquema, restricciones y políticas de acceso (RLS)
--
-- Cómo ejecutarlo: Supabase > SQL Editor > New query > pegar todo > Run.
-- Es idempotente: se puede ejecutar más de una vez sin duplicar ni borrar datos.
-- No contiene claves ni datos personales.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Administrador (uso exclusivo: la tabla admite UNA sola fila)
-- ---------------------------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Un índice único sobre una constante impide que existan dos administradores.
create unique index if not exists admins_solo_uno on public.admins ((true));

-- ¿El usuario autenticado es el administrador? SECURITY DEFINER para poder leer
-- public.admins sin depender de las políticas de esa tabla.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Categorías (tabla propia para poder ampliarlas sin tocar código)
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique
              check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  description text not null default '' check (char_length(description) <= 300),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

insert into public.categories (slug, name, description, sort_order) values
  ('bolsos', 'Bolsos', 'Tejidos en el color, tamaño y punto que usted elija. Piezas únicas.', 1),
  ('amigurumis', 'Amigurumis', 'Muñecos y figuras tejidas, para regalar o para decorar.', 2),
  ('otros', 'Otros', 'Si cuenta con un tutorial o modelo de referencia, podemos elaborarlo para usted.', 3)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Productos
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique
                   check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  name             text not null check (char_length(btrim(name)) between 1 and 120),
  description      text not null default '' check (char_length(description) <= 2000),
  -- Precio opcional en pesos colombianos. NULL = "Consultar precio".
  price_cop        integer check (price_cop is null or (price_cop >= 0 and price_cop <= 100000000)),
  category_id      uuid not null references public.categories (id) on delete restrict,
  -- 'pieza' = producto físico; 'servicio' = p. ej. "Diseño a su medida".
  kind             text not null default 'pieza' check (kind in ('pieza', 'servicio')),
  -- 'oculto' no se ve en la tienda; 'publicado' sí.
  status           text not null default 'oculto' check (status in ('publicado', 'oculto')),
  availability     text not null default 'disponible' check (availability in ('disponible', 'agotado')),
  featured         boolean not null default false,
  -- Color opcional de la pieza (#rrggbb): tiñe su lámina y el sello del logo.
  tile_color       text check (tile_color is null or tile_color ~ '^#[0-9a-fA-F]{6}$'),
  -- 'recorte' = foto sin fondo sobre el color; 'foto' = foto completa con su fondo.
  image_mode       text not null default 'recorte' check (image_mode in ('recorte', 'foto')),
  cta_label        text check (cta_label is null or char_length(btrim(cta_label)) between 1 and 60),
  whatsapp_message text check (whatsapp_message is null or char_length(btrim(whatsapp_message)) between 1 and 400),
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_status_order_idx on public.products (status, sort_order);

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Fotografías de cada producto (el archivo vive en Storage; aquí la referencia)
-- ---------------------------------------------------------------------------
create table if not exists public.product_images (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products (id) on delete cascade,
  storage_path text not null
               check (char_length(storage_path) between 3 and 300
                      and storage_path !~ '\.\.'
                      and storage_path !~ '^/'),
  alt          text not null default '' check (char_length(alt) <= 200),
  position     integer not null default 0,
  created_at   timestamptz not null default now(),
  unique (product_id, storage_path)
);

create index if not exists product_images_product_idx on public.product_images (product_id, position);

-- ---------------------------------------------------------------------------
-- Permisos a nivel de tabla (defensa en profundidad, además de RLS)
-- ---------------------------------------------------------------------------
revoke all on public.categories, public.products, public.product_images, public.admins
  from anon, authenticated;

grant select on public.categories, public.products, public.product_images to anon, authenticated;
grant insert, update, delete on public.categories, public.products, public.product_images to authenticated;
grant select on public.admins to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.admins         enable row level security;
alter table public.categories     enable row level security;
alter table public.products       enable row level security;
alter table public.product_images enable row level security;

-- admins: cada usuario solo puede ver su propia fila (para saber si es admin).
-- No hay políticas de escritura: nadie puede crear administradores desde la API.
drop policy if exists admins_ver_propia on public.admins;
create policy admins_ver_propia on public.admins
  for select to authenticated
  using (user_id = (select auth.uid()));

-- categories: lectura pública; escritura solo del administrador.
drop policy if exists categories_leer on public.categories;
create policy categories_leer on public.categories
  for select to anon, authenticated using (true);

drop policy if exists categories_insertar on public.categories;
create policy categories_insertar on public.categories
  for insert to authenticated with check (public.is_admin());

drop policy if exists categories_actualizar on public.categories;
create policy categories_actualizar on public.categories
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists categories_borrar on public.categories;
create policy categories_borrar on public.categories
  for delete to authenticated using (public.is_admin());

-- products: los visitantes ven solo lo publicado; el administrador ve todo.
drop policy if exists products_leer on public.products;
create policy products_leer on public.products
  for select to anon, authenticated
  using (status = 'publicado' or public.is_admin());

drop policy if exists products_insertar on public.products;
create policy products_insertar on public.products
  for insert to authenticated with check (public.is_admin());

drop policy if exists products_actualizar on public.products;
create policy products_actualizar on public.products
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists products_borrar on public.products;
create policy products_borrar on public.products
  for delete to authenticated using (public.is_admin());

-- product_images: se ven solo las de productos publicados (o todas, si es admin).
drop policy if exists product_images_leer on public.product_images;
create policy product_images_leer on public.product_images
  for select to anon, authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.products p
      where p.id = product_images.product_id and p.status = 'publicado'
    )
  );

drop policy if exists product_images_insertar on public.product_images;
create policy product_images_insertar on public.product_images
  for insert to authenticated with check (public.is_admin());

drop policy if exists product_images_actualizar on public.product_images;
create policy product_images_actualizar on public.product_images
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists product_images_borrar on public.product_images;
create policy product_images_borrar on public.product_images
  for delete to authenticated using (public.is_admin());

-- ============================================================================
-- YÜITO · 002 · Almacenamiento de fotografías y sus políticas
--
-- Ejecutar DESPUÉS de 001_schema.sql (usa la función public.is_admin()).
-- Es idempotente.
--
-- Nota importante: el bucket es PÚBLICO para que la tienda pueda mostrar las
-- fotos con una URL normal. Eso significa que cualquiera que conozca la URL
-- exacta de una foto puede verla, incluso si el producto está "oculto".
-- No suba aquí imágenes confidenciales.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,                                          -- 5 MB por archivo
  array['image/jpeg', 'image/png', 'image/webp']    -- solo imágenes
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Los visitantes NO pueden listar ni escribir. Leer una foto por su URL pública
-- no requiere política. Solo el administrador puede listar, subir, reemplazar y
-- borrar archivos de este bucket.
drop policy if exists "yuito imagenes: admin lista" on storage.objects;
create policy "yuito imagenes: admin lista" on storage.objects
  for select to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "yuito imagenes: admin sube" on storage.objects;
create policy "yuito imagenes: admin sube" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "yuito imagenes: admin reemplaza" on storage.objects;
create policy "yuito imagenes: admin reemplaza" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "yuito imagenes: admin borra" on storage.objects;
create policy "yuito imagenes: admin borra" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

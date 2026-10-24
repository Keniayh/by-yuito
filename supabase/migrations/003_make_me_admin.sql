-- ============================================================================
-- YÜITO · 003 · Registrar su cuenta como administradora
--
-- Antes: cree su usuario en Supabase > Authentication > Users > Add user
-- (con correo y contraseña) y desactive el registro público
-- (Authentication > Sign In / Providers > "Allow new users to sign up" = OFF).
--
-- Después: cambie el correo de abajo por el SUYO y ejecute este archivo.
-- Solo puede existir un administrador: si ya hay uno, este comando falla.
-- ============================================================================

do $$
declare
  mi_correo constant text := 'CAMBIE-ESTE-CORREO@ejemplo.com';
  mi_id uuid;
begin
  select id into mi_id from auth.users where lower(email) = lower(mi_correo);
  if mi_id is null then
    raise exception 'No existe un usuario con el correo %. Créelo primero en Authentication > Users.', mi_correo;
  end if;

  insert into public.admins (user_id) values (mi_id);
  raise notice 'Listo: % ahora es la administradora.', mi_correo;
end;
$$;

-- Comprobación (debe mostrar una sola fila con su correo):
select a.user_id, u.email
from public.admins a
join auth.users u on u.id = a.user_id;

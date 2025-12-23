-- Tabla para gestionar tokens de Google Search Console de forma persistente
create table if not exists user_gsc_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  refresh_token text,
  access_token text,
  expires_at timestamp with time zone,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS
alter table user_gsc_tokens enable row level security;

-- Políticas de seguridad
drop policy if exists "Users can manage own tokens" on user_gsc_tokens;
create policy "Users can manage own tokens" on user_gsc_tokens 
  for all using ( auth.uid() = user_id );

-- Dar acceso a los robles autenticados para insertar/actualizar
grant all on user_gsc_tokens to authenticated;
grant all on user_gsc_tokens to service_role;

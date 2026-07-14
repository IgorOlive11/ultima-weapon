-- Storage pra GIFs próprios da biblioteca de exercícios (biblioteca agora é própria —
-- sem ExerciseDB/seed automático). Primeira vez usando Storage neste projeto; aplicar
-- colando no SQL Editor do Supabase Dashboard (mesmo caminho já usado nas migrations
-- anteriores, já que o CLI não tem sessão autenticada neste ambiente).
--
-- GIF é gravado CRU (fundo branco, line-art) — o filtro neon roda em runtime no app
-- (invert+SVG em ExerciseGif.jsx), nunca queimado no arquivo.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exercises', 'exercises', true, 10485760, array['image/gif'])
on conflict (id) do nothing;

-- SEM "alter table storage.objects enable row level security" aqui de propósito:
-- essa tabela pertence ao role interno supabase_storage_admin, não ao "postgres" do
-- SQL Editor — o ALTER dá 42501 (must be owner). RLS já vem habilitado por padrão
-- em storage.objects em todo projeto Supabase, então a linha era redundante mesmo.

-- Leitura pública (conteúdo de referência, igual exercises_library) — bucket já é
-- público pra URL direta, mas a policy cobre também list()/download() via API.
create policy "read_exercises_storage" on storage.objects
  for select
  using (bucket_id = 'exercises');

-- Escrita só admin. bucket_id ENTRA NA POLICY — sem isso a regra vale pra
-- storage.objects inteiro (todos os buckets), não só o 'exercises'.
create policy "admin_write_exercises_storage" on storage.objects
  for insert
  with check (
    bucket_id = 'exercises'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "admin_update_exercises_storage" on storage.objects
  for update
  using (
    bucket_id = 'exercises'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    bucket_id = 'exercises'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "admin_delete_exercises_storage" on storage.objects
  for delete
  using (
    bucket_id = 'exercises'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

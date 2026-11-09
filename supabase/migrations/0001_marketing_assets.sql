-- Marketing Ravi – Gestão de Ativos
-- Rode no MESMO projeto Supabase da Base de Produtos (a tabela public.products já deve existir).
-- Cria: marketing_assets (arquivos por referência), marketing_labels (dados das etiquetas
-- EAN-13 / DUN-14 por referência) e o bucket de Storage "marketing".

-- ---------------------------------------------------------------------------
-- Arquivos (imagens, arte de embalagem, artes de redes sociais, outros)
-- ---------------------------------------------------------------------------
create table if not exists public.marketing_assets (
  id           uuid primary key default gen_random_uuid(),
  referencia   text not null,
  tipo         text not null check (tipo in ('imagem', 'embalagem', 'social', 'outro')),
  titulo       text,
  obs          text,
  storage_path text not null unique,
  file_name    text not null,
  mime_type    text,
  size_bytes   bigint,
  created_at   timestamptz not null default now(),
  created_by   uuid default auth.uid()
);

create index if not exists marketing_assets_referencia_idx on public.marketing_assets (referencia, tipo);

-- ---------------------------------------------------------------------------
-- Dados das etiquetas de código de barras (uma linha por referência)
-- ---------------------------------------------------------------------------
create table if not exists public.marketing_labels (
  referencia   text primary key,
  ean          text,
  dun          text,
  modelo       text not null default 'mori' check (modelo in ('mori', 'ravi')),
  nome_produto text,
  lote         text,
  quantidade   text,
  composicao   text,
  validade     text,
  fabricado_em text,
  updated_at   timestamptz not null default now()
);

create or replace function public.marketing_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists marketing_labels_set_updated_at on public.marketing_labels;
create trigger marketing_labels_set_updated_at
  before update on public.marketing_labels
  for each row execute function public.marketing_set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: leitura pública, escrita somente para usuários autenticados
-- (mesma regra da tabela products)
-- ---------------------------------------------------------------------------
alter table public.marketing_assets enable row level security;
alter table public.marketing_labels enable row level security;

drop policy if exists "marketing_assets_select_public" on public.marketing_assets;
create policy "marketing_assets_select_public" on public.marketing_assets
  for select to anon, authenticated using (true);

drop policy if exists "marketing_assets_write_auth" on public.marketing_assets;
create policy "marketing_assets_write_auth" on public.marketing_assets
  for all to authenticated using (true) with check (true);

drop policy if exists "marketing_labels_select_public" on public.marketing_labels;
create policy "marketing_labels_select_public" on public.marketing_labels
  for select to anon, authenticated using (true);

drop policy if exists "marketing_labels_write_auth" on public.marketing_labels;
create policy "marketing_labels_write_auth" on public.marketing_labels
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Storage: bucket público "marketing" (qualquer pessoa com o link vê o arquivo;
-- enviar, substituir e excluir exigem login)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('marketing', 'marketing', true)
on conflict (id) do nothing;

drop policy if exists "marketing_storage_select" on storage.objects;
create policy "marketing_storage_select" on storage.objects
  for select to anon, authenticated using (bucket_id = 'marketing');

drop policy if exists "marketing_storage_insert_auth" on storage.objects;
create policy "marketing_storage_insert_auth" on storage.objects
  for insert to authenticated with check (bucket_id = 'marketing');

drop policy if exists "marketing_storage_update_auth" on storage.objects;
create policy "marketing_storage_update_auth" on storage.objects
  for update to authenticated using (bucket_id = 'marketing') with check (bucket_id = 'marketing');

drop policy if exists "marketing_storage_delete_auth" on storage.objects;
create policy "marketing_storage_delete_auth" on storage.objects
  for delete to authenticated using (bucket_id = 'marketing');

-- Alinha os ativos de marketing ao modelo de perfis do projeto (public.profiles / current_app_role()):
-- leitura para qualquer perfil ativo; escrita só para os perfis admin e marketing.

drop policy if exists "marketing_assets_select_public" on public.marketing_assets;
drop policy if exists "marketing_assets_write_auth" on public.marketing_assets;
drop policy if exists "marketing_assets_select_ativo" on public.marketing_assets;
drop policy if exists "marketing_assets_write_marketing" on public.marketing_assets;
create policy "marketing_assets_select_ativo" on public.marketing_assets
  for select to authenticated using (public.current_app_role() is not null);
create policy "marketing_assets_write_marketing" on public.marketing_assets
  for all to authenticated
  using (public.current_app_role() = any (array['admin', 'marketing']))
  with check (public.current_app_role() = any (array['admin', 'marketing']));

drop policy if exists "marketing_labels_select_public" on public.marketing_labels;
drop policy if exists "marketing_labels_write_auth" on public.marketing_labels;
drop policy if exists "marketing_labels_select_ativo" on public.marketing_labels;
drop policy if exists "marketing_labels_write_marketing" on public.marketing_labels;
create policy "marketing_labels_select_ativo" on public.marketing_labels
  for select to authenticated using (public.current_app_role() is not null);
create policy "marketing_labels_write_marketing" on public.marketing_labels
  for all to authenticated
  using (public.current_app_role() = any (array['admin', 'marketing']))
  with check (public.current_app_role() = any (array['admin', 'marketing']));

revoke all on public.marketing_assets, public.marketing_labels from anon;

-- Storage: enviar, substituir e excluir só para admin e marketing.
-- O bucket continua público: quem tiver o link de um arquivo consegue abri-lo.
drop policy if exists "marketing_storage_select" on storage.objects;
drop policy if exists "marketing_storage_insert_auth" on storage.objects;
drop policy if exists "marketing_storage_update_auth" on storage.objects;
drop policy if exists "marketing_storage_delete_auth" on storage.objects;
create policy "marketing_storage_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'marketing' and public.current_app_role() is not null);
create policy "marketing_storage_insert_auth" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'marketing' and public.current_app_role() = any (array['admin', 'marketing']));
create policy "marketing_storage_update_auth" on storage.objects
  for update to authenticated
  using (bucket_id = 'marketing' and public.current_app_role() = any (array['admin', 'marketing']))
  with check (bucket_id = 'marketing' and public.current_app_role() = any (array['admin', 'marketing']));
create policy "marketing_storage_delete_auth" on storage.objects
  for delete to authenticated
  using (bucket_id = 'marketing' and public.current_app_role() = any (array['admin', 'marketing']));

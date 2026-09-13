-- Habilita Row Level Security nas tabelas principais do CRM Pérola e garante
-- que só usuários autenticados (com perfil na mesma organização) acessam os
-- dados. Isso já está ativo em produção desde a criação do banco (faz parte
-- do supabase/schema.sql, rodado no SQL Editor) — este arquivo apenas
-- registra o estado atual em formato de migration, para quem quiser adotar
-- o fluxo `supabase db push` no futuro. É seguro rodar de novo (idempotente).

alter table perfis enable row level security;
alter table clientes enable row level security;
alter table atendimentos enable row level security;
alter table metas enable row level security;

drop policy if exists "Ver perfis da mesma organizacao" on perfis;
create policy "Ver perfis da mesma organizacao" on perfis
  for select using (organizacao_id = public.minha_organizacao());

drop policy if exists "Ver clientes da organizacao" on clientes;
create policy "Ver clientes da organizacao" on clientes
  for select using (organizacao_id = public.minha_organizacao());

drop policy if exists "Gerenciar clientes da organizacao" on clientes;
create policy "Gerenciar clientes da organizacao" on clientes
  for all using (organizacao_id = public.minha_organizacao())
  with check (organizacao_id = public.minha_organizacao());

drop policy if exists "Ver atendimentos da organizacao" on atendimentos;
create policy "Ver atendimentos da organizacao" on atendimentos
  for select using (
    organizacao_id = public.minha_organizacao()
    and (public.meu_papel() = 'master' or vendedor_id = auth.uid())
  );

drop policy if exists "Criar atendimentos" on atendimentos;
create policy "Criar atendimentos" on atendimentos
  for insert with check (
    organizacao_id = public.minha_organizacao()
    and (public.meu_papel() = 'master' or vendedor_id = auth.uid())
  );

drop policy if exists "Editar atendimentos" on atendimentos;
create policy "Editar atendimentos" on atendimentos
  for update using (
    organizacao_id = public.minha_organizacao()
    and (public.meu_papel() = 'master' or vendedor_id = auth.uid())
  );

drop policy if exists "Excluir atendimentos" on atendimentos;
create policy "Excluir atendimentos" on atendimentos
  for delete using (
    organizacao_id = public.minha_organizacao()
    and (public.meu_papel() = 'master' or vendedor_id = auth.uid())
  );

drop policy if exists "Ver metas da organizacao" on metas;
create policy "Ver metas da organizacao" on metas
  for select using (
    organizacao_id = public.minha_organizacao()
    and (public.meu_papel() = 'master' or vendedor_id = auth.uid())
  );

drop policy if exists "Master gerencia metas" on metas;
create policy "Master gerencia metas" on metas
  for all using (organizacao_id = public.minha_organizacao() and public.meu_papel() = 'master')
  with check (organizacao_id = public.minha_organizacao() and public.meu_papel() = 'master');

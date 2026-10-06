-- Qualquer pessoa da equipe pode lançar ou editar um atendimento no nome de
-- outra vendedora da mesma organização (ex.: a Vanessa lança uma venda que foi
-- do Quércia). Editar continua restrito ao master ou a quem é dono do
-- atendimento antes da mudança. Não altera nenhum dado.

drop policy if exists "Criar atendimentos" on atendimentos;
create policy "Criar atendimentos" on atendimentos
  for insert with check (
    organizacao_id = public.minha_organizacao()
    and vendedor_id in (select id from perfis where organizacao_id = public.minha_organizacao())
  );

drop policy if exists "Editar atendimentos" on atendimentos;
create policy "Editar atendimentos" on atendimentos
  for update using (
    organizacao_id = public.minha_organizacao()
    and (public.meu_papel() = 'master' or vendedor_id = auth.uid())
  )
  with check (
    organizacao_id = public.minha_organizacao()
    and vendedor_id in (select id from perfis where organizacao_id = public.minha_organizacao())
  );

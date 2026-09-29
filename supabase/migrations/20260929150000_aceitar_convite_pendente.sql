-- Usuário removido (só o perfil é apagado; o login continua no Supabase Auth)
-- e convidado de novo: o gatilho on_auth_user_created não roda outra vez, porque
-- a conta já existe. O app chama esta função quando alguém logado não tem
-- perfil, e o convite pendente vira perfil. É seguro rodar de novo (idempotente).
create or replace function public.aceitar_convite_pendente()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_convite convites%rowtype;
  v_email text;
begin
  if auth.uid() is null then
    return;
  end if;

  if exists (select 1 from perfis where id = auth.uid()) then
    return;
  end if;

  select email into v_email from auth.users where id = auth.uid();

  select * into v_convite from convites
    where lower(email) = lower(v_email) and usado = false
    limit 1;

  if not found then
    return;
  end if;

  insert into perfis (id, organizacao_id, nome, email, papel)
  values (auth.uid(), v_convite.organizacao_id, v_convite.nome, v_email, v_convite.papel);

  update convites set usado = true where id = v_convite.id;
end;
$$;

revoke all on function public.aceitar_convite_pendente() from public, anon;
grant execute on function public.aceitar_convite_pendente() to authenticated;

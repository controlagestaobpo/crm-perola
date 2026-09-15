-- CRM Pérola — schema completo
-- Rode este script no SQL Editor do seu projeto Supabase:
-- https://supabase.com/dashboard/project/igsjfejtcereiwjnvkoy/sql/new
--
-- Este script é seguro de rodar várias vezes (idempotente) — sempre que
-- eu atualizar o banco, é só colar o arquivo inteiro de novo e rodar.
--
-- IMPORTANTE: na primeira vez, depois de rodar, vá em
-- Authentication > Providers > Email e desative "Confirm email".

-- ==================== EXTENSÕES ====================

create extension if not exists pgcrypto with schema extensions;

-- ==================== TABELAS ====================

create table if not exists organizacoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  criado_em timestamptz not null default now()
);

create table if not exists perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  organizacao_id uuid not null references organizacoes(id) on delete cascade,
  nome text not null,
  email text not null,
  papel text not null check (papel in ('master', 'gerente', 'vendedor')),
  criado_em timestamptz not null default now()
);

create table if not exists convites (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references organizacoes(id) on delete cascade,
  email text not null,
  nome text not null,
  papel text not null check (papel in ('master', 'gerente', 'vendedor')),
  criado_por uuid references perfis(id) on delete set null,
  usado boolean not null default false,
  criado_em timestamptz not null default now(),
  unique (organizacao_id, email)
);

-- Adiciona o papel "gerente" (define metas/comissao dos vendedores, sem ver Relatorios)
-- em bancos que ja existiam com so master/vendedor.
alter table perfis drop constraint if exists perfis_papel_check;
alter table perfis add constraint perfis_papel_check check (papel in ('master', 'gerente', 'vendedor'));

alter table convites drop constraint if exists convites_papel_check;
alter table convites add constraint convites_papel_check check (papel in ('master', 'gerente', 'vendedor'));

create table if not exists produtos (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references organizacoes(id) on delete cascade,
  categoria text not null,
  nome text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references organizacoes(id) on delete cascade,
  nome text not null,
  telefone text,
  cidade text,
  proximo_contato date,
  estagio text not null default 'prospectar'
    check (estagio in ('prospectar', 'contatado', 'negociacao', 'vendido', 'recusado')),
  criado_em timestamptz not null default now()
);

alter table clientes add column if not exists cidade text;

create table if not exists atendimentos (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references organizacoes(id) on delete cascade,
  vendedor_id uuid not null references perfis(id) on delete cascade,
  cliente_id uuid not null references clientes(id) on delete cascade,
  data date not null default current_date,
  resultado text not null check (
    resultado in ('compra', 'negociacao', 'interessado', 'sem_interesse', 'nao_atendeu', 'indisponivel')
  ),
  motivo text,
  valor numeric,
  valor_negociacao numeric,
  produtos_oferecidos text[] not null default '{}',
  produtos_vendidos text[] not null default '{}',
  proximo_contato date,
  observacoes text,
  criado_em timestamptz not null default now()
);

create table if not exists metas (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references organizacoes(id) on delete cascade,
  vendedor_id uuid not null references perfis(id) on delete cascade,
  ano int not null,
  mes int not null check (mes between 1 and 12),
  meta_valor numeric not null default 0,
  meta_prospeccoes int not null default 0,
  meta_conversao numeric not null default 0,
  comissao_percentual numeric not null default 1,
  criado_em timestamptz not null default now(),
  unique (vendedor_id, ano, mes)
);

alter table metas add column if not exists comissao_percentual numeric not null default 1;

-- Antes de travar duplicados, mescla clientes que já tinham sido cadastrados
-- em duplicidade (mantém o mais antigo e move os atendimentos pra ele).
do $$
declare
  grupo record;
  sobrevivente uuid;
begin
  for grupo in
    select organizacao_id, lower(nome) as nome_lower
    from clientes
    group by organizacao_id, lower(nome)
    having count(*) > 1
  loop
    select id into sobrevivente
    from clientes
    where organizacao_id = grupo.organizacao_id and lower(nome) = grupo.nome_lower
    order by criado_em asc
    limit 1;

    update atendimentos
    set cliente_id = sobrevivente
    where cliente_id in (
      select id from clientes
      where organizacao_id = grupo.organizacao_id
        and lower(nome) = grupo.nome_lower
        and id <> sobrevivente
    );

    delete from clientes
    where organizacao_id = grupo.organizacao_id
      and lower(nome) = grupo.nome_lower
      and id <> sobrevivente;
  end loop;
end $$;

-- Trava duplicados: mesmo nome de cliente (ou mesmo produto na mesma categoria)
-- não pode ser cadastrado duas vezes dentro da mesma organização.
create unique index if not exists clientes_org_nome_unique
  on clientes (organizacao_id, lower(nome));

create unique index if not exists produtos_org_categoria_nome_unique
  on produtos (organizacao_id, categoria, lower(nome))
  where ativo = true;

-- ==================== CADASTRO / CONVITES ====================
-- Quando alguém cria uma conta (auth.users), este gatilho decide o que fazer:
-- 1) Se o e-mail está em "convites" (ainda não usado) -> vira perfil daquela organização com o papel definido
-- 2) Se é o PRIMEIRO usuário do sistema (nenhum perfil existe ainda) -> cria uma organização nova e vira "master"
-- 3) Caso contrário -> cadastro é bloqueado (precisa de convite do master)

-- Os nomes abaixo usam escape Unicode (U&'...\00E7...') em vez da letra
-- acentuada literal. Isso evita corrupção de acentos que pode acontecer ao
-- copiar/colar este script (copia e cola só caracteres ASCII simples).
create or replace function public.seed_produtos_padrao(p_org_id uuid)
returns void
language sql
as $$
  insert into produtos (organizacao_id, categoria, nome) values
    -- Bovinos de Corte
    (p_org_id, 'Bovinos de Corte', 'STENT'),
    (p_org_id, 'Bovinos de Corte', 'STENT 40'),
    (p_org_id, 'Bovinos de Corte', 'MULTIBEEF'),
    (p_org_id, 'Bovinos de Corte', 'MULTICROMO'),
    (p_org_id, 'Bovinos de Corte', 'MULTICROMO FML'),
    (p_org_id, 'Bovinos de Corte', U&'MF\00D3S ENGORDA 40'),
    (p_org_id, 'Bovinos de Corte', U&'MF\00D3S RECRIA 65'),
    (p_org_id, 'Bovinos de Corte', U&'MF\00D3S PROTEICO 1G'),
    (p_org_id, 'Bovinos de Corte', U&'MF\00D3S ENERG\00C9TICO 4G'),
    (p_org_id, 'Bovinos de Corte', U&'PH\00D3S CROMO 50 + OP'),
    (p_org_id, 'Bovinos de Corte', U&'PH\00D3S CROMO PLUS'),
    (p_org_id, 'Bovinos de Corte', U&'PH\00D3S CROMO ULTRA'),
    (p_org_id, 'Bovinos de Corte', U&'PH\00D3S CROMO 65'),
    (p_org_id, 'Bovinos de Corte', U&'PH\00D3S CROMO 130'),
    (p_org_id, 'Bovinos de Corte', U&'PH\00D3S CROMO DRY 40'),
    (p_org_id, 'Bovinos de Corte', U&'PH\00D3S CROMO DRY 65'),
    (p_org_id, 'Bovinos de Corte', 'CONCENTRADO 10'),
    (p_org_id, 'Bovinos de Corte', U&'CONCENTRADO PR\00D3 MAIS'),
    (p_org_id, 'Bovinos de Corte', U&'N\00DACLEO PR\00D3 MULTI'),
    (p_org_id, 'Bovinos de Corte', U&'N\00DACLEO CONFIMASTER'),
    (p_org_id, 'Bovinos de Corte', U&'N\00DACLEO CONFIBOI FML'),
    (p_org_id, 'Bovinos de Corte', U&'N\00DACLEO TOTAL FOOD PREMIUM'),
    (p_org_id, 'Bovinos de Corte', U&'PR\00D3 TORQUE 20 FML'),
    (p_org_id, 'Bovinos de Corte', U&'PR\00D3 TORQUE 35 FML'),
    (p_org_id, 'Bovinos de Corte', U&'PR\00D3 BULLS'),
    (p_org_id, 'Bovinos de Corte', U&'PR\00D3 ENERGIA FML'),
    (p_org_id, 'Bovinos de Corte', U&'PR\00D3 ENERGIA AC'),
    (p_org_id, 'Bovinos de Corte', U&'PR\00D3 TURBO 200 FML'),
    (p_org_id, 'Bovinos de Corte', U&'PR\00D3 TURBO CORTE'),
    (p_org_id, 'Bovinos de Corte', U&'PR\00D3 JUMBO'),
    (p_org_id, 'Bovinos de Corte', U&'RA\00C7\00C3O TOP CREEP FML'),
    (p_org_id, 'Bovinos de Corte', U&'RA\00C7\00C3O TOP ACABAMENTO'),
    (p_org_id, 'Bovinos de Corte', U&'RA\00C7\00C3O TOP SEMI-CONFINAMENTO 16'),
    (p_org_id, 'Bovinos de Corte', U&'RA\00C7\00C3O TOP SEMI-CONFINAMENTO 18'),
    (p_org_id, 'Bovinos de Corte', 'COLOSSAL'),
    (p_org_id, 'Bovinos de Corte', U&'COLOSSAL ALTO GR\00C3O 34 FML'),
    (p_org_id, 'Bovinos de Corte', U&'COLOSSAL ALTO GR\00C3O 38 FML'),
    -- Bovinos de Leite
    (p_org_id, 'Bovinos de Leite', 'MULTIBEEF LEITE ADE'),
    (p_org_id, 'Bovinos de Leite', U&'MF\00D3S LEITE 80'),
    (p_org_id, 'Bovinos de Leite', U&'PH\00D3S CROMO LEITE VITAMINADO'),
    (p_org_id, 'Bovinos de Leite', 'CONCENTRADO LEITE'),
    (p_org_id, 'Bovinos de Leite', U&'N\00DACLEO CROMOLAC VITAMINADO'),
    (p_org_id, 'Bovinos de Leite', U&'PR\00D3 TORQUE LEITE'),
    (p_org_id, 'Bovinos de Leite', U&'PR\00D3 TURBO LACTA\00C7\00C3O'),
    (p_org_id, 'Bovinos de Leite', U&'RA\00C7\00C3O TOP LEITE 22'),
    (p_org_id, 'Bovinos de Leite', 'COLOSSAL BEZERROS PRECOCE'),
    (p_org_id, 'Bovinos de Leite', 'COLOSSAL LEITE'),
    (p_org_id, 'Bovinos de Leite', U&'COLOSSAL LACTA\00C7\00C3O'),
    -- Bovinos de Cria
    (p_org_id, 'Bovinos de Cria', 'MULTIBEEF CRIA'),
    (p_org_id, 'Bovinos de Cria', U&'MULTICROMO PRENH\00CAZ FML'),
    (p_org_id, 'Bovinos de Cria', U&'MULTICROMO REPRODU\00C7\00C3O 1G'),
    (p_org_id, 'Bovinos de Cria', U&'MULTICROMO REPRODU\00C7\00C3O 3G'),
    (p_org_id, 'Bovinos de Cria', U&'MF\00D3S CRIA 80'),
    (p_org_id, 'Bovinos de Cria', U&'M F\00D3S RP'),
    (p_org_id, 'Bovinos de Cria', U&'PH\00D3S CROMO 75'),
    (p_org_id, 'Bovinos de Cria', U&'PH\00D3S CROMO REPRODU\00C7\00C3O'),
    (p_org_id, 'Bovinos de Cria', U&'PH\00D3S CROMO CRIA'),
    (p_org_id, 'Bovinos de Cria', U&'PH\00D3S CROMO EMBRYO'),
    (p_org_id, 'Bovinos de Cria', U&'PH\00D3S CROMO DRY 80'),
    (p_org_id, 'Bovinos de Cria', U&'PR\00D3 BEZERRO'),
    -- Suínos
    (p_org_id, U&'Su\00EDnos', U&'CONC. TOP SU\00CDNOS'),
    (p_org_id, U&'Su\00EDnos', U&'RA\00C7\00C3O TOP SU\00CDNOS CRESCIMENTO'),
    (p_org_id, U&'Su\00EDnos', U&'RA\00C7\00C3O TOP SU\00CDNOS TERMINA\00C7\00C3O'),
    (p_org_id, U&'Su\00EDnos', U&'RA\00C7\00C3O TOP SU\00CDNOS REPRODU\00C7\00C3O'),
    -- Aves
    (p_org_id, 'Aves', 'CONC. TOP AVES'),
    (p_org_id, 'Aves', 'CONC. TOP AVES POSTURA'),
    (p_org_id, 'Aves', U&'RA\00C7\00C3O TOP AVES INICIAL'),
    (p_org_id, 'Aves', U&'RA\00C7\00C3O TOP AVES CRESCIMENTO'),
    (p_org_id, 'Aves', U&'RA\00C7\00C3O TOP AVES FINAL'),
    (p_org_id, 'Aves', U&'RA\00C7\00C3O TOP AVES POSTURA'),
    -- Peixes
    (p_org_id, 'Peixes', U&'RA\00C7\00C3O TOP PEIXE 22% - 12 a 14mm'),
    (p_org_id, 'Peixes', U&'RA\00C7\00C3O TOP PEIXE 28% - 06 a 08mm'),
    (p_org_id, 'Peixes', U&'RA\00C7\00C3O TOP PEIXE 28% - 08 a 10mm'),
    (p_org_id, 'Peixes', U&'RA\00C7\00C3O TOP PEIXE 28% - 12 a 14mm'),
    (p_org_id, 'Peixes', U&'RA\00C7\00C3O TOP PEIXE 32% - 06 a 08mm'),
    -- Equinos
    (p_org_id, 'Equinos', U&'PH\00D3S CROMO EQUINOS'),
    (p_org_id, 'Equinos', U&'PH\00D3S CROMO EQUINOS GOLD'),
    (p_org_id, 'Equinos', 'COLOSSAL EQUINOS'),
    (p_org_id, 'Equinos', 'COLOSSAL EQUINOS LIDA'),
    (p_org_id, 'Equinos', 'COLOSSAL EQUINOS GOLD'),
    -- Ovinos
    (p_org_id, 'Ovinos', 'PHOS CROMO OVINOS'),
    (p_org_id, 'Ovinos', 'COLOSSAL OVINOS')
  on conflict do nothing;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_convite convites%rowtype;
  v_org_id uuid;
  v_nome_empresa text;
  v_nome_usuario text;
begin
  select * into v_convite from convites
    where email = new.email and usado = false
    limit 1;

  if found then
    insert into perfis (id, organizacao_id, nome, email, papel)
    values (new.id, v_convite.organizacao_id, v_convite.nome, new.email, v_convite.papel);

    update convites set usado = true where id = v_convite.id;
    return new;
  end if;

  if not exists (select 1 from perfis limit 1) then
    v_nome_empresa := coalesce(new.raw_user_meta_data->>'nome_empresa', 'Minha Empresa');
    v_nome_usuario := coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1));

    insert into organizacoes (nome) values (v_nome_empresa) returning id into v_org_id;

    insert into perfis (id, organizacao_id, nome, email, papel)
    values (new.id, v_org_id, v_nome_usuario, new.email, 'master');

    perform public.seed_produtos_padrao(v_org_id);

    return new;
  end if;

  raise exception 'Cadastro bloqueado: peça um convite ao administrador do sistema.';
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Atualiza organizações que já existem para usar o catálogo real da Marília Nutri
-- (roda se ainda não tiverem os produtos novos, OU se detectar nomes corrompidos
-- por causa do símbolo "√" que aparece quando um copiar/colar corrompe acentos)
do $$
declare r record;
begin
  for r in select id from organizacoes loop
    if not exists (select 1 from produtos where organizacao_id = r.id and nome = 'STENT')
       or exists (select 1 from produtos where organizacao_id = r.id and nome like '%' || chr(8730) || '%')
    then
      update produtos set ativo = false where organizacao_id = r.id;
      perform public.seed_produtos_padrao(r.id);
    end if;
  end loop;
end $$;

-- ==================== FUNÇÕES AUXILIARES (RLS) ====================

create or replace function public.minha_organizacao()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select organizacao_id from perfis where id = auth.uid();
$$;

create or replace function public.meu_papel()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select papel from perfis where id = auth.uid();
$$;

-- ==================== RLS ====================

alter table organizacoes enable row level security;
alter table perfis enable row level security;
alter table convites enable row level security;
alter table produtos enable row level security;
alter table clientes enable row level security;
alter table atendimentos enable row level security;
alter table metas enable row level security;

drop policy if exists "Ver a propria organizacao" on organizacoes;
create policy "Ver a propria organizacao" on organizacoes
  for select using (id = public.minha_organizacao());

drop policy if exists "Ver perfis da mesma organizacao" on perfis;
create policy "Ver perfis da mesma organizacao" on perfis
  for select using (organizacao_id = public.minha_organizacao());

drop policy if exists "Master gerencia perfis da organizacao" on perfis;
create policy "Master gerencia perfis da organizacao" on perfis
  for update using (organizacao_id = public.minha_organizacao() and public.meu_papel() = 'master');

drop policy if exists "Master ve convites da organizacao" on convites;
create policy "Master ve convites da organizacao" on convites
  for select using (organizacao_id = public.minha_organizacao());

drop policy if exists "Master cria convites" on convites;
create policy "Master cria convites" on convites
  for insert with check (organizacao_id = public.minha_organizacao() and public.meu_papel() = 'master');

drop policy if exists "Master remove convites" on convites;
create policy "Master remove convites" on convites
  for delete using (organizacao_id = public.minha_organizacao() and public.meu_papel() = 'master');

drop policy if exists "Ver produtos da organizacao" on produtos;
create policy "Ver produtos da organizacao" on produtos
  for select using (organizacao_id = public.minha_organizacao());

drop policy if exists "Gerenciar produtos da organizacao" on produtos;
create policy "Gerenciar produtos da organizacao" on produtos
  for all using (organizacao_id = public.minha_organizacao())
  with check (organizacao_id = public.minha_organizacao());

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
    and (public.meu_papel() in ('master', 'gerente') or vendedor_id = auth.uid())
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
    and (public.meu_papel() in ('master', 'gerente') or vendedor_id = auth.uid())
  );

drop policy if exists "Master gerencia metas" on metas;
drop policy if exists "Master e gerente gerenciam metas" on metas;
create policy "Master e gerente gerenciam metas" on metas
  for all using (organizacao_id = public.minha_organizacao() and public.meu_papel() in ('master', 'gerente'))
  with check (organizacao_id = public.minha_organizacao() and public.meu_papel() in ('master', 'gerente'));

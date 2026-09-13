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
  papel text not null check (papel in ('master', 'vendedor')),
  criado_em timestamptz not null default now()
);

create table if not exists convites (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references organizacoes(id) on delete cascade,
  email text not null,
  nome text not null,
  papel text not null check (papel in ('master', 'vendedor')),
  criado_por uuid references perfis(id) on delete set null,
  usado boolean not null default false,
  criado_em timestamptz not null default now(),
  unique (organizacao_id, email)
);

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
  criado_em timestamptz not null default now(),
  unique (vendedor_id, ano, mes)
);

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
    (p_org_id, 'Bovinos de Corte', 'MFÓS ENGORDA 40'),
    (p_org_id, 'Bovinos de Corte', 'MFÓS RECRIA 65'),
    (p_org_id, 'Bovinos de Corte', 'MFÓS PROTEICO 1G'),
    (p_org_id, 'Bovinos de Corte', 'MFÓS ENERGÉTICO 4G'),
    (p_org_id, 'Bovinos de Corte', 'PHÓS CROMO 50 + OP'),
    (p_org_id, 'Bovinos de Corte', 'PHÓS CROMO PLUS'),
    (p_org_id, 'Bovinos de Corte', 'PHÓS CROMO ULTRA'),
    (p_org_id, 'Bovinos de Corte', 'PHÓS CROMO 65'),
    (p_org_id, 'Bovinos de Corte', 'PHÓS CROMO 130'),
    (p_org_id, 'Bovinos de Corte', 'PHÓS CROMO DRY 40'),
    (p_org_id, 'Bovinos de Corte', 'PHÓS CROMO DRY 65'),
    (p_org_id, 'Bovinos de Corte', 'CONCENTRADO 10'),
    (p_org_id, 'Bovinos de Corte', 'CONCENTRADO PRÓ MAIS'),
    (p_org_id, 'Bovinos de Corte', 'NÚCLEO PRÓ MULTI'),
    (p_org_id, 'Bovinos de Corte', 'NÚCLEO CONFIMASTER'),
    (p_org_id, 'Bovinos de Corte', 'NÚCLEO CONFIBOI FML'),
    (p_org_id, 'Bovinos de Corte', 'NÚCLEO TOTAL FOOD PREMIUM'),
    (p_org_id, 'Bovinos de Corte', 'PRÓ TORQUE 20 FML'),
    (p_org_id, 'Bovinos de Corte', 'PRÓ TORQUE 35 FML'),
    (p_org_id, 'Bovinos de Corte', 'PRÓ BULLS'),
    (p_org_id, 'Bovinos de Corte', 'PRÓ ENERGIA FML'),
    (p_org_id, 'Bovinos de Corte', 'PRÓ ENERGIA AC'),
    (p_org_id, 'Bovinos de Corte', 'PRÓ TURBO 200 FML'),
    (p_org_id, 'Bovinos de Corte', 'PRÓ TURBO CORTE'),
    (p_org_id, 'Bovinos de Corte', 'PRÓ JUMBO'),
    (p_org_id, 'Bovinos de Corte', 'RAÇÃO TOP CREEP FML'),
    (p_org_id, 'Bovinos de Corte', 'RAÇÃO TOP ACABAMENTO'),
    (p_org_id, 'Bovinos de Corte', 'RAÇÃO TOP SEMI-CONFINAMENTO 16'),
    (p_org_id, 'Bovinos de Corte', 'RAÇÃO TOP SEMI-CONFINAMENTO 18'),
    (p_org_id, 'Bovinos de Corte', 'COLOSSAL'),
    (p_org_id, 'Bovinos de Corte', 'COLOSSAL ALTO GRÃO 34 FML'),
    (p_org_id, 'Bovinos de Corte', 'COLOSSAL ALTO GRÃO 38 FML'),
    -- Bovinos de Leite
    (p_org_id, 'Bovinos de Leite', 'MULTIBEEF LEITE ADE'),
    (p_org_id, 'Bovinos de Leite', 'MFÓS LEITE 80'),
    (p_org_id, 'Bovinos de Leite', 'PHÓS CROMO LEITE VITAMINADO'),
    (p_org_id, 'Bovinos de Leite', 'CONCENTRADO LEITE'),
    (p_org_id, 'Bovinos de Leite', 'NÚCLEO CROMOLAC VITAMINADO'),
    (p_org_id, 'Bovinos de Leite', 'PRÓ TORQUE LEITE'),
    (p_org_id, 'Bovinos de Leite', 'PRÓ TURBO LACTAÇÃO'),
    (p_org_id, 'Bovinos de Leite', 'RAÇÃO TOP LEITE 22'),
    (p_org_id, 'Bovinos de Leite', 'COLOSSAL BEZERROS PRECOCE'),
    (p_org_id, 'Bovinos de Leite', 'COLOSSAL LEITE'),
    (p_org_id, 'Bovinos de Leite', 'COLOSSAL LACTAÇÃO'),
    -- Bovinos de Cria
    (p_org_id, 'Bovinos de Cria', 'MULTIBEEF CRIA'),
    (p_org_id, 'Bovinos de Cria', 'MULTICROMO PRENHÊZ FML'),
    (p_org_id, 'Bovinos de Cria', 'MULTICROMO REPRODUÇÃO 1G'),
    (p_org_id, 'Bovinos de Cria', 'MULTICROMO REPRODUÇÃO 3G'),
    (p_org_id, 'Bovinos de Cria', 'MFÓS CRIA 80'),
    (p_org_id, 'Bovinos de Cria', 'M FÓS RP'),
    (p_org_id, 'Bovinos de Cria', 'PHÓS CROMO 75'),
    (p_org_id, 'Bovinos de Cria', 'PHÓS CROMO REPRODUÇÃO'),
    (p_org_id, 'Bovinos de Cria', 'PHÓS CROMO CRIA'),
    (p_org_id, 'Bovinos de Cria', 'PHÓS CROMO EMBRYO'),
    (p_org_id, 'Bovinos de Cria', 'PHÓS CROMO DRY 80'),
    (p_org_id, 'Bovinos de Cria', 'PRÓ BEZERRO'),
    -- Suínos
    (p_org_id, 'Suínos', 'CONC. TOP SUÍNOS'),
    (p_org_id, 'Suínos', 'RAÇÃO TOP SUÍNOS CRESCIMENTO'),
    (p_org_id, 'Suínos', 'RAÇÃO TOP SUÍNOS TERMINAÇÃO'),
    (p_org_id, 'Suínos', 'RAÇÃO TOP SUÍNOS REPRODUÇÃO'),
    -- Aves
    (p_org_id, 'Aves', 'CONC. TOP AVES'),
    (p_org_id, 'Aves', 'CONC. TOP AVES POSTURA'),
    (p_org_id, 'Aves', 'RAÇÃO TOP AVES INICIAL'),
    (p_org_id, 'Aves', 'RAÇÃO TOP AVES CRESCIMENTO'),
    (p_org_id, 'Aves', 'RAÇÃO TOP AVES FINAL'),
    (p_org_id, 'Aves', 'RAÇÃO TOP AVES POSTURA'),
    -- Peixes
    (p_org_id, 'Peixes', 'RAÇÃO TOP PEIXE 22% - 12 a 14mm'),
    (p_org_id, 'Peixes', 'RAÇÃO TOP PEIXE 28% - 06 a 08mm'),
    (p_org_id, 'Peixes', 'RAÇÃO TOP PEIXE 28% - 08 a 10mm'),
    (p_org_id, 'Peixes', 'RAÇÃO TOP PEIXE 28% - 12 a 14mm'),
    (p_org_id, 'Peixes', 'RAÇÃO TOP PEIXE 32% - 06 a 08mm'),
    -- Equinos
    (p_org_id, 'Equinos', 'PHÓS CROMO EQUINOS'),
    (p_org_id, 'Equinos', 'PHÓS CROMO EQUINOS GOLD'),
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
-- (roda apenas se ainda não tiverem os produtos novos, e desativa os antigos de teste)
do $$
declare r record;
begin
  for r in select id from organizacoes loop
    if not exists (select 1 from produtos where organizacao_id = r.id and nome = 'STENT') then
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

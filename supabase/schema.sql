-- Rode este script no SQL Editor do seu projeto Supabase
-- (https://supabase.com/dashboard/project/igsjfejtcereiwjnvkoy/sql/new)

create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text,
  telefone text,
  empresa text,
  criado_em timestamptz not null default now()
);

create table if not exists negocios (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  cliente_id uuid references clientes(id) on delete set null,
  valor numeric not null default 0,
  status text not null default 'novo' check (status in ('novo', 'em_andamento', 'ganho', 'perdido')),
  criado_em timestamptz not null default now()
);

alter table clientes enable row level security;
alter table negocios enable row level security;

-- Libera leitura/escrita para usuários autenticados e anônimos (ajuste depois conforme sua necessidade de segurança)
create policy "Permitir tudo em clientes" on clientes for all using (true) with check (true);
create policy "Permitir tudo em negocios" on negocios for all using (true) with check (true);

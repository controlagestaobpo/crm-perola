-- Bônus mensal por vendedora, guardado junto com a meta do mês (pode mudar a
-- cada mês). Faixas de vendas: [{"percentual": 80, "valor": 100}, ...] sobre a
-- meta_valor; recebe só o degrau mais alto atingido. Atendimentos e clientes
-- diferentes: valor fixo ao atingir o mínimo. vendas_faturadas: quando o
-- master informa o faturado do mês, ele vale no lugar das vendas do CRM.
alter table metas add column if not exists bonus_vendas_faixas jsonb not null default '[]'::jsonb;
alter table metas add column if not exists bonus_atendimentos_meta int not null default 0;
alter table metas add column if not exists bonus_atendimentos_valor numeric not null default 0;
alter table metas add column if not exists bonus_clientes_meta int not null default 0;
alter table metas add column if not exists bonus_clientes_valor numeric not null default 0;
alter table metas add column if not exists vendas_faturadas numeric;

-- CPF/CNPJ do cliente (opcional, só dígitos). Serve para não cadastrar o mesmo
-- cliente duas vezes e para contar "clientes diferentes" no bônus.
alter table clientes add column if not exists documento text;
create unique index if not exists clientes_org_documento_unique
  on clientes (organizacao_id, documento)
  where documento is not null;

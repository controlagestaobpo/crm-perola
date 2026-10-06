-- A chave estrangeira agenda_removida_por -> perfis criou uma segunda ligação
-- entre atendimentos e perfis, e a consulta da agenda (perfis(nome)) passou a
-- dar erro de ambiguidade, deixando a agenda vazia. A coluna continua.
alter table atendimentos drop constraint if exists atendimentos_agenda_removida_por_fkey;
notify pgrst, 'reload schema';

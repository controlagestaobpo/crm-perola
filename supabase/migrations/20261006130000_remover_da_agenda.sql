-- "Remover da agenda": guarda no próprio atendimento que gerou o retorno o
-- motivo de ele ter saído da agenda, quem tirou e quando. Um atendimento novo
-- com próximo contato coloca o cliente de volta na agenda normalmente.
alter table atendimentos add column if not exists agenda_removida_em timestamptz;
alter table atendimentos add column if not exists agenda_removida_motivo text;
alter table atendimentos add column if not exists agenda_removida_por uuid references perfis(id) on delete set null;

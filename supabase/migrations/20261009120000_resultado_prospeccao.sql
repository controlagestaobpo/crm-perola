-- Novo resultado "Prospecção" (primeiro contato com um cliente em potencial).
alter table atendimentos drop constraint if exists atendimentos_resultado_check;
alter table atendimentos add constraint atendimentos_resultado_check check (
  resultado in ('prospeccao', 'compra', 'negociacao', 'interessado', 'sem_interesse', 'nao_atendeu', 'indisponivel')
);

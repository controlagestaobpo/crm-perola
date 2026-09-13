#!/bin/bash
# Backup completo (schema + dados) do banco Supabase do CRM Pérola.
#
# A senha do banco NUNCA fica neste arquivo (que é versionado no git).
# Ela mora em ~/.crm-perola-backup.env, fora do repositório, lido abaixo.
set -euo pipefail

ENV_FILE="$HOME/.crm-perola-backup.env"
BACKUP_DIR="$HOME/backups-crm-perola"
RETENCAO_DIAS=90

if [ ! -f "$ENV_FILE" ]; then
  echo "Erro: arquivo $ENV_FILE não encontrado." >&2
  echo "Crie-o com uma linha: SUPABASE_DB_URL=\"postgresql://postgres:SENHA@db.igsjfejtcereiwjnvkoy.supabase.co:5432/postgres\"" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "Erro: variável SUPABASE_DB_URL não definida em $ENV_FILE" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

DATA=$(date +%Y-%m-%d_%H%M%S)
ARQUIVO="$BACKUP_DIR/crm-perola-backup-$DATA.sql"

echo "[$(date)] Iniciando backup..."
npx --yes supabase db dump --db-url "$SUPABASE_DB_URL" -f "$ARQUIVO"
echo "[$(date)] Backup salvo em: $ARQUIVO"

# Remove backups com mais de 90 dias
REMOVIDOS=$(find "$BACKUP_DIR" -name "crm-perola-backup-*.sql" -type f -mtime +"$RETENCAO_DIAS" -print -delete | wc -l | tr -d ' ')
echo "[$(date)] Backups antigos removidos (>$RETENCAO_DIAS dias): $REMOVIDOS"

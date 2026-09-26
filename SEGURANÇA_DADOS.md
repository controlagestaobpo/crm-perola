# 🛡️ PROTOCOLO DE SEGURANÇA DE DADOS - CRM PÉROLA

**Objetivo:** Garantir que NENHUM dado seja perdido durante updates, ajustes ou emergências

## 📋 ANTES DE QUALQUER MUDANÇA (OBRIGATÓRIO)

### **PASSO 1: Backup Supabase**
1. Acesse: https://app.supabase.com → seu projeto
2. Vá em: **Backups** (ou **Replication**)
3. Clique: **Download Backup**
4. Salve em: `~/Backups/crm-perola/backup_YYYY-MM-DD.sql`

### **PASSO 2: Export CSV dos Clientes**
```bash
# Abra Supabase SQL Editor e execute:
SELECT * FROM clientes_perola;
# Clique "Download" → salva CSV com todos os clientes
```

### **PASSO 3: Branch Git Novo**
```bash
git checkout -b feature/[nome-da-mudança]
```

### **PASSO 4: Teste Local**
```bash
npm run dev
# Teste tudo em http://localhost:3000
```

### **PASSO 5: Commit & PR**
```bash
git add .
git commit -m "feat: [descrição clara]"
git push origin feature/[nome]
```

## ⚡ SE DER RUIM (ROLLBACK)

### **Erro no código (antes de deploy):**
```bash
git checkout main
git reset --hard HEAD~1
```

### **Erro em produção (depois de deploy):**
- Vercel → Deployments → seleciona versão anterior → Rollback

### **Dados corrompidos:**
- Supabase Dashboard → Backups → Restore

## 🗓️ CHECKLIST PRÉ-DEPLOY

- [ ] Backup Supabase baixado
- [ ] Export CSV dos clientes feito
- [ ] Branch feature criado
- [ ] Testado localmente (npm run dev)
- [ ] Git commit + push
- [ ] Pull Request criado
- [ ] Sem erros no log de build Vercel
- [ ] Dados de teste intactos
- [ ] ✅ PRONTO PARA DEPLOY

## 🚨 NUNCA FAZER

❌ Editar dados direto no Supabase sem backup
❌ Deletar tabelas sem backup
❌ Update sem testar localmente
❌ Push pra main sem PR

## ✅ SEMPRE FAZER

✅ Backup ANTES de mudança
✅ Testar localmente
✅ Commit com mensagem clara
✅ PR + review
✅ Verificar build Vercel
✅ Checar dados após deploy

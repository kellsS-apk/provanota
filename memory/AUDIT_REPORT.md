# 🔍 Auditoria Técnica - ProvaNota Backend V2

## Data: Fevereiro 2026
## Branch: feature/v2-structure

---

## 1️⃣ SEGURANÇA

### ✅ APROVADO

| Item | Status | Detalhes |
|------|--------|----------|
| `/api/auth/register` nunca cria admin | ✅ OK | Linha 340: `role = 'admin' if user_data.email.lower() in ADMIN_EMAILS else 'student'`. Modelo `UserRegister` usa `extra="ignore"` (linha 122), então campos extras são ignorados |
| `ADMIN_EMAILS` funciona | ✅ OK | Linha 32: Processa corretamente emails da env var, converte para lowercase |
| `correct_answer` não retornado para estudantes | ✅ OK | Linhas 667, 794: Projection exclui `correct_answer` e `question_hash` |
| `/api/simulations/{id}` retorna 403 | ✅ OK | Linhas 767-768: Verifica `created_by != current_user['id']` → 403 |
| `JWT_SECRET` obrigatório | ✅ OK | Linhas 46-47: `raise RuntimeError` se não definido |
| CORS configurado | ✅ OK | Linhas 35-43, 1103-1108: Usa lista de origens, não `*` |

### ⚠️ PROBLEMAS ENCONTRADOS

| Problema | Severidade | Localização | Descrição |
|----------|------------|-------------|-----------|
| bcrypt salt fixo por request | BAIXA | Linha 299 | `bcrypt.gensalt()` gera salt aleatório por chamada - OK, mas poderia ter work factor configurável |
| Sem rate limiting | MÉDIA | Todos endpoints | Vulnerável a brute force. Recomendado adicionar |
| Sem validação de força de senha | BAIXA | Linha 124 | Só valida min 8 chars, não complexidade |

---

## 2️⃣ PERFORMANCE

### ✅ APROVADO

| Item | Status | Detalhes |
|------|--------|----------|
| `/api/simulations/generate` usa `$match + $sample` | ✅ OK | Linhas 710-721: Pipeline eficiente, não carrega tudo na memória |
| Índices criados no startup | ✅ OK | Linhas 1117-1149: Todos os índices requeridos estão sendo criados |

### ⚠️ PROBLEMAS ENCONTRADOS

| Problema | Severidade | Localização | Solução |
|----------|------------|-------------|---------|
| N+1 Query em `get_exams` | ALTA | Linhas 636-644 | Loop com `count_documents` para cada exam. **CORRIGIR** |
| N+1 Query em `get_admin_exams` | ALTA | Linhas 404-412 | Mesmo problema. **CORRIGIR** |
| `.to_list(1000)` desnecessário | MÉDIA | Múltiplas linhas | Hardcoded 1000, pode causar OOM. **CORRIGIR** |
| `distinct()` sem índice otimizado | BAIXA | Linhas 996-998 | Pode ser lento com 100k+ questões |

### Consultas que podem degradar com 10k+ questões:

1. **Linha 636-644** (`get_exams`): O(n) queries para contar questões por exam
2. **Linha 404-412** (`get_admin_exams`): Mesmo problema
3. **Linha 996-998** (`get_filter_options`): `distinct()` em campos não indexados
4. **Linha 1001-1006**: Agregação para year_range sem índice em `year`

---

## 3️⃣ CONSISTÊNCIA DE DADOS

### ✅ APROVADO

| Item | Status | Detalhes |
|------|--------|----------|
| `question_hash` é determinístico | ✅ OK | Linhas 92-96: SHA256 de string normalizada. Consistente |
| Score funciona para exam e simulation | ✅ OK | Linhas 907-917: Tratamento correto para ambos casos |

### ⚠️ PROBLEMAS ENCONTRADOS

| Problema | Severidade | Localização | Solução |
|----------|------------|-------------|---------|
| Simulation pode armazenar IDs inválidos | MÉDIA | Linhas 720-742 | Não valida se questões existem antes de salvar IDs |
| Attempt pode ter ambos nulos | BAIXA | Linhas 824-839 | Modelo permite `exam_id=None` e `simulation_id=None` simultaneamente |
| Sem validação de `question_id` em answers | BAIXA | Linha 893 | Aceita qualquer string como `question_id` |
| Race condition em `count_documents` para order | MÉDIA | Linha 499 | Duas inserções simultâneas podem ter mesmo `order` |

---

## 4️⃣ ESCALABILIDADE FUTURA

### Análise de Carga

| Cenário | Impacto | Risco |
|---------|---------|-------|
| 10k questões | Baixo | ✅ Suportado |
| 50k questões | Médio | ⚠️ N+1 queries problemáticos |
| 100k questões | Alto | ❌ `distinct()` e N+1 causarão timeouts |

### Gargalos Identificados

1. **`get_exams` e `get_admin_exams`**: O(n) database calls
2. **`get_filter_options`**: 3x `distinct()` + 1 agregação
3. **Sem paginação**: Endpoints retornam listas completas
4. **Sem cache**: Metadados recalculados a cada request

### Riscos de Race Condition

1. **Criação de questão**: `count_documents` + `insert` não é atômico
2. **Hash duplicado**: Índice único resolve, mas pode causar erro silencioso

---

## 📋 CORREÇÕES NECESSÁRIAS

### ALTA PRIORIDADE

1. **Resolver N+1 Query** - Usar agregação com `$lookup` ou cache
2. **Adicionar índice em `year`** para agregações
3. **Validar question_ids** antes de criar simulation
4. **Limitar `.to_list()`** com paginação

### MÉDIA PRIORIDADE

1. **Adicionar rate limiting** nos endpoints de auth
2. **Usar `$inc` atômico** para `order` em questões
3. **Validar `question_id`** em save_answer
4. **Adicionar paginação** em listagens

### BAIXA PRIORIDADE

1. **Cachear metadados** (subjects, sources, etc)
2. **Adicionar índice composto** para filtros comuns
3. **Validação de complexidade** de senha

---

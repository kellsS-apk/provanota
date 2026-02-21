# ProvaNota V2 - PRD (Product Requirements Document)

## Visão Geral
ProvaNota é uma plataforma de simulados e banco de questões para preparação de vestibulares e concursos.

## Problem Statement Original
Evoluir o ProvaNota (FastAPI + MongoDB + React) para virar uma plataforma estruturada de banco de questões (escola/vestibular/faculdade), com:
- Exames oficiais por ano
- Simulados gerados (custom/mixed) salvos para revisão
- Banco geral de questões independente de exame

## User Personas
1. **Estudante**: Realiza simulados oficiais e cria simulados personalizados para praticar
2. **Administrador**: Gerencia exames, questões e importa questões em lote

## Core Requirements

### Segurança (✅ Implementado)
- Cadastro público sempre cria role="student"
- Admin só via ADMIN_EMAILS whitelist ou promoção manual
- JWT_SECRET obrigatório (sem default fraco)
- CORS configurado corretamente

### Modelo de Dados V2 (✅ Implementado)

#### Questions Collection
- `id`, `exam_id` (opcional), `statement`, `image_url`
- `alternatives`, `correct_answer` (A-E)
- `tags`, `difficulty` (easy/medium/hard)
- `area`, `subject`, `topic`
- `education_level` (escola/vestibular/faculdade)
- `source_exam`, `year`, `question_hash` (único)
- `created_at`

#### Simulations Collection
- `id`, `type` (custom/mixed)
- `criteria`, `question_ids`
- `created_by`, `created_at`

#### Attempts (Atualizado)
- Suporta `exam_id` OU `simulation_id`
- `mode`: "official" ou "generated"

### Endpoints V2 (✅ Implementado)

#### Simulações
- `POST /api/simulations/generate` - Gera simulado personalizado
- `GET /api/simulations/my` - Lista simulados do usuário
- `GET /api/simulations/{id}` - Detalhes do simulado
- `GET /api/simulations/{id}/questions` - Questões sem gabarito
- `POST /api/simulations/{id}/attempt` - Inicia tentativa

#### Admin
- `POST /api/admin/import/questions` - Importação em lote com hash

#### Metadata
- `GET /api/metadata/subjects` - Lista de matérias válidas
- `GET /api/metadata/topics/{subject}` - Tópicos por matéria
- `GET /api/metadata/filters` - Opções de filtros disponíveis

#### Stats
- `GET /api/stats/dashboard` - Estatísticas do usuário

## What's Been Implemented (Feb 2026)

### Backend
- ✅ Modelo Questions com todos os novos campos
- ✅ Collection Simulations
- ✅ Attempts suporta exam_id ou simulation_id
- ✅ Todos os endpoints de simulação
- ✅ Importação em lote com hash anti-duplicata
- ✅ Índices MongoDB otimizados
- ✅ Validação de subjects/topics
- ✅ Regras de segurança (role ignorado no registro)

### Frontend
- ✅ Página CreateSimulation com filtros multi-select
- ✅ Página MySimulations
- ✅ Dashboard atualizado com cards informativos
- ✅ Simulation.js suporta exam_id ou simulation_id
- ✅ Results.js com melhorias UX
- ✅ Login.js sem dropdown de role
- ✅ Rotas atualizadas no App.js

### Seed Data
- ✅ 12 questões de exemplo no banco
- ✅ Diversas matérias (Matemática, Física, Química, etc.)
- ✅ Diferentes níveis e dificuldades

## Prioritized Backlog

### P0 (Crítico)
- N/A - Core implementado

### P1 (Alta Prioridade)
- [ ] Revisão de questões erradas após simulado
- [ ] Filtro por tópicos na criação de simulado
- [ ] Histórico detalhado de performance por matéria

### P2 (Média Prioridade)
- [ ] Importação via CSV/Excel
- [ ] Exportação de resultados
- [ ] Compartilhamento de simulados
- [ ] Modo escuro

### Backlog Futuro
- [ ] Gamificação (conquistas, streaks)
- [ ] Planos de estudo personalizados
- [ ] Análise preditiva de desempenho
- [ ] Integração com calendário
- [ ] App mobile

## Tech Stack
- **Backend**: FastAPI, MongoDB, PyJWT, bcrypt
- **Frontend**: React, Tailwind CSS, Radix UI, Sonner
- **Auth**: JWT com 7 dias de expiração
- **Database**: MongoDB com índices otimizados

## Auditoria Técnica (Feb 2026)
- ✅ Segurança: Todas verificações aprovadas
- ✅ Performance: N+1 queries corrigidos com $lookup
- ✅ Consistência: Validações de dados adicionadas
- ✅ Escalabilidade: Suporta 100k+ questões com índices otimizados
- Ver detalhes em `/app/memory/AUDIT_REPORT.md`

## Environment Variables

### Backend
- `MONGO_URL`: URL do MongoDB
- `DB_NAME`: Nome do banco
- `JWT_SECRET`: Chave secreta JWT (obrigatório)
- `ADMIN_EMAILS`: Lista de emails admin (separados por vírgula)
- `CORS_ORIGINS`: Domínios permitidos

### Frontend
- `REACT_APP_BACKEND_URL`: URL da API

## Next Actions
1. Adicionar mais questões ao banco via importação
2. Implementar revisão de questões erradas
3. Melhorar filtros na criação de simulado
4. Adicionar analytics de performance

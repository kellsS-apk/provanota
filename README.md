# ProvaNota - Plataforma de Simulados ENEM

Plataforma web para prática de questões objetivas de vestibulares brasileiros (ENEM e outros), com correção automática e análise de desempenho por área de conhecimento.

## 🚀 Funcionalidades

- **Autenticação**: Sistema completo de login/registro com JWT
- **Simulados Cronometrados**: Timer, navegação entre questões, autosave
- **Correção Automática**: Pontuação total e breakdown por área (Linguagens, Humanas, Natureza, Matemática)
- **Dashboard**: Estatísticas de desempenho, histórico de tentativas
- **Painel Admin**: CRUD de provas e questões, publicação/despublicação
- **Sistema Premium**: Monetização com ads (free) e upgrade premium (sem ads)

## 📋 Requisitos

- Node.js 16+ e Yarn
- Python 3.11+
- MongoDB (local ou Atlas)

## 🛠️ Configuração Local

### 1. Clone o Repositório

```bash
git clone <seu-repositorio>
cd provanota
```

### 2. Configurar Backend

```bash
cd backend

# Criar ambiente virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate  # Windows

# Instalar dependências
pip install -r requirements.txt

# Configurar variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais
```

**Arquivo `.env` do Backend:**

```env
MONGO_URL="mongodb://localhost:27017"
# Para MongoDB Atlas: mongodb+srv://<user>:<password>@cluster.mongodb.net

DB_NAME="provanota_db"
CORS_ORIGINS="http://localhost:3000,https://seu-dominio-vercel.vercel.app"
JWT_SECRET="seu-secret-key-super-seguro-aqui"
```

**Executar Backend:**

```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### 3. Configurar Frontend

```bash
cd frontend

# Instalar dependências
yarn install

# Configurar variáveis de ambiente
cp .env.example .env
# Edite .env com o URL do backend
```

**Arquivo `.env` do Frontend:**

```env
REACT_APP_BACKEND_URL=http://localhost:8001
# Para produção: https://seu-backend.onrender.com
```

**Executar Frontend:**

```bash
yarn start
```

Acesse: `http://localhost:3000`

### 4. Popular Banco de Dados (Seed)

```bash
cd backend
python seed_data.py
```

**Credenciais de Teste:**
- **Admin**: admin@provanota.com / admin123
- **Estudante**: estudante@provanota.com / estudante123

## ☁️ Deploy em Plataformas Gratuitas

### MongoDB Atlas (Gratuito)

1. Acesse [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Crie uma conta gratuita
3. Crie um novo cluster (M0 - Free Tier)
4. Em **Database Access**: Crie um usuário com senha
5. Em **Network Access**: Adicione `0.0.0.0/0` (permitir de qualquer IP)
6. Clique em **Connect** → **Connect your application**
7. Copie a connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
8. Substitua `<username>` e `<password>` com suas credenciais
9. Use esta string na variável `MONGO_URL`

### Deploy Backend no Render

1. Acesse [Render](https://render.com) e crie uma conta
2. Clique em **New** → **Web Service**
3. Conecte seu repositório GitHub
4. Configure:
   - **Name**: `provanota-api`
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
5. Adicione **Environment Variables**:
   ```
   MONGO_URL=mongodb+srv://...
   DB_NAME=provanota_db
   CORS_ORIGINS=https://seu-app.vercel.app
   JWT_SECRET=seu-secret-super-seguro
   ```
6. Clique em **Create Web Service**
7. Aguarde o deploy (5-10 min)
8. Copie a URL: `https://provanota-api.onrender.com`

**⚠️ Importante:** O plano gratuito do Render hiberna após 15min de inatividade. A primeira requisição após hibernação pode demorar 30-60 segundos.

**Popular banco de dados no Render:**

```bash
# Localmente, aponte para o MongoDB Atlas
export MONGO_URL="mongodb+srv://..."
python seed_data.py
```

Ou use o Render Shell:
1. No painel do Render, vá em **Shell**
2. Execute: `python seed_data.py`

### Deploy Frontend no Vercel

1. Instale Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. No diretório `frontend`:
   ```bash
   cd frontend
   vercel
   ```

3. Ou use o Dashboard:
   - Acesse [Vercel](https://vercel.com)
   - Clique em **Import Project**
   - Conecte seu repositório GitHub
   - Configure:
     - **Root Directory**: `frontend`
     - **Framework Preset**: `Create React App`
     - **Build Command**: `yarn build`
     - **Output Directory**: `build`
   - Adicione **Environment Variable**:
     ```
     REACT_APP_BACKEND_URL=https://provanota-api.onrender.com
     ```
   - Clique em **Deploy**

4. Após deploy, copie a URL: `https://provanota.vercel.app`

5. **Atualizar CORS no Backend:**
   - No Render, adicione a URL do Vercel em `CORS_ORIGINS`:
     ```
     CORS_ORIGINS=https://provanota.vercel.app
     ```

## 🗂️ Estrutura do Projeto

```
provanota/
├── backend/
│   ├── server.py          # FastAPI application
│   ├── seed_data.py       # Database seeding script
│   ├── requirements.txt   # Python dependencies
│   └── .env.example       # Environment variables template
├── frontend/
│   ├── src/
│   │   ├── pages/         # React pages
│   │   ├── components/    # Reusable components
│   │   ├── api.js         # API client
│   │   └── AuthContext.js # Authentication context
│   ├── package.json       # Node dependencies
│   ├── tailwind.config.js # Tailwind configuration
│   └── .env.example       # Environment variables template
└── README.md
```

## 🔧 Tecnologias

### Backend
- FastAPI
- MongoDB (Motor async driver)
- JWT Authentication
- Bcrypt (password hashing)
- Pydantic (validation)

### Frontend
- React 19
- React Router v7
- Tailwind CSS
- Shadcn/UI components
- Axios
- Lucide React (icons)
- Sonner (toasts)

## 📱 Páginas

### Estudante
- `/login` - Autenticação
- `/dashboard` - Dashboard com estatísticas e exames disponíveis
- `/exam/:id` - Detalhes da prova
- `/simulation/:attemptId` - Interface de simulado
- `/results/:attemptId` - Resultado com breakdown por área
- `/profile` - Perfil e upgrade premium

### Admin
- `/admin` - Painel administrativo
- `/admin/exams/new` - Criar nova prova
- `/admin/exams/:id/questions` - Gerenciar questões

## 🔐 API Endpoints

### Autenticação
- `POST /api/auth/register` - Criar conta
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Obter usuário atual

### Provas (Estudante)
- `GET /api/exams` - Listar provas publicadas
- `GET /api/exams/:id` - Detalhes da prova
- `GET /api/exams/:id/questions` - Questões da prova (sem gabarito)

### Tentativas
- `POST /api/attempts` - Iniciar simulado
- `GET /api/attempts/:id` - Obter tentativa
- `POST /api/attempts/:id/answer` - Salvar resposta
- `POST /api/attempts/:id/submit` - Submeter simulado
- `GET /api/attempts` - Histórico de tentativas

### Admin
- `GET /api/admin/exams` - Listar todas as provas
- `POST /api/admin/exams` - Criar prova
- `PUT /api/admin/exams/:id` - Atualizar prova
- `DELETE /api/admin/exams/:id` - Excluir prova
- `POST /api/admin/exams/:id/publish` - Publicar prova
- `POST /api/admin/exams/:id/unpublish` - Despublicar prova
- `POST /api/admin/questions` - Criar questão
- `GET /api/admin/exams/:id/questions` - Listar questões
- `PUT /api/admin/questions/:id` - Atualizar questão
- `DELETE /api/admin/questions/:id` - Excluir questão

### Usuário
- `PUT /api/users/subscription` - Atualizar para premium (mockup)

## 🐛 Troubleshooting

### Backend não conecta ao MongoDB
- Verifique se MongoDB está rodando: `mongod --version`
- Teste a connection string com MongoDB Compass
- Para Atlas: verifique Network Access (IP whitelist)

### Frontend não conecta ao Backend
- Verifique `REACT_APP_BACKEND_URL` no `.env`
- Verifique CORS no backend
- Abra DevTools → Network para ver erros

### Render: "Application failed to respond"
- Verifique logs no Render Dashboard
- Certifique-se que `PORT` está sendo usado: `--port $PORT`
- Aguarde ~30s se o serviço estava hibernando

### Vercel: Build falha
- Verifique se `yarn.lock` está commitado
- Root Directory deve ser `frontend`
- Build Command: `yarn build`

## 📄 Licença

MIT

## 🤝 Contribuindo

Contribuições são bem-vindas! Abra uma issue ou pull request.

## 📞 Suporte

Para dúvidas ou problemas, abra uma issue no GitHub.
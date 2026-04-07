# Sistema de Pesquisas

Estrutura inicial simples com backend em FastAPI e frontend em React.

## Estrutura

- `backend/`: API HTTP com organização por camadas simples.
- `frontend/`: aplicação React usando Vite.

```text
backend/
	app/
		api/
			v1/
				endpoints/
				router.py
		core/
		db/
		models/
		repositories/
		schemas/
		seeds/
		services/
		main.py
	seed.py
	tests/

frontend/
	src/
		components/
		pages/
		services/
		styles/
		App.jsx
		main.jsx
```

## Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

A API ficará disponível em `http://127.0.0.1:8000`.

## Banco de dados local

O backend agora possui uma base inicial em SQLite para o MVP corporativo de pesquisas de RH.

- Configuração do banco: `backend/app/core/config.py`
- Base declarativa e registro dos modelos: `backend/app/db/base.py`
- Engine, session local e criação das tabelas: `backend/app/db/session.py`
- Modelos do domínio: `backend/app/models/`
- Seed inicial: `backend/app/seeds/seed_initial.py`
- Script simples para seed: `backend/seed.py`

### Cobertura inicial do domínio

- autenticação e usuários
- colaboradores
- departamentos
- cargos
- pesquisas e versões
- dimensões e perguntas
- opções de resposta
- campanhas e público-alvo congelado
- respostas e itens de resposta
- auditoria básica

### Seed inicial incluído

- 3 departamentos
- 5 cargos
- 5 usuários com perfis `RH_ADMIN`, `RH_ANALISTA`, `GESTOR`, `COLABORADOR` e `TI_SUPORTE`
- 5 colaboradores vinculados
- 1 pesquisa GPTW
- 1 versão publicada
- 4 dimensões
- 6 perguntas
- 3 opções de resposta para pergunta `SINGLE_CHOICE`
- 1 campanha ativa
- 3 registros de público-alvo
- 1 resposta em rascunho com 2 itens respondidos

### Login administrativo local

O portal administrativo agora usa autenticação JWT no backend.

- Endpoint de login: `POST /api/v1/auth/login`
- Endpoint de sessão autenticada: `GET /api/v1/auth/me`
- Perfis com acesso ao portal administrativo: `RH_ADMIN`, `RH_ANALISTA` e `TI_SUPORTE`

Credenciais de desenvolvimento já seedadas:

- `rh.admin@example.com` / `AdminRH123!`
- `rh.analyst@example.com` / `AnalistaRH123!`
- `ti.suporte@example.com` / `SuporteTI123!`

### Primeiras telas do portal administrativo

O frontend administrativo agora possui uma base real protegida por JWT:

- `/admin`: dashboard inicial com indicadores do ambiente
- `/admin/surveys`: tela inicial para gerenciar pesquisas
- formulario real para criar novas pesquisas com versao inicial e dimensoes opcionais

Dados exibidos no portal:

- total de pesquisas
- versoes publicadas
- campanhas ativas
- respostas em rascunho e enviadas
- listagem de pesquisas com versao atual, perguntas, dimensoes e campanha mais recente

### Rodando o banco localmente

```bash
cd backend
.venv\Scripts\activate
python seed.py
uvicorn app.main:app --reload
```

O arquivo SQLite será criado em `backend/rh_surveys.db`.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

A interface ficará disponível em `http://127.0.0.1:5173`.

## Depuração no VS Code

Use as configurações em `.vscode/launch.json`:

- `Backend: FastAPI`: inicia e depura a API.
- `Frontend: Vite`: sobe o servidor React.
- `Frontend: Navegador`: abre o app no navegador com suporte a debug.
- `Full Stack: FastAPI + React`: inicia backend, frontend e navegador juntos.

## Próximos passos

1. Adicionar autenticação real com hash seguro e emissão de token.
2. Criar migrations com Alembic pensando na futura migração para MySQL.
3. Expor CRUD inicial de pesquisas, campanhas e respostas no backend.
4. Conectar o frontend aos fluxos reais de login, listagem de campanhas e resposta da pesquisa.

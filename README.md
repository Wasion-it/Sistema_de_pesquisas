# Sistema de Recursos Humanos

Portal web para centralizar processos de Recursos Humanos, com fluxos de admissão, desligamento, aprovações, checklists operacionais, pesquisas internas, campanhas e dashboards administrativos.

O projeto é composto por uma API em FastAPI e uma interface em React + Vite.

## Módulos

- **Solicitações de admissão**: abertura de requisições de vaga, aprovação por fluxo, contratação de candidatos e finalização.
- **Solicitações de demissão**: criação de pedidos de desligamento, aprovação, acompanhamento e checklist.
- **Aprovações**: fila para gestores, diretoria e RH decidirem etapas pendentes.
- **Checklists de RH**: configuração e acompanhamento de etapas operacionais de admissão e demissão.
- **Pesquisas internas**: criação de pesquisas, dimensões, perguntas, campanhas e publicação.
- **Respostas e KPIs**: acompanhamento de participação, respostas e indicadores de campanhas.
- **Cadastros auxiliares**: departamentos e cargos.
- **Controle de acesso**: perfis administrativos e integração opcional com LDAP/Active Directory.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Frontend | React, Vite, React Router |
| Backend | FastAPI, Pydantic, SQLAlchemy |
| Autenticação | JWT, login local e LDAP opcional |
| Banco local | SQLite |
| Migrations | Alembic |
| Deploy | Docker, Docker Swarm, Traefik, GitHub Actions |

## Estrutura do projeto

```text
backend/
  app/
    api/              # Rotas, dependências e endpoints HTTP
    core/             # Configuração e segurança
    db/               # Engine, sessão e base ORM
    models/           # Modelos SQLAlchemy
    schemas/          # Contratos Pydantic
    seeds/            # Dados iniciais
    services/         # Serviços de domínio e integrações
    main.py           # Aplicação FastAPI
  alembic/            # Migrations
  requirements.txt
  seed.py

frontend/
  public/
  src/
    auth/             # Sessão e autenticação no frontend
    components/       # Componentes compartilhados
    pages/            # Telas da aplicação
    services/         # Clientes HTTP
    styles/           # CSS global
    utils/            # Utilitários
    App.jsx           # Rotas
    main.jsx
  package.json
```

## Documentação

- [Documentação do usuário](DOCUMENTACAO_USUARIO.md): guia funcional das telas, perfis e fluxos.
- [Documentação de arquitetura](DOCUMENTACAO_ARQUITETURA.md): visão técnica da arquitetura, módulos, API e decisões.
- [Arquitetura resumida](ARCHITECTURE.md): registro arquitetural original do projeto.
- [Documentação técnica RH](DOCUMENTACAO_TECNICA_RH.md): detalhes técnicos e regras dos fluxos de RH.

## Pré-requisitos

- Python 3.11 ou superior;
- Node.js 20 ou superior;
- npm;
- Git;
- Docker, apenas para execução/deploy em container.

## Como rodar localmente

### 1. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python seed.py
uvicorn app.main:app --reload
```

A API ficará disponível em:

```text
http://127.0.0.1:8000
```

Documentação interativa da API:

```text
http://127.0.0.1:8000/docs
```

### 2. Frontend

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

A interface ficará disponível em:

```text
http://127.0.0.1:5173
```

## Banco de dados local

O ambiente local usa SQLite. Ao rodar o seed, o arquivo de banco é criado em:

```text
backend/rh_surveys.db
```

O seed inicial inclui:

- departamentos e cargos;
- usuários de desenvolvimento;
- colaboradores vinculados;
- pesquisa publicada;
- dimensões, perguntas e opções;
- campanha ativa;
- respostas de exemplo;
- dados mínimos para fluxos administrativos.

## Credenciais de desenvolvimento

Usuários seedados para testes locais:

| Perfil | E-mail | Senha |
| --- | --- | --- |
| RH Admin | `rh.admin@example.com` | `AdminRH123!` |
| RH Analista | `rh.analyst@example.com` | `AnalistaRH123!` |
| Suporte TI | `ti.suporte@example.com` | `SuporteTI123!` |

## Principais rotas

### Interface

```text
/                         Home
/solicitacoes             Solicitações de admissão e demissão
/my-requests              Minhas solicitações
/pesquisas                Campanhas de pesquisa
/admin                    Portal administrativo
/admin/approvals          Aprovações
/admin/surveys            Gestão de pesquisas
/admin/requests           Solicitações administrativas
/admin/access-control     Controle de acesso
```

### API

```text
GET  /api/v1/health
POST /api/v1/auth/login
GET  /api/v1/auth/me
GET  /api/v1/campaigns/published
GET  /api/v1/admin/dashboard
GET  /api/v1/admin/surveys
GET  /api/v1/admin/hr/admission-requests
GET  /api/v1/admin/hr/dismissal-requests
GET  /api/v1/admin/hr/approvals/admission
GET  /api/v1/admin/hr/approvals/dismissal
```

## Autenticação e permissões

O portal usa JWT para sessão administrativa. A autorização é baseada em perfis e módulos.

Perfis principais:

- `RH_ADMIN`;
- `RH_ANALISTA`;
- `RH_PESQUISAS`;
- `GESTOR`;
- `DIRETOR_RAVI`;
- `COLABORADOR`.

Módulos de acesso:

- `DASHBOARD`;
- `ADMISSION`;
- `DISMISSAL`;
- `SURVEYS`;
- `APPROVALS`;
- `ACCESS_CONTROL`.

## LDAP/Active Directory

O backend pode autenticar usuários de RH via LDAP/Active Directory quando `LDAP_ENABLED=true`. Mesmo nesse modo, o usuário precisa existir no banco para manter papel, status e auditoria.

Exemplo de `backend/.env`:

```env
LDAP_ENABLED=true
LDAP_SERVER_URI=ldap://ad.empresa.local:389
LDAP_USE_SSL=false
LDAP_START_TLS=true
LDAP_VALIDATE_CERTIFICATES=false
LDAP_BIND_DN=CN=svc_ldap,OU=Servicos,DC=empresa,DC=local
LDAP_BIND_PASSWORD=trocar-em-producao
LDAP_USER_BASE_DN=OU=Usuarios,DC=empresa,DC=local
LDAP_USER_FILTER=(mail={username})
LDAP_TIMEOUT_SECONDS=5
```

## Scripts úteis

### Frontend

```bash
npm run dev
npm run build
npm run preview
```

### Backend

```bash
uvicorn app.main:app --reload
python seed.py
alembic upgrade head
```

## Docker

O projeto possui `Dockerfile` e `docker-compose.yml` para execução em container e deploy.

```bash
docker compose up --build
```

Em produção, a aplicação é publicada via Docker Swarm e exposta pelo Traefik no domínio:

```text
https://systemrh.wasion.com.br
```

## Deploy via GitHub Actions

O workflow de produção faz deploy por SSH e publica a stack com `docker stack deploy`.

Secrets/variáveis esperados:

- `DEPLOY_PROD_HOST`;
- `DEPLOY_PROD_USER`;
- `DEPLOY_PROD_PATH`;
- `DEPLOY_PROD_SSH_KEY`.

O servidor precisa ter:

- Git;
- Docker;
- Docker Swarm ativo;
- rede externa `apps` criada;
- Traefik operando no mesmo cluster.

### Chave SSH para deploy

No servidor, autorize a chave pública do usuário de deploy:

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
cat ~/.ssh/id_ed25519.pub
```

Adicione a chave pública em `~/.ssh/authorized_keys`. A chave privada correspondente deve ser cadastrada no GitHub como `DEPLOY_PROD_SSH_KEY`.

## Depuração no VS Code

O projeto inclui configurações em `.vscode/launch.json`:

- `Backend: FastAPI`;
- `Frontend: Vite`;
- `Frontend: Navegador`;
- `Full Stack: FastAPI + React`.

## Estado atual

O sistema já possui uma base funcional para:

- portal administrativo protegido;
- login com JWT;
- integração LDAP opcional;
- solicitações de admissão e demissão;
- aprovação por etapas;
- checklists configuráveis;
- gestão de pesquisas;
- campanhas públicas;
- respostas e indicadores administrativos.

Próximas melhorias recomendadas:

- ampliar cobertura de testes automatizados;
- dividir endpoints administrativos por domínio;
- consolidar migrations Alembic como fluxo principal de schema;
- evoluir observabilidade e logs;
- revisar política de expiração e renovação de sessão.

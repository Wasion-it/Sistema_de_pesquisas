# Sistema de Recursos Humanos

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
- 5 usuários com perfis `RH_ADMIN`, `RH_ANALISTA`, `GESTOR` e `COLABORADOR`
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
- Perfis com acesso ao portal administrativo: `RH_ADMIN` e `RH_ANALISTA`

Credenciais de desenvolvimento já seedadas:

- `rh.admin@example.com` / `AdminRH123!`
- `rh.analyst@example.com` / `AnalistaRH123!`
- `ti.suporte@example.com` / `SuporteTI123!`

### Login corporativo via LDAP para RH

O backend agora pode autenticar perfis de RH usando LDAP/Active Directory, enquanto a autorizacao continua baseada no usuario ja cadastrado no banco.

Comportamento:

- perfis `RH_ADMIN` e `RH_ANALISTA` usam LDAP quando `LDAP_ENABLED=true`
- usuários de apoio interno continuam usando senha local do banco
- o usuario precisa continuar existindo na tabela `users` para manter papel, ativo/inativo e auditoria

Variaveis de ambiente suportadas no backend:

- `LDAP_ENABLED=false`
- `LDAP_SERVER_URI=ldap://servidor.corporativo.local:389`
- `LDAP_USE_SSL=false`
- `LDAP_START_TLS=true`
- `LDAP_VALIDATE_CERTIFICATES=true`
- `LDAP_BIND_DN=CN=svc_ldap,OU=Servicos,DC=empresa,DC=local`
- `LDAP_BIND_PASSWORD=sua-senha-de-servico`
- `LDAP_USER_BASE_DN=OU=Usuarios,DC=empresa,DC=local`
- `LDAP_USER_FILTER=(mail={username})`
- `LDAP_USER_DN_TEMPLATE=`
- `LDAP_TIMEOUT_SECONDS=5`

Existem dois modos de localizar o usuario:

- busca + bind: informe `LDAP_BIND_DN`, `LDAP_BIND_PASSWORD`, `LDAP_USER_BASE_DN` e `LDAP_USER_FILTER`
- bind direto: informe `LDAP_USER_DN_TEMPLATE`, por exemplo `CN={username},OU=Usuarios,DC=empresa,DC=local`

Exemplo de `.env` em `backend/.env`:

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

A interface ficará disponível em `http://127.0.0.1:5173` no ambiente de desenvolvimento e via Traefik no domínio `https://systemrh.wasion.com.com` no deploy.

## Deploy via GitHub Actions

O workflow de produção agora faz deploy direto no servidor via SSH e publica a stack com `docker stack deploy`, porque o Traefik está operando com `providers.swarm=true`.

## Guia de configuração da chave SSH

1. No servidor de produção, entre no usuário que vai receber o deploy e crie a pasta de SSH se ela ainda não existir:

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
```

2. Gere um par de chaves. O ideal é fazer isso em uma máquina segura que você controla, como sua máquina local ou um host administrativo:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy"
```

3. Copie a chave pública para o servidor e autorize o acesso do GitHub Actions:

```bash
cat ~/.ssh/id_ed25519.pub
```

Adicione o conteúdo retornado no arquivo `~/.ssh/authorized_keys` do usuário do servidor.

4. Pegue a chave privada gerada no passo anterior e cadastre no GitHub em `Settings > Secrets and variables > Actions > New repository secret`.

5. Crie o secret `DEPLOY_PROD_SSH_KEY` com o conteúdo completo da chave privada.

6. Garanta que os secrets e variáveis do workflow estejam preenchidos:

- `DEPLOY_PROD_HOST`: host do servidor de produção.
- `DEPLOY_PROD_USER`: usuário SSH do servidor.
- `DEPLOY_PROD_PATH`: diretório onde o projeto ficará no servidor.
- `DEPLOY_PROD_SSH_KEY`: chave privada SSH usada pelo deploy.

O servidor precisa ter `git` e `docker compose` disponíveis, além de acesso ao diretório informado em `DEPLOY_PROD_PATH`.
O acesso público da aplicação é feito pelo Traefik, usando o domínio `systemrh.wasion.com.com` em HTTPS. Sem certificado customizado, o Traefik pode servir o certificado padrão e o navegador pode exibir aviso de segurança.

7. Garanta que o servidor esteja com Swarm ativo e que a rede externa `controle_overlay` exista no mesmo cluster onde o Traefik roda.

8. Crie ou ajuste o DNS do domínio `systemrh.wasion.com.com` para apontar para o host onde o Traefik está rodando. Em geral isso é feito com um registro `A` para o IP público do proxy ou um `CNAME` para o hostname que resolve esse proxy.

9. Execute o workflow `Publicação de produção` em `Actions` e confirme que o job de deploy consegue publicar a stack no Swarm.

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

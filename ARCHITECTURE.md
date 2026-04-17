# Arquitetura do Sistema

## Visao Geral

O Sistema de Recursos Humanos e um monolito modular com frontend e backend separados por responsabilidade de entrega:

- frontend em React + Vite para interface administrativa e fluxos publicos de pesquisa
- backend em FastAPI para autenticacao, regras de negocio e exposicao da API HTTP
- persistencia local em SQLite via SQLAlchemy ORM

O sistema cobre dois macrodominios:

- operacao de RH: admissao, demissao, aprovacoes, checklist, departamentos e cargos
- pesquisas: pesquisas, versoes, dimensoes, perguntas, campanhas, publico e respostas

### Estrutura de alto nivel

```text
frontend (React + Vite)
  -> consome API REST
backend (FastAPI)
  -> aplica autenticacao, autorizacao e regras de negocio
database (SQLite)
  -> persiste entidades operacionais e historico
```

### Organizacao do repositorio

```text
backend/
  app/
    api/
      v1/
        endpoints/
    core/
    db/
    models/
    repositories/
    schemas/
    services/
  tests/

frontend/
  src/
    auth/
    components/
    pages/
    services/
    styles/
```

## Componentes e Responsabilidades

### Frontend

- `src/App.jsx`: roteamento principal da aplicacao
- `src/auth/AuthProvider.jsx`: sessao do usuario admin, armazenamento do token e carregamento da sessao atual
- `src/components/`: layout administrativo, modais e componentes de apoio aos fluxos
- `src/pages/`: telas por caso de uso, com foco em composicao da interface e orquestracao das chamadas
- `src/services/`: client HTTP baseado em `fetch` para backend publico, autenticacao e admin

### Backend

- `app/main.py`: bootstrap da API, CORS, startup e registro das rotas
- `app/api/deps.py`: resolucao do usuario autenticado e validacao de acesso administrativo
- `app/api/v1/endpoints/auth.py`: login local/JWT, integracao opcional com LDAP e leitura da sessao
- `app/api/v1/endpoints/public.py`: campanhas publicadas, inicio de participacao e envio de respostas
- `app/api/v1/endpoints/admin.py`: operacao administrativa do sistema
- `app/core/config.py`: configuracoes de ambiente
- `app/core/security.py`: hash de senha, JWT e papeis autorizados
- `app/db/`: engine, sessao, base declarativa e inicializacao de schema
- `app/models/`: entidades ORM e enums do dominio
- `app/schemas/`: contratos de entrada e saida da API
- `app/services/`: logica reutilizavel de suporte, como LDAP e checklist

### Persistencia

- SQLite como banco padrao de desenvolvimento
- SQLAlchemy ORM para mapeamento objeto-relacional
- criacao de tabelas e ajustes de compatibilidade executados no startup

## Fluxos

### 1. Login administrativo

```text
Usuario -> Frontend /admin/login
        -> POST /api/v1/auth/login
        -> validacao local ou LDAP
        -> emissao do JWT
        -> token salvo no navegador
        -> GET /api/v1/auth/me para montar contexto da sessao
```

Objetivo do fluxo:

- autenticar usuarios administrativos
- carregar papel e dados da sessao para navegacao protegida

### 2. Navegacao administrativa autenticada

```text
Frontend protegido -> envia Bearer token
                  -> backend resolve usuario em api/deps.py
                  -> endpoint valida papel e executa regra de negocio
                  -> resposta JSON atualiza a tela
```

Esse fluxo sustenta paginas como:

- dashboard administrativo
- departamentos e cargos
- fila de aprovacoes
- solicitacoes de admissao e demissao
- gestao de pesquisas

### 3. Fluxo de admissao

```text
Solicitante cria pedido
  -> POST /api/v1/admin/hr/admission-requests
  -> backend grava solicitacao, workflow e auditoria

Fila de aprovacao
  -> GET /api/v1/admin/hr/approvals/admission
  -> aprovadores executam approve/reject

Execucao da vaga
  -> RH acompanha checklist
  -> endpoint de hire registra candidatos contratados
  -> employees sao criados para os aprovados

Encerramento
  -> finalize marca conclusao da solicitacao
```

Aspectos do fluxo:

- workflow multi-etapa por papel
- controle de SLA a partir de etapa especifica de aprovacao
- vinculo entre solicitacao, candidatos e colaboradores criados

### 4. Fluxo de demissao

```text
Solicitante cria pedido
  -> POST /api/v1/admin/hr/dismissal-requests
  -> backend cria etapas de aprovacao

Aprovadores atuam na fila
  -> approve/reject por etapa

RH acompanha status consolidado
  -> detalhe do pedido e status das aprovacoes
```

### 5. Fluxo de pesquisas e campanhas

```text
Admin cria/edita pesquisa
  -> define dimensoes e perguntas
  -> publica uma versao

Campanha publicada
  -> disponibilizada no fluxo publico
  -> participante inicia resposta
  -> resposta pode virar rascunho ou envio final

Admin acompanha resultados
  -> dashboard
  -> respostas da campanha
  -> KPIs agregados
```

### 6. Fluxo publico de participacao em campanha

```text
Usuario acessa campanha publicada
  -> GET /api/v1/campaigns/published/{id}
  -> POST /api/v1/campaigns/published/{id}/start
  -> responde perguntas
  -> POST /api/v1/campaigns/published/{id}/submit
```

Esse fluxo contempla campanhas anonimas e nao anonimas, com congelamento de contexto da audiencia quando necessario.

## Decisoes Tecnicas

### FastAPI como camada HTTP

Motivacao:

- produtividade alta para API corporativa
- tipagem com Pydantic
- integracao simples com SQLAlchemy

Consequencia:

- a camada HTTP ficou muito proxima da regra de negocio, principalmente no modulo administrativo

### React + Vite no frontend

Motivacao:

- ciclo de desenvolvimento rapido
- roteamento simples para SPA administrativa
- baixo custo operacional para evoluir telas e modais

Consequencia:

- boa velocidade de entrega, com risco de concentracao de logica em paginas grandes

### SQLAlchemy ORM com SQLite no desenvolvimento

Motivacao:

- setup local simples
- menor friccao para MVP e desenvolvimento individual

Consequencia:

- solucao adequada para ambiente local, mas com limite claro de escalabilidade e governanca
- evolucao de schema depende hoje de ajustes executados no startup

### JWT para sessao administrativa

Motivacao:

- autenticacao stateless
- integracao simples com frontend SPA

Consequencia:

- token fica sob responsabilidade do frontend
- expiracao e renovacao de sessao dependem da estrategia adotada na interface

### LDAP opcional para perfis de RH

Motivacao:

- permitir autenticacao corporativa sem remover o controle de papel interno

Consequencia:

- autenticacao pode variar entre local e corporativa conforme perfil e ambiente
- onboarding de usuarios LDAP depende da conciliacao com o cadastro interno

### Organizacao por dominios dentro de um unico backend

Motivacao:

- manter tudo no mesmo deploy durante a fase atual do produto
- compartilhar modelos, autenticacao e auditoria entre dominios de RH e pesquisas

Consequencia:

- simplicidade operacional
- aumento de acoplamento no endpoint administrativo central

### Regras de negocio proximas dos endpoints

Motivacao:

- entrega rapida
- menor numero de camadas no inicio do projeto

Consequencia:

- manutencao mais sensivel em `admin.py`
- menor reutilizacao de regras em comparacao com uma camada de aplicacao mais explicita

## Estado Atual da Arquitetura

Pontos fortes:

- estrutura compreensivel para equipe pequena
- backend e frontend com responsabilidades macro bem definidas
- cobertura funcional ampla para RH e pesquisas
- contratos HTTP separados por schemas

Pontos de atencao:

- concentracao de logica no modulo administrativo
- uso de migracoes implicitas no startup
- camada de repositorios ainda pouco explorada
- necessidade futura de endurecer sessao, observabilidade e governanca de schema

## Direcao de Evolucao Recomendada

- extrair casos de uso criticos de `admin.py` para servicos de aplicacao
- substituir ajustes de schema no startup por migracoes versionadas
- reforcar contratos entre frontend e backend para reduzir acoplamento de payloads
- manter a separacao por dominio ao expandir os fluxos de RH e pesquisas
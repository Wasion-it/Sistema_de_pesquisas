# Desenho da Arquitetura

Este arquivo apresenta a arquitetura do Sistema de Recursos Humanos em diagramas Mermaid. O GitHub renderiza estes blocos automaticamente na visualização do Markdown.

## 1. Visão Geral

```mermaid
flowchart LR
    user[Usuários<br/>Colaboradores, Gestores, RH] --> browser[Navegador]
    browser --> frontend[Frontend<br/>React + Vite]
    frontend --> api[Backend API<br/>FastAPI]
    api --> auth[Autenticação e Autorização<br/>JWT + Perfis]
    api --> services[Serviços de Domínio<br/>RH, Pesquisas, LDAP, Checklists]
    api --> orm[SQLAlchemy ORM]
    orm --> db[(Banco de Dados)]

    db -. local .-> sqlite[(SQLite<br/>desenvolvimento)]
    db -. deploy .-> postgres[(PostgreSQL 16<br/>produção)]

    auth -. opcional .-> ldap[LDAP / Active Directory]
```

## 2. Arquitetura de Deploy

```mermaid
flowchart TB
    github[GitHub Repository] --> actions[GitHub Actions<br/>Publicação de produção]
    actions --> ssh[Deploy via SSH]
    ssh --> swarm[Docker Swarm]

    subgraph swarm[Docker Swarm]
        subgraph overlay[controle_overlay]
            traefik[Traefik<br/>HTTPS + roteamento]
            frontend[Frontend container<br/>Nginx + build React]
            backend[Backend container<br/>FastAPI + Uvicorn]
        end

        subgraph internal[pesquisas_internal]
            postgres[(PostgreSQL 16)]
            volume[(Volume<br/>postgres-data)]
        end

        backend --> postgres
        postgres --> volume
    end

    usuario[Usuário] --> dominio[systemrh.wasion.com.br]
    dominio --> traefik
    traefik --> frontend
    traefik -- /api --> backend

    backend -. antes de iniciar .-> alembic[Alembic<br/>upgrade head]
```

## 3. Camadas do Backend

```mermaid
flowchart TB
    main[app/main.py<br/>Bootstrap FastAPI] --> router[api/v1/router.py]

    router --> authEndpoint[auth.py<br/>Login e sessão]
    router --> publicEndpoint[public.py<br/>Campanhas públicas]
    router --> adminEndpoint[admin.py<br/>Portal administrativo]
    router --> accessEndpoint[access_control.py<br/>Controle de acesso]
    router --> healthEndpoint[health.py<br/>Healthcheck]

    authEndpoint --> deps[api/deps.py<br/>Usuário autenticado]
    adminEndpoint --> deps
    accessEndpoint --> deps

    authEndpoint --> security[core/security.py<br/>JWT e senha]
    authEndpoint --> ldapService[services/ldap_auth.py]
    accessEndpoint --> ldapService

    adminEndpoint --> schemas[schemas/<br/>Contratos Pydantic]
    publicEndpoint --> schemas

    adminEndpoint --> models[models/<br/>Entidades ORM]
    publicEndpoint --> models
    models --> session[db/session.py<br/>Engine e SessionLocal]
    session --> database[(SQLite local<br/>PostgreSQL deploy)]
```

## 4. Camadas do Frontend

```mermaid
flowchart TB
    app[App.jsx<br/>Rotas] --> authProvider[AuthProvider.jsx<br/>Sessão]
    app --> protected[ProtectedRoute.jsx<br/>Rotas protegidas]
    app --> adminLayout[AdminLayout.jsx<br/>Shell administrativo]

    app --> publicPages[Pages públicas<br/>Home, Solicitações, Pesquisas]
    app --> adminPages[Pages admin<br/>Dashboard, RH, Pesquisas, Acessos]

    adminLayout --> accessUtil[utils/accessControl.js<br/>Permissões de tela]
    adminPages --> components[components/<br/>Modais, listas, painéis]
    publicPages --> components

    adminPages --> services[services/<br/>auth.js, admin.js, api.js]
    publicPages --> services
    services --> backend[Backend API<br/>/api/v1]
```

## 5. Fluxo de Login

```mermaid
sequenceDiagram
    actor U as Usuário
    participant F as Frontend
    participant A as /api/v1/auth/login
    participant L as LDAP opcional
    participant D as Banco

    U->>F: Informa e-mail e senha
    F->>A: POST login
    A->>D: Busca usuário interno

    alt LDAP habilitado para perfil de RH
        A->>L: Valida credenciais no diretório
        L-->>A: Credenciais válidas
    else Login local
        A->>A: Valida senha local
    end

    A->>D: Atualiza dados de sessão/auditoria
    A-->>F: Retorna JWT
    F->>A: GET /me com Bearer token
    A-->>F: Dados do usuário e permissões
```

## 6. Fluxo de Admissão

```mermaid
flowchart TB
    solicitante[Solicitante] --> form[Formulário<br/>Requisição de vaga]
    form --> create[Cria AdmissionRequest]
    create --> workflow[Cria etapas de aprovação]

    workflow --> gestor[Gestor aprova]
    gestor --> diretor[General Manager aprova]
    diretor --> rhManager[Gerente de RH aprova]

    rhManager --> approved{Aprovado?}
    approved -- não --> rejected[Solicitação rejeitada]
    approved -- sim --> rh[RH acompanha solicitação]

    rh --> checklist[Checklist de admissão]
    rh --> hire[Registro de candidatos contratados]
    hire --> employee[Criação/vínculo de colaborador]
    employee --> finalized[Solicitação finalizada]
```

## 7. Fluxo de Demissão

```mermaid
flowchart TB
    solicitante[Solicitante] --> form[Formulário<br/>Solicitação de demissão]
    form --> create[Cria DismissalRequest]
    create --> workflow[Cria etapas de aprovação]

    workflow --> gestor[Gestor aprova]
    gestor --> diretor[General Manager aprova]
    diretor --> rhManager[Gerente de RH aprova]

    rhManager --> approved{Aprovado?}
    approved -- não --> rejected[Solicitação rejeitada]
    approved -- sim --> rh[RH acompanha desligamento]

    rh --> checklist[Checklist de demissão]
    rh --> operationalDecision{Há impedimento operacional?}
    operationalDecision -- sim --> postReject[Rejeição operacional registrada]
    operationalDecision -- não --> done[Processo acompanhado pelo RH]
```

## 8. Fluxo de Pesquisas

```mermaid
flowchart TB
    admin[RH / Pesquisas] --> survey[Cria pesquisa]
    survey --> version[Cria versão]
    version --> dimensions[Configura dimensões]
    dimensions --> questions[Configura perguntas]
    questions --> publish[Publica campanha]

    publish --> audience[Congela público-alvo<br/>CampaignAudience]
    publish --> publicList[Campanha aparece em /pesquisas]

    participant[Participante] --> publicList
    publicList --> start[Inicia participação]
    start --> response[Cria resposta]
    response --> submit[Envia respostas]
    submit --> dashboard[Admin acompanha respostas e KPIs]
```

## 9. Modelo de Dados Simplificado

```mermaid
erDiagram
    USER ||--o| EMPLOYEE : vincula
    DEPARTMENT ||--o{ EMPLOYEE : possui
    JOB_TITLE ||--o{ EMPLOYEE : classifica

    USER ||--o{ ADMISSION_REQUEST : cria
    USER ||--o{ DISMISSAL_REQUEST : cria

    ADMISSION_REQUEST ||--o{ ADMISSION_REQUEST_APPROVAL : possui
    DISMISSAL_REQUEST ||--o{ DISMISSAL_REQUEST_APPROVAL : possui

    ADMISSION_REQUEST ||--o{ ADMISSION_REQUEST_CANDIDATE : possui
    ADMISSION_REQUEST ||--o{ EMPLOYEE : gera

    SURVEY ||--o{ SURVEY_VERSION : possui
    SURVEY ||--o{ SURVEY_DIMENSION : organiza
    SURVEY_VERSION ||--o{ SURVEY_QUESTION : possui
    SURVEY_QUESTION ||--o{ QUESTION_OPTION : possui
    SURVEY_VERSION ||--o{ CAMPAIGN : publica

    CAMPAIGN ||--o{ CAMPAIGN_AUDIENCE : possui
    CAMPAIGN ||--o{ RESPONSE : recebe
    RESPONSE ||--o{ RESPONSE_ITEM : contem
    SURVEY_QUESTION ||--o{ RESPONSE_ITEM : respondida_em
```

## 10. Responsabilidades por Módulo

```mermaid
mindmap
  root((Sistema RH))
    Solicitações
      Admissão
      Demissão
      Minhas solicitações
    Aprovações
      Gestor
      General Manager
      Gerente RH
    Operação RH
      Checklists
      Candidatos
      Finalização
    Pesquisas
      Pesquisas
      Versões
      Dimensões
      Perguntas
      Campanhas
      Respostas
      KPIs
    Administração
      Departamentos
      Cargos
      Controle de acesso
    Segurança
      JWT
      LDAP opcional
      Perfis
      Auditoria
```


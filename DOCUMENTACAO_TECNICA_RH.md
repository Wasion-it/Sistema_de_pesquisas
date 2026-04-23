# Documentação técnica do sistema RH

## Objetivo
Este documento explica, em linguagem operacional, como o sistema funciona para que a equipe de RH possa entender as telas, navegar pelos módulos e aplicar as regras de negócio sem depender da TI.

O sistema está dividido em duas experiências principais:

- Portal do colaborador, para acessar pesquisas e abrir solicitações.
- Portal administrativo, para o RH acompanhar aprovações, manter cadastros de apoio e administrar pesquisas.

## Visão geral do acesso

- A página inicial pública concentra os atalhos do colaborador.
- A área administrativa exige login.
- Algumas telas do admin ficam disponíveis apenas para perfis com permissão específica.
- O perfil `RH_ADMIN` tem acesso à delegação de acesso.
- O perfil de aprovação isolada é redirecionado diretamente para a tela de aprovações.

## Perfis e permissões

Os perfis do sistema controlam o que cada pessoa consegue ver e fazer no portal administrativo.

- `COLABORADOR`: acesso básico ao portal do colaborador.
- `GESTOR`: aprova solicitações de admissão e demissão.
- `DIRETOR_RAVI`: aprova solicitações em etapa executiva.
- `RH_ANALISTA`: opera admissão, demissão e gestão de base administrativa.
- `RH_PESQUISAS`: gerencia pesquisas, campanhas e respostas.
- `RH_ADMIN`: acesso completo ao portal administrativo e à tela de delegação de acesso.

## Mapa de páginas

### Portal do colaborador

| URL | Página | Finalidade | Regras principais |
|---|---|---|---|
| `/` | Página inicial | Porta de entrada do sistema. Apresenta os atalhos para Pesquisas e Solicitações. | Exibe os módulos disponíveis e o botão de acesso RH. |
| `/pesquisas` | Pesquisas | Lista as pesquisas abertas e o histórico das campanhas encerradas. | Mostra apenas campanhas publicadas. Campanhas abertas podem ser respondidas. |
| `/campaigns/:campaignId` | Campanha pública | Tela de resposta de uma pesquisa. | Exige que a campanha esteja disponível. A participação pede departamento e cargo antes do preenchimento. |
| `/campaigns/:campaignId/thank-you` | Agradecimento da campanha | Confirma o envio da resposta. | Mostra confirmação de envio anônimo. |
| `/solicitacoes` | Solicitações | Central de acesso aos fluxos operacionais do RH. | Organiza os atalhos de admissão, demissão e acompanhamento. |
| `/solicitacoes/admissao` | Requisição de vaga | Formulário de abertura de vaga. | Exige login. A solicitação entra no fluxo de aprovação após o envio. |
| `/solicitacoes/demissao` | Solicitação de desligamento | Formulário de desligamento. | Exige login. Pode exigir justificativa adicional para recontratação. |
| `/my-requests` | Minhas solicitações | Histórico de solicitações enviadas pelo usuário. | Exige login. Mostra status, tipo e andamento do fluxo. |

### Portal administrativo

| URL | Página | Finalidade | Regras principais |
|---|---|---|---|
| `/admin/login` | Login administrativo | Entrada para o portal do RH. | Redireciona para a área solicitada após autenticação. |
| `/admin` | Home administrativa | Página inicial do admin. | Mostra os módulos permitidos para o perfil logado. |
| `/admin/dashboard` | Dashboard administrativo | Porta de entrada dos indicadores. | Direciona para a leitura de pesquisas e indicadores operacionais. |
| `/admin/dashboard/pesquisas` | KPIs de pesquisas | Painel de indicadores de pesquisas. | Mostra volumes, rascunhos, envios e pesquisas recentes. |
| `/admin/dashboard/admissao` | KPIs de admissão | Painel de indicadores de admissão. | Exibe tempo de fechamento, SLA e desempenho por tipo de vaga. |
| `/admin/requests` | Solicitações padrão | Central padrão de solicitações do RH. | Reúne atalhos de admissão, demissão e configuração operacional. |
| `/admin/approvals` | Aprovações | Fila de decisões de admissão e demissão. | Mostra o status do fluxo e permite aprovar ou rejeitar solicitações. |
| `/admin/departments` | Departamentos | Cadastro de setores/departamentos. | Usado para segmentar pesquisas e alimentar formulários de admissão. |
| `/admin/job-titles` | Cargos | Cadastro de cargos. | Usado nos fluxos de admissão, demissão e campanhas. |
| `/admin/admission-requests` | Fila de admissão | Lista específica de solicitações de admissão. | Permite focar apenas nas requisições de vaga. |
| `/admin/admission-checklist` | Checklist de admissão | Manutenção das etapas do checklist de admissão. | Permite criar, editar, reordenar e restaurar etapas padrão. |
| `/admin/dismissal-requests` | Fila de demissão | Lista específica de solicitações de demissão. | Foco operacional no fluxo de desligamento. |
| `/admin/dismissal-checklist` | Checklist de demissão | Manutenção das etapas do checklist de demissão. | Permite criar, editar, reordenar e restaurar etapas padrão. |
| `/admin/surveys` | Pesquisas | Gestão de pesquisas e versões. | Permite criar e excluir pesquisas. |
| `/admin/surveys/:surveyId` | Detalhe da pesquisa | Edição da pesquisa, dimensões, perguntas e publicação. | Organiza a pesquisa em abas. |
| `/admin/campaigns/:campaignId/kpis` | KPIs da campanha | Análise detalhada de uma campanha. | Consolida adesão, favorabilidade, NPS e recortes por dimensão/departamento. |
| `/admin/campaigns/:campaignId/responses` | Respostas da campanha | Lista e detalhamento das respostas recebidas. | Mostra resposta por resposta e permite abrir o conteúdo completo. |
| `/admin/access-control` | Delegação de acesso | Gestão de permissões de usuários. | Visível apenas para `RH_ADMIN`. |

## Como navegar pelo sistema

### 1. Portal do colaborador
O portal do colaborador foi desenhado para ser simples: a página inicial apresenta dois caminhos principais, Pesquisas e Solicitações. A partir daí, o usuário escolhe o tipo de atividade que deseja executar.

### 2. Pesquisas
A tela de pesquisas mostra duas listas:

- Pesquisas abertas, que podem ser respondidas.
- Pesquisas encerradas, que ficam apenas como histórico.

Ao abrir uma campanha, o sistema pede o departamento e o cargo do participante antes de liberar o questionário. Depois do envio, o usuário é levado para a tela de agradecimento.

### 3. Solicitações
A área de solicitações organiza o fluxo operacional do RH em três entradas:

- Minhas solicitações, para consultar o que já foi enviado.
- Requisição de vaga, para abertura de admissão.
- Demissão, para solicitação de desligamento.

### 4. Área administrativa
O login administrativo libera o menu lateral com os módulos disponíveis para o perfil da pessoa autenticada. A home administrativa serve como ponto de entrada para os fluxos mais usados.

## Regras do módulo de admissão

A admissão é tratada como abertura de vaga e segue regras específicas:

- O tipo de solicitação pode ser aumento de quadro ou substituição.
- O formulário exige cargo, setor, tipo de recrutamento, posição da vaga, quantidade de pessoas, turno e regime de contratação.
- Quando a solicitação é de substituição, o nome do colaborador substituído deve ser informado.
- Quando a solicitação é de aumento de quadro, a justificativa se torna obrigatória.
- O setor e o cargo dependem do cadastro de departamentos e cargos ativos.
- Ao enviar uma solicitação, ela entra automaticamente na fila de aprovação.

### Estrutura da posição da vaga
A posição da vaga é classificada em três perfis:

- Administrativa.
- Operacional.
- Liderança.

Essa classificação é usada em painéis de análise e no cálculo de prazo esperado para fechamento.

## Regras do módulo de demissão

A demissão centraliza o desligamento de colaboradores e segue estas regras:

- O formulário exige nome, cargo, departamento, tipo de desligamento, substituição, possibilidade de recontratação, data estimada e regime de contratação.
- Se a pessoa não puder ser recontratada, a justificativa passa a ser obrigatória.
- O pedido é enviado para a fila de aprovação após o cadastro.
- O fluxo serve para registrar o desligamento e organizar a transição operacional.

## Regras das aprovações

A tela de aprovações é a fila de trabalho do RH e das lideranças.

- Existem filas separadas para admissão e demissão.
- Cada solicitação mostra o fluxo de etapas, o estado atual e o histórico de decisão.
- A solicitação pode estar pendente, em análise, aprovada, finalizada, rejeitada ou cancelada.
- Em alguns casos, a aprovação depende da vinculação de um recrutador ativo.
- O sistema filtra o conteúdo de acordo com o papel de aprovação do usuário.

## Cadastros de apoio

### Departamentos
A tela de departamentos serve para manter a base de segmentação do RH atualizada.

- Pode criar novos departamentos.
- Pode editar os dados existentes.
- Pode ativar ou inativar registros.
- O total de pessoas ajuda a ter noção de ocupação do setor.
- Esses dados alimentam pesquisas, admissões e filtros administrativos.

### Cargos
A tela de cargos mantém a lista de posições usadas pelo sistema.

- Pode criar novos cargos.
- Pode editar dados já cadastrados.
- Pode ativar ou inativar cargos.
- Essa base é usada nos formulários de admissão, demissão e campanhas.

## Checklists operacionais

Os checklists são usados para padronizar a execução dos fluxos de admissão e demissão.

- É possível criar, editar e remover etapas.
- As etapas podem ser reordenadas por arrastar e soltar.
- Existe opção para restaurar o checklist padrão.
- A ordem do checklist define a sequência de execução do processo.

## Pesquisas e campanhas

O módulo de pesquisas cobre a criação, publicação e leitura de resultados.

### Lista de pesquisas
A tela de pesquisas administrativas concentra:

- Criação de novas pesquisas.
- Consulta de versões.
- Visualização de campanhas ativas.
- Acesso rápido para respostas e indicadores.

### Detalhe da pesquisa
Na tela de detalhe, a pesquisa é organizada em quatro abas:

- Pesquisa: edição das informações gerais.
- Dimensões: agrupamento temático das perguntas.
- Perguntas: cadastro e manutenção do questionário.
- Publicar: definição do período da campanha.

### KPIs da campanha
A tela de KPIs mostra a leitura gerencial da campanha:

- Adesão geral.
- Taxa de conclusão.
- Taxa de abandono.
- Favorabilidade.
- Indicadores de NPS/eNPS quando aplicável.
- Visão por pergunta, dimensão e departamento.

### Respostas da campanha
A tela de respostas detalha o que foi enviado pelos participantes:

- Volume de respostas criadas.
- Volume de respostas enviadas.
- Volume de rascunhos.
- Adesão por departamento.
- Lista de respostas individuais para análise detalhada.

## Delegação de acesso

A tela de delegação de acesso é exclusiva do `RH_ADMIN`.

- Permite localizar usuários por nome, e-mail, papel ou origem de autenticação.
- Mostra o total de usuários sincronizados do AD/LDAP e usuários locais.
- Permite alterar o papel de cada usuário.
- É a tela usada para ajustar permissões sem depender de suporte técnico.

## Regras importantes para o RH

- Um usuário precisa estar autenticado para abrir solicitações e ver as próprias demandas.
- Pesquisas públicas só aparecem quando há campanhas publicadas.
- Respostas de campanha são anônimas.
- Cargos e departamentos precisam estar ativos para aparecer nos formulários e filtros.
- A fila de aprovação depende do perfil do usuário e do tipo de solicitação.
- A ordem dos checklists define a sequência operacional que o RH segue.

## Resumo prático por tipo de tela

- Telas de consulta: mostram status, histórico e indicadores.
- Telas de cadastro: mantêm bases como cargos, departamentos, perguntas e dimensões.
- Telas de fluxo: controlam envio, aprovação, rejeição e finalização.
- Telas de análise: transformam respostas e solicitações em KPIs para gestão.

## Observação final
Este documento descreve o comportamento visível do sistema para operação de RH. Se houver mudança em regras, permissões ou nomenclaturas de telas, esta documentação deve ser atualizada junto com o sistema para evitar divergência entre a operação e o software.

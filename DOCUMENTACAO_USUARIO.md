# Documentação do Usuário

## 1. Visão geral

O Sistema de Recursos Humanos centraliza fluxos de RH em um portal único para colaboradores, gestores e equipe administrativa. Ele reúne:

- solicitações de admissão;
- solicitações de desligamento;
- acompanhamento das próprias solicitações;
- aprovações de gestores, diretoria e RH;
- checklists operacionais de admissão e demissão;
- criação e acompanhamento de pesquisas internas;
- participação dos colaboradores em campanhas de pesquisa;
- dashboards e indicadores para RH;
- gestão de departamentos, cargos e acessos administrativos.

O acesso às telas depende do perfil do usuário. Por isso, algumas opções podem não aparecer para todos.

## 2. Fluxos principais

Esta seção resume, em formato visual, os três fluxos mais importantes do sistema. Eles ajudam o usuário a entender o caminho completo antes de consultar as telas em detalhe.

### 2.1 Fluxo de admissão

```text
[Solicitante]
      |
      v
[Acessa Solicitações > Requisição de vaga]
      |
      v
[Preenche dados da vaga]
  - tipo da solicitação
  - cargo e setor
  - quantidade de pessoas
  - turno e regime
  - justificativa
      |
      v
[Envia solicitação]
      |
      v
[Sistema cria fluxo de aprovação]
      |
      v
[Gestor avalia]
      |
      v
[Diretor RAVI avalia]
      |
      v
[Gerente de RH avalia]
      |
      +--------------------+
      |                    |
      v                    v
[Rejeitada]          [Aprovada]
      |                    |
      v                    v
[Solicitante         [RH acompanha
 acompanha status]    solicitação]
                           |
                           v
                  [Checklist de admissão]
                           |
                           v
                  [Registro de candidatos
                   contratados]
                           |
                           v
                  [Finalização da admissão]
```

Resumo do fluxo:

1. O solicitante cria uma requisição de vaga.
2. A solicitação passa pelas etapas de aprovação configuradas.
3. Se recusada, o status fica disponível para acompanhamento.
4. Se aprovada, o RH executa o checklist, registra contratações e finaliza o processo.

### 2.2 Fluxo de demissão

```text
[Solicitante]
      |
      v
[Acessa Solicitações > Demissão]
      |
      v
[Preenche dados do desligamento]
  - colaborador
  - cargo e departamento
  - tipo de desligamento
  - data estimada
  - substituição
  - possibilidade de recontratação
  - observações
      |
      v
[Envia solicitação]
      |
      v
[Sistema cria fluxo de aprovação]
      |
      v
[Gestor avalia]
      |
      v
[Diretor RAVI avalia]
      |
      v
[Gerente de RH avalia]
      |
      +--------------------+
      |                    |
      v                    v
[Rejeitada]          [Aprovada]
      |                    |
      v                    v
[Solicitante         [RH acompanha
 acompanha status]    desligamento]
                           |
                           v
                  [Checklist de demissão]
                           |
                           v
                  [Conferência operacional]
                           |
               +-----------+-----------+
               |                       |
               v                       v
       [Pendência encontrada]   [Processo segue]
               |                       |
               v                       v
       [RH registra recusa       [RH conclui as
        operacional, se           etapas necessárias]
        necessário]
```

Resumo do fluxo:

1. O solicitante abre o pedido de desligamento.
2. O pedido segue para aprovação conforme o fluxo definido.
3. Se rejeitado, o solicitante pode consultar o status.
4. Se aprovado, o RH acompanha as etapas do checklist.
5. Se houver impedimento operacional, o RH pode registrar a recusa ou pendência conforme o caso.

### 2.3 Fluxo de pesquisas

```text
[RH / Administrador de pesquisas]
      |
      v
[Acessa Admin > Pesquisas]
      |
      v
[Cria ou edita pesquisa]
      |
      v
[Configura versão]
      |
      v
[Cadastra dimensões]
      |
      v
[Cadastra perguntas]
  - escala de 1 a 5
  - texto livre
  - escolha única
      |
      v
[Publica campanha]
  - período de início e fim
  - anonimato
  - rascunho permitido ou não
      |
      v
[Campanha aparece em /pesquisas]
      |
      v
[Colaborador seleciona campanha]
      |
      v
[Informa departamento e posição]
      |
      v
[Responde perguntas]
      |
      v
[Envia participação]
      |
      v
[Tela de agradecimento]
      |
      v
[RH acompanha respostas e KPIs]
```

Resumo do fluxo:

1. O RH cria a pesquisa e organiza perguntas por dimensões.
2. A campanha é publicada com período de participação.
3. O colaborador acessa a campanha pela lista de pesquisas.
4. Após o envio, o sistema registra a resposta.
5. O RH acompanha participação, respostas e indicadores administrativos.

## 3. Tipos de usuário

### Colaborador

Usuário que acessa as telas públicas ou protegidas para:

- abrir uma solicitação de admissão ou demissão, quando autorizado;
- consultar as próprias solicitações;
- responder pesquisas disponíveis.

### Gestor

Usuário responsável por aprovar ou recusar solicitações encaminhadas ao seu nível de aprovação.

### Diretor RAVI

Usuário com acesso focado em etapas de aprovação que exigem decisão da diretoria.

### Analista de RH

Usuário do RH que acompanha solicitações, checklists, candidatos e andamento operacional de admissões e desligamentos.

### Administrador de RH

Usuário com acesso amplo ao portal administrativo, incluindo cadastros, pesquisas, dashboards, solicitações, aprovações e controle de acesso.

### Usuário de Pesquisas

Usuário com foco na administração de pesquisas, campanhas, respostas e indicadores.

## 4. Página inicial

A página inicial apresenta os módulos disponíveis para o usuário.

Principais opções:

- **Solicitações**: acesso aos fluxos de admissão, demissão e acompanhamento.
- **Pesquisas**: lista de campanhas abertas ou encerradas.
- **Portal administrativo**: acesso à área administrativa, quando o usuário possui permissão.

Caso uma opção não apareça, significa que o perfil logado não possui acesso àquele módulo.

## 5. Login e sessão

O sistema utiliza login para áreas protegidas.

Ao acessar uma tela protegida, o usuário é direcionado para a página de login quando ainda não existe uma sessão ativa. Depois de entrar, o sistema carrega as permissões do usuário e libera apenas as funcionalidades compatíveis com o perfil.

Na área administrativa, o botão de sair fica no menu lateral, junto ao nome e e-mail do usuário.

## 6. Módulo de solicitações

O módulo de solicitações concentra os processos de admissão e demissão.

### Tela "Admissão e demissão"

Endereço principal: `/solicitacoes`

Nesta tela o usuário encontra três caminhos:

- **Minhas solicitações**: consulta dos pedidos já criados.
- **Requisição de vaga**: criação de uma nova solicitação de admissão.
- **Demissão**: criação de uma solicitação de desligamento.

## 7. Requisição de vaga

Endereço: `/solicitacoes/admissao`

Use esta tela para solicitar a abertura de uma vaga.

Informações geralmente solicitadas:

- tipo da solicitação, como crescimento ou substituição;
- posição da vaga;
- cargo;
- setor;
- quantidade de pessoas;
- turno;
- regime de contratação;
- abrangência do recrutamento;
- pessoa substituída, quando aplicável;
- justificativa da necessidade;
- observações para o gestor ou RH.

Depois do envio, a solicitação entra no fluxo de aprovação. O usuário pode acompanhar a evolução em **Minhas solicitações**.

### Boas práticas ao preencher

- Informe o cargo e setor com clareza.
- Explique a justificativa de forma objetiva.
- Em caso de substituição, informe corretamente o colaborador substituído.
- Revise quantidade de vagas, turno e regime antes de enviar.

## 8. Solicitação de desligamento

Endereço: `/solicitacoes/demissao`

Use esta tela para solicitar o desligamento de um colaborador.

Informações geralmente solicitadas:

- nome completo do colaborador;
- cargo;
- departamento;
- tipo de desligamento;
- previsão de data de término;
- regime contratual;
- se haverá substituição;
- se o colaborador poderá ser recontratado futuramente;
- justificativa quando não houver possibilidade de recontratação;
- observações adicionais.

Após o envio, a solicitação segue para aprovação. Dependendo do resultado, o RH pode acompanhar as etapas operacionais pelo checklist de demissão.

### Atenção

Solicitações de desligamento lidam com informação sensível. Preencha apenas dados necessários e mantenha a justificativa profissional.

## 9. Minhas solicitações

Endereço: `/my-requests`

Esta tela permite acompanhar solicitações criadas pelo usuário.

Recursos disponíveis:

- busca por título ou status;
- visualização de solicitações de admissão e demissão;
- acompanhamento do status;
- abertura de detalhes;
- consulta do andamento das etapas de aprovação.

Status comuns:

- **Pendente**: ainda aguardando decisão;
- **Aprovado**: aprovado no fluxo de aprovação;
- **Rejeitado**: recusado por algum aprovador;
- **Finalizado**: concluído operacionalmente pelo RH;
- **Em análise**: solicitação de desligamento em avaliação.

## 10. Aprovações

Endereço administrativo: `/admin/approvals`

Esta tela é usada por gestores, diretoria e RH para decidir solicitações pendentes.

Na fila de aprovação é possível:

- consultar solicitações de admissão e desligamento;
- visualizar dados principais do pedido;
- verificar o fluxo de aprovação;
- aprovar a etapa atual;
- rejeitar a solicitação com comentário;
- acompanhar quem já decidiu etapas anteriores.

### Como aprovar

1. Acesse **Aprovações**.
2. Localize a solicitação desejada.
3. Abra os detalhes, se precisar revisar informações.
4. Clique em aprovar.
5. O sistema encaminha a solicitação para a próxima etapa ou conclui a aprovação.

### Como rejeitar

1. Acesse **Aprovações**.
2. Localize a solicitação.
3. Clique na ação de rejeição.
4. Informe um comentário ou justificativa quando solicitado.
5. Confirme a decisão.

## 11. Portal administrativo

Endereço: `/admin`

O portal administrativo reúne as ferramentas de gestão do RH.

O menu lateral pode exibir:

- **Início**;
- **Aprovações**;
- **Pesquisas**;
- **Solicitações**;
- **Delegação de acesso**.

As opções variam conforme o perfil.

## 12. Início administrativo

Endereço: `/admin`

Tela inicial da administração. Serve como ponto de entrada para os módulos liberados ao usuário.

Pode apresentar atalhos para:

- dashboards;
- solicitações;
- pesquisas;
- aprovações;
- cadastros;
- controle de acesso.

## 13. Dashboard administrativo

Endereço: `/admin/dashboard`

Painel geral para acompanhamento de indicadores.

Pode conter atalhos para:

- KPIs de pesquisas;
- KPIs de admissão;
- visões consolidadas do ambiente administrativo.

## 14. Dashboard de admissão

Endereço: `/admin/dashboard/admissao`

Painel voltado ao acompanhamento de admissões.

Informações acompanhadas:

- distribuição de solicitações por status;
- leitura de SLA;
- indicadores por perfil de vaga;
- analistas designados;
- evolução das solicitações.

Use esta tela para entender gargalos, volume de demandas e tempo de atendimento.

## 15. Dashboard de pesquisas

Endereço: `/admin/dashboard/pesquisas`

Painel voltado às campanhas de pesquisa.

Informações acompanhadas:

- pesquisas recentes;
- campanhas ativas;
- fluxo de respostas;
- atalhos para gestão e análise.

## 16. Solicitações administrativas

Endereço: `/admin/requests`

Tela de acompanhamento administrativo para solicitações de admissão e demissão.

Recursos disponíveis:

- alternar entre admissões e desligamentos;
- pesquisar solicitações;
- filtrar por status;
- abrir detalhes;
- consultar aprovação;
- abrir checklist;
- registrar contratação em admissões aprovadas;
- finalizar admissões quando o processo estiver completo;
- rejeitar desligamentos após análise, quando aplicável.

## 17. Solicitações de admissão

Endereço: `/admin/admission-requests`

Tela dedicada à lista de admissões.

O RH pode:

- consultar solicitações;
- acompanhar status;
- verificar dados da vaga;
- abrir detalhes;
- consultar etapas de aprovação;
- acompanhar checklist;
- registrar candidatos contratados;
- finalizar o processo.

### Registro de contratação

Quando uma solicitação de admissão está aprovada, o RH pode registrar candidatos contratados. O sistema controla a quantidade de posições disponíveis e cria o vínculo do colaborador contratado quando aplicável.

## 18. Checklist de admissão

Endereço: `/admin/admission-checklist`

Tela de configuração das etapas operacionais da admissão.

Permite:

- criar uma nova etapa;
- editar título e descrição;
- excluir etapa;
- reordenar etapas;
- restaurar o checklist padrão.

O checklist configurado é usado no acompanhamento das admissões aprovadas.

## 19. Solicitações de demissão

Endereço: `/admin/dismissal-requests`

Tela dedicada ao acompanhamento de desligamentos.

O RH pode:

- consultar solicitações;
- verificar dados do colaborador;
- acompanhar aprovação;
- abrir detalhes;
- acompanhar checklist;
- registrar rejeição operacional após aprovação, quando necessário.

## 20. Checklist de demissão

Endereço: `/admin/dismissal-checklist`

Tela de configuração das etapas operacionais do desligamento.

Permite:

- criar etapa;
- editar etapa;
- excluir etapa;
- alterar ordem;
- restaurar padrão.

Esse checklist ajuda o RH a controlar atividades como documentação, devoluções, comunicações internas e encerramentos operacionais.

## 21. Departamentos

Endereço: `/admin/departments`

Tela de cadastro e manutenção de departamentos.

Permite:

- criar departamento;
- editar código, nome, descrição e total de pessoas;
- ativar ou inativar registros;
- pesquisar por código, nome ou descrição.

Departamentos ativos são usados em pesquisas, relatórios e cadastros relacionados.

## 22. Cargos

Endereço: `/admin/job-titles`

Tela de cadastro e manutenção de cargos.

Permite:

- criar cargo;
- editar código, nome e descrição;
- ativar ou inativar registros;
- pesquisar por código, nome ou descrição.

Cargos ativos podem ser usados em pesquisas, solicitações e agrupamentos de indicadores.

## 23. Pesquisas

Endereço: `/admin/surveys`

Tela principal para criar e administrar pesquisas.

Recursos disponíveis:

- listar pesquisas existentes;
- buscar por nome, código ou categoria;
- criar nova pesquisa;
- informar código, categoria, nome e descrição;
- criar versão inicial;
- adicionar dimensões iniciais;
- acessar os detalhes de cada pesquisa;
- excluir pesquisas quando permitido.

### Criação de uma pesquisa

1. Clique para criar uma nova pesquisa.
2. Preencha código, categoria, nome e descrição.
3. Informe o título e descrição da versão inicial.
4. Adicione dimensões, se desejar.
5. Salve a pesquisa.

Depois disso, acesse os detalhes para cadastrar perguntas e publicar uma campanha.

## 24. Detalhe da pesquisa

Endereço: `/admin/surveys/:surveyId`

Tela para configurar uma pesquisa específica.

Áreas principais:

- **Metadados da pesquisa**: nome, categoria, descrição e dados da versão.
- **Dimensões**: temas usados para organizar perguntas.
- **Perguntas**: itens respondidos pelos colaboradores.
- **Publicação**: configuração da campanha e período de coleta.
- **Campanhas publicadas**: atalhos para respostas e KPIs.

### Tipos de pergunta

O sistema suporta:

- escala de 1 a 5;
- texto livre;
- escolha única.

### Publicação

Para publicar, a pesquisa precisa ter pelo menos uma pergunta ativa. Na publicação, o administrador define:

- código da campanha;
- nome;
- descrição;
- data de início;
- data de fim;
- se permite rascunho;
- se a campanha é anônima.

Após publicada, a campanha aparece na área de pesquisas para participação.

## 25. Respostas de campanha

Endereço: `/admin/campaigns/:campaignId/responses`

Tela usada para acompanhar respostas enviadas em uma campanha.

Pode apresentar:

- resumo da campanha;
- progresso por departamento;
- lista de respostas;
- respostas por pergunta;
- informações de status.

Em campanhas anônimas, a identificação individual do participante não deve ser exibida como informação pessoal.

## 26. KPIs de campanha

Endereço: `/admin/campaigns/:campaignId/kpis`

Tela voltada à análise dos resultados da campanha.

Pode apresentar:

- total de respostas;
- indicadores agregados;
- evolução por dimensão;
- distribuição de respostas;
- leitura gerencial da campanha.

## 27. Pesquisas para colaboradores

Endereço: `/pesquisas`

Tela pública de campanhas.

Mostra:

- pesquisas abertas;
- pesquisas encerradas;
- período de participação;
- botão para responder campanhas disponíveis.

## 28. Responder pesquisa

Endereço: `/campaigns/:campaignId`

Ao abrir uma campanha, o participante informa seu departamento e posição. Em seguida, responde às perguntas da pesquisa.

As perguntas podem ser:

- escala numérica;
- múltipla escolha de opção única;
- texto livre.

Ao concluir, o participante envia as respostas e é direcionado para a tela de agradecimento.

### Recomendações ao participante

- Responda com sinceridade.
- Revise antes de enviar.
- Observe se a campanha permite rascunho ou exige envio em uma única sessão.
- Em campanhas anônimas, as respostas são tratadas sem identificação pessoal direta.

## 29. Tela de agradecimento

Endereço: `/campaigns/:campaignId/thank-you`

Confirma que a participação foi registrada com sucesso e oferece retorno para a lista de pesquisas.

## 30. Delegação de acesso

Endereço: `/admin/access-control`

Tela disponível para administradores de RH.

Permite consultar usuários sincronizados do diretório corporativo e ajustar o papel de acesso no sistema.

Uso típico:

- localizar usuário;
- revisar papel atual;
- alterar perfil quando necessário;
- salvar a atualização.

## 31. Segurança e privacidade para usuários

Recomendações:

- não compartilhe sua senha;
- encerre a sessão ao usar computador compartilhado;
- não registre dados sensíveis fora dos campos necessários;
- em solicitações de desligamento, escreva justificativas de forma objetiva e profissional;
- em pesquisas, respeite o propósito da campanha e evite incluir dados pessoais desnecessários em respostas abertas.

## 32. Dúvidas frequentes

### Não consigo ver um módulo. O que fazer?

Verifique se você está logado com o usuário correto. Se o problema continuar, procure o RH ou o administrador do sistema para revisar seu perfil.

### Enviei uma solicitação errada. Posso editar?

O fluxo atual prioriza acompanhamento e aprovação. Se a solicitação foi enviada com erro, entre em contato com o RH ou com o aprovador responsável para orientação.

### Minha pesquisa não aparece na lista.

A campanha pode estar fora do período de participação, não publicada ou encerrada.

### Uma aprovação não aparece para mim.

As aprovações aparecem conforme o papel do usuário e a etapa atual do fluxo. Se você deveria aprovar e não visualiza a solicitação, acione o RH.

### O checklist pode ser alterado?

Sim. Usuários administrativos autorizados podem alterar os checklists de admissão e demissão nas telas específicas.

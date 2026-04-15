from __future__ import annotations

DEFAULT_ADMISSION_CHECKLIST_STEPS = [
    (1, "Solicitação criada", "O pedido foi registrado e já pode ser acompanhado pelo RH."),
    (2, "Em análise", "A solicitação está em avaliação no fluxo de aprovação."),
    (3, "Aprovada", "O fluxo aprovou a abertura da vaga e o RH pode seguir com a contratação."),
    (4, "Cadastro do contratado", "A equipe do RH pode registrar o novo colaborador vinculado à solicitação."),
    (5, "Integração e documentação", "Etapa de conferência final, documentação e entrada do colaborador."),
    (6, "Concluída ou encerrada", "O processo foi finalizado, aprovado com contratação ou encerrado sem prosseguimento."),
]
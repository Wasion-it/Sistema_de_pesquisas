from __future__ import annotations

import json
import random
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.session import SessionLocal, create_tables
from app.models import (
    ApprovalOriginGroupEnum,
    ApprovalRequestKindEnum,
    ApprovalRoleEnum,
    ApprovalWorkflowStep,
    ApprovalWorkflowTemplate,
    AdmissionRequest,
    AdmissionRequestApproval,
    AuditActionEnum,
    AuditLog,
    Campaign,
    CampaignAudience,
    CampaignAudienceStatusEnum,
    CampaignStatusEnum,
    Department,
    Employee,
    EmployeeStatusEnum,
    JobTitle,
    QuestionOption,
    Response,
    ResponseItem,
    ResponseStatusEnum,
    RoleEnum,
    Survey,
    SurveyDimension,
    SurveyQuestion,
    SurveyVersion,
    SurveyVersionStatusEnum,
    User,
)
from app.models.enums import (
    AuthenticationSourceEnum,
    ApprovalStepStatusEnum,
    AdmissionPositionEnum,
    AdmissionRequestStatusEnum,
    AdmissionRequestTypeEnum,
    ContractRegimeEnum,
    QuestionTypeEnum,
    RecruitmentScopeEnum,
)

DEV_PASSWORDS = {
    "rh_admin": "AdminRH123!",
    "rh_analyst": "AnalistaRH123!",
    "manager": "Gestor123!",
    "director_ravi": "Ravi123!",
    "employee": "Colaborador123!",
    "it_support": "SuporteTI123!",
}


def get_or_create(session: Session, model, defaults: dict | None = None, **filters):
    instance = session.scalar(select(model).filter_by(**filters))
    if instance:
        return instance, False

    params = {**filters, **(defaults or {})}
    instance = model(**params)
    session.add(instance)
    session.flush()
    return instance, True


def seed_departments(session: Session) -> dict[str, Department]:
    departments: dict[str, Department] = {}
    base_data = [
        {
            "code": "HR",
            "name": "Human Resources",
            "description": "People operations and organizational development.",
        },
        {
            "code": "TECH",
            "name": "Technology",
            "description": "Product engineering and internal systems.",
        },
        {
            "code": "OPS",
            "name": "Operations",
            "description": "Business operations and execution.",
        },
    ]

    for item in base_data:
        department, _ = get_or_create(
            session,
            Department,
            defaults={
                "name": item["name"],
                "description": item["description"],
                "is_active": True,
            },
            code=item["code"],
        )
        department.name = item["name"]
        department.description = item["description"]
        department.is_active = True
        departments[item["code"]] = department

    return departments


def seed_job_titles(session: Session) -> dict[str, JobTitle]:
    job_titles: dict[str, JobTitle] = {}
    base_data = [
        {"code": "HR_ADMIN", "name": "HR Administrator"},
        {"code": "HR_ANALYST", "name": "HR Analyst"},
        {"code": "ENG_MANAGER", "name": "Engineering Manager"},
        {"code": "DIRECTOR", "name": "Director"},
        {"code": "SOFTWARE_ENG", "name": "Software Engineer"},
        {"code": "IT_SUPPORT", "name": "IT Support Analyst"},
    ]

    for item in base_data:
        job_title, _ = get_or_create(
            session,
            JobTitle,
            defaults={
                "name": item["name"],
                "is_active": True,
            },
            code=item["code"],
        )
        job_title.name = item["name"]
        job_title.is_active = True
        job_titles[item["code"]] = job_title

    return job_titles


def seed_users_and_employees(
    session: Session,
    departments: dict[str, Department],
    job_titles: dict[str, JobTitle],
) -> tuple[dict[str, User], dict[str, Employee]]:
    users: dict[str, User] = {}
    employees: dict[str, Employee] = {}

    people = [
        {
            "key": "rh_admin",
            "email": "rh.admin@example.com",
            "full_name": "Ana Martins",
            "password_hash": hash_password(DEV_PASSWORDS["rh_admin"]),
            "role": RoleEnum.RH_ADMIN,
            "employee_code": "EMP-1001",
            "department": departments["HR"],
            "job_title": job_titles["HR_ADMIN"],
            "work_email": "ana.martins@example.com",
        },
        {
            "key": "rh_analyst",
            "email": "rh.analyst@example.com",
            "full_name": "Bruno Lima",
            "password_hash": hash_password(DEV_PASSWORDS["rh_analyst"]),
            "role": RoleEnum.RH_ANALISTA,
            "employee_code": "EMP-1002",
            "department": departments["HR"],
            "job_title": job_titles["HR_ANALYST"],
            "work_email": "bruno.lima@example.com",
        },
        {
            "key": "manager",
            "email": "gestor.tech@example.com",
            "full_name": "Carla Souza",
            "password_hash": hash_password(DEV_PASSWORDS["manager"]),
            "role": RoleEnum.GESTOR,
            "employee_code": "EMP-2001",
            "department": departments["TECH"],
            "job_title": job_titles["ENG_MANAGER"],
            "work_email": "carla.souza@example.com",
        },
        {
            "key": "director_ravi",
            "email": "ravi.director@example.com",
            "full_name": "Ravi Almeida",
            "password_hash": hash_password(DEV_PASSWORDS["director_ravi"]),
            "role": RoleEnum.DIRETOR_RAVI,
            "employee_code": "EMP-2003",
            "department": departments["TECH"],
            "job_title": job_titles["DIRECTOR"],
            "work_email": "ravi.almeida@example.com",
        },
        {
            "key": "employee",
            "email": "colaborador@example.com",
            "full_name": "Diego Alves",
            "password_hash": hash_password(DEV_PASSWORDS["employee"]),
            "role": RoleEnum.COLABORADOR,
            "employee_code": "EMP-2002",
            "department": departments["TECH"],
            "job_title": job_titles["SOFTWARE_ENG"],
            "work_email": "diego.alves@example.com",
        },
        {
            "key": "it_support",
            "email": "ti.suporte@example.com",
            "full_name": "Elisa Rocha",
            "password_hash": hash_password(DEV_PASSWORDS["it_support"]),
            "role": RoleEnum.RH_ANALISTA,
            "employee_code": "EMP-3001",
            "department": departments["OPS"],
            "job_title": job_titles["IT_SUPPORT"],
            "work_email": "elisa.rocha@example.com",
        },
    ]

    for item in people:
        user, _ = get_or_create(
            session,
            User,
            defaults={
                "password_hash": item["password_hash"],
                "role": item["role"],
                "full_name": item["full_name"],
                "auth_source": AuthenticationSourceEnum.LOCAL,
                "is_active": True,
            },
            email=item["email"],
        )
        user.full_name = item["full_name"]
        user.password_hash = item["password_hash"]
        user.role = item["role"]
        user.auth_source = AuthenticationSourceEnum.LOCAL
        users[item["key"]] = user

        employee, _ = get_or_create(
            session,
            Employee,
            defaults={
                "user_id": user.id,
                "full_name": item["full_name"],
                "department_id": item["department"].id,
                "job_title_id": item["job_title"].id,
                "work_email": item["work_email"],
                "status": EmployeeStatusEnum.ACTIVE,
            },
            employee_code=item["employee_code"],
        )
        employee.user_id = user.id
        employee.full_name = item["full_name"]
        employee.department_id = item["department"].id
        employee.job_title_id = item["job_title"].id
        employee.work_email = item["work_email"]
        employee.status = EmployeeStatusEnum.ACTIVE
        employees[item["key"]] = employee

    employees["employee"].manager_id = employees["manager"].id
    employees["it_support"].manager_id = employees["manager"].id
    session.flush()

    return users, employees


def seed_survey(session: Session, created_by: User) -> tuple[Survey, SurveyVersion, list[SurveyDimension], list[SurveyQuestion]]:
    survey, _ = get_or_create(
        session,
        Survey,
        defaults={
            "name": "GPTW Organizational Climate Survey",
            "description": "Initial survey focused on trust, leadership, pride and respect.",
            "category": "Great Place to Work",
            "is_active": True,
        },
        code="GPTW-2026",
    )
    survey.name = "GPTW Organizational Climate Survey"
    survey.description = "Initial survey focused on trust, leadership, pride and respect."
    survey.category = "Great Place to Work"

    version, _ = get_or_create(
        session,
        SurveyVersion,
        defaults={
            "title": "Version 1",
            "description": "First MVP publication for local validation.",
            "status": SurveyVersionStatusEnum.PUBLISHED,
            "published_at": datetime.now(UTC),
        },
        survey_id=survey.id,
        version_number=1,
    )
    version.title = "Version 1"
    version.description = "First MVP publication for local validation."
    version.status = SurveyVersionStatusEnum.PUBLISHED
    version.published_at = datetime.now(UTC)
    session.flush()

    dimensions_data = [
        ("TRUST", "Trust", 1),
        ("LEADERSHIP", "Leadership", 2),
        ("PRIDE", "Pride", 3),
        ("RESPECT", "Respect", 4),
    ]
    dimensions: list[SurveyDimension] = []
    dimension_map: dict[str, SurveyDimension] = {}

    for code, name, order in dimensions_data:
        dimension, _ = get_or_create(
            session,
            SurveyDimension,
            defaults={
                "code": code,
                "description": f"Dimension {name} for GPTW analysis.",
                "display_order": order,
                "is_active": True,
            },
            survey_id=survey.id,
            name=name,
        )
        dimension.code = code
        dimension.display_order = order
        dimension.is_active = True
        dimensions.append(dimension)
        dimension_map[code] = dimension

    questions_data = [
        (
            "Q-TRUST-01",
            "People can count on each other in this company.",
            "TRUST",
            1,
            QuestionTypeEnum.SCALE_1_5,
        ),
        (
            "Q-LEAD-01",
            "Leadership communicates clear expectations and priorities.",
            "LEADERSHIP",
            2,
            QuestionTypeEnum.SCALE_1_5,
        ),
        (
            "Q-PRIDE-01",
            "I feel proud to tell others where I work.",
            "PRIDE",
            3,
            QuestionTypeEnum.SCALE_1_5,
        ),
        (
            "Q-RESPECT-01",
            "People are treated with respect regardless of their role.",
            "RESPECT",
            4,
            QuestionTypeEnum.SCALE_1_5,
        ),
        (
            "Q-RECOMMEND-01",
            "Would you recommend this company as a good place to work?",
            "PRIDE",
            5,
            QuestionTypeEnum.SINGLE_CHOICE,
        ),
        (
            "Q-COMMENT-01",
            "What is the main factor that would improve your experience here?",
            "RESPECT",
            6,
            QuestionTypeEnum.TEXT,
        ),
    ]

    questions: list[SurveyQuestion] = []
    for code, text, dimension_code, order, question_type in questions_data:
        question, _ = get_or_create(
            session,
            SurveyQuestion,
            defaults={
                "dimension_id": dimension_map[dimension_code].id,
                "question_text": text,
                "question_type": question_type,
                "display_order": order,
                "is_required": code != "Q-COMMENT-01",
                "scale_min": 1,
                "scale_max": 5,
                "allow_comment": question_type == QuestionTypeEnum.SCALE_1_5,
                "is_active": True,
            },
            survey_version_id=version.id,
            code=code,
        )
        question.dimension_id = dimension_map[dimension_code].id
        question.question_text = text
        question.question_type = question_type
        question.display_order = order
        question.is_required = code != "Q-COMMENT-01"
        question.scale_min = 1
        question.scale_max = 5
        question.allow_comment = question_type == QuestionTypeEnum.SCALE_1_5
        question.is_active = True
        questions.append(question)

    session.flush()

    recommend_question = next(question for question in questions if question.code == "Q-RECOMMEND-01")
    options_data = [
        ("Yes", "YES", 1),
        ("Maybe", "MAYBE", 2),
        ("No", "NO", 3),
    ]

    for order, (label, value, score_value) in enumerate(options_data, start=1):
        option, _ = get_or_create(
            session,
            QuestionOption,
            defaults={
                "label": label,
                "score_value": score_value,
                "display_order": order,
                "is_active": True,
            },
            question_id=recommend_question.id,
            value=value,
        )
        option.label = label
        option.score_value = score_value
        option.display_order = order
        option.is_active = True

    audit_log, created = get_or_create(
        session,
        AuditLog,
        defaults={
            "actor_user_id": created_by.id,
            "action": AuditActionEnum.CREATE,
            "description": "Initial GPTW survey seeded for MVP.",
            "details_json": json.dumps({"survey_code": survey.code, "version": version.version_number}),
            "ip_address": "127.0.0.1",
            "created_at": datetime.now(UTC),
        },
        entity_name="survey",
        entity_id=survey.code,
    )
    if created:
        session.add(audit_log)

    return survey, version, dimensions, questions


def seed_approval_workflows(session: Session) -> dict[str, ApprovalWorkflowTemplate]:
    workflow, _ = get_or_create(
        session,
        ApprovalWorkflowTemplate,
        defaults={
            "name": "Fluxo padrão de aprovação RH",
            "description": "Fluxo compartilhado para admissão e demissão.",
            "request_kind": ApprovalRequestKindEnum.ANY,
            "origin_group": ApprovalOriginGroupEnum.ANY,
            "is_active": True,
        },
        code="HR_STANDARD_APPROVAL",
    )
    workflow.name = "Fluxo padrão de aprovação RH"
    workflow.description = "Fluxo compartilhado para admissão e demissão."
    workflow.request_kind = ApprovalRequestKindEnum.ANY
    workflow.origin_group = ApprovalOriginGroupEnum.ANY
    workflow.is_active = True
    session.flush()

    workflow_steps = [
        (1, ApprovalRoleEnum.MANAGER, "Gerente"),
        (2, ApprovalRoleEnum.DIRECTOR_RAVI, "Diretor Ravi"),
        (3, ApprovalRoleEnum.RH_MANAGER, "Gerente de RH"),
    ]

    for step_order, approver_role, approver_label in workflow_steps:
        step, _ = get_or_create(
            session,
            ApprovalWorkflowStep,
            defaults={
                "approver_role": approver_role,
                "approver_label": approver_label,
                "is_required": True,
            },
            workflow_template_id=workflow.id,
            step_order=step_order,
        )
        step.approver_role = approver_role
        step.approver_label = approver_label
        step.is_required = True

    return {workflow.code: workflow}


def seed_campaign(
    session: Session,
    users: dict[str, User],
    employees: dict[str, Employee],
    version: SurveyVersion,
    questions: list[SurveyQuestion],
) -> Campaign:
    now = datetime.now(UTC)
    campaign, _ = get_or_create(
        session,
        Campaign,
        defaults={
            "name": "GPTW Pilot Campaign",
            "description": "Pilot campaign for local validation in development.",
            "start_at": now - timedelta(days=1),
            "end_at": now + timedelta(days=14),
            "published_at": now - timedelta(days=1),
            "status": CampaignStatusEnum.ACTIVE,
            "is_anonymous": True,
            "allows_draft": True,
            "created_by_user_id": users["rh_admin"].id,
        },
        code="GPTW-CAMPAIGN-2026-01",
        survey_version_id=version.id,
    )
    campaign.name = "GPTW Pilot Campaign"
    campaign.description = "Pilot campaign for local validation in development."
    campaign.start_at = now - timedelta(days=1)
    campaign.end_at = now + timedelta(days=14)
    campaign.published_at = now - timedelta(days=1)
    campaign.status = CampaignStatusEnum.ACTIVE
    campaign.is_anonymous = True
    campaign.allows_draft = True
    campaign.created_by_user_id = users["rh_admin"].id
    session.flush()

    audience_targets = [employees["manager"], employees["employee"], employees["it_support"]]
    audiences: dict[str, CampaignAudience] = {}

    for employee in audience_targets:
        audience, _ = get_or_create(
            session,
            CampaignAudience,
            defaults={
                "employee_name_snapshot": employee.full_name,
                "work_email_snapshot": employee.work_email or employee.user.email,
                "department_name_snapshot": employee.department.name,
                "job_title_name_snapshot": employee.job_title.name,
                "manager_name_snapshot": employee.manager.full_name if employee.manager else None,
                "status": CampaignAudienceStatusEnum.PENDING,
                "published_at": campaign.published_at,
                "responded_at": None,
            },
            campaign_id=campaign.id,
            employee_id=employee.id,
        )
        audience.employee_name_snapshot = employee.full_name
        audience.work_email_snapshot = employee.work_email or employee.user.email
        audience.department_name_snapshot = employee.department.name
        audience.job_title_name_snapshot = employee.job_title.name
        audience.manager_name_snapshot = employee.manager.full_name if employee.manager else None
        audience.published_at = campaign.published_at
        audiences[employee.employee_code] = audience

    session.flush()

    draft_response, _ = get_or_create(
        session,
        Response,
        defaults={
            "campaign_audience_id": audiences[employees["employee"].employee_code].id,
            "status": ResponseStatusEnum.DRAFT,
            "started_at": now - timedelta(hours=2),
            "submitted_at": None,
            "is_anonymous_snapshot": campaign.is_anonymous,
            "submission_ip": None,
        },
        campaign_id=campaign.id,
        employee_id=employees["employee"].id,
    )
    draft_response.campaign_audience_id = audiences[employees["employee"].employee_code].id
    draft_response.status = ResponseStatusEnum.DRAFT
    draft_response.started_at = now - timedelta(hours=2)
    draft_response.is_anonymous_snapshot = campaign.is_anonymous
    audiences[employees["employee"].employee_code].status = CampaignAudienceStatusEnum.STARTED

    scale_questions = [question for question in questions if question.question_type == QuestionTypeEnum.SCALE_1_5]
    seed_answers = [(scale_questions[0], 4), (scale_questions[1], 5)]

    for question, score in seed_answers:
        item, _ = get_or_create(
            session,
            ResponseItem,
            defaults={
                "numeric_answer": score,
                "text_answer": None,
                "selected_option_id": None,
            },
            response_id=draft_response.id,
            question_id=question.id,
        )
        item.numeric_answer = score
        item.selected_option_id = None
        item.text_answer = None

    audit_log, created = get_or_create(
        session,
        AuditLog,
        defaults={
            "actor_user_id": users["rh_admin"].id,
            "action": AuditActionEnum.PUBLISH,
            "description": "Initial campaign published for development validation.",
            "details_json": json.dumps({"campaign_code": campaign.code, "audience_count": len(audience_targets)}),
            "ip_address": "127.0.0.1",
            "created_at": now,
        },
        entity_name="campaign",
        entity_id=campaign.code,
    )
    if created:
        session.add(audit_log)

    return campaign


def _seed_admission_approval_steps(session: Session, admission_request: AdmissionRequest, workflow: ApprovalWorkflowTemplate) -> None:
    for step in workflow.steps:
        session.add(
            AdmissionRequestApproval(
                admission_request_id=admission_request.id,
                workflow_step_id=step.id,
                step_order=step.step_order,
                approver_role=step.approver_role,
                status=ApprovalStepStatusEnum.PENDING,
            )
        )


def seed_admission_requests(
    session: Session,
    users: dict[str, User],
    employees: dict[str, Employee],
    workflows: dict[str, ApprovalWorkflowTemplate],
) -> list[AdmissionRequest]:
    randomizer = random.Random(20260418)
    workflow = workflows["HR_STANDARD_APPROVAL"]

    request_types = [AdmissionRequestTypeEnum.GROWTH, AdmissionRequestTypeEnum.REPLACEMENT]
    positions = list(AdmissionPositionEnum)
    scopes = list(RecruitmentScopeEnum)
    regimes = list(ContractRegimeEnum)
    statuses = [
        AdmissionRequestStatusEnum.PENDING,
        AdmissionRequestStatusEnum.APPROVED,
        AdmissionRequestStatusEnum.FINALIZED,
        AdmissionRequestStatusEnum.REJECTED,
    ]
    creator_pool = [users["rh_admin"], users["rh_analyst"], users["manager"], users["it_support"]]
    recruiter_pool = [users["rh_admin"], users["rh_analyst"], users["manager"], None]
    employee_pool = list(employees.values())
    cargo_pool = [
        "Analista de Dados",
        "Assistente Administrativo",
        "Coordenador de Projetos",
        "Desenvolvedor Backend",
        "Especialista de Suporte",
        "Técnico de Operações",
        "Analista de RH",
        "Líder de Squad",
    ]
    setor_pool = ["RH", "Tecnologia", "Operações", "Financeiro", "Comercial", "Suporte"]
    turno_pool = ["Comercial", "Integral", "12x36", "Noturno", "Diurno"]

    existing_count = session.scalar(
        select(func.count())
        .select_from(AdmissionRequest)
        .where(AdmissionRequest.manager_reminder.like("Solicitação gerada para validação %"))
    )
    if existing_count is None:
        existing_count = 0

    if existing_count >= 20:
        return session.scalars(
            select(AdmissionRequest)
            .where(AdmissionRequest.manager_reminder.like("Solicitação gerada para validação %"))
            .order_by(AdmissionRequest.id.desc())
            .limit(20)
        ).all()

    created_requests: list[AdmissionRequest] = []
    base_now = datetime.now(UTC)

    for index in range(existing_count + 1, 21):
        request_type = randomizer.choice(request_types)
        posicao_vaga = randomizer.choice(positions)
        recruitment_scope = randomizer.choice(scopes)
        contract_regime = randomizer.choice(regimes)
        created_by = randomizer.choice(creator_pool)
        recruiter_user = randomizer.choice(recruiter_pool)
        status = randomizer.choice(statuses)
        cargo = randomizer.choice(cargo_pool)
        setor = randomizer.choice(setor_pool)
        turno = randomizer.choice(turno_pool)
        quantity_people = randomizer.randint(1, 4)
        submitted_at = base_now - timedelta(days=index * 2) + timedelta(hours=2)
        finalized_at = submitted_at + timedelta(days=3) if status == AdmissionRequestStatusEnum.FINALIZED else None
        substituted_employee = None
        justification = None

        if request_type == AdmissionRequestTypeEnum.REPLACEMENT:
            substituted_employee = randomizer.choice(employee_pool).full_name
        else:
            justification = (
                f"Reposição de demanda para {setor.lower()} e expansão do time."
                if index % 2 == 0
                else f"Abertura de nova vaga para reforço do setor {setor}."
            )

        admission_request = AdmissionRequest(
            status=status,
            request_type=request_type,
            posicao_vaga=posicao_vaga,
            is_confidential=index % 4 == 0,
            recruiter_user_id=recruiter_user.id if recruiter_user else None,
            cargo=cargo,
            setor=setor,
            recruitment_scope=recruitment_scope,
            quantity_people=quantity_people,
            turno=turno,
            contract_regime=contract_regime,
            substituted_employee_name=substituted_employee,
            justification=justification,
            manager_reminder=f"Solicitação gerada para validação #{index}.",
            submitted_at=submitted_at,
            finalized_at=finalized_at,
            checklist_completed_steps=randomizer.randint(0, 5),
            created_by_user_id=created_by.id,
            approval_workflow_template_id=workflow.id,
        )
        session.add(admission_request)
        session.flush()
        _seed_admission_approval_steps(session, admission_request, workflow)

        created_requests.append(admission_request)

    return created_requests


def run_seed() -> None:
    create_tables()

    with SessionLocal() as session:
        departments = seed_departments(session)
        job_titles = seed_job_titles(session)
        users, employees = seed_users_and_employees(session, departments, job_titles)
        workflows = seed_approval_workflows(session)
        _, version, _, questions = seed_survey(session, users["rh_admin"])
        seed_campaign(session, users, employees, version, questions)
        seed_admission_requests(session, users, employees, workflows)
        session.commit()

    print("Initial seed executed successfully.")


if __name__ == "__main__":
    run_seed()

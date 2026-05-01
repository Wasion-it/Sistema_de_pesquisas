from collections.abc import Generator

from sqlalchemy import create_engine, inspect, select, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, selectinload, sessionmaker

from app.core.config import settings
from app.db.base import Base, import_all_models
from app.services.admission_checklist import DEFAULT_ADMISSION_CHECKLIST_STEPS
from app.services.dismissal_checklist import DEFAULT_DISMISSAL_CHECKLIST_STEPS


def _build_engine() -> Engine:
    connect_args: dict[str, object] = {}

    if settings.database_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False

    return create_engine(
        settings.database_url,
        echo=settings.database_echo,
        future=True,
        connect_args=connect_args,
    )


engine = _build_engine()
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    class_=Session,
)


def _ensure_survey_question_columns() -> None:
    inspector = inspect(engine)
    if "survey_questions" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("survey_questions")}
    statements: list[str] = []

    if "score_weight" not in existing_columns:
        statements.append("ALTER TABLE survey_questions ADD COLUMN score_weight INTEGER NOT NULL DEFAULT 1")

    if "is_negative" not in existing_columns:
        statements.append("ALTER TABLE survey_questions ADD COLUMN is_negative BOOLEAN NOT NULL DEFAULT 0")

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def _ensure_department_columns() -> None:
    inspector = inspect(engine)
    if "departments" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("departments")}
    statements: list[str] = []

    if "total_people" not in existing_columns:
        statements.append("ALTER TABLE departments ADD COLUMN total_people INTEGER NOT NULL DEFAULT 0")

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def _ensure_job_title_columns() -> None:
    inspector = inspect(engine)
    if "job_titles" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("job_titles")}
    statements: list[str] = []

    if "description" not in existing_columns:
        statements.append("ALTER TABLE job_titles ADD COLUMN description TEXT")

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def _ensure_user_columns() -> None:
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("users")}
    statements: list[str] = []

    if "auth_source" not in existing_columns:
        statements.append("ALTER TABLE users ADD COLUMN auth_source VARCHAR(20) NOT NULL DEFAULT 'LOCAL'")

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))

        if "auth_source" not in existing_columns:
            connection.execute(text("UPDATE users SET auth_source = 'LOCAL' WHERE auth_source IS NULL"))


def _normalize_user_roles() -> None:
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("users")}
    if "role" not in existing_columns:
        return

    with engine.begin() as connection:
        connection.execute(text("UPDATE users SET role = 'RH_ANALISTA' WHERE role = 'TI_SUPORTE'"))


def _ensure_employee_columns() -> None:
    inspector = inspect(engine)
    if "employees" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("employees")}
    statements: list[str] = []

    if "source_admission_request_id" not in existing_columns:
        statements.append(
            "ALTER TABLE employees ADD COLUMN source_admission_request_id INTEGER REFERENCES admission_requests(id)"
        )

    statements.append(
        "CREATE INDEX IF NOT EXISTS ix_employees_source_admission_request_id "
        "ON employees(source_admission_request_id)"
    )

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def _ensure_admission_request_candidate_columns() -> None:
    inspector = inspect(engine)
    if "admission_request_candidates" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("admission_request_candidates")}
    desired_columns = {"id", "created_at", "updated_at", "admission_request_id", "employee_id", "full_name", "email", "phone_number", "hire_date", "is_hired"}
    legacy_columns = {"employee_code", "department_id", "job_title_id", "work_email", "personal_email"}

    if desired_columns.issubset(existing_columns) and not (existing_columns & legacy_columns):
        return

    with engine.begin() as connection:
        connection.execute(text("PRAGMA foreign_keys=OFF"))
        connection.execute(text("ALTER TABLE admission_request_candidates RENAME TO admission_request_candidates_legacy"))
        connection.execute(
            text(
                "CREATE TABLE admission_request_candidates ("
                "id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "
                "created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "
                "updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "
                "admission_request_id INTEGER NOT NULL, "
                "employee_id INTEGER, "
                "full_name VARCHAR(150) NOT NULL, "
                "email VARCHAR(255) NOT NULL, "
                "phone_number VARCHAR(30), "
                "hire_date DATE, "
                "is_hired BOOLEAN NOT NULL DEFAULT 0, "
                "FOREIGN KEY(admission_request_id) REFERENCES admission_requests(id) ON DELETE CASCADE, "
                "FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE SET NULL"
                ")"
            )
        )

        email_expr = "COALESCE(NULLIF(email, ''), NULLIF(work_email, ''), NULLIF(personal_email, ''), '')" if "email" not in existing_columns else "COALESCE(NULLIF(email, ''), '')"
        phone_expr = "phone_number" if "phone_number" in existing_columns else "NULL"
        hire_date_expr = "hire_date" if "hire_date" in existing_columns else "NULL"
        employee_id_expr = "employee_id" if "employee_id" in existing_columns else "NULL"
        is_hired_expr = "COALESCE(is_hired, 0)" if "is_hired" in existing_columns else "0"

        connection.execute(
            text(
                f"INSERT INTO admission_request_candidates (id, created_at, updated_at, admission_request_id, employee_id, full_name, email, phone_number, hire_date, is_hired) "
                f"SELECT id, created_at, updated_at, admission_request_id, {employee_id_expr}, full_name, {email_expr}, {phone_expr}, {hire_date_expr}, {is_hired_expr} "
                f"FROM admission_request_candidates_legacy"
            )
        )
        connection.execute(text("DROP TABLE admission_request_candidates_legacy"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_admission_request_candidates_request_id ON admission_request_candidates(admission_request_id)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_admission_request_candidates_is_hired ON admission_request_candidates(is_hired)"))
        connection.execute(text("PRAGMA foreign_keys=ON"))


def _ensure_admission_request_columns() -> None:
    inspector = inspect(engine)
    if "admission_requests" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("admission_requests")}
    statements: list[str] = []

    if "posicao_vaga" not in existing_columns:
        statements.append(
            "ALTER TABLE admission_requests ADD COLUMN posicao_vaga VARCHAR(30) NOT NULL DEFAULT 'PUBLIC_ADMINISTRATIVE'"
        )

    if "is_confidential" not in existing_columns:
        statements.append("ALTER TABLE admission_requests ADD COLUMN is_confidential BOOLEAN NOT NULL DEFAULT 0")

    if "recruiter_user_id" not in existing_columns:
        statements.append("ALTER TABLE admission_requests ADD COLUMN recruiter_user_id INTEGER REFERENCES users(id)")

    if "checklist_completed_steps" not in existing_columns:
        statements.append("ALTER TABLE admission_requests ADD COLUMN checklist_completed_steps INTEGER NOT NULL DEFAULT 0")

    if "finalized_at" not in existing_columns:
        statements.append("ALTER TABLE admission_requests ADD COLUMN finalized_at DATETIME")

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))

        if "posicao_vaga" not in existing_columns:
            connection.execute(
                text(
                    "UPDATE admission_requests SET posicao_vaga = 'PUBLIC_ADMINISTRATIVE' "
                    "WHERE posicao_vaga IS NULL"
                )
            )

        if "is_confidential" not in existing_columns:
            connection.execute(
                text("UPDATE admission_requests SET is_confidential = 0 WHERE is_confidential IS NULL")
            )

        if "finalized_at" not in existing_columns:
            connection.execute(
                text(
                    "UPDATE admission_requests SET finalized_at = updated_at "
                    "WHERE status = 'FINALIZED' AND finalized_at IS NULL"
                )
            )

        connection.execute(
            text(
                "UPDATE admission_requests SET finalized_at = COALESCE(finalized_at, updated_at) "
                "WHERE status = 'FINALIZED' AND finalized_at IS NULL"
            )
        )


def _ensure_admission_request_salary_table() -> None:
    from app.models import AdmissionRequestSalary

    inspector = inspect(engine)
    if "admission_requests" not in inspector.get_table_names():
        return

    AdmissionRequestSalary.__table__.create(bind=engine, checkfirst=True)
    for index in AdmissionRequestSalary.__table__.indexes:
        index.create(bind=engine, checkfirst=True)


def _normalize_admission_request_statuses() -> None:
    inspector = inspect(engine)
    if "admission_requests" not in inspector.get_table_names():
        return

    with engine.begin() as connection:
        connection.execute(text("UPDATE admission_requests SET status = 'PENDING' WHERE status = 'UNDER_REVIEW'"))
        connection.execute(text("UPDATE admission_requests SET status = 'REJECTED' WHERE status = 'CANCELED'"))


def _ensure_default_admission_checklist() -> None:
    from app.models import AdmissionChecklistStep

    with SessionLocal() as session:
        existing_step = session.scalar(select(AdmissionChecklistStep.id).limit(1))
        if existing_step is not None:
            return

        for step_order, title, description in DEFAULT_ADMISSION_CHECKLIST_STEPS:
            session.add(
                AdmissionChecklistStep(
                    step_order=step_order,
                    title=title,
                    description=description,
                )
            )

        session.commit()


def _ensure_default_dismissal_checklist() -> None:
    from app.models import DismissalChecklistStep

    with SessionLocal() as session:
        existing_step = session.scalar(select(DismissalChecklistStep.id).limit(1))
        if existing_step is not None:
            return

        for step_order, title, description in DEFAULT_DISMISSAL_CHECKLIST_STEPS:
            session.add(
                DismissalChecklistStep(
                    step_order=step_order,
                    title=title,
                    description=description,
                )
            )

        session.commit()


def _ensure_approval_workflow_columns() -> None:
    from app.models import ApprovalWorkflowStep, ApprovalWorkflowTemplate

    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    if "approval_workflow_templates" not in existing_tables:
        ApprovalWorkflowTemplate.__table__.create(bind=engine, checkfirst=True)
    if "approval_workflow_steps" not in existing_tables:
        ApprovalWorkflowStep.__table__.create(bind=engine, checkfirst=True)

    for table in (ApprovalWorkflowTemplate.__table__, ApprovalWorkflowStep.__table__):
        for index in table.indexes:
            index.create(bind=engine, checkfirst=True)

    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    statements: list[str] = []

    if "admission_requests" in existing_tables:
        existing_columns = {column["name"] for column in inspector.get_columns("admission_requests")}
        if "approval_workflow_template_id" not in existing_columns:
            statements.append(
                "ALTER TABLE admission_requests ADD COLUMN approval_workflow_template_id INTEGER REFERENCES approval_workflow_templates(id)"
            )

    if "dismissal_requests" in existing_tables:
        existing_columns = {column["name"] for column in inspector.get_columns("dismissal_requests")}
        if "approval_workflow_template_id" not in existing_columns:
            statements.append(
                "ALTER TABLE dismissal_requests ADD COLUMN approval_workflow_template_id INTEGER REFERENCES approval_workflow_templates(id)"
            )
        if "checklist_completed_steps" not in existing_columns:
            statements.append(
                "ALTER TABLE dismissal_requests ADD COLUMN checklist_completed_steps INTEGER NOT NULL DEFAULT 0"
            )
        if "recruiter_user_id" not in existing_columns:
            statements.append(
                "ALTER TABLE dismissal_requests ADD COLUMN recruiter_user_id INTEGER REFERENCES users(id)"
            )
        if "can_be_rehired" not in existing_columns:
            statements.append(
                "ALTER TABLE dismissal_requests ADD COLUMN can_be_rehired BOOLEAN NOT NULL DEFAULT 1"
            )
        if "rehire_justification" not in existing_columns:
            statements.append(
                "ALTER TABLE dismissal_requests ADD COLUMN rehire_justification TEXT"
            )
        if "post_approval_rejection_reason" not in existing_columns:
            statements.append(
                "ALTER TABLE dismissal_requests ADD COLUMN post_approval_rejection_reason TEXT"
            )
        if "post_approval_rejected_at" not in existing_columns:
            statements.append(
                "ALTER TABLE dismissal_requests ADD COLUMN post_approval_rejected_at DATETIME"
            )
        if "finalized_at" not in existing_columns:
            statements.append(
                "ALTER TABLE dismissal_requests ADD COLUMN finalized_at DATETIME"
            )

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def _ensure_default_approval_workflow() -> None:
    from app.models import (
        ApprovalOriginGroupEnum,
        ApprovalRequestKindEnum,
        ApprovalRoleEnum,
        ApprovalWorkflowStep,
        ApprovalWorkflowTemplate,
    )

    with SessionLocal() as session:
        workflow = session.scalar(
            select(ApprovalWorkflowTemplate)
            .options(selectinload(ApprovalWorkflowTemplate.steps))
            .where(ApprovalWorkflowTemplate.code == "HR_STANDARD_APPROVAL")
        )

        has_changes = False

        if workflow is None:
            workflow = ApprovalWorkflowTemplate(
                code="HR_STANDARD_APPROVAL",
                name="Fluxo padrão de aprovação RH",
                description="Fluxo compartilhado para admissão e demissão.",
                request_kind=ApprovalRequestKindEnum.ANY,
                origin_group=ApprovalOriginGroupEnum.ANY,
                is_active=True,
            )
            session.add(workflow)
            session.flush()
            has_changes = True
        else:
            workflow.name = "Fluxo padrão de aprovação RH"
            workflow.description = "Fluxo compartilhado para admissão e demissão."
            workflow.request_kind = ApprovalRequestKindEnum.ANY
            workflow.origin_group = ApprovalOriginGroupEnum.ANY
            workflow.is_active = True

        expected_steps = [
            (1, ApprovalRoleEnum.MANAGER, "Gerente"),
            (2, ApprovalRoleEnum.DIRECTOR_RAVI, "General Manager"),
            (3, ApprovalRoleEnum.RH_MANAGER, "Gerente de RH"),
        ]
        existing_steps = {step.step_order: step for step in workflow.steps}

        for step_order, approver_role, approver_label in expected_steps:
            step = existing_steps.get(step_order)
            if step is None:
                session.add(
                    ApprovalWorkflowStep(
                        workflow_template_id=workflow.id,
                        step_order=step_order,
                        approver_role=approver_role,
                        approver_label=approver_label,
                        is_required=True,
                    )
                )
                has_changes = True
                continue

            step.approver_role = approver_role
            step.approver_label = approver_label
            step.is_required = True

        if has_changes:
            session.commit()


def _backfill_request_approval_steps() -> None:
    from app.models import (
        AdmissionRequest,
        AdmissionRequestApproval,
        AdmissionRequestStatusEnum,
        ApprovalStepStatusEnum,
        ApprovalWorkflowTemplate,
        DismissalRequest,
        DismissalRequestApproval,
        DismissalRequestStatusEnum,
    )

    with SessionLocal() as session:
        workflow = session.scalar(
            select(ApprovalWorkflowTemplate)
            .options(selectinload(ApprovalWorkflowTemplate.steps))
            .where(ApprovalWorkflowTemplate.code == "HR_STANDARD_APPROVAL")
            .where(ApprovalWorkflowTemplate.is_active.is_(True))
        )

        if workflow is None or not workflow.steps:
            return

        has_changes = False

        admission_requests = session.scalars(
            select(AdmissionRequest)
            .options(selectinload(AdmissionRequest.approval_steps))
            .where(AdmissionRequest.status == AdmissionRequestStatusEnum.PENDING)
        ).all()

        for request_item in admission_requests:
            if request_item.approval_steps:
                continue

            request_item.approval_workflow_template_id = workflow.id
            for step in workflow.steps:
                session.add(
                    AdmissionRequestApproval(
                        admission_request_id=request_item.id,
                        workflow_step_id=step.id,
                        step_order=step.step_order,
                        approver_role=step.approver_role,
                        status=ApprovalStepStatusEnum.PENDING,
                    )
                )
            has_changes = True

        dismissal_requests = session.scalars(
            select(DismissalRequest)
            .options(selectinload(DismissalRequest.approval_steps))
            .where(DismissalRequest.status.in_([DismissalRequestStatusEnum.PENDING, DismissalRequestStatusEnum.UNDER_REVIEW]))
        ).all()

        for request_item in dismissal_requests:
            if request_item.approval_steps:
                continue

            request_item.approval_workflow_template_id = workflow.id
            for step in workflow.steps:
                session.add(
                    DismissalRequestApproval(
                        dismissal_request_id=request_item.id,
                        workflow_step_id=step.id,
                        step_order=step.step_order,
                        approver_role=step.approver_role,
                        status=ApprovalStepStatusEnum.PENDING,
                    )
                )
            has_changes = True

        if has_changes:
            session.commit()


def create_tables() -> None:
    import_all_models()
    Base.metadata.create_all(bind=engine)
    _ensure_user_columns()
    _normalize_user_roles()
    _ensure_survey_question_columns()
    _ensure_department_columns()
    _ensure_job_title_columns()
    _ensure_employee_columns()
    _ensure_admission_request_candidate_columns()
    _ensure_admission_request_columns()
    _ensure_admission_request_salary_table()
    _normalize_admission_request_statuses()
    _ensure_default_admission_checklist()
    _ensure_default_dismissal_checklist()
    _ensure_approval_workflow_columns()
    _ensure_default_approval_workflow()
    _backfill_request_approval_steps()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

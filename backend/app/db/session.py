from collections.abc import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.db.base import Base, import_all_models


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


def _ensure_approval_workflow_columns() -> None:
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    statements: list[str] = []

    if "approval_workflow_templates" not in existing_tables:
        statements.append(
            "CREATE TABLE IF NOT EXISTS approval_workflow_templates ("
            "id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "
            "created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "
            "updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "
            "code VARCHAR(80) NOT NULL UNIQUE, "
            "name VARCHAR(180) NOT NULL, "
            "description TEXT, "
            "request_kind VARCHAR(20) NOT NULL, "
            "origin_group VARCHAR(30) NOT NULL, "
            "is_active BOOLEAN NOT NULL DEFAULT 1"
            ")"
        )

    if "approval_workflow_steps" not in existing_tables:
        statements.append(
            "CREATE TABLE IF NOT EXISTS approval_workflow_steps ("
            "id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "
            "created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "
            "updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "
            "workflow_template_id INTEGER NOT NULL, "
            "step_order INTEGER NOT NULL, "
            "approver_role VARCHAR(30) NOT NULL, "
            "approver_label VARCHAR(150) NOT NULL, "
            "is_required BOOLEAN NOT NULL DEFAULT 1, "
            "FOREIGN KEY(workflow_template_id) REFERENCES approval_workflow_templates(id) ON DELETE CASCADE"
            ")"
        )

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

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def create_tables() -> None:
    import_all_models()
    Base.metadata.create_all(bind=engine)
    _ensure_survey_question_columns()
    _ensure_department_columns()
    _ensure_approval_workflow_columns()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

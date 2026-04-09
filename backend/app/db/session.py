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


def create_tables() -> None:
    import_all_models()
    Base.metadata.create_all(bind=engine)
    _ensure_survey_question_columns()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

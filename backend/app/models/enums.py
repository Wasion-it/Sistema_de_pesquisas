from enum import Enum


class RoleEnum(str, Enum):
    RH_ADMIN = "RH_ADMIN"
    RH_ANALISTA = "RH_ANALISTA"
    GESTOR = "GESTOR"
    COLABORADOR = "COLABORADOR"
    TI_SUPORTE = "TI_SUPORTE"


class EmployeeStatusEnum(str, Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    ON_LEAVE = "ON_LEAVE"


class SurveyCategoryEnum(str, Enum):
    GPTW = "GPTW"
    PULSE = "PULSE"
    CUSTOM = "CUSTOM"


class SurveyVersionStatusEnum(str, Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"


class QuestionTypeEnum(str, Enum):
    SCALE_1_5 = "SCALE_1_5"
    TEXT = "TEXT"
    SINGLE_CHOICE = "SINGLE_CHOICE"


class CampaignStatusEnum(str, Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"


class CampaignAudienceStatusEnum(str, Enum):
    PENDING = "PENDING"
    STARTED = "STARTED"
    SUBMITTED = "SUBMITTED"
    EXPIRED = "EXPIRED"


class ResponseStatusEnum(str, Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"


class AuditActionEnum(str, Enum):
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    LOGIN = "LOGIN"
    PUBLISH = "PUBLISH"
    SUBMIT = "SUBMIT"

from enum import Enum


class RoleEnum(str, Enum):
    RH_ADMIN = "RH_ADMIN"
    RH_ANALISTA = "RH_ANALISTA"
    GESTOR = "GESTOR"
    DIRETOR_RAVI = "DIRETOR_RAVI"
    COLABORADOR = "COLABORADOR"
    TI_SUPORTE = "TI_SUPORTE"


class AuthenticationSourceEnum(str, Enum):
    LOCAL = "LOCAL"
    LDAP = "LDAP"


class AccessModuleEnum(str, Enum):
    DASHBOARD = "DASHBOARD"
    ADMISSION = "ADMISSION"
    DISMISSAL = "DISMISSAL"
    SURVEYS = "SURVEYS"
    APPROVALS = "APPROVALS"
    ACCESS_CONTROL = "ACCESS_CONTROL"


class AccessLevelEnum(str, Enum):
    READ = "READ"
    MANAGE = "MANAGE"


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


class AdmissionRequestStatusEnum(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    FINALIZED = "FINALIZED"
    REJECTED = "REJECTED"


class AdmissionRequestTypeEnum(str, Enum):
    GROWTH = "GROWTH"
    REPLACEMENT = "REPLACEMENT"


class RecruitmentScopeEnum(str, Enum):
    INTERNAL = "INTERNAL"
    EXTERNAL = "EXTERNAL"
    MIXED = "MIXED"


class ContractRegimeEnum(str, Enum):
    TEMPORARY = "TEMPORARY"
    EFFECTIVE = "EFFECTIVE"
    INTERN = "INTERN"
    APPRENTICE = "APPRENTICE"
    CLT = "CLT"
    PJ = "PJ"


class AdmissionPositionEnum(str, Enum):
    PUBLIC_ADMINISTRATIVE = "PUBLIC_ADMINISTRATIVE"
    PUBLIC_OPERATIONAL = "PUBLIC_OPERATIONAL"
    PUBLIC_LEADERSHIP = "PUBLIC_LEADERSHIP"


class DismissalRequestStatusEnum(str, Enum):
    PENDING = "PENDING"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELED = "CANCELED"


class DismissalRequestTypeEnum(str, Enum):
    JUST_CAUSE = "JUST_CAUSE"
    RESIGNATION = "RESIGNATION"
    WITHOUT_JUST_CAUSE = "WITHOUT_JUST_CAUSE"
    TERM_CONTRACT = "TERM_CONTRACT"
    CONSENSUAL = "CONSENSUAL"


class ApprovalRequestKindEnum(str, Enum):
    ANY = "ANY"
    ADMISSION = "ADMISSION"
    DISMISSAL = "DISMISSAL"


class ApprovalOriginGroupEnum(str, Enum):
    COORDINATOR_SUPERVISOR = "COORDINATOR_SUPERVISOR"
    MANAGER = "MANAGER"
    ANY = "ANY"


class ApprovalRoleEnum(str, Enum):
    MANAGER = "MANAGER"
    DIRECTOR_RAVI = "DIRECTOR_RAVI"
    RH_MANAGER = "RH_MANAGER"


class ApprovalStepStatusEnum(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    SKIPPED = "SKIPPED"

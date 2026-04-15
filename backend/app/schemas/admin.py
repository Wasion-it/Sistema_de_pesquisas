from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.enums import (
    ApprovalRequestKindEnum,
    ApprovalRoleEnum,
    ApprovalStepStatusEnum,
    AdmissionPositionEnum,
    AdmissionRequestStatusEnum,
    AdmissionRequestTypeEnum,
    CampaignStatusEnum,
    ContractRegimeEnum,
    DismissalRequestStatusEnum,
    DismissalRequestTypeEnum,
    QuestionTypeEnum,
    RecruitmentScopeEnum,
    SurveyVersionStatusEnum,
)


class DashboardSummaryResponse(BaseModel):
    total_surveys: int
    published_versions: int
    active_campaigns: int
    total_responses: int
    submitted_responses: int
    draft_responses: int


class DashboardRecentSurveyResponse(BaseModel):
    id: int
    code: str
    name: str
    category: str
    updated_at: datetime
    current_version: str | None
    active_campaigns: int


class DashboardResponse(BaseModel):
    summary: DashboardSummaryResponse
    recent_surveys: list[DashboardRecentSurveyResponse]


class SurveyManagementItemResponse(BaseModel):
    id: int
    code: str
    name: str
    category: str
    is_active: bool
    total_versions: int
    current_version: str | None
    current_version_status: SurveyVersionStatusEnum | None
    total_questions: int
    total_dimensions: int
    active_campaigns: int
    latest_campaign_id: int | None
    latest_campaign_name: str | None
    latest_campaign_status: CampaignStatusEnum | None
    updated_at: datetime


class SurveyManagementListResponse(BaseModel):
    items: list[SurveyManagementItemResponse]


class DepartmentManagementItemResponse(BaseModel):
    id: int
    code: str
    name: str
    description: str | None
    total_people: int
    is_active: bool
    updated_at: datetime


class DepartmentManagementListResponse(BaseModel):
    items: list[DepartmentManagementItemResponse]


class DepartmentCreateRequest(BaseModel):
    code: str = Field(min_length=2, max_length=50)
    name: str = Field(min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    total_people: int = Field(default=0, ge=0, le=1000000)
    is_active: bool = True


class DepartmentUpdateRequest(BaseModel):
    code: str = Field(min_length=2, max_length=50)
    name: str = Field(min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    total_people: int = Field(default=0, ge=0, le=1000000)
    is_active: bool = True


class JobTitleManagementItemResponse(BaseModel):
    id: int
    code: str
    name: str
    description: str | None
    is_active: bool
    updated_at: datetime


class JobTitleManagementListResponse(BaseModel):
    items: list[JobTitleManagementItemResponse]


class JobTitleCreateRequest(BaseModel):
    code: str = Field(min_length=2, max_length=50)
    name: str = Field(min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    is_active: bool = True


class JobTitleUpdateRequest(BaseModel):
    code: str = Field(min_length=2, max_length=50)
    name: str = Field(min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    is_active: bool = True


class AdmissionChecklistStepResponse(BaseModel):
    id: int
    step_order: int
    title: str
    description: str | None
    created_at: datetime
    updated_at: datetime


class AdmissionChecklistStepListResponse(BaseModel):
    items: list[AdmissionChecklistStepResponse]


class AdmissionChecklistStepCreateRequest(BaseModel):
    title: str = Field(min_length=2, max_length=180)
    description: str | None = Field(default=None, max_length=5000)
    step_order: int = Field(default=1, ge=1, le=1000)


class AdmissionChecklistStepUpdateRequest(BaseModel):
    title: str = Field(min_length=2, max_length=180)
    description: str | None = Field(default=None, max_length=5000)
    step_order: int = Field(default=1, ge=1, le=1000)


class AdmissionChecklistReorderRequest(BaseModel):
    ordered_step_ids: list[int] = Field(min_length=1)


class AdmissionChecklistProgressUpdateRequest(BaseModel):
    completed_steps: int = Field(ge=0, le=1000)


class AdmissionRequestCreateRequest(BaseModel):
    request_type: AdmissionRequestTypeEnum
    posicao_vaga: AdmissionPositionEnum
    cargo: str = Field(min_length=2, max_length=150)
    setor: str = Field(min_length=2, max_length=150)
    recruitment_scope: RecruitmentScopeEnum
    quantity_people: int = Field(default=1, ge=1, le=1000000)
    turno: str = Field(min_length=2, max_length=80)
    contract_regime: ContractRegimeEnum
    substituted_employee_name: str | None = Field(default=None, max_length=150)
    justification: str | None = Field(default=None, max_length=5000)
    manager_reminder: str | None = Field(default=None, max_length=2000)


class HiredEmployeeResponse(BaseModel):
    id: int
    employee_code: str
    full_name: str
    work_email: str | None
    personal_email: str | None
    hire_date: date | None
    department_name: str
    job_title_name: str


class AdmissionRequestHireRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    employee_code: str = Field(min_length=2, max_length=50)
    work_email: str = Field(min_length=3, max_length=255)
    personal_email: str | None = Field(default=None, max_length=255)
    department_id: int
    job_title_id: int
    hire_date: date | None = None


class AdmissionRequestResponse(BaseModel):
    id: int
    status: AdmissionRequestStatusEnum
    request_type: AdmissionRequestTypeEnum
    posicao_vaga: AdmissionPositionEnum | None
    cargo: str
    setor: str
    recruitment_scope: RecruitmentScopeEnum
    quantity_people: int
    turno: str
    contract_regime: ContractRegimeEnum
    substituted_employee_name: str | None
    justification: str | None
    manager_reminder: str | None
    created_by_user_id: int
    created_by_user_name: str
    created_by_user_email: str
    approval_workflow_template_id: int | None
    checklist_completed_steps: int
    hired_employee_count: int
    remaining_positions: int
    hired_employees: list[HiredEmployeeResponse]
    submitted_at: datetime | None
    finalized_at: datetime | None
    created_at: datetime
    updated_at: datetime


class AdmissionRequestListResponse(BaseModel):
    items: list[AdmissionRequestResponse]


class DismissalRequestCreateRequest(BaseModel):
    employee_name: str = Field(min_length=2, max_length=150)
    cargo: str = Field(min_length=2, max_length=150)
    departamento: str = Field(min_length=2, max_length=150)
    dismissal_type: DismissalRequestTypeEnum
    has_replacement: bool = False
    estimated_termination_date: date
    contract_regime: ContractRegimeEnum


class DismissalRequestResponse(BaseModel):
    id: int
    status: DismissalRequestStatusEnum
    employee_name: str
    cargo: str
    departamento: str
    dismissal_type: DismissalRequestTypeEnum
    has_replacement: bool
    estimated_termination_date: date
    contract_regime: ContractRegimeEnum
    manager_reminder: str | None
    created_by_user_id: int
    created_by_user_name: str
    created_by_user_email: str
    approval_workflow_template_id: int | None
    submitted_at: datetime | None
    created_at: datetime
    updated_at: datetime


class DismissalRequestListResponse(BaseModel):
    items: list[DismissalRequestResponse]


class ApprovalStepResponse(BaseModel):
    id: int | None
    step_order: int
    approver_role: ApprovalRoleEnum
    approver_label: str
    status: ApprovalStepStatusEnum
    decided_by_user_name: str | None
    decided_at: datetime | None
    comments: str | None


class ApprovalQueueItemResponse(BaseModel):
    request_kind: ApprovalRequestKindEnum
    request_id: int
    request_title: str
    request_subtitle: str
    request_status: str
    requester_name: str
    requester_email: str
    workflow_name: str
    current_step_order: int | None
    current_step_label: str | None
    current_step_role: ApprovalRoleEnum | None
    submitted_at: datetime | None
    created_at: datetime
    updated_at: datetime
    steps: list[ApprovalStepResponse]
    hired_employees: list[HiredEmployeeResponse]


class ApprovalQueueListResponse(BaseModel):
    items: list[ApprovalQueueItemResponse]


class ApprovalActionRequest(BaseModel):
    comments: str | None = Field(default=None, max_length=2000)


class AdminActionResponse(BaseModel):
    message: str


class SurveyCreateRequest(BaseModel):
    code: str = Field(min_length=3, max_length=60)
    name: str = Field(min_length=3, max_length=180)
    description: str | None = Field(default=None, max_length=1000)
    category: str = Field(min_length=2, max_length=120)
    is_active: bool = True
    version_title: str = Field(min_length=3, max_length=180)
    version_description: str | None = Field(default=None, max_length=1000)
    dimension_names: list[str] = Field(default_factory=list)


class SurveyUpdateRequest(BaseModel):
    name: str = Field(min_length=3, max_length=180)
    description: str | None = Field(default=None, max_length=1000)
    category: str = Field(min_length=2, max_length=120)
    is_active: bool = True
    version_title: str = Field(min_length=3, max_length=180)
    version_description: str | None = Field(default=None, max_length=1000)


class SurveyDimensionResponse(BaseModel):
    id: int
    code: str
    name: str
    description: str | None
    display_order: int
    is_active: bool


class SurveyDimensionCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=1000)


class SurveyDimensionUpdateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    is_active: bool = True


class QuestionOptionInput(BaseModel):
    label: str = Field(min_length=1, max_length=120)
    value: str = Field(min_length=1, max_length=60)
    score_value: int | None = None


class QuestionOptionResponse(BaseModel):
    id: int
    label: str
    value: str
    score_value: int | None
    display_order: int
    is_active: bool


class SurveyQuestionCreateRequest(BaseModel):
    code: str = Field(min_length=2, max_length=80)
    question_text: str = Field(min_length=3, max_length=2000)
    help_text: str | None = Field(default=None, max_length=2000)
    question_type: QuestionTypeEnum
    dimension_id: int | None = None
    is_required: bool = True
    display_order: int | None = None
    scale_min: int = 1
    scale_max: int = 5
    score_weight: int = Field(default=1, ge=1, le=100)
    is_negative: bool = False
    allow_comment: bool = False
    is_active: bool = True
    options: list[QuestionOptionInput] = Field(default_factory=list)


class SurveyQuestionUpdateRequest(BaseModel):
    code: str = Field(min_length=2, max_length=80)
    question_text: str = Field(min_length=3, max_length=2000)
    help_text: str | None = Field(default=None, max_length=2000)
    question_type: QuestionTypeEnum
    dimension_id: int | None = None
    is_required: bool = True
    display_order: int
    scale_min: int = 1
    scale_max: int = 5
    score_weight: int = Field(default=1, ge=1, le=100)
    is_negative: bool = False
    allow_comment: bool = False
    is_active: bool = True
    options: list[QuestionOptionInput] = Field(default_factory=list)


class SurveyQuestionResponse(BaseModel):
    id: int
    code: str
    question_text: str
    help_text: str | None
    question_type: QuestionTypeEnum
    dimension_id: int | None
    is_required: bool
    display_order: int
    scale_min: int
    scale_max: int
    score_weight: int
    is_negative: bool
    allow_comment: bool
    is_active: bool
    options: list[QuestionOptionResponse]


class SurveyVersionDetailResponse(BaseModel):
    id: int
    version_number: int
    title: str
    description: str | None
    status: SurveyVersionStatusEnum
    published_at: datetime | None
    questions: list[SurveyQuestionResponse]


class CampaignSummaryResponse(BaseModel):
    id: int
    code: str
    name: str
    description: str | None
    status: CampaignStatusEnum
    start_at: datetime
    end_at: datetime
    published_at: datetime | None
    is_anonymous: bool
    allows_draft: bool
    audience_count: int


class CampaignResponseAnswerResponse(BaseModel):
    question_id: int
    question_code: str
    question_text: str
    question_type: QuestionTypeEnum
    selected_option_label: str | None
    numeric_answer: int | None
    text_answer: str | None


class CampaignResponseEntryResponse(BaseModel):
    response_id: int
    status: str
    started_at: datetime
    submitted_at: datetime | None
    total_answers: int
    department_name: str | None = None
    position_name: str | None = None
    answers: list[CampaignResponseAnswerResponse]


class CampaignResponsesSummaryResponse(BaseModel):
    audience_count: int
    total_responses: int
    submitted_responses: int
    draft_responses: int


class CampaignDepartmentProgressResponse(BaseModel):
    department_id: int
    department_name: str
    total_people: int
    submitted_responses: int
    pending_people: int
    participation_rate: float


class CampaignResponsesPageResponse(BaseModel):
    campaign: CampaignSummaryResponse
    survey_id: int
    survey_code: str
    survey_name: str
    version_id: int
    version_title: str
    total_questions: int
    questions: list[SurveyQuestionResponse]
    dimensions: list[SurveyDimensionResponse]
    summary: CampaignResponsesSummaryResponse
    department_progress: list[CampaignDepartmentProgressResponse]
    responses: list[CampaignResponseEntryResponse]


class SurveyDetailResponse(BaseModel):
    id: int
    code: str
    name: str
    description: str | None
    category: str
    is_active: bool
    updated_at: datetime
    dimensions: list[SurveyDimensionResponse]
    current_version: SurveyVersionDetailResponse | None
    campaigns: list[CampaignSummaryResponse]


class PublishSurveyRequest(BaseModel):
    campaign_code: str = Field(min_length=3, max_length=60)
    campaign_name: str = Field(min_length=3, max_length=180)
    campaign_description: str | None = Field(default=None, max_length=1000)
    start_at: datetime
    end_at: datetime
    is_anonymous: bool = True
    allows_draft: bool = False

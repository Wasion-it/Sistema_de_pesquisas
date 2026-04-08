from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import CampaignStatusEnum, QuestionTypeEnum, SurveyCategoryEnum, SurveyVersionStatusEnum


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
    category: SurveyCategoryEnum
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
    category: SurveyCategoryEnum
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


class SurveyCreateRequest(BaseModel):
    code: str = Field(min_length=3, max_length=60)
    name: str = Field(min_length=3, max_length=180)
    description: str | None = Field(default=None, max_length=1000)
    category: SurveyCategoryEnum
    is_active: bool = True
    version_title: str = Field(min_length=3, max_length=180)
    version_description: str | None = Field(default=None, max_length=1000)
    dimension_names: list[str] = Field(default_factory=list)


class SurveyUpdateRequest(BaseModel):
    name: str = Field(min_length=3, max_length=180)
    description: str | None = Field(default=None, max_length=1000)
    category: SurveyCategoryEnum
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
    answers: list[CampaignResponseAnswerResponse]


class CampaignResponsesSummaryResponse(BaseModel):
    audience_count: int
    total_responses: int
    submitted_responses: int
    draft_responses: int


class CampaignResponsesPageResponse(BaseModel):
    campaign: CampaignSummaryResponse
    survey_id: int
    survey_code: str
    survey_name: str
    version_id: int
    version_title: str
    total_questions: int
    summary: CampaignResponsesSummaryResponse
    responses: list[CampaignResponseEntryResponse]


class SurveyDetailResponse(BaseModel):
    id: int
    code: str
    name: str
    description: str | None
    category: SurveyCategoryEnum
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
    allows_draft: bool = True

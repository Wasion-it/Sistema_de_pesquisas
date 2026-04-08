from datetime import datetime

from pydantic import BaseModel

from app.models.enums import CampaignStatusEnum, SurveyCategoryEnum


class PublicCampaignSummaryResponse(BaseModel):
    total_published_campaigns: int
    active_campaigns: int


class PublicCampaignItemResponse(BaseModel):
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
    survey_id: int
    survey_code: str
    survey_name: str
    survey_description: str | None
    survey_category: SurveyCategoryEnum
    version_id: int
    version_title: str
    total_questions: int


class PublicCampaignListResponse(BaseModel):
    summary: PublicCampaignSummaryResponse
    items: list[PublicCampaignItemResponse]


class PublicCampaignDetailResponse(BaseModel):
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
    survey_id: int
    survey_code: str
    survey_name: str
    survey_description: str | None
    survey_category: SurveyCategoryEnum
    version_id: int
    version_title: str
    version_description: str | None
    total_questions: int


class PublicQuestionOptionResponse(BaseModel):
    id: int
    label: str
    value: str
    score_value: int | None
    display_order: int


class PublicCampaignQuestionResponse(BaseModel):
    id: int
    code: str
    question_text: str
    help_text: str | None
    question_type: str
    is_required: bool
    display_order: int
    scale_min: int
    scale_max: int
    options: list[PublicQuestionOptionResponse]


class PublicResponseAnswerResponse(BaseModel):
    question_id: int
    selected_option_id: int | None
    numeric_answer: int | None
    text_answer: str | None


class PublicCampaignStartRequest(BaseModel):
    pass


class PublicCampaignStartResponse(BaseModel):
    response_id: int | None
    status: str
    participant_name: str | None
    participant_email: str | None
    started_at: datetime
    campaign: PublicCampaignDetailResponse
    questions: list[PublicCampaignQuestionResponse]
    answers: list[PublicResponseAnswerResponse]


class PublicCampaignAnswerInput(BaseModel):
    question_id: int
    selected_option_id: int | None = None
    numeric_answer: int | None = None
    text_answer: str | None = None


class PublicCampaignSubmitRequest(BaseModel):
    response_id: int | None = None
    answers: list[PublicCampaignAnswerInput]


class PublicCampaignSubmitResponse(BaseModel):
    response_id: int
    status: str
    submitted_at: datetime
    message: str
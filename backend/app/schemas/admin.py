from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import CampaignStatusEnum, SurveyCategoryEnum, SurveyVersionStatusEnum


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

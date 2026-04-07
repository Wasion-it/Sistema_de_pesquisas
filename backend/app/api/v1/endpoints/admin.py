from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_admin_user
from app.db.session import get_db
from app.models import Campaign, CampaignStatusEnum, Response, ResponseStatusEnum, Survey, SurveyVersion, SurveyVersionStatusEnum, User
from app.schemas.admin import (
    DashboardRecentSurveyResponse,
    DashboardResponse,
    DashboardSummaryResponse,
    SurveyManagementItemResponse,
    SurveyManagementListResponse,
)

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/dashboard", response_model=DashboardResponse)
def read_admin_dashboard(
    _: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DashboardResponse:
    total_surveys = db.scalar(select(func.count(Survey.id))) or 0
    published_versions = db.scalar(
        select(func.count(SurveyVersion.id)).where(SurveyVersion.status == SurveyVersionStatusEnum.PUBLISHED)
    )
    active_campaigns = db.scalar(
        select(func.count(Campaign.id)).where(Campaign.status == CampaignStatusEnum.ACTIVE)
    ) or 0
    total_responses = db.scalar(select(func.count(Response.id))) or 0
    submitted_responses = db.scalar(
        select(func.count(Response.id)).where(Response.status == ResponseStatusEnum.SUBMITTED)
    ) or 0
    draft_responses = db.scalar(
        select(func.count(Response.id)).where(Response.status == ResponseStatusEnum.DRAFT)
    ) or 0

    surveys = db.scalars(
        select(Survey)
        .options(selectinload(Survey.versions).selectinload(SurveyVersion.campaigns))
        .order_by(Survey.updated_at.desc())
        .limit(4)
    ).all()

    recent_surveys: list[DashboardRecentSurveyResponse] = []
    for survey in surveys:
        versions = sorted(survey.versions, key=lambda item: item.version_number, reverse=True)
        current_version = versions[0] if versions else None
        active_campaign_count = 0
        if current_version is not None:
            active_campaign_count = sum(
                1 for campaign in current_version.campaigns if campaign.status == CampaignStatusEnum.ACTIVE
            )

        recent_surveys.append(
            DashboardRecentSurveyResponse(
                id=survey.id,
                code=survey.code,
                name=survey.name,
                category=survey.category,
                updated_at=survey.updated_at,
                current_version=current_version.title if current_version else None,
                active_campaigns=active_campaign_count,
            )
        )

    return DashboardResponse(
        summary=DashboardSummaryResponse(
            total_surveys=total_surveys,
            published_versions=published_versions or 0,
            active_campaigns=active_campaigns,
            total_responses=total_responses,
            submitted_responses=submitted_responses,
            draft_responses=draft_responses,
        ),
        recent_surveys=recent_surveys,
    )


@router.get("/surveys", response_model=SurveyManagementListResponse)
def read_admin_surveys(
    _: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> SurveyManagementListResponse:
    surveys = db.scalars(
        select(Survey)
        .options(
            selectinload(Survey.versions).selectinload(SurveyVersion.questions),
            selectinload(Survey.versions).selectinload(SurveyVersion.campaigns),
            selectinload(Survey.dimensions),
        )
        .order_by(Survey.updated_at.desc())
    ).all()

    items: list[SurveyManagementItemResponse] = []
    for survey in surveys:
        versions = sorted(survey.versions, key=lambda item: item.version_number, reverse=True)
        current_version = versions[0] if versions else None
        latest_campaign = None
        active_campaigns = 0
        total_questions = 0

        if current_version is not None:
            total_questions = len(current_version.questions)
            campaigns = sorted(current_version.campaigns, key=lambda item: item.start_at, reverse=True)
            latest_campaign = campaigns[0] if campaigns else None
            active_campaigns = sum(1 for campaign in campaigns if campaign.status == CampaignStatusEnum.ACTIVE)

        items.append(
            SurveyManagementItemResponse(
                id=survey.id,
                code=survey.code,
                name=survey.name,
                category=survey.category,
                is_active=survey.is_active,
                total_versions=len(versions),
                current_version=current_version.title if current_version else None,
                current_version_status=current_version.status if current_version else None,
                total_questions=total_questions,
                total_dimensions=len(survey.dimensions),
                active_campaigns=active_campaigns,
                latest_campaign_name=latest_campaign.name if latest_campaign else None,
                latest_campaign_status=latest_campaign.status if latest_campaign else None,
                updated_at=survey.updated_at,
            )
        )

    return SurveyManagementListResponse(items=items)

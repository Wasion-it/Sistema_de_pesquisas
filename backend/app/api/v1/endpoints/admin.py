from __future__ import annotations

import json
import re
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_admin_user
from app.db.session import get_db
from app.models import (
    AuditActionEnum,
    AuditLog,
    Campaign,
    CampaignStatusEnum,
    Response,
    ResponseStatusEnum,
    Survey,
    SurveyDimension,
    SurveyVersion,
    SurveyVersionStatusEnum,
    User,
)
from app.schemas.admin import (
    DashboardRecentSurveyResponse,
    DashboardResponse,
    DashboardSummaryResponse,
    SurveyCreateRequest,
    SurveyManagementItemResponse,
    SurveyManagementListResponse,
)

router = APIRouter(prefix="/admin", tags=["admin"])


def _serialize_survey_item(survey: Survey) -> SurveyManagementItemResponse:
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

    return SurveyManagementItemResponse(
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


def _normalize_dimension_code(name: str, fallback_index: int) -> str:
    normalized = re.sub(r"[^A-Z0-9]+", "_", name.upper()).strip("_")
    if not normalized:
        normalized = f"DIMENSION_{fallback_index}"
    return normalized[:60]


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

    items = [_serialize_survey_item(survey) for survey in surveys]

    return SurveyManagementListResponse(items=items)


@router.post("/surveys", response_model=SurveyManagementItemResponse, status_code=status.HTTP_201_CREATED)
def create_admin_survey(
    payload: SurveyCreateRequest,
    user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> SurveyManagementItemResponse:
    normalized_code = payload.code.strip().upper()
    if db.scalar(select(Survey.id).where(Survey.code == normalized_code)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Survey code already exists")

    survey = Survey(
        code=normalized_code,
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else None,
        category=payload.category,
        is_active=payload.is_active,
    )
    db.add(survey)
    db.flush()

    version = SurveyVersion(
        survey_id=survey.id,
        version_number=1,
        title=payload.version_title.strip(),
        description=payload.version_description.strip() if payload.version_description else None,
        status=SurveyVersionStatusEnum.DRAFT,
        published_at=None,
    )
    db.add(version)

    unique_dimension_names: list[str] = []
    seen_dimension_names: set[str] = set()
    for raw_name in payload.dimension_names:
        cleaned_name = raw_name.strip()
        if not cleaned_name:
            continue
        canonical = cleaned_name.casefold()
        if canonical in seen_dimension_names:
            continue
        seen_dimension_names.add(canonical)
        unique_dimension_names.append(cleaned_name)

    seen_codes: set[str] = set()
    for index, dimension_name in enumerate(unique_dimension_names, start=1):
        dimension_code = _normalize_dimension_code(dimension_name, index)
        suffix = 1
        base_code = dimension_code
        while dimension_code in seen_codes:
            suffix += 1
            dimension_code = f"{base_code[:55]}_{suffix}"
        seen_codes.add(dimension_code)

        db.add(
            SurveyDimension(
                survey_id=survey.id,
                code=dimension_code,
                name=dimension_name,
                description=None,
                display_order=index,
                is_active=True,
            )
        )

    db.add(
        AuditLog(
            actor_user_id=user.id,
            action=AuditActionEnum.CREATE,
            entity_name="survey",
            entity_id=normalized_code,
            description="Survey created from administrative portal.",
            details_json=json.dumps(
                {
                    "survey_code": normalized_code,
                    "version_title": payload.version_title,
                    "dimensions": unique_dimension_names,
                }
            ),
            ip_address="127.0.0.1",
            created_at=datetime.now(UTC),
        )
    )
    db.commit()

    created_survey = db.scalar(
        select(Survey)
        .options(
            selectinload(Survey.versions).selectinload(SurveyVersion.questions),
            selectinload(Survey.versions).selectinload(SurveyVersion.campaigns),
            selectinload(Survey.dimensions),
        )
        .where(Survey.id == survey.id)
    )

    if created_survey is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Survey was created but could not be loaded")

    return _serialize_survey_item(created_survey)

from __future__ import annotations

import json
import re
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_admin_user
from app.db.session import get_db
from app.models import (
    AuditActionEnum,
    AuditLog,
    Campaign,
    CampaignAudience,
    CampaignStatusEnum,
    Employee,
    EmployeeStatusEnum,
    QuestionOption,
    QuestionTypeEnum,
    Response,
    ResponseItem,
    ResponseStatusEnum,
    Survey,
    SurveyDimension,
    SurveyQuestion,
    SurveyVersion,
    SurveyVersionStatusEnum,
    User,
)
from app.schemas.admin import (
    AdminActionResponse,
    CampaignResponseAnswerResponse,
    CampaignResponseEntryResponse,
    CampaignResponsesPageResponse,
    CampaignResponsesSummaryResponse,
    CampaignSummaryResponse,
    DashboardRecentSurveyResponse,
    DashboardResponse,
    DashboardSummaryResponse,
    PublishSurveyRequest,
    QuestionOptionResponse,
    SurveyCreateRequest,
    SurveyDetailResponse,
    SurveyDimensionCreateRequest,
    SurveyDimensionResponse,
    SurveyDimensionUpdateRequest,
    SurveyManagementItemResponse,
    SurveyManagementListResponse,
    SurveyQuestionCreateRequest,
    SurveyQuestionResponse,
    SurveyQuestionUpdateRequest,
    SurveyUpdateRequest,
    SurveyVersionDetailResponse,
)

router = APIRouter(prefix="/admin", tags=["admin"])


def _normalize_dimension_code(name: str, fallback_index: int) -> str:
    normalized = re.sub(r"[^A-Z0-9]+", "_", name.upper()).strip("_")
    if not normalized:
        normalized = f"DIMENSION_{fallback_index}"
    return normalized[:60]


def _get_current_version(survey: Survey) -> SurveyVersion | None:
    versions = sorted(survey.versions, key=lambda item: item.version_number, reverse=True)
    return versions[0] if versions else None


def _serialize_option(option: QuestionOption) -> QuestionOptionResponse:
    return QuestionOptionResponse(
        id=option.id,
        label=option.label,
        value=option.value,
        score_value=option.score_value,
        display_order=option.display_order,
        is_active=option.is_active,
    )


def _serialize_question(question: SurveyQuestion) -> SurveyQuestionResponse:
    options = sorted(question.options, key=lambda item: item.display_order)
    return SurveyQuestionResponse(
        id=question.id,
        code=question.code,
        question_text=question.question_text,
        help_text=question.help_text,
        question_type=question.question_type,
        dimension_id=question.dimension_id,
        is_required=question.is_required,
        display_order=question.display_order,
        scale_min=question.scale_min,
        scale_max=question.scale_max,
        allow_comment=question.allow_comment,
        is_active=question.is_active,
        options=[_serialize_option(option) for option in options],
    )


def _serialize_campaign(campaign: Campaign) -> CampaignSummaryResponse:
    return CampaignSummaryResponse(
        id=campaign.id,
        code=campaign.code,
        name=campaign.name,
        description=campaign.description,
        status=campaign.status,
        start_at=campaign.start_at,
        end_at=campaign.end_at,
        published_at=campaign.published_at,
        is_anonymous=campaign.is_anonymous,
        allows_draft=campaign.allows_draft,
        audience_count=len(campaign.audiences),
    )


def _serialize_campaign_response(response: Response) -> CampaignResponseEntryResponse:
    items = sorted(response.items, key=lambda item: item.question.display_order)
    return CampaignResponseEntryResponse(
        response_id=response.id,
        status=response.status.value,
        started_at=response.started_at,
        submitted_at=response.submitted_at,
        total_answers=len(items),
        answers=[
            CampaignResponseAnswerResponse(
                question_id=item.question_id,
                question_code=item.question.code,
                question_text=item.question.question_text,
                question_type=item.question.question_type,
                selected_option_label=item.selected_option.label if item.selected_option else None,
                numeric_answer=item.numeric_answer,
                text_answer=item.text_answer,
            )
            for item in items
        ],
    )


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
        latest_campaign_id=latest_campaign.id if latest_campaign else None,
        latest_campaign_name=latest_campaign.name if latest_campaign else None,
        latest_campaign_status=latest_campaign.status if latest_campaign else None,
        updated_at=survey.updated_at,
    )


def _serialize_survey_detail(survey: Survey) -> SurveyDetailResponse:
    current_version = _get_current_version(survey)
    dimensions = sorted(survey.dimensions, key=lambda item: item.display_order)
    campaigns = []

    current_version_response = None
    if current_version is not None:
        questions = sorted(current_version.questions, key=lambda item: item.display_order)
        campaigns = sorted(current_version.campaigns, key=lambda item: item.start_at, reverse=True)
        current_version_response = SurveyVersionDetailResponse(
            id=current_version.id,
            version_number=current_version.version_number,
            title=current_version.title,
            description=current_version.description,
            status=current_version.status,
            published_at=current_version.published_at,
            questions=[_serialize_question(question) for question in questions],
        )

    return SurveyDetailResponse(
        id=survey.id,
        code=survey.code,
        name=survey.name,
        description=survey.description,
        category=survey.category,
        is_active=survey.is_active,
        updated_at=survey.updated_at,
        dimensions=[
            SurveyDimensionResponse(
                id=dimension.id,
                code=dimension.code,
                name=dimension.name,
                description=dimension.description,
                display_order=dimension.display_order,
                is_active=dimension.is_active,
            )
            for dimension in dimensions
        ],
        current_version=current_version_response,
        campaigns=[_serialize_campaign(campaign) for campaign in campaigns],
    )


def _get_survey_with_related(db: Session, survey_id: int, *, refresh: bool = False) -> Survey | None:
    query = (
        select(Survey)
        .options(
            selectinload(Survey.dimensions),
            selectinload(Survey.versions)
            .selectinload(SurveyVersion.questions)
            .selectinload(SurveyQuestion.options),
            selectinload(Survey.versions)
            .selectinload(SurveyVersion.campaigns)
            .selectinload(Campaign.audiences),
        )
        .where(Survey.id == survey_id)
    )

    if refresh:
        query = query.execution_options(populate_existing=True)

    return db.scalar(query)


def _ensure_dimension_belongs_to_survey(
    survey: Survey,
    dimension_id: int | None,
) -> SurveyDimension | None:
    if dimension_id is None:
        return None

    for dimension in survey.dimensions:
        if dimension.id == dimension_id:
            return dimension

    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Dimension does not belong to survey")


def _validate_question_payload(payload: SurveyQuestionCreateRequest | SurveyQuestionUpdateRequest) -> None:
    if payload.scale_min > payload.scale_max:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Scale min cannot be greater than scale max")

    if payload.question_type == QuestionTypeEnum.SINGLE_CHOICE and not payload.options:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Single choice questions require options")

    if payload.question_type != QuestionTypeEnum.SINGLE_CHOICE and payload.options:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only single choice questions can define options")


def _sync_question_options(question: SurveyQuestion, options_payload: list) -> None:
    question.options.clear()
    for index, option in enumerate(options_payload, start=1):
        question.options.append(
            QuestionOption(
                label=option.label.strip(),
                value=option.value.strip().upper(),
                score_value=option.score_value,
                display_order=index,
                is_active=True,
            )
        )


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


@router.get("/surveys/{survey_id}", response_model=SurveyDetailResponse)
def read_admin_survey_detail(
    survey_id: int,
    _: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> SurveyDetailResponse:
    survey = _get_survey_with_related(db, survey_id)
    if survey is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Survey not found")

    return _serialize_survey_detail(survey)


@router.get("/campaigns/{campaign_id}/responses", response_model=CampaignResponsesPageResponse)
def read_admin_campaign_responses(
    campaign_id: int,
    _: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> CampaignResponsesPageResponse:
    campaign = db.scalar(
        select(Campaign)
        .options(
            selectinload(Campaign.audiences),
            selectinload(Campaign.survey_version).selectinload(SurveyVersion.survey),
            selectinload(Campaign.survey_version)
            .selectinload(SurveyVersion.questions)
            .selectinload(SurveyQuestion.options),
            selectinload(Campaign.responses)
            .selectinload(Response.items)
            .selectinload(ResponseItem.question),
            selectinload(Campaign.responses)
            .selectinload(Response.items)
            .selectinload(ResponseItem.selected_option),
        )
        .where(Campaign.id == campaign_id)
    )

    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    responses = sorted(campaign.responses, key=lambda item: item.started_at, reverse=True)
    submitted_responses = sum(1 for item in responses if item.status == ResponseStatusEnum.SUBMITTED)
    draft_responses = sum(1 for item in responses if item.status == ResponseStatusEnum.DRAFT)

    return CampaignResponsesPageResponse(
        campaign=_serialize_campaign(campaign),
        survey_id=campaign.survey_version.survey.id,
        survey_code=campaign.survey_version.survey.code,
        survey_name=campaign.survey_version.survey.name,
        version_id=campaign.survey_version.id,
        version_title=campaign.survey_version.title,
        total_questions=len(campaign.survey_version.questions),
        questions=[
            _serialize_question(question)
            for question in sorted(campaign.survey_version.questions, key=lambda item: item.display_order)
        ],
        summary=CampaignResponsesSummaryResponse(
            audience_count=len(campaign.audiences),
            total_responses=len(responses),
            submitted_responses=submitted_responses,
            draft_responses=draft_responses,
        ),
        responses=[_serialize_campaign_response(response) for response in responses],
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
        category=payload.category.strip(),
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


@router.delete("/surveys/{survey_id}", response_model=AdminActionResponse)
def delete_admin_survey(
    survey_id: int,
    user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AdminActionResponse:
    survey = _get_survey_with_related(db, survey_id)
    if survey is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Survey not found")

    version_ids = [version.id for version in survey.versions]
    question_ids = [question.id for version in survey.versions for question in version.questions]
    campaign_ids = [campaign.id for version in survey.versions for campaign in version.campaigns]
    survey_name = survey.name
    survey_code = survey.code

    if question_ids:
        db.execute(delete(ResponseItem).where(ResponseItem.question_id.in_(question_ids)))
        db.execute(delete(QuestionOption).where(QuestionOption.question_id.in_(question_ids)))
        db.execute(delete(SurveyQuestion).where(SurveyQuestion.id.in_(question_ids)))

    if campaign_ids:
        db.execute(delete(Response).where(Response.campaign_id.in_(campaign_ids)))
        db.execute(delete(CampaignAudience).where(CampaignAudience.campaign_id.in_(campaign_ids)))
        db.execute(delete(Campaign).where(Campaign.id.in_(campaign_ids)))

    if version_ids:
        db.execute(delete(SurveyVersion).where(SurveyVersion.id.in_(version_ids)))

    db.execute(delete(SurveyDimension).where(SurveyDimension.survey_id == survey_id))
    db.execute(delete(Survey).where(Survey.id == survey_id))

    db.add(
        AuditLog(
            actor_user_id=user.id,
            action=AuditActionEnum.DELETE,
            entity_name="survey",
            entity_id=survey_code,
            description="Survey removed from administrative portal.",
            details_json=json.dumps({"survey_id": survey_id, "survey_name": survey_name}),
            ip_address="127.0.0.1",
            created_at=datetime.now(UTC),
        )
    )
    db.commit()

    return AdminActionResponse(message=f'Pesquisa "{survey_name}" excluida com sucesso.')


@router.put("/surveys/{survey_id}", response_model=SurveyDetailResponse)
def update_admin_survey(
    survey_id: int,
    payload: SurveyUpdateRequest,
    user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> SurveyDetailResponse:
    survey = _get_survey_with_related(db, survey_id)
    if survey is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Survey not found")

    current_version = _get_current_version(survey)
    if current_version is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Survey has no version to update")

    survey.name = payload.name.strip()
    survey.description = payload.description.strip() if payload.description else None
    survey.category = payload.category.strip()
    survey.is_active = payload.is_active
    current_version.title = payload.version_title.strip()
    current_version.description = payload.version_description.strip() if payload.version_description else None

    if not payload.is_active:
        for version in survey.versions:
            for campaign in version.campaigns:
                if campaign.status == CampaignStatusEnum.ACTIVE:
                    campaign.status = CampaignStatusEnum.CLOSED

    db.add(
        AuditLog(
            actor_user_id=user.id,
            action=AuditActionEnum.UPDATE,
            entity_name="survey",
            entity_id=survey.code,
            description="Survey metadata updated from administrative portal.",
            details_json=json.dumps({"survey_id": survey.id}),
            ip_address="127.0.0.1",
            created_at=datetime.now(UTC),
        )
    )
    db.commit()

    updated_survey = _get_survey_with_related(db, survey_id, refresh=True)
    if updated_survey is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Updated survey could not be loaded")

    return _serialize_survey_detail(updated_survey)


@router.post("/surveys/{survey_id}/dimensions", response_model=SurveyDetailResponse)
def create_survey_dimension(
    survey_id: int,
    payload: SurveyDimensionCreateRequest,
    user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> SurveyDetailResponse:
    survey = _get_survey_with_related(db, survey_id)
    if survey is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Survey not found")

    dimension_name = payload.name.strip()
    if any(existing.name.casefold() == dimension_name.casefold() for existing in survey.dimensions):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Dimension already exists")

    next_order = max((dimension.display_order for dimension in survey.dimensions), default=0) + 1
    base_code = _normalize_dimension_code(dimension_name, next_order)
    code = base_code
    suffix = 1
    existing_codes = {dimension.code for dimension in survey.dimensions}
    while code in existing_codes:
        suffix += 1
        code = f"{base_code[:55]}_{suffix}"

    db.add(
        SurveyDimension(
            survey_id=survey.id,
            code=code,
            name=dimension_name,
            description=payload.description.strip() if payload.description else None,
            display_order=next_order,
            is_active=True,
        )
    )
    db.add(
        AuditLog(
            actor_user_id=user.id,
            action=AuditActionEnum.UPDATE,
            entity_name="survey_dimension",
            entity_id=survey.code,
            description="Dimension added from administrative portal.",
            details_json=json.dumps({"name": dimension_name}),
            ip_address="127.0.0.1",
            created_at=datetime.now(UTC),
        )
    )
    db.commit()

    updated_survey = _get_survey_with_related(db, survey_id, refresh=True)
    return _serialize_survey_detail(updated_survey)


@router.patch("/dimensions/{dimension_id}", response_model=SurveyDetailResponse)
def update_survey_dimension(
    dimension_id: int,
    payload: SurveyDimensionUpdateRequest,
    user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> SurveyDetailResponse:
    dimension = db.scalar(select(SurveyDimension).where(SurveyDimension.id == dimension_id))
    if dimension is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dimension not found")

    duplicate_dimension = db.scalar(
        select(SurveyDimension)
        .where(SurveyDimension.survey_id == dimension.survey_id)
        .where(func.lower(SurveyDimension.name) == payload.name.strip().lower())
        .where(SurveyDimension.id != dimension.id)
    )
    if duplicate_dimension is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Dimension already exists")

    dimension.name = payload.name.strip()
    dimension.description = payload.description.strip() if payload.description else None
    dimension.is_active = payload.is_active

    db.add(
        AuditLog(
            actor_user_id=user.id,
            action=AuditActionEnum.UPDATE,
            entity_name="survey_dimension",
            entity_id=str(dimension.id),
            description="Dimension updated from administrative portal.",
            details_json=json.dumps({"dimension_id": dimension.id}),
            ip_address="127.0.0.1",
            created_at=datetime.now(UTC),
        )
    )
    db.commit()

    survey = _get_survey_with_related(db, dimension.survey_id)
    return _serialize_survey_detail(survey)


@router.delete("/dimensions/{dimension_id}", response_model=SurveyDetailResponse)
def delete_survey_dimension(
    dimension_id: int,
    user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> SurveyDetailResponse:
    dimension = db.scalar(select(SurveyDimension).where(SurveyDimension.id == dimension_id))
    if dimension is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dimension not found")

    survey_id = dimension.survey_id
    for question in db.scalars(select(SurveyQuestion).where(SurveyQuestion.dimension_id == dimension.id)).all():
        question.dimension_id = None

    db.delete(dimension)
    db.add(
        AuditLog(
            actor_user_id=user.id,
            action=AuditActionEnum.DELETE,
            entity_name="survey_dimension",
            entity_id=str(dimension_id),
            description="Dimension removed from administrative portal.",
            details_json=json.dumps({"dimension_id": dimension_id}),
            ip_address="127.0.0.1",
            created_at=datetime.now(UTC),
        )
    )
    db.commit()

    survey = _get_survey_with_related(db, survey_id, refresh=True)
    return _serialize_survey_detail(survey)


@router.post("/surveys/{survey_id}/questions", response_model=SurveyDetailResponse)
def create_survey_question(
    survey_id: int,
    payload: SurveyQuestionCreateRequest,
    user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> SurveyDetailResponse:
    _validate_question_payload(payload)
    survey = _get_survey_with_related(db, survey_id)
    if survey is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Survey not found")

    current_version = _get_current_version(survey)
    if current_version is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Survey has no active version")

    _ensure_dimension_belongs_to_survey(survey, payload.dimension_id)
    normalized_code = payload.code.strip().upper()
    if any(question.code == normalized_code for question in current_version.questions):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Question code already exists in version")

    display_order = payload.display_order or (max((question.display_order for question in current_version.questions), default=0) + 1)
    if any(question.display_order == display_order for question in current_version.questions):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Question display order already exists")

    question = SurveyQuestion(
        survey_version_id=current_version.id,
        dimension_id=payload.dimension_id,
        code=normalized_code,
        question_text=payload.question_text.strip(),
        help_text=payload.help_text.strip() if payload.help_text else None,
        question_type=payload.question_type,
        is_required=payload.is_required,
        display_order=display_order,
        scale_min=payload.scale_min,
        scale_max=payload.scale_max,
        allow_comment=payload.allow_comment,
        is_active=payload.is_active,
    )
    _sync_question_options(question, payload.options)
    db.add(question)

    db.add(
        AuditLog(
            actor_user_id=user.id,
            action=AuditActionEnum.CREATE,
            entity_name="survey_question",
            entity_id=normalized_code,
            description="Question created from administrative portal.",
            details_json=json.dumps({"survey_id": survey.id}),
            ip_address="127.0.0.1",
            created_at=datetime.now(UTC),
        )
    )
    db.commit()

    updated_survey = _get_survey_with_related(db, survey_id, refresh=True)
    return _serialize_survey_detail(updated_survey)


@router.patch("/questions/{question_id}", response_model=SurveyDetailResponse)
def update_survey_question(
    question_id: int,
    payload: SurveyQuestionUpdateRequest,
    user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> SurveyDetailResponse:
    _validate_question_payload(payload)
    question = db.scalar(
        select(SurveyQuestion)
        .options(selectinload(SurveyQuestion.survey_version).selectinload(SurveyVersion.survey))
        .where(SurveyQuestion.id == question_id)
    )
    if question is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    survey = _get_survey_with_related(db, question.survey_version.survey_id)
    if survey is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Survey not found")

    _ensure_dimension_belongs_to_survey(survey, payload.dimension_id)
    normalized_code = payload.code.strip().upper()
    current_version = _get_current_version(survey)
    if current_version is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Survey has no active version")

    for existing_question in current_version.questions:
        if existing_question.id == question.id:
            continue
        if existing_question.code == normalized_code:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Question code already exists in version")
        if existing_question.display_order == payload.display_order:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Question display order already exists")

    question.code = normalized_code
    question.question_text = payload.question_text.strip()
    question.help_text = payload.help_text.strip() if payload.help_text else None
    question.question_type = payload.question_type
    question.dimension_id = payload.dimension_id
    question.is_required = payload.is_required
    question.display_order = payload.display_order
    question.scale_min = payload.scale_min
    question.scale_max = payload.scale_max
    question.allow_comment = payload.allow_comment
    question.is_active = payload.is_active
    _sync_question_options(question, payload.options)

    db.add(
        AuditLog(
            actor_user_id=user.id,
            action=AuditActionEnum.UPDATE,
            entity_name="survey_question",
            entity_id=str(question.id),
            description="Question updated from administrative portal.",
            details_json=json.dumps({"question_id": question.id}),
            ip_address="127.0.0.1",
            created_at=datetime.now(UTC),
        )
    )
    db.commit()

    updated_survey = _get_survey_with_related(db, survey.id, refresh=True)
    return _serialize_survey_detail(updated_survey)


@router.delete("/questions/{question_id}", response_model=SurveyDetailResponse)
def delete_survey_question(
    question_id: int,
    user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> SurveyDetailResponse:
    question = db.scalar(
        select(SurveyQuestion)
        .options(selectinload(SurveyQuestion.survey_version).selectinload(SurveyVersion.survey))
        .where(SurveyQuestion.id == question_id)
    )
    if question is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    survey_id = question.survey_version.survey_id
    db.delete(question)
    db.add(
        AuditLog(
            actor_user_id=user.id,
            action=AuditActionEnum.DELETE,
            entity_name="survey_question",
            entity_id=str(question_id),
            description="Question removed from administrative portal.",
            details_json=json.dumps({"question_id": question_id}),
            ip_address="127.0.0.1",
            created_at=datetime.now(UTC),
        )
    )
    db.commit()

    updated_survey = _get_survey_with_related(db, survey_id, refresh=True)
    return _serialize_survey_detail(updated_survey)


@router.post("/surveys/{survey_id}/publish", response_model=SurveyDetailResponse)
def publish_survey_version(
    survey_id: int,
    payload: PublishSurveyRequest,
    user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> SurveyDetailResponse:
    survey = _get_survey_with_related(db, survey_id)
    if survey is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Survey not found")

    current_version = _get_current_version(survey)
    if current_version is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Survey has no version to publish")
    if not current_version.questions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Survey version must have at least one question before publishing")
    if payload.start_at >= payload.end_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Campaign start date must be before end date")

    campaign_code = payload.campaign_code.strip().upper()
    active_campaigns_for_version = sorted(
        [campaign for campaign in current_version.campaigns if campaign.status == CampaignStatusEnum.ACTIVE],
        key=lambda item: (item.published_at or item.created_at, item.id),
        reverse=True,
    )
    current_campaign = active_campaigns_for_version[0] if active_campaigns_for_version else None

    duplicate_campaign = db.scalar(select(Campaign).where(Campaign.code == campaign_code))
    if duplicate_campaign is not None and (current_campaign is None or duplicate_campaign.id != current_campaign.id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Campaign code already exists")

    for version in survey.versions:
        if version.id != current_version.id and version.status == SurveyVersionStatusEnum.PUBLISHED:
            version.status = SurveyVersionStatusEnum.ARCHIVED

    current_version.status = SurveyVersionStatusEnum.PUBLISHED
    current_version.published_at = datetime.now(UTC)

    for archived_campaign in active_campaigns_for_version[1:]:
        archived_campaign.status = CampaignStatusEnum.CLOSED

    if current_campaign is None:
        campaign = Campaign(
            survey_version_id=current_version.id,
            code=campaign_code,
            name=payload.campaign_name.strip(),
            description=payload.campaign_description.strip() if payload.campaign_description else None,
            start_at=payload.start_at,
            end_at=payload.end_at,
            published_at=datetime.now(UTC),
            status=CampaignStatusEnum.ACTIVE,
            is_anonymous=True,
            allows_draft=payload.allows_draft,
            created_by_user_id=user.id,
        )
        db.add(campaign)
        db.flush()
    else:
        campaign = current_campaign
        campaign.code = campaign_code
        campaign.name = payload.campaign_name.strip()
        campaign.description = payload.campaign_description.strip() if payload.campaign_description else None
        campaign.start_at = payload.start_at
        campaign.end_at = payload.end_at
        campaign.published_at = datetime.now(UTC)
        campaign.status = CampaignStatusEnum.ACTIVE
        campaign.is_anonymous = payload.is_anonymous
        campaign.allows_draft = payload.allows_draft
        campaign.created_by_user_id = user.id

    employees = db.scalars(
        select(Employee)
        .options(
            selectinload(Employee.department),
            selectinload(Employee.job_title),
            selectinload(Employee.manager),
            selectinload(Employee.user),
        )
        .where(Employee.status == EmployeeStatusEnum.ACTIVE)
        .order_by(Employee.id.asc())
    ).all()

    existing_audiences_by_employee_id = {audience.employee_id: audience for audience in campaign.audiences}

    for employee in employees:
        audience = existing_audiences_by_employee_id.get(employee.id)
        if audience is None:
            db.add(
                CampaignAudience(
                    campaign_id=campaign.id,
                    employee_id=employee.id,
                    employee_name_snapshot=employee.full_name,
                    work_email_snapshot=employee.work_email or (employee.user.email if employee.user else ""),
                    department_name_snapshot=employee.department.name,
                    job_title_name_snapshot=employee.job_title.name,
                    manager_name_snapshot=employee.manager.full_name if employee.manager else None,
                    published_at=campaign.published_at,
                )
            )
            continue

        audience.employee_name_snapshot = employee.full_name
        audience.work_email_snapshot = employee.work_email or (employee.user.email if employee.user else "")
        audience.department_name_snapshot = employee.department.name
        audience.job_title_name_snapshot = employee.job_title.name
        audience.manager_name_snapshot = employee.manager.full_name if employee.manager else None
        audience.published_at = campaign.published_at

    db.add(
        AuditLog(
            actor_user_id=user.id,
            action=AuditActionEnum.PUBLISH,
            entity_name="survey_version",
            entity_id=str(current_version.id),
            description="Survey version published or updated from administrative portal.",
            details_json=json.dumps({"survey_id": survey.id, "campaign_code": campaign.code, "campaign_id": campaign.id}),
            ip_address="127.0.0.1",
            created_at=datetime.now(UTC),
        )
    )
    db.commit()

    updated_survey = _get_survey_with_related(db, survey_id, refresh=True)
    return _serialize_survey_detail(updated_survey)

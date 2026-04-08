import json
from datetime import UTC, datetime
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.db.session import get_db
from app.models import (
    AuditActionEnum,
    AuditLog,
    Campaign,
    CampaignAudience,
    CampaignAudienceStatusEnum,
    CampaignStatusEnum,
    Department,
    Employee,
    EmployeeStatusEnum,
    JobTitle,
    QuestionTypeEnum,
    Response,
    ResponseItem,
    ResponseStatusEnum,
    Survey,
    SurveyQuestion,
    SurveyVersion,
    SurveyVersionStatusEnum,
)
from app.schemas.public import (
    PublicCampaignAnswerInput,
    PublicCampaignDetailResponse,
    PublicCampaignQuestionResponse,
    PublicCampaignStartRequest,
    PublicCampaignStartResponse,
    PublicCampaignItemResponse,
    PublicCampaignListResponse,
    PublicCampaignSummaryResponse,
    PublicCampaignSubmitRequest,
    PublicCampaignSubmitResponse,
    PublicQuestionOptionResponse,
    PublicResponseAnswerResponse,
)

router = APIRouter(tags=["public"])


def _utc_now_naive() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def _normalize_datetime(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is not None:
        return value.astimezone(UTC).replace(tzinfo=None)
    return value


def _is_campaign_open(campaign: Campaign) -> bool:
    now = _utc_now_naive()
    start_at = _normalize_datetime(campaign.start_at)
    end_at = _normalize_datetime(campaign.end_at)

    return (
        campaign.status == CampaignStatusEnum.ACTIVE
        and start_at is not None
        and end_at is not None
        and start_at <= now <= end_at
    )


def _serialize_public_question(question) -> PublicCampaignQuestionResponse:
    options = sorted(question.options, key=lambda item: item.display_order)
    return PublicCampaignQuestionResponse(
        id=question.id,
        code=question.code,
        question_text=question.question_text,
        help_text=question.help_text,
        question_type=question.question_type.value,
        is_required=question.is_required,
        display_order=question.display_order,
        scale_min=question.scale_min,
        scale_max=question.scale_max,
        options=[
            PublicQuestionOptionResponse(
                id=option.id,
                label=option.label,
                value=option.value,
                score_value=option.score_value,
                display_order=option.display_order,
            )
            for option in options
            if option.is_active
        ],
    )


def _serialize_public_answer(item: ResponseItem) -> PublicResponseAnswerResponse:
    return PublicResponseAnswerResponse(
        question_id=item.question_id,
        selected_option_id=item.selected_option_id,
        numeric_answer=item.numeric_answer,
        text_answer=item.text_answer,
    )


def _load_public_campaign(db: Session, campaign_id: int) -> Campaign | None:
    return db.scalar(
        select(Campaign)
        .join(Campaign.survey_version)
        .join(SurveyVersion.survey)
        .options(
            selectinload(Campaign.audiences)
            .selectinload(CampaignAudience.employee)
            .selectinload(Employee.user),
            selectinload(Campaign.audiences)
            .selectinload(CampaignAudience.response)
            .selectinload(Response.items),
            selectinload(Campaign.survey_version).selectinload(SurveyVersion.questions),
            selectinload(Campaign.survey_version).selectinload(SurveyVersion.survey),
            selectinload(Campaign.survey_version)
            .selectinload(SurveyVersion.questions)
            .selectinload(SurveyQuestion.options),
        )
        .where(Campaign.id == campaign_id)
        .where(Campaign.published_at.is_not(None))
        .where(Survey.is_active.is_(True))
        .where(SurveyVersion.status == SurveyVersionStatusEnum.PUBLISHED)
    )


def _ensure_campaign_available(campaign: Campaign) -> None:
    if campaign.status != CampaignStatusEnum.ACTIVE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Campaign is not active")
    if not _is_campaign_open(campaign):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Campaign is outside the participation window")


def _build_campaign_detail(campaign: Campaign) -> PublicCampaignDetailResponse:
    return PublicCampaignDetailResponse(
        **_serialize_public_campaign(campaign).model_dump(),
        version_description=campaign.survey_version.description,
    )


def _build_participation_payload(campaign: Campaign, response: Response, audience: CampaignAudience) -> PublicCampaignStartResponse:
    active_questions = sorted(
        [question for question in campaign.survey_version.questions if question.is_active],
        key=lambda item: item.display_order,
    )
    existing_items = sorted(response.items, key=lambda item: item.question_id)

    return PublicCampaignStartResponse(
        response_id=response.id,
        status=response.status.value,
        participant_name=None if campaign.is_anonymous else audience.employee_name_snapshot,
        participant_email=None if campaign.is_anonymous else audience.work_email_snapshot,
        started_at=response.started_at,
        campaign=_build_campaign_detail(campaign),
        questions=[_serialize_public_question(question) for question in active_questions],
        answers=[_serialize_public_answer(item) for item in existing_items],
    )


def _create_anonymous_participation(db: Session, campaign: Campaign) -> tuple[CampaignAudience, Response]:
    department = db.scalar(select(Department).where(Department.is_active.is_(True)).order_by(Department.id.asc()))
    job_title = db.scalar(select(JobTitle).where(JobTitle.is_active.is_(True)).order_by(JobTitle.id.asc()))

    if department is None or job_title is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Anonymous participation could not be initialized")

    token = uuid4().hex[:12].upper()
    anonymous_email = f"anonymous-{campaign.id}-{token.lower()}@local.invalid"

    employee = Employee(
        employee_code=f"ANON-{campaign.id}-{token}",
        user_id=None,
        department_id=department.id,
        job_title_id=job_title.id,
        manager_id=None,
        full_name="Participante Anonimo",
        work_email=None,
        personal_email=None,
        hire_date=None,
        status=EmployeeStatusEnum.ACTIVE,
    )
    db.add(employee)
    db.flush()

    audience = CampaignAudience(
        campaign_id=campaign.id,
        employee_id=employee.id,
        employee_name_snapshot="Participante Anonimo",
        work_email_snapshot=anonymous_email,
        department_name_snapshot=department.name,
        job_title_name_snapshot=job_title.name,
        manager_name_snapshot=None,
        status=CampaignAudienceStatusEnum.STARTED,
        published_at=campaign.published_at or _utc_now_naive(),
        responded_at=None,
    )
    db.add(audience)
    db.flush()

    response = Response(
        campaign_id=campaign.id,
        campaign_audience_id=audience.id,
        employee_id=employee.id,
        status=ResponseStatusEnum.DRAFT,
        started_at=_utc_now_naive(),
        submitted_at=None,
        is_anonymous_snapshot=True,
        submission_ip=None,
    )
    db.add(response)
    db.flush()

    return audience, response


def _serialize_public_campaign(campaign: Campaign) -> PublicCampaignItemResponse:
    return PublicCampaignItemResponse(
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
        survey_id=campaign.survey_version.survey.id,
        survey_code=campaign.survey_version.survey.code,
        survey_name=campaign.survey_version.survey.name,
        survey_description=campaign.survey_version.survey.description,
        survey_category=campaign.survey_version.survey.category,
        version_id=campaign.survey_version.id,
        version_title=campaign.survey_version.title,
        total_questions=len(campaign.survey_version.questions),
    )


@router.get("/campaigns/published", response_model=PublicCampaignListResponse)
def read_published_campaigns(
    db: Annotated[Session, Depends(get_db)],
) -> PublicCampaignListResponse:
    campaigns = db.scalars(
        select(Campaign)
        .join(Campaign.survey_version)
        .join(SurveyVersion.survey)
        .options(
            selectinload(Campaign.audiences),
            selectinload(Campaign.survey_version).selectinload(SurveyVersion.questions),
            selectinload(Campaign.survey_version).selectinload(SurveyVersion.survey),
        )
        .where(Campaign.published_at.is_not(None))
        .where(Survey.is_active.is_(True))
        .where(SurveyVersion.status == SurveyVersionStatusEnum.PUBLISHED)
        .order_by(Campaign.published_at.desc(), Campaign.id.desc())
    ).all()

    active_campaigns = db.scalar(
        select(func.count(Campaign.id))
        .join(Campaign.survey_version)
        .join(SurveyVersion.survey)
        .where(Campaign.published_at.is_not(None))
        .where(Campaign.status == CampaignStatusEnum.ACTIVE)
        .where(Survey.is_active.is_(True))
        .where(SurveyVersion.status == SurveyVersionStatusEnum.PUBLISHED)
    ) or 0

    items = [_serialize_public_campaign(campaign) for campaign in campaigns]

    return PublicCampaignListResponse(
        summary=PublicCampaignSummaryResponse(
            total_published_campaigns=len(items),
            active_campaigns=active_campaigns,
        ),
        items=items,
    )


@router.get("/campaigns/published/{campaign_id}", response_model=PublicCampaignDetailResponse)
def read_published_campaign_detail(
    campaign_id: int,
    db: Annotated[Session, Depends(get_db)],
) -> PublicCampaignDetailResponse:
    campaign = _load_public_campaign(db, campaign_id)

    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    return _build_campaign_detail(campaign)


@router.post("/campaigns/published/{campaign_id}/start", response_model=PublicCampaignStartResponse)
def start_public_campaign_participation(
    campaign_id: int,
    payload: PublicCampaignStartRequest,
    db: Annotated[Session, Depends(get_db)],
) -> PublicCampaignStartResponse:
    campaign = _load_public_campaign(db, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    _ensure_campaign_available(campaign)
    audience, response = _create_anonymous_participation(db, campaign)

    db.commit()

    refreshed_campaign = _load_public_campaign(db, campaign_id)
    if refreshed_campaign is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Campaign could not be reloaded")

    refreshed_response = db.scalar(
        select(Response)
        .options(selectinload(Response.items))
        .where(Response.id == response.id)
    )
    if refreshed_response is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Participation could not be initialized")

    refreshed_audience = db.scalar(select(CampaignAudience).where(CampaignAudience.id == audience.id))
    if refreshed_audience is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Participation could not be initialized")

    return _build_participation_payload(refreshed_campaign, refreshed_response, refreshed_audience)


@router.post("/campaigns/published/{campaign_id}/submit", response_model=PublicCampaignSubmitResponse)
def submit_public_campaign_response(
    campaign_id: int,
    payload: PublicCampaignSubmitRequest,
    db: Annotated[Session, Depends(get_db)],
) -> PublicCampaignSubmitResponse:
    campaign = _load_public_campaign(db, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    _ensure_campaign_available(campaign)
    response = db.scalar(
        select(Response)
        .options(selectinload(Response.items), selectinload(Response.campaign_audience))
        .where(Response.id == payload.response_id)
        .where(Response.campaign_id == campaign.id)
    )
    if response is None or response.campaign_audience is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Participation not found for this campaign")

    audience = response.campaign_audience
    if response.status == ResponseStatusEnum.SUBMITTED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This response was already submitted")

    active_questions = {
        question.id: question
        for question in campaign.survey_version.questions
        if question.is_active
    }
    answers_by_question_id: dict[int, PublicCampaignAnswerInput] = {}
    for answer in payload.answers:
        if answer.question_id not in active_questions:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Answer references an invalid question")
        if answer.question_id in answers_by_question_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Duplicated answer for the same question")
        answers_by_question_id[answer.question_id] = answer

    for question in active_questions.values():
        answer = answers_by_question_id.get(question.id)
        if question.is_required and answer is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Required question missing: {question.code}")
        if answer is None:
            continue

        if question.question_type == QuestionTypeEnum.SCALE_1_5:
            if answer.numeric_answer is None:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Numeric answer required for question {question.code}")
            if answer.numeric_answer < question.scale_min or answer.numeric_answer > question.scale_max:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Numeric answer out of range for question {question.code}")

        if question.question_type == QuestionTypeEnum.TEXT:
            if answer.text_answer is None or not answer.text_answer.strip():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Text answer required for question {question.code}")

        if question.question_type == QuestionTypeEnum.SINGLE_CHOICE:
            if answer.selected_option_id is None:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Option selection required for question {question.code}")
            valid_option_ids = {option.id for option in question.options if option.is_active}
            if answer.selected_option_id not in valid_option_ids:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid option for question {question.code}")

    existing_items = {item.question_id: item for item in response.items}
    for question_id, answer in answers_by_question_id.items():
        item = existing_items.get(question_id)
        if item is None:
            item = ResponseItem(response_id=response.id, question_id=question_id)
            db.add(item)

        question = active_questions[question_id]
        item.selected_option_id = answer.selected_option_id if question.question_type == QuestionTypeEnum.SINGLE_CHOICE else None
        item.numeric_answer = answer.numeric_answer if question.question_type == QuestionTypeEnum.SCALE_1_5 else None
        item.text_answer = answer.text_answer.strip() if answer.text_answer and question.question_type == QuestionTypeEnum.TEXT else None

    submitted_at = _utc_now_naive()
    response.status = ResponseStatusEnum.SUBMITTED
    response.submitted_at = submitted_at
    response.submission_ip = "127.0.0.1"
    audience.status = CampaignAudienceStatusEnum.SUBMITTED
    audience.responded_at = submitted_at

    db.add(
        AuditLog(
            actor_user_id=None,
            action=AuditActionEnum.SUBMIT,
            entity_name="public_campaign_response",
            entity_id=str(response.id),
            description="Campaign response submitted from public portal.",
            details_json=json.dumps({"campaign_id": campaign.id}),
            ip_address="127.0.0.1",
            created_at=submitted_at,
        )
    )
    db.commit()

    return PublicCampaignSubmitResponse(
        response_id=response.id,
        status=response.status.value,
        submitted_at=submitted_at,
        message="Respostas enviadas com sucesso.",
    )
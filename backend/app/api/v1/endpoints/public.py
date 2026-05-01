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
    SurveyDimension,
    SurveyQuestion,
    SurveyVersion,
    SurveyVersionStatusEnum,
)
from app.schemas.public import (
    PublicCampaignAnswerInput,
    PublicCampaignDetailResponse,
    PublicCampaignQuestionResponse,
    PublicLookupOptionResponse,
    PublicCampaignStartRequest,
    PublicCampaignStartResponse,
    PublicCampaignItemResponse,
    PublicCampaignListResponse,
    PublicCampaignSummaryResponse,
    PublicCampaignSubmitRequest,
    PublicCampaignSubmitResponse,
    PublicQuestionOptionResponse,
    PublicResponseAnswerResponse,
    PublicSurveyDimensionResponse,
)

router = APIRouter(tags=["public"])

PUBLIC_POSITION_OPTIONS = [
    ("PUBLIC_ADMINISTRATIVE", "Administrativo"),
    ("PUBLIC_OPERATIONAL", "Operacional"),
    ("PUBLIC_LEADERSHIP", "Liderança"),
]


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
        dimension_id=question.dimension_id,
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


def _serialize_public_dimension(dimension: SurveyDimension) -> PublicSurveyDimensionResponse:
    return PublicSurveyDimensionResponse(
        id=dimension.id,
        code=dimension.code,
        name=dimension.name,
        description=dimension.description,
        display_order=dimension.display_order,
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
            selectinload(Campaign.survey_version).selectinload(SurveyVersion.survey).selectinload(Survey.dimensions),
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


def _list_active_departments(db: Session) -> list[Department]:
    return list(
        db.scalars(
            select(Department)
            .where(Department.is_active.is_(True))
            .order_by(Department.name.asc())
        ).all()
    )


def _list_active_job_titles(db: Session) -> list[JobTitle]:
    existing_by_code = {
        item.code: item
        for item in db.scalars(
            select(JobTitle)
            .where(JobTitle.code.in_([code for code, _ in PUBLIC_POSITION_OPTIONS]))
        ).all()
    }

    created_any = False
    created_job_titles: list[JobTitle] = []
    updated_job_titles: list[JobTitle] = []
    for code, name in PUBLIC_POSITION_OPTIONS:
        job_title = existing_by_code.get(code)
        if job_title is None:
            job_title = JobTitle(code=code, name=name, description="Posição disponível para participação pública.", is_active=True)
            db.add(job_title)
            db.flush()
            existing_by_code[code] = job_title
            created_job_titles.append(job_title)
            created_any = True
        else:
            needs_update = job_title.name != name or not job_title.is_active
            job_title.name = name
            job_title.is_active = True
            if needs_update:
                updated_job_titles.append(job_title)

    for job_title in created_job_titles:
        db.add(
            AuditLog(
                actor_user_id=None,
                action=AuditActionEnum.CREATE,
                entity_name="job_title",
                entity_id=str(job_title.id),
                description="Public participation job title option created automatically.",
                details_json=json.dumps({"job_title_id": job_title.id, "code": job_title.code, "name": job_title.name}),
                ip_address="127.0.0.1",
                created_at=_utc_now_naive(),
            )
        )

    for job_title in updated_job_titles:
        db.add(
            AuditLog(
                actor_user_id=None,
                action=AuditActionEnum.UPDATE,
                entity_name="job_title",
                entity_id=str(job_title.id),
                description="Public participation job title option normalized automatically.",
                details_json=json.dumps({"job_title_id": job_title.id, "code": job_title.code, "name": job_title.name}),
                ip_address="127.0.0.1",
                created_at=_utc_now_naive(),
            )
        )

    if created_any:
        db.commit()

    return [existing_by_code[code] for code, _ in PUBLIC_POSITION_OPTIONS]


def _get_participation_profile(
    db: Session,
    department_id: int,
    job_title_id: int,
) -> tuple[Department, JobTitle]:
    department = db.scalar(
        select(Department)
        .where(Department.id == department_id)
        .where(Department.is_active.is_(True))
    )
    allowed_job_titles = {item.id: item for item in _list_active_job_titles(db)}
    job_title = allowed_job_titles.get(job_title_id)

    if department is None or job_title is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selecione um departamento e uma posição válidos")

    return department, job_title


def _build_campaign_detail(campaign: Campaign, db: Session) -> PublicCampaignDetailResponse:
    departments = _list_active_departments(db)
    job_titles = _list_active_job_titles(db)

    return PublicCampaignDetailResponse(
        **_serialize_public_campaign(campaign).model_dump(),
        version_description=campaign.survey_version.description,
        available_departments=[PublicLookupOptionResponse(id=item.id, name=item.name) for item in departments],
        available_job_titles=[PublicLookupOptionResponse(id=item.id, name=item.name) for item in job_titles],
        dimensions=[
            _serialize_public_dimension(dimension)
            for dimension in sorted(campaign.survey_version.survey.dimensions, key=lambda item: item.display_order)
        ],
    )


def _build_participation_payload(campaign: Campaign, response: Response, audience: CampaignAudience, db: Session) -> PublicCampaignStartResponse:
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
        campaign=_build_campaign_detail(campaign, db),
        questions=[_serialize_public_question(question) for question in active_questions],
        answers=[_serialize_public_answer(item) for item in existing_items],
    )
def _build_transient_participation_payload(campaign: Campaign, db: Session) -> PublicCampaignStartResponse:
    active_questions = sorted(
        [question for question in campaign.survey_version.questions if question.is_active],
        key=lambda item: item.display_order,
    )

    return PublicCampaignStartResponse(
        response_id=None,
        status="IN_PROGRESS",
        participant_name=None,
        participant_email=None,
        started_at=_utc_now_naive(),
        campaign=_build_campaign_detail(campaign, db),
        questions=[_serialize_public_question(question) for question in active_questions],
        answers=[],
    )


def _create_anonymous_participation(
    db: Session,
    campaign: Campaign,
    department: Department,
    job_title: JobTitle,
) -> tuple[CampaignAudience, Response]:

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

    return _build_campaign_detail(campaign, db)


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
    department, job_title = _get_participation_profile(db, payload.department_id, payload.job_title_id)

    if not campaign.allows_draft:
        return _build_transient_participation_payload(campaign, db)

    audience, response = _create_anonymous_participation(db, campaign, department, job_title)
    db.add(
        AuditLog(
            actor_user_id=None,
            action=AuditActionEnum.CREATE,
            entity_name="public_campaign_participation",
            entity_id=str(response.id),
            description="Campaign participation started from public portal.",
            details_json=json.dumps(
                {
                    "campaign_id": campaign.id,
                    "response_id": response.id,
                    "audience_id": audience.id,
                    "employee_id": response.employee_id,
                    "department_id": department.id,
                    "job_title_id": job_title.id,
                }
            ),
            ip_address="127.0.0.1",
            created_at=response.started_at,
        )
    )

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

    return _build_participation_payload(refreshed_campaign, refreshed_response, refreshed_audience, db)


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

    if campaign.allows_draft:
        if payload.response_id is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Participation identifier is required")

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
    else:
        if payload.department_id is None or payload.job_title_id is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Departamento e posição são obrigatórios para iniciar a pesquisa")

        department, job_title = _get_participation_profile(db, payload.department_id, payload.job_title_id)
        audience, response = _create_anonymous_participation(db, campaign, department, job_title)
        db.add(
            AuditLog(
                actor_user_id=None,
                action=AuditActionEnum.CREATE,
                entity_name="public_campaign_participation",
                entity_id=str(response.id),
                description="Campaign participation created during public response submission.",
                details_json=json.dumps(
                    {
                        "campaign_id": campaign.id,
                        "response_id": response.id,
                        "audience_id": audience.id,
                        "employee_id": response.employee_id,
                        "department_id": department.id,
                        "job_title_id": job_title.id,
                    }
                ),
                ip_address="127.0.0.1",
                created_at=response.started_at,
            )
        )

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

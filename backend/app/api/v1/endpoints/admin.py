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
from app.services.admission_checklist import DEFAULT_ADMISSION_CHECKLIST_STEPS
from app.models import (
    AdmissionRequestApproval,
    AdmissionRequest,
    AdmissionRequestCandidate,
    AdmissionChecklistStep,
    AdmissionRequestStatusEnum,
    ApprovalOriginGroupEnum,
    AdmissionRequestTypeEnum,
    ApprovalStepStatusEnum,
    ApprovalRequestKindEnum,
    ApprovalRoleEnum,
    ApprovalWorkflowStep,
    ApprovalWorkflowTemplate,
    AuditActionEnum,
    AuditLog,
    Campaign,
    CampaignAudience,
    CampaignStatusEnum,
    Department,
    Employee,
    EmployeeStatusEnum,
    DismissalRequest,
    DismissalRequestStatusEnum,
    DismissalRequestApproval,
    JobTitle,
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
    RoleEnum,
    User,
)
from app.schemas.admin import (
    AdminActionResponse,
    ApprovalActionRequest,
    ApprovalQueueItemResponse,
    ApprovalQueueListResponse,
    ApprovalStepResponse,
    AdmissionPositionEnum,
    AdmissionChecklistStepCreateRequest,
    AdmissionChecklistReorderRequest,
    AdmissionChecklistProgressUpdateRequest,
    AdmissionChecklistStepListResponse,
    AdmissionChecklistStepResponse,
    AdmissionChecklistStepUpdateRequest,
    AdmissionRequestCreateRequest,
    AdmissionRequestCandidateResponse,
    AdmissionRequestHireRequest,
    AdmissionRequestListResponse,
    AdmissionRequestResponse,
    CampaignResponseAnswerResponse,
    CampaignDepartmentProgressResponse,
    CampaignResponseEntryResponse,
    CampaignResponsesPageResponse,
    CampaignResponsesSummaryResponse,
    CampaignSummaryResponse,
    DepartmentCreateRequest,
    DepartmentManagementItemResponse,
    DepartmentManagementListResponse,
    DepartmentUpdateRequest,
    DashboardRecentSurveyResponse,
    DashboardResponse,
    DashboardSummaryResponse,
    DismissalRequestCreateRequest,
    DismissalRequestListResponse,
    DismissalRequestResponse,
    JobTitleCreateRequest,
    JobTitleManagementItemResponse,
    JobTitleManagementListResponse,
    JobTitleUpdateRequest,
    HiredEmployeeResponse,
    PublishSurveyRequest,
    QuestionOptionResponse,
    RecruiterOptionListResponse,
    RecruiterOptionResponse,
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


def _serialize_dimension(dimension: SurveyDimension) -> SurveyDimensionResponse:
    return SurveyDimensionResponse(
        id=dimension.id,
        code=dimension.code,
        name=dimension.name,
        description=dimension.description,
        display_order=dimension.display_order,
        is_active=dimension.is_active,
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
        score_weight=question.score_weight,
        is_negative=question.is_negative,
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


def _serialize_department(department: Department) -> DepartmentManagementItemResponse:
    return DepartmentManagementItemResponse(
        id=department.id,
        code=department.code,
        name=department.name,
        description=department.description,
        total_people=department.total_people,
        is_active=department.is_active,
        updated_at=department.updated_at,
    )


def _serialize_job_title(job_title: JobTitle) -> JobTitleManagementItemResponse:
    return JobTitleManagementItemResponse(
        id=job_title.id,
        code=job_title.code,
        name=job_title.name,
        description=job_title.description,
        is_active=job_title.is_active,
        updated_at=job_title.updated_at,
    )


def _serialize_admission_checklist_step(step: AdmissionChecklistStep) -> AdmissionChecklistStepResponse:
    return AdmissionChecklistStepResponse(
        id=step.id,
        step_order=step.step_order,
        title=step.title,
        description=step.description,
        created_at=step.created_at,
        updated_at=step.updated_at,
    )


def _list_admission_checklist_steps(db: Session) -> list[AdmissionChecklistStep]:
    return list(
        db.scalars(
            select(AdmissionChecklistStep).order_by(AdmissionChecklistStep.step_order.asc(), AdmissionChecklistStep.id.asc())
        ).all()
    )


def _normalize_admission_checklist_steps(db: Session) -> list[AdmissionChecklistStep]:
    steps = _list_admission_checklist_steps(db)

    for index, step in enumerate(steps, start=1):
        step.step_order = index

    return steps


def _seed_default_admission_checklist_steps(db: Session) -> list[AdmissionChecklistStep]:
    checklist_steps = []
    for step_order, title, description in DEFAULT_ADMISSION_CHECKLIST_STEPS:
        checklist_steps.append(
            AdmissionChecklistStep(
                step_order=step_order,
                title=title,
                description=description,
            )
        )

    db.add_all(checklist_steps)
    db.flush()
    return _list_admission_checklist_steps(db)


def _serialize_hired_employee(employee: Employee) -> HiredEmployeeResponse:
    return HiredEmployeeResponse(
        id=employee.id,
        employee_code=employee.employee_code,
        full_name=employee.full_name,
        work_email=employee.work_email,
        personal_email=employee.personal_email,
        hire_date=employee.hire_date,
        department_name=employee.department.name,
        job_title_name=employee.job_title.name,
    )


def _serialize_admission_request_candidate(candidate: AdmissionRequestCandidate) -> AdmissionRequestCandidateResponse:
    return AdmissionRequestCandidateResponse(
        id=candidate.id,
        full_name=candidate.full_name,
        email=candidate.email,
        phone_number=candidate.phone_number,
        hire_date=candidate.hire_date,
        is_hired=candidate.is_hired,
        employee_id=candidate.employee_id,
    )


def _serialize_recruiter_option(user: User) -> RecruiterOptionResponse:
    return RecruiterOptionResponse(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role.value,
    )


def _serialize_admission_request(item: AdmissionRequest) -> AdmissionRequestResponse:
    hired_employee_count = sum(1 for candidate in item.candidates if candidate.is_hired)
    return AdmissionRequestResponse(
        id=item.id,
        status=item.status,
        request_type=item.request_type,
        posicao_vaga=item.posicao_vaga,
        is_confidential=item.is_confidential,
        recruiter_user_id=item.recruiter_user_id,
        recruiter_user_name=item.recruiter_user.full_name if item.recruiter_user else None,
        recruiter_user_email=item.recruiter_user.email if item.recruiter_user else None,
        cargo=item.cargo,
        setor=item.setor,
        recruitment_scope=item.recruitment_scope,
        quantity_people=item.quantity_people,
        turno=item.turno,
        contract_regime=item.contract_regime,
        substituted_employee_name=item.substituted_employee_name,
        justification=item.justification,
        manager_reminder=item.manager_reminder,
        created_by_user_id=item.created_by_user_id,
        created_by_user_name=item.created_by_user.full_name,
        created_by_user_email=item.created_by_user.email,
        approval_workflow_template_id=item.approval_workflow_template_id,
        checklist_completed_steps=item.checklist_completed_steps or 0,
        hired_employee_count=hired_employee_count,
        remaining_positions=max(item.quantity_people - hired_employee_count, 0),
        candidates=[_serialize_admission_request_candidate(candidate) for candidate in item.candidates],
        hired_employees=[_serialize_hired_employee(employee) for employee in item.hired_employees],
        sla_started_at=_get_admission_sla_started_at(item),
        submitted_at=item.submitted_at,
        finalized_at=item.finalized_at,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def _get_admission_sla_started_at(item: AdmissionRequest) -> datetime | None:
    ordered_steps = sorted(item.approval_steps, key=lambda approval_step: approval_step.step_order)
    manager_step = next(
        (
            approval_step
            for approval_step in ordered_steps
            if approval_step.approver_role == ApprovalRoleEnum.RH_MANAGER
            and approval_step.status == ApprovalStepStatusEnum.APPROVED
            and approval_step.decided_at is not None
        ),
        None,
    )
    return manager_step.decided_at if manager_step else None


def _serialize_dismissal_request(item: DismissalRequest) -> DismissalRequestResponse:
    return DismissalRequestResponse(
        id=item.id,
        status=item.status,
        employee_name=item.employee_name,
        cargo=item.cargo,
        departamento=item.departamento,
        dismissal_type=item.dismissal_type,
        has_replacement=item.has_replacement,
        can_be_rehired=item.can_be_rehired,
        rehire_justification=item.rehire_justification,
        estimated_termination_date=item.estimated_termination_date,
        contract_regime=item.contract_regime,
        manager_reminder=item.manager_reminder,
        created_by_user_id=item.created_by_user_id,
        created_by_user_name=item.created_by_user.full_name,
        created_by_user_email=item.created_by_user.email,
        approval_workflow_template_id=item.approval_workflow_template_id,
        submitted_at=item.submitted_at,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def _serialize_approval_step(step) -> ApprovalStepResponse:
    return ApprovalStepResponse(
        id=step.id,
        step_order=step.step_order,
        approver_role=step.approver_role,
        approver_label=step.workflow_step.approver_label if step.workflow_step else step.approver_role.value,
        status=step.status,
        decided_by_user_name=step.decided_by_user.full_name if step.decided_by_user else None,
        decided_at=step.decided_at,
        comments=step.comments,
    )


def _serialize_admission_approval_queue_item(item: AdmissionRequest) -> ApprovalQueueItemResponse:
    ordered_steps = sorted(item.approval_steps, key=lambda approval_step: approval_step.step_order)
    current_step = next((approval_step for approval_step in ordered_steps if approval_step.status == ApprovalStepStatusEnum.PENDING), None)
    return ApprovalQueueItemResponse(
        request_kind=ApprovalRequestKindEnum.ADMISSION,
        request_id=item.id,
        request_title=item.cargo,
        request_subtitle=f"{item.setor} • {item.turno}",
        request_status=item.status.value,
        requester_name=item.created_by_user.full_name,
        requester_email=item.created_by_user.email,
        workflow_name=item.approval_workflow_template.name if item.approval_workflow_template else "Fluxo padrão",
        current_step_order=current_step.step_order if current_step else None,
        current_step_label=current_step.workflow_step.approver_label if current_step and current_step.workflow_step else (current_step.approver_role.value if current_step else None),
        current_step_role=current_step.approver_role if current_step else None,
        recruiter_user_id=item.recruiter_user_id,
        recruiter_user_name=item.recruiter_user.full_name if item.recruiter_user else None,
        recruiter_user_email=item.recruiter_user.email if item.recruiter_user else None,
        submitted_at=item.submitted_at,
        created_at=item.created_at,
        updated_at=item.updated_at,
        steps=[_serialize_approval_step(approval_step) for approval_step in ordered_steps],
        candidates=[_serialize_admission_request_candidate(candidate) for candidate in item.candidates],
        hired_employees=[_serialize_hired_employee(employee) for employee in item.hired_employees],
    )


def _serialize_dismissal_approval_queue_item(item: DismissalRequest) -> ApprovalQueueItemResponse:
    ordered_steps = sorted(item.approval_steps, key=lambda approval_step: approval_step.step_order)
    current_step = next((approval_step for approval_step in ordered_steps if approval_step.status == ApprovalStepStatusEnum.PENDING), None)
    return ApprovalQueueItemResponse(
        request_kind=ApprovalRequestKindEnum.DISMISSAL,
        request_id=item.id,
        request_title=item.employee_name,
        request_subtitle=f"{item.cargo} • {item.departamento}",
        request_status=item.status.value,
        requester_name=item.created_by_user.full_name,
        requester_email=item.created_by_user.email,
        workflow_name=item.approval_workflow_template.name if item.approval_workflow_template else "Fluxo padrão",
        current_step_order=current_step.step_order if current_step else None,
        current_step_label=current_step.workflow_step.approver_label if current_step and current_step.workflow_step else (current_step.approver_role.value if current_step else None),
        current_step_role=current_step.approver_role if current_step else None,
        recruiter_user_id=None,
        recruiter_user_name=None,
        recruiter_user_email=None,
        submitted_at=item.submitted_at,
        created_at=item.created_at,
        updated_at=item.updated_at,
        steps=[_serialize_approval_step(approval_step) for approval_step in ordered_steps],
        candidates=[],
        hired_employees=[],
    )


def _can_user_view_admission_request(user: User, request_item: AdmissionRequest) -> bool:
    if user.role == RoleEnum.RH_ADMIN:
        return True

    return user.role == RoleEnum.RH_ANALISTA and request_item.recruiter_user_id == user.id


def _require_recruiter_access(user: User) -> None:
    if user.role not in {RoleEnum.RH_ADMIN, RoleEnum.RH_ANALISTA}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admission access restricted to assigned recruiters")


def _mark_request_approval_progress(
    db: Session,
    request_item,
    approval_steps,
    *,
    target_step=None,
    approve: bool,
    user: User,
    comments: str | None,
    pending_status,
    approved_status,
    rejected_status,
) -> None:
    ordered_steps = sorted(approval_steps, key=lambda approval_step: approval_step.step_order)
    current_step = target_step or next((approval_step for approval_step in ordered_steps if approval_step.status == ApprovalStepStatusEnum.PENDING), None)
    if current_step is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This request no longer has pending approval steps")

    now = datetime.now(UTC)
    first_pending_step = next((approval_step for approval_step in ordered_steps if approval_step.status == ApprovalStepStatusEnum.PENDING), None)
    direct_bypass = first_pending_step is not None and current_step.id != first_pending_step.id

    if approve:
        current_step.status = ApprovalStepStatusEnum.APPROVED
        current_step.decided_by_user_id = user.id
        current_step.decided_at = now
        current_step.comments = comments

        if direct_bypass:
            for approval_step in ordered_steps:
                if approval_step.id != current_step.id and approval_step.status == ApprovalStepStatusEnum.PENDING:
                    approval_step.status = ApprovalStepStatusEnum.SKIPPED
                    approval_step.decided_by_user_id = user.id
                    approval_step.decided_at = now
                    approval_step.comments = comments
            request_item.status = approved_status
            request_item.submitted_at = request_item.submitted_at or now
            return

        remaining_pending = [approval_step for approval_step in ordered_steps if approval_step.step_order > current_step.step_order and approval_step.status == ApprovalStepStatusEnum.PENDING]
        if remaining_pending:
            request_item.status = pending_status
        else:
            request_item.status = approved_status
            request_item.submitted_at = request_item.submitted_at or now
        return

    current_step.status = ApprovalStepStatusEnum.REJECTED
    current_step.decided_by_user_id = user.id
    current_step.decided_at = now
    current_step.comments = comments

    for approval_step in ordered_steps:
        if approval_step.step_order > current_step.step_order and approval_step.status == ApprovalStepStatusEnum.PENDING:
            approval_step.status = ApprovalStepStatusEnum.SKIPPED
            approval_step.decided_by_user_id = user.id
            approval_step.decided_at = now
            approval_step.comments = comments

    request_item.status = rejected_status


@router.get("/admission-checklist", response_model=AdmissionChecklistStepListResponse)
def read_admin_admission_checklist_steps(
    _: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AdmissionChecklistStepListResponse:
    steps = _list_admission_checklist_steps(db)
    return AdmissionChecklistStepListResponse(items=[_serialize_admission_checklist_step(step) for step in steps])


@router.post("/admission-checklist", response_model=AdmissionChecklistStepResponse, status_code=status.HTTP_201_CREATED)
def create_admin_admission_checklist_step(
    payload: AdmissionChecklistStepCreateRequest,
    user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AdmissionChecklistStepResponse:
    checklist_step = AdmissionChecklistStep(
        step_order=payload.step_order,
        title=payload.title.strip(),
        description=payload.description.strip() if payload.description else None,
    )
    db.add(checklist_step)
    db.flush()

    _normalize_admission_checklist_steps(db)
    db.add(
        AuditLog(
            actor_user_id=user.id,
            action=AuditActionEnum.CREATE,
            entity_name="admission_checklist_step",
            entity_id=str(checklist_step.id),
            description="Admission checklist step created from administrative portal.",
            details_json=json.dumps(
                {
                    "step_id": checklist_step.id,
                    "title": checklist_step.title,
                    "step_order": checklist_step.step_order,
                }
            ),
            ip_address="127.0.0.1",
            created_at=datetime.now(UTC),
        )
    )
    db.commit()
    db.refresh(checklist_step)
    return _serialize_admission_checklist_step(checklist_step)


@router.put("/admission-checklist/{step_id}", response_model=AdmissionChecklistStepResponse)
def update_admin_admission_checklist_step(
    step_id: int,
    payload: AdmissionChecklistStepUpdateRequest,
    user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AdmissionChecklistStepResponse:
    checklist_step = db.scalar(select(AdmissionChecklistStep).where(AdmissionChecklistStep.id == step_id))
    if checklist_step is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admission checklist step not found")

    checklist_step.step_order = payload.step_order
    checklist_step.title = payload.title.strip()
    checklist_step.description = payload.description.strip() if payload.description else None

    db.flush()
    _normalize_admission_checklist_steps(db)
    db.add(
        AuditLog(
            actor_user_id=user.id,
            action=AuditActionEnum.UPDATE,
            entity_name="admission_checklist_step",
            entity_id=str(checklist_step.id),
            description="Admission checklist step updated from administrative portal.",
            details_json=json.dumps(
                {
                    "step_id": checklist_step.id,
                    "title": checklist_step.title,
                    "step_order": checklist_step.step_order,
                }
            ),
            ip_address="127.0.0.1",
            created_at=datetime.now(UTC),
        )
    )
    db.commit()
    db.refresh(checklist_step)
    return _serialize_admission_checklist_step(checklist_step)


@router.delete("/admission-checklist/{step_id}", response_model=AdminActionResponse)
def delete_admin_admission_checklist_step(
    step_id: int,
    user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AdminActionResponse:
    checklist_step = db.scalar(select(AdmissionChecklistStep).where(AdmissionChecklistStep.id == step_id))
    if checklist_step is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admission checklist step not found")

    db.delete(checklist_step)
    db.flush()
    _normalize_admission_checklist_steps(db)
    db.add(
        AuditLog(
            actor_user_id=user.id,
            action=AuditActionEnum.DELETE,
            entity_name="admission_checklist_step",
            entity_id=str(step_id),
            description="Admission checklist step deleted from administrative portal.",
            details_json=json.dumps({"step_id": step_id}),
            ip_address="127.0.0.1",
            created_at=datetime.now(UTC),
        )
    )
    db.commit()
    return AdminActionResponse(message="Checklist step deleted successfully")


@router.post("/admission-checklist/reorder", response_model=AdmissionChecklistStepListResponse)
def reorder_admin_admission_checklist_steps(
    payload: AdmissionChecklistReorderRequest,
    user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AdmissionChecklistStepListResponse:
    existing_steps = db.scalars(select(AdmissionChecklistStep)).all()
    steps_by_id = {step.id: step for step in existing_steps}
    ordered_ids = payload.ordered_step_ids

    if len(ordered_ids) != len(existing_steps):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Checklist order must include every step")

    if len(set(ordered_ids)) != len(ordered_ids):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Checklist order cannot contain repeated steps")

    if set(ordered_ids) != set(steps_by_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Checklist order contains unknown steps")

    for index, step_id in enumerate(ordered_ids, start=1):
        steps_by_id[step_id].step_order = index

    db.add(
        AuditLog(
            actor_user_id=user.id,
            action=AuditActionEnum.UPDATE,
            entity_name="admission_checklist_step",
            entity_id="bulk-reorder",
            description="Admission checklist reordered from administrative portal.",
            details_json=json.dumps({"ordered_step_ids": ordered_ids}),
            ip_address="127.0.0.1",
            created_at=datetime.now(UTC),
        )
    )
    db.commit()

    steps = _list_admission_checklist_steps(db)
    return AdmissionChecklistStepListResponse(items=[_serialize_admission_checklist_step(step) for step in steps])


@router.post("/admission-checklist/reset-default", response_model=AdmissionChecklistStepListResponse)
def reset_admin_admission_checklist_steps(
    user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AdmissionChecklistStepListResponse:
    steps = db.scalars(select(AdmissionChecklistStep)).all()
    for step in steps:
        db.delete(step)

    db.flush()
    seeded_steps = _seed_default_admission_checklist_steps(db)
    db.add(
        AuditLog(
            actor_user_id=user.id,
            action=AuditActionEnum.UPDATE,
            entity_name="admission_checklist_step",
            entity_id="reset-default",
            description="Admission checklist restored to default items from administrative portal.",
            details_json=json.dumps({"step_count": len(seeded_steps)}),
            ip_address="127.0.0.1",
            created_at=datetime.now(UTC),
        )
    )
    db.commit()

    return AdmissionChecklistStepListResponse(items=[_serialize_admission_checklist_step(step) for step in seeded_steps])


@router.get("/hr/approvals/admission", response_model=ApprovalQueueListResponse)
def read_admin_admission_approval_queue(
    _: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ApprovalQueueListResponse:
    items = db.scalars(
        select(AdmissionRequest)
        .options(
            selectinload(AdmissionRequest.created_by_user),
            selectinload(AdmissionRequest.recruiter_user),
            selectinload(AdmissionRequest.approval_workflow_template),
            selectinload(AdmissionRequest.approval_steps).selectinload(AdmissionRequestApproval.workflow_step),
            selectinload(AdmissionRequest.approval_steps).selectinload(AdmissionRequestApproval.decided_by_user),
        )
            .where(AdmissionRequest.status == AdmissionRequestStatusEnum.PENDING)
        .order_by(AdmissionRequest.submitted_at.desc().nullslast(), AdmissionRequest.created_at.desc())
    ).all()
    return ApprovalQueueListResponse(items=[_serialize_admission_approval_queue_item(item) for item in items])


@router.get("/hr/recruiters", response_model=RecruiterOptionListResponse)
def read_admin_recruiters(
    _: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> RecruiterOptionListResponse:
    items = db.scalars(
        select(User)
        .where(User.is_active.is_(True))
        .where(User.role == RoleEnum.RH_ANALISTA)
        .order_by(User.full_name.asc())
    ).all()
    return RecruiterOptionListResponse(items=[_serialize_recruiter_option(user) for user in items])


@router.get("/hr/approvals/dismissal", response_model=ApprovalQueueListResponse)
def read_admin_dismissal_approval_queue(
    _: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ApprovalQueueListResponse:
    items = db.scalars(
        select(DismissalRequest)
        .options(
            selectinload(DismissalRequest.created_by_user),
            selectinload(DismissalRequest.approval_workflow_template),
            selectinload(DismissalRequest.approval_steps).selectinload(DismissalRequestApproval.workflow_step),
            selectinload(DismissalRequest.approval_steps).selectinload(DismissalRequestApproval.decided_by_user),
        )
        .where(DismissalRequest.status.in_([DismissalRequestStatusEnum.PENDING, DismissalRequestStatusEnum.UNDER_REVIEW]))
        .order_by(DismissalRequest.submitted_at.desc().nullslast(), DismissalRequest.created_at.desc())
    ).all()
    return ApprovalQueueListResponse(items=[_serialize_dismissal_approval_queue_item(item) for item in items])


@router.get("/hr/my-requests", response_model=ApprovalQueueListResponse)
def read_my_requests(
    user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ApprovalQueueListResponse:
    admission_items = db.scalars(
        select(AdmissionRequest)
        .options(
            selectinload(AdmissionRequest.created_by_user),
            selectinload(AdmissionRequest.recruiter_user),
            selectinload(AdmissionRequest.approval_workflow_template),
            selectinload(AdmissionRequest.approval_steps).selectinload(AdmissionRequestApproval.workflow_step),
            selectinload(AdmissionRequest.approval_steps).selectinload(AdmissionRequestApproval.decided_by_user),
        )
        .where(AdmissionRequest.created_by_user_id == user.id)
        .order_by(AdmissionRequest.created_at.desc())
    ).all()

    dismissal_items = db.scalars(
        select(DismissalRequest)
        .options(
            selectinload(DismissalRequest.created_by_user),
            selectinload(DismissalRequest.approval_workflow_template),
            selectinload(DismissalRequest.approval_steps).selectinload(DismissalRequestApproval.workflow_step),
            selectinload(DismissalRequest.approval_steps).selectinload(DismissalRequestApproval.decided_by_user),
        )
        .where(DismissalRequest.created_by_user_id == user.id)
        .order_by(DismissalRequest.created_at.desc())
    ).all()

    items = [
        _serialize_admission_approval_queue_item(item)
        for item in admission_items
    ] + [
        _serialize_dismissal_approval_queue_item(item)
        for item in dismissal_items
    ]
    items = sorted(items, key=lambda item: item.created_at, reverse=True)
    return ApprovalQueueListResponse(items=items)


@router.post("/hr/approvals/admission/{request_id}/approve", response_model=ApprovalQueueItemResponse)
def approve_admin_admission_request(
    request_id: int,
    payload: ApprovalActionRequest,
    user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ApprovalQueueItemResponse:
    request_item = db.scalar(
        select(AdmissionRequest)
        .options(
            selectinload(AdmissionRequest.created_by_user),
            selectinload(AdmissionRequest.recruiter_user),
            selectinload(AdmissionRequest.approval_workflow_template),
            selectinload(AdmissionRequest.approval_steps).selectinload(AdmissionRequestApproval.workflow_step),
            selectinload(AdmissionRequest.approval_steps).selectinload(AdmissionRequestApproval.decided_by_user),
        )
        .where(AdmissionRequest.id == request_id)
    )
    if request_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admission request not found")

    current_step = _get_approval_step_for_user(user, request_item.approval_steps)
    if current_step is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This request no longer has pending approval steps")

    _assert_user_can_act_on_step(user, current_step)

    if current_step.approver_role == ApprovalRoleEnum.RH_MANAGER:
        recruiter_user_id = payload.recruiter_user_id
        if recruiter_user_id is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Recruiter selection is required for RH manager approval")

        recruiter_user = db.scalar(
            select(User)
            .where(User.id == recruiter_user_id)
            .where(User.is_active.is_(True))
            .where(User.role == RoleEnum.RH_ANALISTA)
        )
        if recruiter_user is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected recruiter is not available")

        request_item.recruiter_user_id = recruiter_user.id
    elif payload.recruiter_user_id is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Recruiter selection is only allowed for RH manager approval")

    _mark_request_approval_progress(
        db,
        request_item,
        request_item.approval_steps,
        target_step=current_step,
        approve=True,
        user=user,
        comments=payload.comments,
        pending_status=AdmissionRequestStatusEnum.PENDING,
        approved_status=AdmissionRequestStatusEnum.APPROVED,
        rejected_status=AdmissionRequestStatusEnum.REJECTED,
    )
    db.commit()
    db.refresh(request_item)
    return _serialize_admission_approval_queue_item(request_item)


@router.post("/hr/approvals/admission/{request_id}/reject", response_model=ApprovalQueueItemResponse)
def reject_admin_admission_request(
    request_id: int,
    payload: ApprovalActionRequest,
    user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ApprovalQueueItemResponse:
    request_item = db.scalar(
        select(AdmissionRequest)
        .options(
            selectinload(AdmissionRequest.created_by_user),
            selectinload(AdmissionRequest.recruiter_user),
            selectinload(AdmissionRequest.approval_workflow_template),
            selectinload(AdmissionRequest.approval_steps).selectinload(AdmissionRequestApproval.workflow_step),
            selectinload(AdmissionRequest.approval_steps).selectinload(AdmissionRequestApproval.decided_by_user),
        )
        .where(AdmissionRequest.id == request_id)
    )
    if request_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admission request not found")

    current_step = _get_approval_step_for_user(user, request_item.approval_steps)
    if current_step is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This request no longer has pending approval steps")

    _assert_user_can_act_on_step(user, current_step)

    _mark_request_approval_progress(
        db,
        request_item,
        request_item.approval_steps,
        target_step=current_step,
        approve=False,
        user=user,
        comments=payload.comments,
        pending_status=AdmissionRequestStatusEnum.PENDING,
        approved_status=AdmissionRequestStatusEnum.APPROVED,
        rejected_status=AdmissionRequestStatusEnum.REJECTED,
    )
    db.commit()
    db.refresh(request_item)
    return _serialize_admission_approval_queue_item(request_item)


@router.post("/hr/approvals/dismissal/{request_id}/approve", response_model=ApprovalQueueItemResponse)
def approve_admin_dismissal_request(
    request_id: int,
    payload: ApprovalActionRequest,
    user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ApprovalQueueItemResponse:
    request_item = db.scalar(
        select(DismissalRequest)
        .options(
            selectinload(DismissalRequest.created_by_user),
            selectinload(DismissalRequest.approval_workflow_template),
            selectinload(DismissalRequest.approval_steps).selectinload(DismissalRequestApproval.workflow_step),
            selectinload(DismissalRequest.approval_steps).selectinload(DismissalRequestApproval.decided_by_user),
        )
        .where(DismissalRequest.id == request_id)
    )
    if request_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dismissal request not found")

    current_step = _get_approval_step_for_user(user, request_item.approval_steps)
    if current_step is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This request no longer has pending approval steps")

    _assert_user_can_act_on_step(user, current_step)

    _mark_request_approval_progress(
        db,
        request_item,
        request_item.approval_steps,
        target_step=current_step,
        approve=True,
        user=user,
        comments=payload.comments,
        pending_status=DismissalRequestStatusEnum.UNDER_REVIEW,
        approved_status=DismissalRequestStatusEnum.APPROVED,
        rejected_status=DismissalRequestStatusEnum.REJECTED,
    )
    db.commit()
    db.refresh(request_item)
    return _serialize_dismissal_approval_queue_item(request_item)


@router.post("/hr/approvals/dismissal/{request_id}/reject", response_model=ApprovalQueueItemResponse)
def reject_admin_dismissal_request(
    request_id: int,
    payload: ApprovalActionRequest,
    user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ApprovalQueueItemResponse:
    request_item = db.scalar(
        select(DismissalRequest)
        .options(
            selectinload(DismissalRequest.created_by_user),
            selectinload(DismissalRequest.approval_workflow_template),
            selectinload(DismissalRequest.approval_steps).selectinload(DismissalRequestApproval.workflow_step),
            selectinload(DismissalRequest.approval_steps).selectinload(DismissalRequestApproval.decided_by_user),
        )
        .where(DismissalRequest.id == request_id)
    )
    if request_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dismissal request not found")

    if request_item.status == DismissalRequestStatusEnum.APPROVED:
        comments = payload.comments.strip() if payload.comments else None
        if not comments:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rejection reason is required after approval")

        request_item.status = DismissalRequestStatusEnum.REJECTED
        db.add(
            AuditLog(
                actor_user_id=user.id,
                action=AuditActionEnum.UPDATE,
                entity_name="dismissal_request",
                entity_id=str(request_item.id),
                description="Dismissal request rejected after approval due to an operational impediment.",
                details_json=json.dumps(
                    {
                        "request_id": request_item.id,
                        "status": request_item.status.value,
                        "comments": comments,
                    }
                ),
                ip_address="127.0.0.1",
                created_at=datetime.now(UTC),
            )
        )
        db.commit()
        db.refresh(request_item)
        return _serialize_dismissal_approval_queue_item(request_item)

    current_step = _get_approval_step_for_user(user, request_item.approval_steps)
    if current_step is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This request no longer has pending approval steps")

    _assert_user_can_act_on_step(user, current_step)

    _mark_request_approval_progress(
        db,
        request_item,
        request_item.approval_steps,
        target_step=current_step,
        approve=False,
        user=user,
        comments=payload.comments,
        pending_status=DismissalRequestStatusEnum.UNDER_REVIEW,
        approved_status=DismissalRequestStatusEnum.APPROVED,
        rejected_status=DismissalRequestStatusEnum.REJECTED,
    )
    db.commit()
    db.refresh(request_item)
    return _serialize_dismissal_approval_queue_item(request_item)


def _get_standard_approval_workflow(db: Session) -> ApprovalWorkflowTemplate:
    workflow = db.scalar(
        select(ApprovalWorkflowTemplate)
        .options(selectinload(ApprovalWorkflowTemplate.steps))
        .where(ApprovalWorkflowTemplate.code == "HR_STANDARD_APPROVAL")
    )

    has_changes = False

    if workflow is None:
        workflow = ApprovalWorkflowTemplate(
            code="HR_STANDARD_APPROVAL",
            name="Fluxo padrão de aprovação RH",
            description="Fluxo compartilhado para admissão e demissão.",
            request_kind=ApprovalRequestKindEnum.ANY,
            origin_group=ApprovalOriginGroupEnum.ANY,
            is_active=True,
        )
        db.add(workflow)
        db.flush()
        has_changes = True
    else:
        workflow.name = "Fluxo padrão de aprovação RH"
        workflow.description = "Fluxo compartilhado para admissão e demissão."
        workflow.request_kind = ApprovalRequestKindEnum.ANY
        workflow.origin_group = ApprovalOriginGroupEnum.ANY
        workflow.is_active = True

    expected_steps = [
        (1, ApprovalRoleEnum.MANAGER, "Gerente"),
        (2, ApprovalRoleEnum.DIRECTOR_RAVI, "Diretor Ravi"),
        (3, ApprovalRoleEnum.RH_MANAGER, "Gerente de RH"),
    ]
    existing_steps = {step.step_order: step for step in workflow.steps}

    for step_order, approver_role, approver_label in expected_steps:
        step = existing_steps.get(step_order)
        if step is None:
            db.add(
                ApprovalWorkflowStep(
                    workflow_template_id=workflow.id,
                    step_order=step_order,
                    approver_role=approver_role,
                    approver_label=approver_label,
                    is_required=True,
                )
            )
            has_changes = True
            continue

        step.approver_role = approver_role
        step.approver_label = approver_label
        step.is_required = True

    if has_changes:
        db.flush()
        workflow = db.scalar(
            select(ApprovalWorkflowTemplate)
            .options(selectinload(ApprovalWorkflowTemplate.steps))
            .where(ApprovalWorkflowTemplate.code == "HR_STANDARD_APPROVAL")
            .where(ApprovalWorkflowTemplate.is_active.is_(True))
        )

    if workflow is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Approval workflow template not found")

    return workflow


def _get_current_pending_step(approval_steps):
    ordered_steps = sorted(approval_steps, key=lambda approval_step: approval_step.step_order)
    return next((approval_step for approval_step in ordered_steps if approval_step.status == ApprovalStepStatusEnum.PENDING), None)


def _get_allowed_roles_for_step(approver_role: ApprovalRoleEnum) -> set[RoleEnum]:
    mapping = {
        ApprovalRoleEnum.MANAGER: {RoleEnum.GESTOR, RoleEnum.DIRETOR_RAVI},
        ApprovalRoleEnum.DIRECTOR_RAVI: {RoleEnum.GESTOR, RoleEnum.DIRETOR_RAVI},
        ApprovalRoleEnum.RH_MANAGER: {RoleEnum.RH_ADMIN},
    }
    return mapping.get(approver_role, set())


def _assert_user_can_act_on_step(user: User, step) -> None:
    allowed_roles = _get_allowed_roles_for_step(step.approver_role)
    if user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User role {user.role.value} cannot approve step {step.approver_role.value}",
        )


def _get_approval_step_for_user(user: User, approval_steps):
    ordered_steps = sorted(approval_steps, key=lambda approval_step: approval_step.step_order)
    current_step = next((approval_step for approval_step in ordered_steps if approval_step.status == ApprovalStepStatusEnum.PENDING), None)
    if current_step is not None and user.role in _get_allowed_roles_for_step(current_step.approver_role):
        return current_step

    if user.role == RoleEnum.RH_ADMIN:
        return next(
            (
                approval_step
                for approval_step in reversed(ordered_steps)
                if approval_step.status == ApprovalStepStatusEnum.PENDING and approval_step.approver_role == ApprovalRoleEnum.RH_MANAGER
            ),
            None,
        )

    return current_step


def _seed_admission_approval_steps(db: Session, admission_request: AdmissionRequest, workflow: ApprovalWorkflowTemplate) -> None:
    for step in workflow.steps:
        db.add(
            AdmissionRequestApproval(
                admission_request_id=admission_request.id,
                workflow_step_id=step.id,
                step_order=step.step_order,
                approver_role=step.approver_role,
                status=ApprovalStepStatusEnum.PENDING,
            )
        )


def _seed_dismissal_approval_steps(db: Session, dismissal_request: DismissalRequest, workflow: ApprovalWorkflowTemplate) -> None:
    for step in workflow.steps:
        db.add(
            DismissalRequestApproval(
                dismissal_request_id=dismissal_request.id,
                workflow_step_id=step.id,
                step_order=step.step_order,
                approver_role=step.approver_role,
                status=ApprovalStepStatusEnum.PENDING,
            )
        )


def _build_department_progress(
    departments: list[Department],
    responses: list[Response],
) -> list[CampaignDepartmentProgressResponse]:
    grouped: dict[int, dict[str, int | str]] = {
        department.id: {
            "department_name": department.name,
            "total_people": max(department.total_people, 0),
            "submitted_responses": 0,
        }
        for department in departments
    }

    for response in responses:
        employee = response.employee
        department = employee.department if employee is not None else None
        if department is None:
            continue

        current = grouped.get(department.id)
        if current is None:
            current = {
                "department_name": department.name,
                "total_people": max(department.total_people, 0),
                "submitted_responses": 0,
            }
            grouped[department.id] = current

        if response.status == ResponseStatusEnum.SUBMITTED:
            current["submitted_responses"] = int(current["submitted_responses"]) + 1

    items: list[CampaignDepartmentProgressResponse] = []
    for department_id, values in grouped.items():
        total_people = int(values["total_people"])
        submitted_responses = int(values["submitted_responses"])
        pending_people = max(total_people - submitted_responses, 0)
        participation_rate = 0.0 if total_people <= 0 else round((submitted_responses / total_people) * 100, 1)
        items.append(
            CampaignDepartmentProgressResponse(
                department_id=department_id,
                department_name=str(values["department_name"]),
                total_people=total_people,
                submitted_responses=submitted_responses,
                pending_people=pending_people,
                participation_rate=participation_rate,
            )
        )

    return sorted(items, key=lambda item: (item.department_name.casefold(), item.department_id))


def _serialize_campaign_response(response: Response) -> CampaignResponseEntryResponse:
    items = sorted(response.items, key=lambda item: item.question.display_order)
    audience = response.campaign_audience
    return CampaignResponseEntryResponse(
        response_id=response.id,
        status=response.status.value,
        started_at=response.started_at,
        submitted_at=response.submitted_at,
        total_answers=len(items),
        department_name=audience.department_name_snapshot if audience is not None else None,
        position_name=audience.job_title_name_snapshot if audience is not None else None,
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
        dimensions=[_serialize_dimension(dimension) for dimension in dimensions],
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

    if payload.question_type != QuestionTypeEnum.SCALE_1_5 and payload.is_negative:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only scale questions can be marked as negative")

    if payload.question_type != QuestionTypeEnum.SCALE_1_5 and payload.score_weight != 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only scale questions can define score weight")

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


@router.get("/departments", response_model=DepartmentManagementListResponse)
def read_admin_departments(
    _: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DepartmentManagementListResponse:
    departments = db.scalars(select(Department).order_by(Department.name.asc(), Department.id.asc())).all()
    return DepartmentManagementListResponse(items=[_serialize_department(item) for item in departments])


@router.get("/job-titles", response_model=JobTitleManagementListResponse)
def read_admin_job_titles(
    _: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> JobTitleManagementListResponse:
    job_titles = db.scalars(select(JobTitle).order_by(JobTitle.name.asc(), JobTitle.id.asc())).all()
    return JobTitleManagementListResponse(items=[_serialize_job_title(item) for item in job_titles])


@router.post("/departments", response_model=DepartmentManagementItemResponse, status_code=status.HTTP_201_CREATED)
def create_admin_department(
    payload: DepartmentCreateRequest,
    user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DepartmentManagementItemResponse:
    normalized_code = payload.code.strip().upper()
    normalized_name = payload.name.strip()

    duplicate = db.scalar(
        select(Department)
        .where((func.lower(Department.name) == normalized_name.lower()) | (Department.code == normalized_code))
    )
    if duplicate is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Department code or name already exists")

    department = Department(
        code=normalized_code,
        name=normalized_name,
        description=payload.description.strip() if payload.description else None,
        total_people=payload.total_people,
        is_active=payload.is_active,
    )
    db.add(department)
    db.flush()
    db.add(
        AuditLog(
            actor_user_id=user.id,
            action=AuditActionEnum.CREATE,
            entity_name="department",
            entity_id=str(department.id),
            description="Department created from administrative portal.",
            details_json=json.dumps({"department_id": department.id}),
            ip_address="127.0.0.1",
            created_at=datetime.now(UTC),
        )
    )
    db.commit()
    db.refresh(department)
    return _serialize_department(department)


@router.post("/job-titles", response_model=JobTitleManagementItemResponse, status_code=status.HTTP_201_CREATED)
def create_admin_job_title(
    payload: JobTitleCreateRequest,
    user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> JobTitleManagementItemResponse:
    normalized_code = payload.code.strip().upper()
    normalized_name = payload.name.strip()

    duplicate = db.scalar(
        select(JobTitle)
        .where((func.lower(JobTitle.name) == normalized_name.lower()) | (JobTitle.code == normalized_code))
    )
    if duplicate is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Job title code or name already exists")

    job_title = JobTitle(
        code=normalized_code,
        name=normalized_name,
        description=payload.description.strip() if payload.description else None,
        is_active=payload.is_active,
    )
    db.add(job_title)
    db.flush()
    db.add(
        AuditLog(
            actor_user_id=user.id,
            action=AuditActionEnum.CREATE,
            entity_name="job_title",
            entity_id=str(job_title.id),
            description="Job title created from administrative portal.",
            details_json=json.dumps({"job_title_id": job_title.id}),
            ip_address="127.0.0.1",
            created_at=datetime.now(UTC),
        )
    )
    db.commit()
    db.refresh(job_title)
    return _serialize_job_title(job_title)


@router.get("/hr/admission-requests", response_model=AdmissionRequestListResponse)
def read_admin_admission_requests(
    user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AdmissionRequestListResponse:
    _require_recruiter_access(user)

    statement = (
        select(AdmissionRequest)
        .options(
            selectinload(AdmissionRequest.created_by_user),
            selectinload(AdmissionRequest.recruiter_user),
            selectinload(AdmissionRequest.approval_steps),
            selectinload(AdmissionRequest.hired_employees).selectinload(Employee.department),
            selectinload(AdmissionRequest.hired_employees).selectinload(Employee.job_title),
        )
        .order_by(AdmissionRequest.submitted_at.desc().nullslast(), AdmissionRequest.created_at.desc())
    )
    if user.role == RoleEnum.RH_ANALISTA:
        statement = statement.where(AdmissionRequest.recruiter_user_id == user.id)

    items = db.scalars(statement).all()
    return AdmissionRequestListResponse(items=[_serialize_admission_request(item) for item in items])


@router.get("/hr/admission-requests/{request_id}", response_model=AdmissionRequestResponse)
def read_admin_admission_request_detail(
    request_id: int,
    user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AdmissionRequestResponse:
    _require_recruiter_access(user)

    item = db.scalar(
        select(AdmissionRequest)
        .options(
            selectinload(AdmissionRequest.created_by_user),
            selectinload(AdmissionRequest.recruiter_user),
            selectinload(AdmissionRequest.approval_steps),
            selectinload(AdmissionRequest.hired_employees).selectinload(Employee.department),
            selectinload(AdmissionRequest.hired_employees).selectinload(Employee.job_title),
        )
        .where(AdmissionRequest.id == request_id)
    )
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admission request not found")

    if not _can_user_view_admission_request(user, item):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admission request not found")

    return _serialize_admission_request(item)


@router.post("/hr/admission-requests", response_model=AdmissionRequestResponse, status_code=status.HTTP_201_CREATED)
def create_admin_admission_request(
    payload: AdmissionRequestCreateRequest,
    user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AdmissionRequestResponse:
    workflow = _get_standard_approval_workflow(db)
    cargo = payload.cargo.strip()
    setor = payload.setor.strip()
    turno = payload.turno.strip()
    substituted_employee_name = payload.substituted_employee_name.strip() if payload.substituted_employee_name else None
    justification = payload.justification.strip() if payload.justification else None
    manager_reminder = payload.manager_reminder.strip() if payload.manager_reminder else None

    if payload.request_type == AdmissionRequestTypeEnum.REPLACEMENT and not substituted_employee_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Substituted employee name is required for replacements")

    if payload.request_type == AdmissionRequestTypeEnum.GROWTH and not justification:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Justification is required for growth requests")

    admission_request = AdmissionRequest(
        status=AdmissionRequestStatusEnum.PENDING,
        request_type=payload.request_type,
        posicao_vaga=payload.posicao_vaga,
        is_confidential=payload.is_confidential,
        cargo=cargo,
        setor=setor,
        recruitment_scope=payload.recruitment_scope,
        quantity_people=payload.quantity_people,
        turno=turno,
        contract_regime=payload.contract_regime,
        substituted_employee_name=substituted_employee_name,
        justification=justification,
        manager_reminder=manager_reminder,
        submitted_at=datetime.now(UTC),
        checklist_completed_steps=0,
        created_by_user_id=user.id,
        approval_workflow_template_id=workflow.id,
    )

    db.add(admission_request)
    db.flush()
    _seed_admission_approval_steps(db, admission_request, workflow)
    db.add(
        AuditLog(
            actor_user_id=user.id,
            action=AuditActionEnum.CREATE,
            entity_name="admission_request",
            entity_id=str(admission_request.id),
            description="Admission request created from administrative portal.",
            details_json=json.dumps(
                {
                    "request_id": admission_request.id,
                    "request_type": admission_request.request_type.value,
                    "cargo": admission_request.cargo,
                    "setor": admission_request.setor,
                }
            ),
            ip_address="127.0.0.1",
            created_at=datetime.now(UTC),
        )
    )
    db.commit()
    db.refresh(admission_request)

    loaded_item = db.scalar(
        select(AdmissionRequest)
        .options(
            selectinload(AdmissionRequest.created_by_user),
            selectinload(AdmissionRequest.recruiter_user),
            selectinload(AdmissionRequest.hired_employees).selectinload(Employee.department),
            selectinload(AdmissionRequest.hired_employees).selectinload(Employee.job_title),
        )
        .where(AdmissionRequest.id == admission_request.id)
    )
    if loaded_item is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Admission request was created but could not be loaded")

    return _serialize_admission_request(loaded_item)


@router.post("/hr/admission-requests/{request_id}/checklist-progress", response_model=AdmissionRequestResponse)
def update_admin_admission_request_checklist_progress(
    request_id: int,
    payload: AdmissionChecklistProgressUpdateRequest,
    user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AdmissionRequestResponse:
    _require_recruiter_access(user)

    request_item = db.scalar(
        select(AdmissionRequest)
        .options(
            selectinload(AdmissionRequest.created_by_user),
            selectinload(AdmissionRequest.recruiter_user),
            selectinload(AdmissionRequest.hired_employees).selectinload(Employee.department),
            selectinload(AdmissionRequest.hired_employees).selectinload(Employee.job_title),
        )
        .where(AdmissionRequest.id == request_id)
    )
    if request_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admission request not found")

    if not _can_user_view_admission_request(user, request_item):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admission request not found")

    request_item.checklist_completed_steps = max(payload.completed_steps, 0)
    db.add(
        AuditLog(
            actor_user_id=user.id,
            action=AuditActionEnum.UPDATE,
            entity_name="admission_request",
            entity_id=str(request_item.id),
            description="Admission checklist progress updated from administrative portal.",
            details_json=json.dumps({"request_id": request_item.id, "completed_steps": request_item.checklist_completed_steps}),
            ip_address="127.0.0.1",
            created_at=datetime.now(UTC),
        )
    )
    db.commit()

    loaded_item = db.scalar(
        select(AdmissionRequest)
        .options(
            selectinload(AdmissionRequest.created_by_user),
            selectinload(AdmissionRequest.recruiter_user),
            selectinload(AdmissionRequest.hired_employees).selectinload(Employee.department),
            selectinload(AdmissionRequest.hired_employees).selectinload(Employee.job_title),
        )
        .where(AdmissionRequest.id == request_id)
    )
    if loaded_item is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Admission request was updated but could not be loaded")

    return _serialize_admission_request(loaded_item)


@router.post("/hr/admission-requests/{request_id}/hire", response_model=AdmissionRequestResponse)
def hire_admin_admission_request(
    request_id: int,
    payload: AdmissionRequestHireRequest,
    user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AdmissionRequestResponse:
    _require_recruiter_access(user)

    request_item = db.scalar(
        select(AdmissionRequest)
        .options(
            selectinload(AdmissionRequest.created_by_user),
            selectinload(AdmissionRequest.recruiter_user),
            selectinload(AdmissionRequest.hired_employees).selectinload(Employee.department),
            selectinload(AdmissionRequest.hired_employees).selectinload(Employee.job_title),
        )
        .where(AdmissionRequest.id == request_id)
    )
    if request_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admission request not found")

    if not _can_user_view_admission_request(user, request_item):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admission request not found")

    if request_item.status != AdmissionRequestStatusEnum.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only approved admission requests can be used to register candidates",
        )

    if len(payload.candidates) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one candidate is required")

    default_department = db.scalar(select(Department).where(Department.is_active.is_(True)).order_by(Department.id.asc()))
    default_job_title = db.scalar(select(JobTitle).where(JobTitle.is_active.is_(True)).order_by(JobTitle.id.asc()))
    if default_department is None or default_job_title is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Default department or job title is not available")

    normalized_candidates: list[dict[str, object]] = []
    seen_emails: set[str] = set()
    requested_hired_count = 0

    for index, candidate_payload in enumerate(payload.candidates, start=1):
        full_name = candidate_payload.full_name.strip()
        email = candidate_payload.email.strip().lower()
        phone_number = candidate_payload.phone_number.strip() if candidate_payload.phone_number else None

        if not full_name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Candidate {index} must have a full name")

        if email in seen_emails:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Candidate {index} has a duplicated email in the same batch")

        if db.scalar(select(AdmissionRequestCandidate.id).where(AdmissionRequestCandidate.admission_request_id == request_item.id).where(func.lower(AdmissionRequestCandidate.email) == email)) is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Email already exists for this admission request: candidate {index}")

        if candidate_payload.is_hired:
            requested_hired_count += 1

        seen_emails.add(email)
        normalized_candidates.append(
            {
                "payload": candidate_payload,
                "full_name": full_name,
                "email": email,
                "phone_number": phone_number,
            }
        )

    hired_employee_count = len(request_item.hired_employees)
    if hired_employee_count + requested_hired_count > request_item.quantity_people:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This admission request does not have enough open positions for the selected hired candidates",
        )

    for candidate_data in normalized_candidates:
        candidate_payload = candidate_data["payload"]

        candidate = AdmissionRequestCandidate(
            admission_request_id=request_item.id,
            full_name=candidate_data["full_name"],
            email=candidate_data["email"],
            phone_number=candidate_data["phone_number"],
            hire_date=candidate_payload.hire_date or datetime.now(UTC).date(),
            is_hired=bool(candidate_payload.is_hired),
        )
        db.add(candidate)
        db.flush()

        if candidate_payload.is_hired:
            employee_code = f"ADM-{request_item.id}-{candidate.id}"
            if db.scalar(select(Employee).where(Employee.employee_code == employee_code)) is not None:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Generated employee code already exists")

            employee = Employee(
                employee_code=employee_code,
                source_admission_request_id=request_item.id,
                department_id=default_department.id,
                job_title_id=default_job_title.id,
                manager_id=None,
                full_name=candidate_data["full_name"],
                work_email=candidate_data["email"],
                personal_email=None,
                hire_date=candidate_payload.hire_date or datetime.now(UTC).date(),
                status=EmployeeStatusEnum.ACTIVE,
            )
            db.add(employee)
            db.flush()
            candidate.employee_id = employee.id

            db.add(
                AuditLog(
                    actor_user_id=user.id,
                    action=AuditActionEnum.CREATE,
                    entity_name="employee",
                    entity_id=str(employee.id),
                    description="Employee registered from an approved admission request.",
                    details_json=json.dumps(
                        {
                            "request_id": request_item.id,
                            "employee_id": employee.id,
                            "employee_code": employee.employee_code,
                            "full_name": employee.full_name,
                        }
                    ),
                    ip_address="127.0.0.1",
                    created_at=datetime.now(UTC),
                )
            )
    db.commit()

    loaded_item = db.scalar(
        select(AdmissionRequest)
        .options(
            selectinload(AdmissionRequest.created_by_user),
            selectinload(AdmissionRequest.recruiter_user),
            selectinload(AdmissionRequest.hired_employees).selectinload(Employee.department),
            selectinload(AdmissionRequest.hired_employees).selectinload(Employee.job_title),
        )
        .where(AdmissionRequest.id == request_id)
    )
    if loaded_item is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Admission request was updated but could not be loaded")

    return _serialize_admission_request(loaded_item)


@router.post("/hr/admission-requests/{request_id}/finalize", response_model=AdmissionRequestResponse)
def finalize_admin_admission_request(
    request_id: int,
    user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AdmissionRequestResponse:
    _require_recruiter_access(user)

    request_item = db.scalar(
        select(AdmissionRequest)
        .options(
            selectinload(AdmissionRequest.created_by_user),
            selectinload(AdmissionRequest.recruiter_user),
            selectinload(AdmissionRequest.hired_employees).selectinload(Employee.department),
            selectinload(AdmissionRequest.hired_employees).selectinload(Employee.job_title),
        )
        .where(AdmissionRequest.id == request_id)
    )
    if request_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admission request not found")

    if not _can_user_view_admission_request(user, request_item):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admission request not found")

    if request_item.status == AdmissionRequestStatusEnum.FINALIZED:
        if request_item.finalized_at is None:
            request_item.finalized_at = request_item.updated_at or datetime.now(UTC)
            db.commit()
            db.refresh(request_item)
        return _serialize_admission_request(request_item)

    if request_item.status != AdmissionRequestStatusEnum.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only approved admission requests can be finalized",
        )

    hired_employee_count = len(request_item.hired_employees)
    if hired_employee_count < request_item.quantity_people:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="All positions must be filled before finalizing the admission request",
        )

    finalized_at = datetime.now(UTC)
    request_item.status = AdmissionRequestStatusEnum.FINALIZED
    request_item.finalized_at = finalized_at
    db.add(
        AuditLog(
            actor_user_id=user.id,
            action=AuditActionEnum.UPDATE,
            entity_name="admission_request",
            entity_id=str(request_item.id),
            description="Admission request finalized from administrative portal.",
            details_json=json.dumps(
                {
                    "request_id": request_item.id,
                    "final_status": request_item.status.value,
                    "hired_employee_count": hired_employee_count,
                    "finalized_at": finalized_at.isoformat(),
                }
            ),
            ip_address="127.0.0.1",
            created_at=finalized_at,
        )
    )
    db.commit()

    loaded_item = db.scalar(
        select(AdmissionRequest)
        .options(
            selectinload(AdmissionRequest.created_by_user),
            selectinload(AdmissionRequest.recruiter_user),
            selectinload(AdmissionRequest.hired_employees).selectinload(Employee.department),
            selectinload(AdmissionRequest.hired_employees).selectinload(Employee.job_title),
        )
        .where(AdmissionRequest.id == request_id)
    )
    if loaded_item is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Admission request was finalized but could not be loaded")

    return _serialize_admission_request(loaded_item)


@router.get("/hr/admission-requests/{request_id}/approval-status", response_model=ApprovalQueueItemResponse)
def read_admin_admission_request_approval_status(
    request_id: int,
    user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ApprovalQueueItemResponse:
    _require_recruiter_access(user)

    item = db.scalar(
        select(AdmissionRequest)
        .options(
            selectinload(AdmissionRequest.created_by_user),
            selectinload(AdmissionRequest.recruiter_user),
            selectinload(AdmissionRequest.approval_workflow_template),
            selectinload(AdmissionRequest.approval_steps).selectinload(AdmissionRequestApproval.workflow_step),
            selectinload(AdmissionRequest.approval_steps).selectinload(AdmissionRequestApproval.decided_by_user),
            selectinload(AdmissionRequest.hired_employees).selectinload(Employee.department),
            selectinload(AdmissionRequest.hired_employees).selectinload(Employee.job_title),
        )
        .where(AdmissionRequest.id == request_id)
    )
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admission request not found")

    if not _can_user_view_admission_request(user, item):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admission request not found")

    return _serialize_admission_approval_queue_item(item)


@router.get("/hr/dismissal-requests", response_model=DismissalRequestListResponse)
def read_admin_dismissal_requests(
    _: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DismissalRequestListResponse:
    items = db.scalars(
        select(DismissalRequest)
        .options(selectinload(DismissalRequest.created_by_user))
        .order_by(DismissalRequest.submitted_at.desc().nullslast(), DismissalRequest.created_at.desc())
    ).all()
    return DismissalRequestListResponse(items=[_serialize_dismissal_request(item) for item in items])


@router.get("/hr/dismissal-requests/{request_id}", response_model=DismissalRequestResponse)
def read_admin_dismissal_request_detail(
    request_id: int,
    _: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DismissalRequestResponse:
    item = db.scalar(
        select(DismissalRequest)
        .options(selectinload(DismissalRequest.created_by_user))
        .where(DismissalRequest.id == request_id)
    )
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dismissal request not found")

    return _serialize_dismissal_request(item)


@router.get("/hr/dismissal-requests/{request_id}/approval-status", response_model=ApprovalQueueItemResponse)
def read_admin_dismissal_request_approval_status(
    request_id: int,
    _: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ApprovalQueueItemResponse:
    item = db.scalar(
        select(DismissalRequest)
        .options(
            selectinload(DismissalRequest.created_by_user),
            selectinload(DismissalRequest.approval_workflow_template),
            selectinload(DismissalRequest.approval_steps).selectinload(DismissalRequestApproval.workflow_step),
            selectinload(DismissalRequest.approval_steps).selectinload(DismissalRequestApproval.decided_by_user),
        )
        .where(DismissalRequest.id == request_id)
    )
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dismissal request not found")

    return _serialize_dismissal_approval_queue_item(item)


@router.post("/hr/dismissal-requests/{request_id}/reject", response_model=DismissalRequestResponse)
def reject_admin_dismissal_request_after_approval(
    request_id: int,
    payload: ApprovalActionRequest,
    user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DismissalRequestResponse:
    item = db.scalar(
        select(DismissalRequest)
        .options(selectinload(DismissalRequest.created_by_user))
        .where(DismissalRequest.id == request_id)
    )
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dismissal request not found")

    if item.status != DismissalRequestStatusEnum.APPROVED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only approved dismissal requests can be rejected after approval")

    comments = payload.comments.strip() if payload.comments else None
    if not comments:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rejection reason is required after approval")

    item.status = DismissalRequestStatusEnum.REJECTED
    db.add(
        AuditLog(
            actor_user_id=user.id,
            action=AuditActionEnum.UPDATE,
            entity_name="dismissal_request",
            entity_id=str(item.id),
            description="Dismissal request rejected after approval due to an operational impediment.",
            details_json=json.dumps(
                {
                    "request_id": item.id,
                    "status": item.status.value,
                    "comments": comments,
                }
            ),
            ip_address="127.0.0.1",
            created_at=datetime.now(UTC),
        )
    )
    db.commit()
    db.refresh(item)
    return _serialize_dismissal_request(item)


@router.post("/hr/dismissal-requests", response_model=DismissalRequestResponse, status_code=status.HTTP_201_CREATED)
def create_admin_dismissal_request(
    payload: DismissalRequestCreateRequest,
    user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DismissalRequestResponse:
    workflow = _get_standard_approval_workflow(db)
    employee_name = payload.employee_name.strip()
    cargo = payload.cargo.strip()
    departamento = payload.departamento.strip()
    rehire_justification = payload.rehire_justification.strip() if payload.rehire_justification else None
    reminder = None

    if payload.has_replacement:
        reminder = (
            "Caso seja substituição de funcionário, informe ao gestor que ele deve solicitar a demissão do substituído."
        )

    if not payload.can_be_rehired and not rehire_justification:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Justification is required when the employee cannot be rehired")

    dismissal_request = DismissalRequest(
        status=DismissalRequestStatusEnum.PENDING,
        employee_name=employee_name,
        cargo=cargo,
        departamento=departamento,
        dismissal_type=payload.dismissal_type,
        has_replacement=payload.has_replacement,
        can_be_rehired=payload.can_be_rehired,
        rehire_justification=rehire_justification,
        estimated_termination_date=payload.estimated_termination_date,
        contract_regime=payload.contract_regime,
        manager_reminder=reminder,
        created_by_user_id=user.id,
        submitted_at=datetime.now(UTC),
        approval_workflow_template_id=workflow.id,
    )

    db.add(dismissal_request)
    db.flush()
    _seed_dismissal_approval_steps(db, dismissal_request, workflow)
    db.add(
        AuditLog(
            actor_user_id=user.id,
            action=AuditActionEnum.CREATE,
            entity_name="dismissal_request",
            entity_id=str(dismissal_request.id),
            description="Dismissal request created from administrative portal.",
            details_json=json.dumps(
                {
                    "request_id": dismissal_request.id,
                    "employee_name": dismissal_request.employee_name,
                    "dismissal_type": dismissal_request.dismissal_type.value,
                    "has_replacement": dismissal_request.has_replacement,
                    "can_be_rehired": dismissal_request.can_be_rehired,
                }
            ),
            ip_address="127.0.0.1",
            created_at=datetime.now(UTC),
        )
    )
    db.commit()
    db.refresh(dismissal_request)

    loaded_item = db.scalar(
        select(DismissalRequest)
        .options(selectinload(DismissalRequest.created_by_user))
        .where(DismissalRequest.id == dismissal_request.id)
    )
    if loaded_item is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Dismissal request was created but could not be loaded")

    return _serialize_dismissal_request(loaded_item)


@router.patch("/departments/{department_id}", response_model=DepartmentManagementItemResponse)
def update_admin_department(
    department_id: int,
    payload: DepartmentUpdateRequest,
    user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DepartmentManagementItemResponse:
    department = db.scalar(select(Department).where(Department.id == department_id))
    if department is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

    normalized_code = payload.code.strip().upper()
    normalized_name = payload.name.strip()
    duplicate = db.scalar(
        select(Department)
        .where(Department.id != department_id)
        .where((func.lower(Department.name) == normalized_name.lower()) | (Department.code == normalized_code))
    )
    if duplicate is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Department code or name already exists")

    department.code = normalized_code
    department.name = normalized_name
    department.description = payload.description.strip() if payload.description else None
    department.total_people = payload.total_people
    department.is_active = payload.is_active
    db.add(
        AuditLog(
            actor_user_id=user.id,
            action=AuditActionEnum.UPDATE,
            entity_name="department",
            entity_id=str(department.id),
            description="Department updated from administrative portal.",
            details_json=json.dumps({"department_id": department.id}),
            ip_address="127.0.0.1",
            created_at=datetime.now(UTC),
        )
    )
    db.commit()
    db.refresh(department)
    return _serialize_department(department)


@router.patch("/job-titles/{job_title_id}", response_model=JobTitleManagementItemResponse)
def update_admin_job_title(
    job_title_id: int,
    payload: JobTitleUpdateRequest,
    user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> JobTitleManagementItemResponse:
    job_title = db.scalar(select(JobTitle).where(JobTitle.id == job_title_id))
    if job_title is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job title not found")

    normalized_code = payload.code.strip().upper()
    normalized_name = payload.name.strip()
    duplicate = db.scalar(
        select(JobTitle)
        .where(JobTitle.id != job_title_id)
        .where((func.lower(JobTitle.name) == normalized_name.lower()) | (JobTitle.code == normalized_code))
    )
    if duplicate is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Job title code or name already exists")

    job_title.code = normalized_code
    job_title.name = normalized_name
    job_title.description = payload.description.strip() if payload.description else None
    job_title.is_active = payload.is_active
    db.add(
        AuditLog(
            actor_user_id=user.id,
            action=AuditActionEnum.UPDATE,
            entity_name="job_title",
            entity_id=str(job_title.id),
            description="Job title updated from administrative portal.",
            details_json=json.dumps({"job_title_id": job_title.id}),
            ip_address="127.0.0.1",
            created_at=datetime.now(UTC),
        )
    )
    db.commit()
    db.refresh(job_title)
    return _serialize_job_title(job_title)


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
            selectinload(Campaign.survey_version).selectinload(SurveyVersion.survey).selectinload(Survey.dimensions),
            selectinload(Campaign.survey_version)
            .selectinload(SurveyVersion.questions)
            .selectinload(SurveyQuestion.options),
            selectinload(Campaign.responses)
            .selectinload(Response.campaign_audience),
            selectinload(Campaign.responses)
            .selectinload(Response.employee)
            .selectinload(Employee.department),
            selectinload(Campaign.responses)
            .selectinload(Response.employee)
            .selectinload(Employee.job_title),
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

    departments = db.scalars(select(Department).order_by(Department.name.asc(), Department.id.asc())).all()
    responses = sorted(campaign.responses, key=lambda item: item.started_at, reverse=True)
    submitted_responses = sum(1 for item in responses if item.status == ResponseStatusEnum.SUBMITTED)
    draft_responses = sum(1 for item in responses if item.status == ResponseStatusEnum.DRAFT)
    department_progress = _build_department_progress(departments, responses)
    target_population = sum(item.total_people for item in department_progress)

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
        dimensions=[
            _serialize_dimension(dimension)
            for dimension in sorted(campaign.survey_version.survey.dimensions, key=lambda item: item.display_order)
        ],
        summary=CampaignResponsesSummaryResponse(
            audience_count=target_population,
            total_responses=len(responses),
            submitted_responses=submitted_responses,
            draft_responses=draft_responses,
        ),
        department_progress=department_progress,
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
        score_weight=payload.score_weight if payload.question_type == QuestionTypeEnum.SCALE_1_5 else 1,
        is_negative=payload.is_negative if payload.question_type == QuestionTypeEnum.SCALE_1_5 else False,
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
    question.score_weight = payload.score_weight if payload.question_type == QuestionTypeEnum.SCALE_1_5 else 1
    question.is_negative = payload.is_negative if payload.question_type == QuestionTypeEnum.SCALE_1_5 else False
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

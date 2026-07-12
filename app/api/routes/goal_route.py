from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from uuid import UUID
from decimal import Decimal
import logging

from app.database import get_db
from app.models.user import User
from app.api.dependencies.auth import get_current_user
from app.services.goal_service import GoalService
from app.schemas.goal import (
    GoalCreate, GoalUpdate, GoalResponse, GoalProgressResponse,
    GoalTopUpRequest, GoalStatsResponse
)
from app.models.goals import GoalStatus

router = APIRouter(prefix="/goals", tags=["goals"])
logger = logging.getLogger(__name__)

@router.post("", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
def create_goal(
    data: GoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new savings goal."""
    try:
        service = GoalService(db)
        return service.create_goal(data, current_user.user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to create goal: {e}")
        raise HTTPException(status_code=500, detail="Failed to create goal")

@router.get("", response_model=list[GoalResponse])
def get_goals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all goals for the current user."""
    try:
        service = GoalService(db)
        return service.get_goals(current_user.user_id)
    except Exception as e:
        logger.error(f"Failed to fetch goals: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch goals")

@router.get("/{goal_id}", response_model=GoalResponse)
def get_goal(
    goal_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific goal by ID."""
    service = GoalService(db)
    goal = service.get_goal(goal_id, current_user.user_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal

@router.get("/{goal_id}/progress", response_model=GoalProgressResponse)
def get_goal_progress(
    goal_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get progress details for a specific goal."""
    service = GoalService(db)
    progress = service.get_goal_progress(goal_id, current_user.user_id)
    if not progress:
        raise HTTPException(status_code=404, detail="Goal not found")
    return progress

@router.put("/{goal_id}", response_model=GoalResponse)
def update_goal(
    goal_id: UUID,
    data: GoalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing goal."""
    try:
        service = GoalService(db)
        goal = service.update_goal(goal_id, current_user.user_id, data)
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        return goal
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to update goal: {e}")
        raise HTTPException(status_code=500, detail="Failed to update goal")

@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(
    goal_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Soft delete a goal."""
    service = GoalService(db)
    if not service.delete_goal(goal_id, current_user.user_id):
        raise HTTPException(status_code=404, detail="Goal not found")

@router.post("/{goal_id}/topup", response_model=GoalResponse)
def topup_goal(
    goal_id: UUID,
    data: GoalTopUpRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Contribute funds to a goal."""
    try:
        service = GoalService(db)
        return service.contribute_to_goal(goal_id, current_user.user_id, data.amount)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to top up goal: {e}")
        raise HTTPException(status_code=500, detail="Failed to top up goal")

@router.get("/progress/all", response_model=list[GoalProgressResponse])
def get_all_goals_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get progress for all active goals."""
    try:
        service = GoalService(db)
        return service.get_all_goals_progress(current_user.user_id)
    except Exception as e:
        logger.error(f"Failed to fetch goals progress: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch goals progress")

@router.get("/stats/achievement-rate", response_model=GoalStatsResponse)
def get_goal_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive goal statistics."""
    try:
        service = GoalService(db)
        return service.get_goal_stats(current_user.user_id)
    except Exception as e:
        logger.error(f"Failed to fetch goal stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch goal stats")
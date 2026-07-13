from sqlalchemy.orm import Session
from sqlalchemy import func, and_, case
from datetime import datetime, timedelta, timezone
from uuid import UUID
from decimal import Decimal
from typing import List, Optional
import logging
import time

from app.models.transaction import Transaction, TransactionType
from app.models.category import Category
from app.models.merchant import Merchant
from app.models.goals import Goal, GoalStatus
from app.schemas.analytics import (
    SpendingByCategoryResponse, CategorySpending,
    SpendingByMerchantResponse, MerchantSpending,
    IncomeExpenseTrendResponse, TrendDataPoint,
    SavingsRateResponse, GoalsAchievedResponse
)

logger = logging.getLogger(__name__)

class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db
        self._cache = {}
        self._cache_ttl = {}
    
    def _get_cached(self, key: str, ttl_minutes: int = 10):
        """Get value from cache if not expired."""
        if key in self._cache and key in self._cache_ttl:
            if datetime.now(timezone.utc) < self._cache_ttl[key]:
                logger.debug(f"cache_hit", extra={"key": key})
                return self._cache[key]
            else:
                # Clean up expired cache
                del self._cache[key]
                del self._cache_ttl[key]
        logger.debug(f"cache_miss", extra={"key": key})
        return None
    
    def _set_cached(self, key: str, value, ttl_minutes: int = 10):
        """Set value in cache with expiration."""
        self._cache[key] = value
        self._cache_ttl[key] = datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes)

    def _get_period_dates(self, period: str) -> tuple[datetime, datetime]:
        """Get start and end dates for the given period."""
        now = datetime.now(timezone.utc)
        
        if period == "daily":
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end = start + timedelta(days=1)
        elif period == "weekly":
            start = now - timedelta(days=now.weekday())
            start = start.replace(hour=0, minute=0, second=0, microsecond=0)
            end = start + timedelta(days=7)
        elif period == "yearly":
            start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
            end = start.replace(year=start.year + 1)
        else:  # monthly
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if start.month == 12:
                end = start.replace(year=start.year + 1, month=1)
            else:
                end = start.replace(month=start.month + 1)
        
        return start, end

    def get_spending_by_category(self, user_id: UUID, period: str = "monthly") -> SpendingByCategoryResponse:
        """Get spending breakdown by category."""
        cache_key = f"spending_cat:{user_id}:{period}"
        cached = self._get_cached(cache_key)
        if cached:
            return cached
        
        start_time = time.time()
        start_date, end_date = self._get_period_dates(period)
        
        # Query expenses grouped by category
        results = (
            self.db.query(
                Category.category_id,
                Category.name,
                func.sum(Transaction.amount).label('total')
            )
            .join(Transaction, Transaction.category_id == Category.category_id)
            .filter(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.type == TransactionType.EXPENSE,
                    Transaction.transaction_date >= start_date,
                    Transaction.transaction_date < end_date
                )
            )
            .group_by(Category.category_id, Category.name)
            .order_by(func.sum(Transaction.amount).desc())
            .all()
        )
        
        total_spent = sum(r.total for r in results) if results else Decimal('0')
        
        categories = [
            CategorySpending(
                category_id=str(r.category_id),
                category_name=r.name,
                total_spent=r.total,
                percentage=float((r.total / total_spent * 100) if total_spent > 0 else 0)
            )
            for r in results
        ]
        
        result = SpendingByCategoryResponse(
            period=period,
            start_date=start_date,
            end_date=end_date,
            categories=categories,
            total_spent=total_spent
        )
        
        query_time = (time.time() - start_time) * 1000
        logger.info(
            "spending_by_category_computed",
            extra={
                "user_id": str(user_id),
                "period": period,
                "categories_count": len(categories),
                "total_spent": str(total_spent),
                "query_time_ms": round(query_time, 2)
            }
        )
        
        self._set_cached(cache_key, result)
        return result

    def get_spending_by_merchant(self, user_id: UUID, period: str = "monthly") -> SpendingByMerchantResponse:
        """Get spending breakdown by merchant."""
        cache_key = f"spending_merchant:{user_id}:{period}"
        cached = self._get_cached(cache_key)
        if cached:
            return cached
        
        start_time = time.time()
        start_date, end_date = self._get_period_dates(period)
        
        # Query expenses grouped by merchant
        results = (
            self.db.query(
                Merchant.merchant_id,
                Merchant.merchant_name,
                func.sum(Transaction.amount).label('total'),
                func.count(Transaction.transaction_id).label('count')
            )
            .join(Transaction, Transaction.merchant_id == Merchant.merchant_id)
            .filter(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.type == TransactionType.EXPENSE,
                    Transaction.transaction_date >= start_date,
                    Transaction.transaction_date < end_date
                )
            )
            .group_by(Merchant.merchant_id, Merchant.merchant_name)
            .order_by(func.sum(Transaction.amount).desc())
            .all()
        )
        
        total_spent = sum(r.total for r in results) if results else Decimal('0')
        
        merchants = [
            MerchantSpending(
                merchant_id=str(r.merchant_id) if r.merchant_id else None,
                merchant_name=r.merchant_name,
                total_spent=r.total,
                transaction_count=r.count,
                percentage=float((r.total / total_spent * 100) if total_spent > 0 else 0)
            )
            for r in results
        ]
        
        result = SpendingByMerchantResponse(
            period=period,
            start_date=start_date,
            end_date=end_date,
            merchants=merchants,
            total_spent=total_spent
        )
        
        query_time = (time.time() - start_time) * 1000
        logger.info(
            "spending_by_merchant_computed",
            extra={
                "user_id": str(user_id),
                "period": period,
                "merchants_count": len(merchants),
                "total_spent": str(total_spent),
                "query_time_ms": round(query_time, 2)
            }
        )
        
        self._set_cached(cache_key, result)
        return result

    def get_income_expense_trend(self, user_id: UUID, period: str = "monthly") -> IncomeExpenseTrendResponse:
        """Get income vs expenses trend over time."""
        cache_key = f"trend:{user_id}:{period}"
        cached = self._get_cached(cache_key)
        if cached:
            return cached
        
        start_time = time.time()
        start_date, end_date = self._get_period_dates(period)
        
        # Determine grouping based on period - FIXED: Actually use different groupings
        if period == "daily":
            date_trunc = func.date(Transaction.transaction_date)
        elif period == "weekly":
            # Group by week using date_trunc (PostgreSQL)
            date_trunc = func.date_trunc('week', Transaction.transaction_date)
        elif period == "yearly":
            # Group by year
            date_trunc = func.date_trunc('year', Transaction.transaction_date)
        else:  # monthly
            # Group by month
            date_trunc = func.date_trunc('month', Transaction.transaction_date)
        
        # Get aggregates grouped by date period
        results = (
            self.db.query(
                date_trunc.label('date'),
                Transaction.type,
                func.sum(Transaction.amount).label('total')
            )
            .filter(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.type.in_([TransactionType.INCOME, TransactionType.EXPENSE]),
                    Transaction.transaction_date >= start_date,
                    Transaction.transaction_date < end_date
                )
            )
            .group_by(date_trunc, Transaction.type)
            .order_by(date_trunc)
            .all()
        )
        
        # Organize data by date
        data_dict = {}
        for r in results:
            date_str = str(r.date)
            if date_str not in data_dict:
                data_dict[date_str] = {'income': Decimal('0'), 'expenses': Decimal('0')}
            
            if r.type == TransactionType.INCOME:
                data_dict[date_str]['income'] = r.total
            else:
                data_dict[date_str]['expenses'] = r.total
        
        data_points = [
            TrendDataPoint(
                date=date,
                income=vals['income'],
                expenses=vals['expenses'],
                net=vals['income'] - vals['expenses']
            )
            for date, vals in sorted(data_dict.items())
        ]
        
        total_income = sum(dp.income for dp in data_points)
        total_expenses = sum(dp.expenses for dp in data_points)
        
        result = IncomeExpenseTrendResponse(
            period=period,
            data_points=data_points,
            total_income=total_income,
            total_expenses=total_expenses,
            net_change=total_income - total_expenses
        )
        
        query_time = (time.time() - start_time) * 1000
        logger.info(
            "income_expense_trend_computed",
            extra={
                "user_id": str(user_id),
                "period": period,
                "data_points_count": len(data_points),
                "total_income": str(total_income),
                "total_expenses": str(total_expenses),
                "query_time_ms": round(query_time, 2)
            }
        )
        
        self._set_cached(cache_key, result)
        return result

    def get_savings_rate(self, user_id: UUID, period: str = "monthly") -> SavingsRateResponse:
        """Calculate savings rate (savings as percentage of income)."""
        cache_key = f"savings_rate:{user_id}:{period}"
        cached = self._get_cached(cache_key)
        if cached:
            return cached
        
        start_time = time.time()
        start_date, end_date = self._get_period_dates(period)
        
        # OPTIMIZED: Single query instead of two separate queries
        result = (
            self.db.query(
                func.coalesce(
                    func.sum(
                        case(
                            (Transaction.type == TransactionType.INCOME, Transaction.amount),
                            else_=0
                        )
                    ), 0
                ).label('income'),
                func.coalesce(
                    func.sum(
                        case(
                            (Transaction.type == TransactionType.SAVINGS, Transaction.amount),
                            else_=0
                        )
                    ), 0
                ).label('savings')
            )
            .filter(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.type.in_([TransactionType.INCOME, TransactionType.SAVINGS]),
                    Transaction.transaction_date >= start_date,
                    Transaction.transaction_date < end_date
                )
            )
            .first()
        )
        
        income = Decimal(str(result.income))
        savings = Decimal(str(result.savings))
        savings_rate = float((savings / income * 100) if income > 0 else 0)
        
        response = SavingsRateResponse(
            period=period,
            total_income=income,
            total_savings=savings,
            savings_rate=savings_rate
        )
        
        query_time = (time.time() - start_time) * 1000
        logger.info(
            "savings_rate_computed",
            extra={
                "user_id": str(user_id),
                "period": period,
                "total_income": str(income),
                "total_savings": str(savings),
                "savings_rate": savings_rate,
                "query_time_ms": round(query_time, 2)
            }
        )
        
        self._set_cached(cache_key, response)
        return response

    def get_goals_achieved(self, user_id: UUID, period: str = "monthly") -> GoalsAchievedResponse:
        """Get goals achievement statistics."""
        cache_key = f"goals_achieved:{user_id}:{period}"
        cached = self._get_cached(cache_key)
        if cached:
            return cached
        
        start_time = time.time()
        start_date, end_date = self._get_period_dates(period)
        
        # OPTIMIZED: Single query instead of three separate queries
        result = (
            self.db.query(
                func.count(Goal.goal_id).label('total_goals'),
                func.count(
                    case(
                        (
                            and_(
                                Goal.status == GoalStatus.COMPLETED,
                                Goal.completed_date >= start_date,
                                Goal.completed_date < end_date
                            ),
                            Goal.goal_id
                        ),
                        else_=None
                    )
                ).label('completed_goals'),
                func.coalesce(
                    func.sum(
                        case(
                            (
                                and_(
                                    Goal.status == GoalStatus.COMPLETED,
                                    Goal.completed_date >= start_date,
                                    Goal.completed_date < end_date
                                ),
                                Goal.target_amount
                            ),
                            else_=0
                        )
                    ), 0
                ).label('total_amount')
            )
            .filter(
                and_(
                    Goal.user_id == user_id,
                    Goal.is_deleted == False
                )
            )
            .first()
        )
        
        total_goals = result.total_goals
        completed_goals = result.completed_goals
        total_amount = Decimal(str(result.total_amount))
        completion_rate = float((completed_goals / total_goals * 100) if total_goals > 0 else 0)
        
        response = GoalsAchievedResponse(
            period=period,
            total_goals=total_goals,
            completed_goals=completed_goals,
            completion_rate=completion_rate,
            total_amount_achieved=total_amount
        )
        
        query_time = (time.time() - start_time) * 1000
        logger.info(
            "goals_achieved_computed",
            extra={
                "user_id": str(user_id),
                "period": period,
                "total_goals": total_goals,
                "completed_goals": completed_goals,
                "completion_rate": completion_rate,
                "query_time_ms": round(query_time, 2)
            }
        )
        
        self._set_cached(cache_key, response)
        return response
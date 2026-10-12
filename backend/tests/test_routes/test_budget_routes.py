"""
Budget Route Integration Tests
Requires: conftest.py with client, auth_headers, test_user, db_session fixtures.
Run with: pytest tests/test_routes/test_budget_routes.py -v -m integration
"""
import pytest
import uuid
from decimal import Decimal
from datetime import datetime, timezone, timedelta

from app.models.budget import Budget, BudgetPeriod, BillRecurrence, BillStatus
from app.models.category import Category

BASE = "/api/v1/budgets"


# ─── Fixtures ────────────────────────────────────────────────────────────────

@pytest.fixture
def test_category(db_session, test_user):
    category = Category(
        category_id=uuid.uuid4(),
        user_id=test_user.user_id,
        name="Food",
        type="expense",
        is_active=True,
        display_order=1,
        parent_id=None,
    )
    db_session.add(category)
    db_session.commit()
    db_session.refresh(category)
    return category


@pytest.fixture
def test_budget(db_session, test_user, test_category):
    budget = Budget(
        budget_id=uuid.uuid4(),
        user_id=test_user.user_id,
        category_id=test_category.category_id,
        amount=Decimal("5000.00"),
        period=BudgetPeriod.MONTHLY,
        start_date=datetime.now(timezone.utc).replace(day=1),
        end_date=datetime.now(timezone.utc) + timedelta(days=30),
        is_bill=False,
    )
    db_session.add(budget)
    db_session.commit()
    db_session.refresh(budget)
    return budget


@pytest.fixture
def test_bill(db_session, test_user, test_category):
    bill = Budget(
        budget_id=uuid.uuid4(),
        user_id=test_user.user_id,
        category_id=test_category.category_id,
        amount=Decimal("2500.00"),
        period=BudgetPeriod.MONTHLY,
        start_date=datetime.now(timezone.utc).replace(day=1),
        end_date=datetime.now(timezone.utc) + timedelta(days=30),
        is_bill=True,
        bill_name="Netflix",
        due_date=datetime.now(timezone.utc) + timedelta(days=5),
        recurrence=BillRecurrence.MONTHLY,
        bill_status=BillStatus.PENDING,
    )
    db_session.add(bill)
    db_session.commit()
    db_session.refresh(bill)
    return bill


@pytest.fixture
def test_parent_category(db_session, test_user):
    category = Category(
        category_id=uuid.uuid4(),
        user_id=test_user.user_id,
        name="The Essentials",
        type="expense",
        is_active=True,
        display_order=1,
        parent_id=None,
    )
    db_session.add(category)
    db_session.commit()
    db_session.refresh(category)
    return category


# ══════════════════════════════════════════════════════════════════════════════
# POST /budgets
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.integration
class TestCreateBudget:

    def test_create_budget_success(self, client, auth_headers, test_category):
        response = client.post(BASE, json={
            "category_id": str(test_category.category_id),
            "amount": "5000.00",
            "period": "monthly",
            "start_date": datetime.now(timezone.utc).replace(day=1).isoformat(),
            "end_date": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
            "is_bill": False,
        }, headers=auth_headers)
        assert response.status_code == 201
        data = response.json()
        assert data["amount"] == "5000.00"
        assert data["is_bill"] is False
        assert data["category_id"] == str(test_category.category_id)

    def test_create_bill_success(self, client, auth_headers, test_category):
        response = client.post(BASE, json={
            "category_id": str(test_category.category_id),
            "amount": "2500.00",
            "period": "monthly",
            "start_date": datetime.now(timezone.utc).replace(day=1).isoformat(),
            "end_date": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
            "is_bill": True,
            "bill_name": "Netflix",
            "due_date": (datetime.now(timezone.utc) + timedelta(days=5)).isoformat(),
            "recurrence": "monthly",
        }, headers=auth_headers)
        assert response.status_code == 201
        data = response.json()
        assert data["is_bill"] is True
        assert data["bill_name"] == "Netflix"
        assert data["bill_status"] == "pending"

    def test_create_bill_missing_bill_name(self, client, auth_headers, test_category):
        response = client.post(BASE, json={
            "category_id": str(test_category.category_id),
            "amount": "2500.00",
            "period": "monthly",
            "start_date": datetime.now(timezone.utc).replace(day=1).isoformat(),
            "end_date": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
            "is_bill": True,
            "due_date": (datetime.now(timezone.utc) + timedelta(days=5)).isoformat(),
            "recurrence": "monthly",
        }, headers=auth_headers)
        assert response.status_code == 422

    def test_create_budget_invalid_category(self, client, auth_headers):
        response = client.post(BASE, json={
            "category_id": str(uuid.uuid4()),
            "amount": "5000.00",
            "period": "monthly",
            "start_date": datetime.now(timezone.utc).replace(day=1).isoformat(),
            "end_date": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
            "is_bill": False,
        }, headers=auth_headers)
        assert response.status_code == 404

    def test_create_duplicate_budget(self, client, auth_headers, test_category, test_budget):
        response = client.post(BASE, json={
            "category_id": str(test_category.category_id),
            "amount": "3000.00",
            "period": "monthly",
            "start_date": datetime.now(timezone.utc).replace(day=1).isoformat(),
            "end_date": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
            "is_bill": False,
        }, headers=auth_headers)
        assert response.status_code == 409

    def test_create_budget_unauthenticated(self, client, test_category):
        response = client.post(BASE, json={
            "category_id": str(test_category.category_id),
            "amount": "5000.00",
            "period": "monthly",
            "start_date": datetime.now(timezone.utc).replace(day=1).isoformat(),
            "end_date": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
            "is_bill": False,
        })
        assert response.status_code == 401


# ══════════════════════════════════════════════════════════════════════════════
# GET /budgets
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.integration
class TestGetBudgets:

    def test_get_all_budgets(self, client, auth_headers, test_budget):
        response = client.get(BASE, headers=auth_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        assert len(response.json()) >= 1

    def test_filter_by_period(self, client, auth_headers, test_budget):
        response = client.get(f"{BASE}?period=monthly", headers=auth_headers)
        assert response.status_code == 200
        for b in response.json():
            assert b["period"] == "monthly"

    def test_filter_bills_only(self, client, auth_headers, test_budget, test_bill):
        response = client.get(f"{BASE}?is_bill=true", headers=auth_headers)
        assert response.status_code == 200
        for b in response.json():
            assert b["is_bill"] is True

    def test_filter_budgets_only(self, client, auth_headers, test_budget, test_bill):
        response = client.get(f"{BASE}?is_bill=false", headers=auth_headers)
        assert response.status_code == 200
        for b in response.json():
            assert b["is_bill"] is False

    def test_unauthenticated(self, client):
        response = client.get(BASE)
        assert response.status_code == 401


# ══════════════════════════════════════════════════════════════════════════════
# GET /budgets/{budget_id}
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.integration
class TestGetBudget:

    def test_get_single_budget(self, client, auth_headers, test_budget):
        response = client.get(f"{BASE}/{test_budget.budget_id}", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["budget_id"] == str(test_budget.budget_id)

    def test_get_nonexistent_budget(self, client, auth_headers):
        response = client.get(f"{BASE}/{uuid.uuid4()}", headers=auth_headers)
        assert response.status_code == 404

    def test_cannot_access_other_users_budget(self, client, auth_headers, db_session, test_category):
        other_budget = Budget(
            budget_id=uuid.uuid4(),
            user_id=uuid.uuid4(),  # different user
            category_id=test_category.category_id,
            amount=Decimal("1000.00"),
            period=BudgetPeriod.MONTHLY,
            start_date=datetime.now(timezone.utc),
            end_date=datetime.now(timezone.utc) + timedelta(days=30),
            is_bill=False,
        )
        db_session.add(other_budget)
        db_session.commit()
        response = client.get(f"{BASE}/{other_budget.budget_id}", headers=auth_headers)
        assert response.status_code == 404


# ══════════════════════════════════════════════════════════════════════════════
# PUT /budgets/{budget_id}
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.integration
class TestUpdateBudget:

    def test_update_amount(self, client, auth_headers, test_budget):
        response = client.put(f"{BASE}/{test_budget.budget_id}", json={
            "amount": "8000.00"
        }, headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["amount"] == "8000.00"

    def test_mark_bill_paid_advances_cycle(self, client, auth_headers, test_bill):
        original_due = test_bill.due_date
        response = client.put(f"{BASE}/{test_bill.budget_id}", json={
            "status": "paid"
        }, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["bill_status"] == "pending"
        new_due = datetime.fromisoformat(data["due_date"])
        assert new_due > original_due

    def test_update_nonexistent_budget(self, client, auth_headers):
        response = client.put(f"{BASE}/{uuid.uuid4()}", json={
            "amount": "8000.00"
        }, headers=auth_headers)
        assert response.status_code == 404

    def test_unauthenticated(self, client, test_budget):
        response = client.put(f"{BASE}/{test_budget.budget_id}", json={
            "amount": "8000.00"
        })
        assert response.status_code == 401


# ══════════════════════════════════════════════════════════════════════════════
# DELETE /budgets/{budget_id}
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.integration
class TestDeleteBudget:

    def test_delete_budget(self, client, auth_headers, test_budget):
        response = client.delete(f"{BASE}/{test_budget.budget_id}", headers=auth_headers)
        assert response.status_code == 204
        get_response = client.get(f"{BASE}/{test_budget.budget_id}", headers=auth_headers)
        assert get_response.status_code == 404

    def test_delete_nonexistent_budget(self, client, auth_headers):
        response = client.delete(f"{BASE}/{uuid.uuid4()}", headers=auth_headers)
        assert response.status_code == 404

    def test_unauthenticated(self, client, test_budget):
        response = client.delete(f"{BASE}/{test_budget.budget_id}")
        assert response.status_code == 401


# ══════════════════════════════════════════════════════════════════════════════
# GET /budgets/progress
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.integration
class TestBudgetProgress:

    def test_get_progress(self, client, auth_headers, test_user, db_session):
        test_user.spending_limit = Decimal("10000.00")
        db_session.commit()
        response = client.get(f"{BASE}/progress?period=monthly", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "spending_limit" in data
        assert "spent" in data
        assert "remaining" in data
        assert "percentage" in data
        assert data["status"] in ("on_track", "warning", "exceeded")

    # def test_missing_period_param(self, client, auth_headers):
    #     response = client.get(f"{BASE}/progress", headers=auth_headers)
    #     assert response.status_code == 422

    def test_unauthenticated(self, client):
        response = client.get(f"{BASE}/progress?period=monthly")
        assert response.status_code == 401


# ══════════════════════════════════════════════════════════════════════════════
# GET /budgets/summary
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.integration
class TestBudgetSummary:

    def test_get_summary_structure(self, client, auth_headers, db_session, test_user, test_parent_category):
        # Add child category and budget
        child = Category(
            category_id=uuid.uuid4(),
            user_id=test_user.user_id,
            name="Food",
            type="expense",
            is_active=True,
            display_order=1,
            parent_id=test_parent_category.category_id,
        )
        db_session.add(child)
        budget = Budget(
            budget_id=uuid.uuid4(),
            user_id=test_user.user_id,
            category_id=child.category_id,
            amount=Decimal("5000.00"),
            period=BudgetPeriod.MONTHLY,
            start_date=datetime.now(timezone.utc).replace(day=1),
            end_date=datetime.now(timezone.utc) + timedelta(days=30),
            is_bill=False,
        )
        db_session.add(budget)
        db_session.commit()

        response = client.get(f"{BASE}/summary?period=monthly", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "groups" in data
        assert "total_budgeted" in data
        assert "total_spent" in data
        assert "spending_limit" in data
        assert len(data["groups"]) >= 1
        assert len(data["groups"][0]["budgets"]) >= 1

    # def test_missing_period_param(self, client, auth_headers):
    #     response = client.get(f"{BASE}/summary", headers=auth_headers)
    #     assert response.status_code == 422

    def test_unauthenticated(self, client):
        response = client.get(f"{BASE}/summary?period=monthly")
        assert response.status_code == 401


# ══════════════════════════════════════════════════════════════════════════════
# GET /budgets/alerts
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.integration
class TestBudgetAlerts:

    def test_get_alerts_returns_list(self, client, auth_headers):
        response = client.get(f"{BASE}/alerts", headers=auth_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_overdue_bill_in_alerts(self, client, auth_headers, db_session, test_user, test_category):
        from app.models.notification import Notification, NotificationType, NotificationPriority
        
        notif = Notification(
            notification_id=uuid.uuid4(),
            user_id=test_user.user_id,
            type=NotificationType.BILL_REMINDER,
            priority=NotificationPriority.URGENT,
            title="Overdue Bill",
            message="Overdue Bill is overdue by 3 day(s)",
            data={"budget_id": str(uuid.uuid4()), "bill_name": "Overdue Bill", "threshold": "overdue"},
            is_read=False
        )
        db_session.add(notif)
        db_session.commit()
        
        response = client.get(f"{BASE}/alerts", headers=auth_headers)
        assert response.status_code == 200
        assert any(a["alert_type"] == "bill_reminder" for a in response.json())

    # def test_missing_period_param(self, client, auth_headers):
    #     response = client.get(f"{BASE}/alerts", headers=auth_headers)
    #     assert response.status_code == 422

    def test_unauthenticated(self, client):
        response = client.get(f"{BASE}/alerts?period=monthly")
        assert response.status_code == 401


# ══════════════════════════════════════════════════════════════════════════════
# GET + PUT /budgets/spending-limit
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.integration
class TestSpendingLimit:

    def test_get_spending_limit(self, client, auth_headers):
        response = client.get(f"{BASE}/spending-limit", headers=auth_headers)
        assert response.status_code == 200
        assert "spending_limit" in response.json()

    def test_update_spending_limit(self, client, auth_headers):
        response = client.put(f"{BASE}/spending-limit", json={
            "spending_limit": "50000.00"
        }, headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["spending_limit"] == "50000.00"

    def test_update_spending_limit_persists(self, client, auth_headers):
        client.put(f"{BASE}/spending-limit", json={
            "spending_limit": "25000.00"
        }, headers=auth_headers)
        response = client.get(f"{BASE}/spending-limit", headers=auth_headers)
        assert response.json()["spending_limit"] == "25000.00"

    def test_update_negative_spending_limit(self, client, auth_headers):
        response = client.put(f"{BASE}/spending-limit", json={
            "spending_limit": "-100.00"
        }, headers=auth_headers)
        assert response.status_code == 422

    def test_unauthenticated(self, client):
        response = client.get(f"{BASE}/spending-limit")
        assert response.status_code == 401

@pytest.mark.integration
class TestCheckAlerts:
    def test_check_alerts_endpoint(self, client, auth_headers, test_user, db_session):
        test_user.spending_limit = Decimal("1000.00")
        test_user.threshold = 80
        db_session.commit()
        
        response = client.post(f"{BASE}/budget-alerts", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Created 0 new notifications" in data["message"] # 0 because no expenses exist yet

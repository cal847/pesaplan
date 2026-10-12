"""
Category Service Unit Tests - no DB required.
Run with: pytest tests/test_services/test_category_service.py -v
"""
import pytest
import uuid
from unittest.mock import MagicMock, patch

from app.models.category import Category
from app.services.category_service import CategoryService, DEFAULT_CATEGORIES
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryReorderRequest
from app.core.exceptions import (
    CategoryNotFoundException,
    CategoryAlreadyExistsException,
)


# ─── Helpers ────────────────────────────────────────────────────────────────

def make_category(name="Food", type="expense", parent_id=None, display_order=0, is_active=True):
    cat = MagicMock(spec=Category)
    cat.category_id = uuid.uuid4()
    cat.user_id = uuid.uuid4()
    cat.name = name
    cat.type = type
    cat.parent_id = parent_id
    cat.display_order = display_order
    cat.is_active = is_active
    return cat


# ══════════════════════════════════════════════════════════════════════════════
# TestSeedDefaultCategories
# ══════════════════════════════════════════════════════════════════════════════

class TestSeedDefaultCategories:

    def test_seeds_correct_number_of_parents(self):
        db = MagicMock()
        added = []
        db.add.side_effect = lambda x: added.append(x)
        CategoryService.seed_default_categories(db, uuid.uuid4())
        parent_names = [g["name"] for g in DEFAULT_CATEGORIES]
        parents = [c for c in added if isinstance(c, Category) and c.name in parent_names]
        assert len(parents) == len(DEFAULT_CATEGORIES)

    def test_seeds_correct_number_of_children(self):
        db = MagicMock()
        added = []
        db.add.side_effect = lambda x: added.append(x)
        CategoryService.seed_default_categories(db, uuid.uuid4())
        parent_names = [g["name"] for g in DEFAULT_CATEGORIES]
        children = [c for c in added if isinstance(c, Category) and c.name not in parent_names]
        expected = sum(len(g["children"]) for g in DEFAULT_CATEGORIES)
        assert len(children) == expected

    def test_commits_once(self):
        db = MagicMock()
        CategoryService.seed_default_categories(db, uuid.uuid4())
        db.commit.assert_called_once()

    def test_flush_called_per_parent(self):
        db = MagicMock()
        CategoryService.seed_default_categories(db, uuid.uuid4())
        assert db.flush.call_count == len(DEFAULT_CATEGORIES)


# ══════════════════════════════════════════════════════════════════════════════
# TestCreateCategory
# ══════════════════════════════════════════════════════════════════════════════

class TestCreateCategory:

    def _run(self, db, user_id, name="Transport", type="expense", parent_id=None):
        data = CategoryCreate(name=name, type=type, parent_id=parent_id)
        with patch("app.services.category_service.validate_parent"), \
             patch("app.services.category_service.get_next_display_order", return_value=0), \
             patch("app.services.category_service.CategoryResponse.model_validate") as mock_validate:
            mock_validate.return_value = MagicMock()
            return CategoryService.create_category(db, user_id, data)

    def test_creates_successfully(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        result = self._run(db, uuid.uuid4())
        db.add.assert_called_once()
        db.commit.assert_called_once()

    def test_raises_on_duplicate(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = make_category()
        with pytest.raises(CategoryAlreadyExistsException):
            self._run(db, uuid.uuid4())

    def test_validates_parent_when_provided(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        parent_id = uuid.uuid4()
        data = CategoryCreate(name="Fast Food", type="expense", parent_id=parent_id)

        with patch("app.services.category_service.validate_parent") as mock_validate, \
             patch("app.services.category_service.get_next_display_order", return_value=0), \
             patch("app.services.category_service.CategoryResponse.model_validate"):
            CategoryService.create_category(db, uuid.uuid4(), data)
            mock_validate.assert_called_once()

    def test_skips_parent_validation_when_no_parent(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        data = CategoryCreate(name="Health", type="expense", parent_id=None)

        with patch("app.services.category_service.validate_parent") as mock_validate, \
             patch("app.services.category_service.get_next_display_order", return_value=0), \
             patch("app.services.category_service.CategoryResponse.model_validate"):
            CategoryService.create_category(db, uuid.uuid4(), data)
            mock_validate.assert_not_called()


# ══════════════════════════════════════════════════════════════════════════════
# TestCategoryTree
# ══════════════════════════════════════════════════════════════════════════════

class TestCategoryTree:

    def test_returns_tree_structure(self):
        db = MagicMock()
        user_id = uuid.uuid4()

        parent = make_category(name="The Essentials", parent_id=None)
        child1 = make_category(name="Food", parent_id=parent.category_id, display_order=0)
        child2 = make_category(name="Rent", parent_id=parent.category_id, display_order=1)

        db.query.return_value.filter.return_value.order_by.return_value.all.side_effect = [
            [parent],
            [child1, child2],
        ]

        result = CategoryService.category_tree(db, user_id)

        assert len(result) == 1
        assert result[0].name == "The Essentials"
        assert len(result[0].children) == 2
        assert result[0].children[0].name == "Food"
        assert result[0].children[1].name == "Rent"

    def test_returns_empty_list_when_no_categories(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.order_by.return_value.all.return_value = []
        result = CategoryService.category_tree(db, uuid.uuid4())
        assert result == []

    def test_parent_with_no_children(self):
        db = MagicMock()
        parent = make_category(name="Income", parent_id=None)

        db.query.return_value.filter.return_value.order_by.return_value.all.side_effect = [
            [parent],
            [],
        ]

        result = CategoryService.category_tree(db, uuid.uuid4())
        assert len(result) == 1
        assert result[0].children == []


# ══════════════════════════════════════════════════════════════════════════════
# TestUpdateCategory
# ══════════════════════════════════════════════════════════════════════════════

class TestUpdateCategory:

    def test_updates_name_successfully(self):
        db = MagicMock()
        category = make_category(name="Food")
        user_id = uuid.uuid4()

        db.query.return_value.filter.return_value.first.return_value = None

        with patch("app.services.category_service.get_category_or_raise", return_value=category), \
             patch("app.services.category_service.CategoryResponse.model_validate"):
            data = CategoryUpdate(name="Groceries")
            CategoryService.update_category(db, user_id, category.category_id, data)

        assert category.name == "Groceries"
        db.commit.assert_called_once()

    def test_raises_on_duplicate_name(self):
        db = MagicMock()
        category = make_category(name="Food")
        existing = make_category(name="Groceries")
        db.query.return_value.filter.return_value.first.return_value = existing

        with patch("app.services.category_service.get_category_or_raise", return_value=category):
            with pytest.raises(CategoryAlreadyExistsException):
                CategoryService.update_category(
                    db, uuid.uuid4(), category.category_id, CategoryUpdate(name="Groceries")
                )

    def test_same_name_does_not_check_duplicate(self):
        db = MagicMock()
        category = make_category(name="Food")

        with patch("app.services.category_service.get_category_or_raise", return_value=category), \
             patch("app.services.category_service.CategoryResponse.model_validate"):
            CategoryService.update_category(
                db, uuid.uuid4(), category.category_id, CategoryUpdate(name="Food")
            )

        db.query.assert_not_called()


# ══════════════════════════════════════════════════════════════════════════════
# TestDeactivateCategory
# ══════════════════════════════════════════════════════════════════════════════

class TestDeactivateCategory:

    def test_deactivates_successfully(self):
        db = MagicMock()
        category = make_category()

        with patch("app.services.category_service.get_category_or_raise", return_value=category):
            CategoryService.deactivate_category(db, uuid.uuid4(), category.category_id)

        assert category.is_active == False
        db.commit.assert_called_once()

    def test_cascades_to_children(self):
        db = MagicMock()
        category = make_category()

        with patch("app.services.category_service.get_category_or_raise", return_value=category):
            CategoryService.deactivate_category(db, uuid.uuid4(), category.category_id)

        db.query.return_value.filter.return_value.update.assert_called_once_with({"is_active": False})


# ══════════════════════════════════════════════════════════════════════════════
# TestReorderCategories
# ══════════════════════════════════════════════════════════════════════════════

class TestReorderCategories:

    def test_reorders_successfully(self):
        db = MagicMock()
        user_id = uuid.uuid4()
        cat1 = make_category(display_order=2)
        cat2 = make_category(display_order=0)
        cat3 = make_category(display_order=1)

        db.query.return_value.filter.return_value.first.side_effect = [cat1, cat2, cat3]

        data = CategoryReorderRequest(ordered_ids=[cat1.category_id, cat2.category_id, cat3.category_id])
        CategoryService.reorder_categories(db, user_id, data)

        assert cat1.display_order == 0
        assert cat2.display_order == 1
        assert cat3.display_order == 2
        db.commit.assert_called_once()

    def test_raises_if_category_not_found(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None

        data = CategoryReorderRequest(ordered_ids=[uuid.uuid4()])
        with pytest.raises(CategoryNotFoundException):
            CategoryService.reorder_categories(db, uuid.uuid4(), data)
"""
MerchantService Integration Tests
Uses db_session fixture — real SQLite DB.
Run with: pytest tests/test_merchant_service.py -v
"""
import pytest
from sqlalchemy.orm import Session

from app.services.merchant_service import MerchantService
from app.models.merchant import Merchant


class TestMerchantService:
    """
    Integration tests for MerchantService.
    Verifies merchant lookup, auto-creation and normalisation.
    """

    @pytest.fixture(autouse=True)
    def setup(self, db_session: Session):
        self.service = MerchantService(db_session)
        self.db = db_session

    # ── Creation ──────────────────────────────────────────────────────────────

    def test_creates_new_merchant(self):
        merchant = self.service.get_or_create("Naivas Supermarket")
        assert merchant is not None
        assert merchant.merchant_id is not None

    def test_created_merchant_persisted_in_db(self):
        self.service.get_or_create("Quickmart")
        found = self.db.query(Merchant).filter(
            Merchant.merchant_name == "QUICKMART"
        ).first()
        assert found is not None

    def test_normalises_to_uppercase(self):
        merchant = self.service.get_or_create("quickmart")
        assert merchant.merchant_name == "QUICKMART"

    def test_strips_leading_trailing_whitespace(self):
        merchant = self.service.get_or_create("  Safaricom  ")
        assert merchant.merchant_name == "SAFARICOM"

    def test_strips_and_uppercases_together(self):
        merchant = self.service.get_or_create("  naivas  ")
        assert merchant.merchant_name == "NAIVAS"

    # ── Dedup / Lookup ────────────────────────────────────────────────────────

    def test_returns_existing_merchant(self):
        first = self.service.get_or_create("Naivas")
        second = self.service.get_or_create("Naivas")
        assert first.merchant_id == second.merchant_id

    def test_case_insensitive_dedup(self):
        """'naivas' and 'NAIVAS' should resolve to the same merchant."""
        lower = self.service.get_or_create("naivas")
        upper = self.service.get_or_create("NAIVAS")
        assert lower.merchant_id == upper.merchant_id

    def test_whitespace_dedup(self):
        """'  NAIVAS  ' and 'NAIVAS' should resolve to the same merchant."""
        padded = self.service.get_or_create("  NAIVAS  ")
        clean = self.service.get_or_create("NAIVAS")
        assert padded.merchant_id == clean.merchant_id

    def test_only_one_db_record_created_for_same_merchant(self):
        self.service.get_or_create("Java House")
        self.service.get_or_create("Java House")

        count = self.db.query(Merchant).filter(
            Merchant.merchant_name == "JAVA HOUSE"
        ).count()
        assert count == 1

    # ── Multiple Merchants ────────────────────────────────────────────────────

    def test_different_names_create_different_merchants(self):
        naivas = self.service.get_or_create("Naivas")
        quickmart = self.service.get_or_create("Quickmart")
        assert naivas.merchant_id != quickmart.merchant_id

    def test_multiple_merchants_all_persisted(self):
        names = ["Naivas", "Quickmart", "Java House", "KFC", "Safaricom"]
        for name in names:
            self.service.get_or_create(name)

        count = self.db.query(Merchant).count()
        assert count == len(names)
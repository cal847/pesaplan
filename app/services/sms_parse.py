# Service for mpesa sms parsing. Uses regex to extract data required in the model.
import re
from datetime import datetime
from decimal import Decimal
from typing import Optional
import logging

from app.schemas.sms import SMSParseResult, ParsedTransactionType

logger = logging.getLogger(__name__)

class SMSParserService:
    PATTERNS = {
        "received": r"Confirmed\.You have received Ksh([\d,]+\.?\d*) from (.+?) \d{10}",
        "sent_person": r"Confirmed\. Ksh([\d,]+\.?\d*) sent to (.+?) \d{10}",
        "till_payment": r"Confirmed\. Ksh([\d,]+\.?\d*) paid to (.+?)\.",
        "airtime": r"confirmed\.You bought Ksh([\d,]+\.?\d*) of airtime",
        "mshwari": r"transferred to M-Shwari",
        "paybill": r"Confirmed\. Ksh([\d,]+\.?\d*) sent to (.+?) for account (\S+)",
    }
    
    DATE_PATTERN = r"on (\d{1,2}/\d{1,2}/\d{2}) at (\d{1,2}:\d{2} [AP]M)"
    CODE_PATTERN = r"^([A-Z0-9]{10})"
    
    def parse_sms(self, message: str) -> Optional[SMSParseResult]:
        transaction_code = self._extract_code(message)
        if not transaction_code:
            logger.warning(
                "transaction_code_unavailable",
                # extra={"transaction_id": transaction_id}
                )
        
        transaction_date = self._extract_date_time(message)
        
        if re.search(self.PATTERNS["mshwari"], message):
            amount = self._extract_amount(message)
            
            logger.info("transaction_saved_as_savings")

            return SMSParseResult(
                transaction_code=transaction_code,
                amount=amount,
                merchant_name=None,
                transaction_type=ParsedTransactionType.SAVINGS,
                transaction_date=transaction_date,
            )
            
            
        # Received
        if match := re.search(self.PATTERNS["received"], message):
            
            logger.info("transaction_saved_as_income")

            return SMSParseResult(
                transaction_code=transaction_code,
                amount=Decimal(match.group(1).replace(",", "")),
                merchant_name=match.group(2).strip(),
                transaction_type=ParsedTransactionType.INCOME,
                transaction_date=transaction_date,
            )
            

        
        # Paybill
        if match := re.search(self.PATTERNS["paybill"], message):
            logger.info("transaction_saved_as_epense")

            return SMSParseResult(
                transaction_code=transaction_code,
                amount=Decimal(match.group(1).replace(",", "")),
                merchant_name=match.group(2).strip(),
                account_number=match.group(3).strip(),
                transaction_type=ParsedTransactionType.EXPENSE,
                transaction_date=transaction_date,
            )
            
        # Sent to person
        if match := re.search(self.PATTERNS["sent_person"], message):
            logger.info("transaction_saved_as_epense")

            return SMSParseResult(
                transaction_code=transaction_code,
                amount=Decimal(match.group(1).replace(",", "")),
                merchant_name=match.group(2).strip(),
                transaction_type=ParsedTransactionType.EXPENSE,
                transaction_date=transaction_date,
            )
            
        # Till payment
        if match := re.search(self.PATTERNS["till_payment"], message):
            logger.info("transaction_saved_as_epense")

            return SMSParseResult(
                transaction_code=transaction_code,
                amount=Decimal(match.group(1).replace(",", "")),
                merchant_name=match.group(2).strip(),
                transaction_type=ParsedTransactionType.EXPENSE,
                transaction_date=transaction_date,
            )
        
        # Airtime
        if re.search(self.PATTERNS["airtime"], message, re.IGNORECASE):
            amount = self._extract_amount(message)
            
            logger.info("transaction_saved_as_epense")

            return SMSParseResult(
                transaction_code=transaction_code,
                amount=amount,
                merchant_name="Safaricom",
                transaction_type=ParsedTransactionType.EXPENSE,
                transaction_date=transaction_date,
                raw_message=message
            )
            
        return None

    def _extract_code(self, message: str) -> Optional[str]:
        match = re.match(self.CODE_PATTERN, message)
        return match.group(1) if match else None

    def _extract_amount(self, message: str) -> Decimal:
        match = re.search(r"Ksh([\d,]+\.?\d*)", message)
        return Decimal(match.group(1).replace(",", "")) if match else Decimal("0")

    def _extract_date_time(self, message: str) -> datetime:
        match = re.search(self.DATE_PATTERN, message)
        if not match:
            return datetime.now()
        date_str = f"{match.group(1)} {match.group(2)}"
        return datetime.strptime(date_str, "%d/%m/%y %I:%M %p")
            
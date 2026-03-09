"""
Date Range utility for consistent period calculations
"""
from datetime import datetime, timedelta, date, timezone
from typing import Optional, Tuple

class DateRangeHelper:
    """
    Helps calculate date ranges. Time-zone aware
    """
    @staticmethod
    def get_today_range(ref_date: Optional[datetime] = None) -> Tuple[datetime, datetime]:
        """Get start and end of day for a given reference date"""
        if ref_date is None:
            ref_date = datetime.now(timezone.utc)
            
        # Ensure is timezone aware
        if ref_date.tzinfo is None:
            ref_date = ref_date.replace(tzinfo=timezone.utc)
            
        start = ref_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end = ref_date.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        return start, end
    
    @staticmethod
    def get_week_range(ref_date: Optional[datetime] = None) -> Tuple[datetime, datetime]:
        """Get start and end of week for a given reference date"""
        if ref_date is None:
            ref_date = datetime.now(timezone.utc)
            
        # Ensure is timezone aware
        if ref_date.tzinfo is None:
            ref_date = ref_date.replace(tzinfo=timezone.utc)

        days_to_monday = ref_date.weekday()
        
        start = (ref_date - timedelta(days=days_to_monday)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        end = (start + timedelta(days=6)).replace(
            hour=23, minute=59, second=59, microsecond=999999
        )        
        return start, end
    
    @staticmethod
    def get_month_range(ref_date: Optional[datetime] = None) -> Tuple[datetime, datetime]:
        """Get start and end of month for a given reference date"""
        if ref_date is None:
            ref_date = datetime.now(timezone.utc)
            
        # Ensure is timezone aware
        if ref_date.tzinfo is None:
            ref_date = ref_date.replace(tzinfo=timezone.utc)

        days_to_monday = ref_date.weekday()
        
        start = ref_date.replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        )
        
        if start.month == 12:
            next_month = start.replace(year=start.year + 1, month=1)
        else:
            next_month = start.replace(month=start.month + 1)
        
        end = next_month - timedelta(microseconds=1)   
        
        return start, end
    
    @staticmethod
    def get_year_range(ref_date: Optional[datetime] = None) -> Tuple[datetime, datetime]:
        """Get start and end of year for a given reference date"""
        if ref_date is None:
            ref_date = datetime.now(timezone.utc)
            
        # Ensure is timezone aware
        if ref_date.tzinfo is None:
            ref_date = ref_date.replace(tzinfo=timezone.utc)

        days_to_monday = ref_date.weekday()
        
        start = ref_date.replace(
            month=1, day=1, hour=0, minute=0, second=0, microsecond=0
        )
        end = ref_date.replace(
            month=12, day=31, hour=23, minute=59, second=59, microsecond=999999
        ) 
        
        return start, end

    @staticmethod
    def get_period_range(period: str, reference_date: Optional[datetime] = None) -> tuple:
        """
        Get date range for any budget period.
        
        Args:
            period: One of 'daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'
            reference_date: Reference date (defaults to now)
        
        Returns:
            Tuple of (start_date, end_date)
        """
        if reference_date is None:
            reference_date = datetime.now(timezone.utc)
        
        if period == 'daily':
            return DateRangeHelper.get_today_range(reference_date)
        elif period == 'weekly':
            return DateRangeHelper.get_week_range(reference_date)
        elif period == 'monthly':
            return DateRangeHelper.get_month_range(reference_date)
        elif period == 'quarterly':
            # Quarter: Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec
            quarter = (reference_date.month - 1) // 3
            start_month = quarter * 3 + 1
            start = reference_date.replace(month=start_month, day=1, hour=0, minute=0, second=0, microsecond=0)
            
            if start_month + 2 > 12:
                end_month = (start_month + 2) % 12
                end_year = start.year + 1
            else:
                end_month = start_month + 2
                end_year = start.year
            
            next_month = datetime(end_year, end_month, 1, tzinfo=reference_date.tzinfo) + relativedelta(months=1)
            end = next_month - timedelta(microseconds=1)
            return start, end
        elif period == 'yearly':
            return DateRangeHelper.get_year_range(reference_date)
        else:
            raise ValueError(f"Unsupported period: {period}")
            
            
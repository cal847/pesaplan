"""Exceptions for each error encountered"""
from fastapi import HTTPException, status
from typing import Optional, Any, Dict, List

class PesaPlanException(HTTPException):
    """
    Base class exception for all custom exceptions
    """
    def __init__(
        self,
        status_code: int,
        detail: str,
        error_code: str = "ERROR"
        headers: Optional[Dict[str, str]] = None
    ):
        detail_with_code = f"[{error_code}] {detail}"
        super().__init__(status_code=status_code, detail=detail_with_code, headers=headers)
        self.error_code = error_code
    
class InvalidCredentialsException(PesaPlanException):
    """Raised when email/password is invalid"""
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            error_code="INVALID_CREDENTIALS",
            headers={"WWW-Authenticate": "Bearer"}
        )
        
class InvalidVerificationTokenException(BudgetAppException):
    """Raised when email verification token is invalid"""
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification token",
            error_code="INVALID_VERIFICATION_TOKEN"
        )
        
class InvalidTokenException(PesaPlanException):
    """Raised when JWT Token is invalid"""
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            error_code="INVALID_TOKENS",
            headers={"WWW-Authenticate": "Bearer"}
        )

class InvalidResetTokenException(BudgetAppException):
    """Raised when password reset token is invalid"""
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token",
            error_code="INVALID_RESET_TOKEN"
        )
        
class TokenExpiredException(PesaPlanException):
    """Raised when JWT Token has expired"""
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            error_code="EXPIRED_TOKENS",
            headers={"WWW-Authenticate": "Bearer"}
        )
        
class UserNotFoundException(PesaPlanException):
    """Raised when user does not exist in database"""
    def __init__(self, user_id: Optional[int] = None, email: Optional[str] = None):
        if user_id:
            detail = f"User with id {user_id} not found"
        elif email:
            detail = f"User with email {user_id} not found"
        else:
            detail = f"User not found"
            
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
            error_code="USER_NOT_FOUND"
        )
        
class EmailNotVerifiedException(PesaPlaException):
    """Raised when trying to access endpoint that requires email verification"""
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please verify your email before proceeding"
        )
        
class OAuthException(PesaPlanException):
    """Base class for OAuth-related exceptions"""
    def __init__(self, provider: str, detail: str):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"{provider} authentication failed: {detail}",
            error_code="OAUTH_ERROR"
        )

class GoogleAuthException(OAuthException):
    """Raised when Google OAuth fails"""
    def __init__(self, detail: str):
        super().__init__("Google", detail)
"""Exceptions for each error encountered"""
from typing import Optional, Dict
from fastapi import HTTPException, status

class PesaPlanException(HTTPException):
    """
    Base class exception for all custom exceptions
    """
    def __init__(
        self,
        status_code: int,
        detail: str,
        error_code: str = "ERROR",
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
        
class InvalidVerificationTokenException(PesaPlanException):
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

class InvalidTokenTypeException(PesaPlanException):
    """Raised when JWT Token is invalid"""
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Token Type",
            error_code="INVALID_TOKEN_TYPE",
            headers={"WWW-Authenticate": "Bearer"}
        )
        
class InvalidResetTokenException(PesaPlanException):
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
    
class ResetTokenExpiredException(PesaPlanException):
    """Raised when password reset token has expired"""
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired. Please request a new one.",
            error_code="RESET_TOKEN_EXPIRED"
        )
           
class UserNotFoundException(PesaPlanException):
    """Raised when user does not exist in database"""
    def __init__(self, user_id: Optional[int] = None, email: Optional[str] = None):
        if user_id:
            detail = f"User with id {user_id} not found"
        elif email:
            detail = f"User with email {user_id} not found"
        else:
            detail = "User not found"
            
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
            error_code="USER_NOT_FOUND"
        )
        
class EmailNotVerifiedException(PesaPlanException):
    """Raised when trying to access endpoint that requires email verification"""
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please verify your email before proceeding"
        )
        
class EmailAlreadyVerifiedException(PesaPlanException):
    """Raised when a user tries to verify an already verified email"""
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email has already been verified",
            error_code="EMAIL_ALREADY_VERIFIED"
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
        
class InvalidPasswordException(PesaPlanException):
    """Raised when the provided password is incorrect"""
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The password you entered is incorrect",
            error_code="INVALID_PASSWORD",
            headers={"WWW-Authenticate": "Bearer"}
        )

# ─── Budget Exceptions ────────────────────────────────────────────────────────
class BudgetAlreadyExistsException(PesaPlanException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail="Budget Already Exists"
        )
        
class BudgetNotFoundException(PesaPlanException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found",
        )
        
# class DuplicateBudgetException(PesaPlanException):
#     def __init__(self):
#         super().__init__(
#             status_code=status.HTTP_409_CONFLICT,
#             detail="A budget already exists for this category in the selected period",
#         )
        
# ─── Category Exceptions ──────────────────────────────────────────────────────

class CategoryNotFoundException(PesaPlanException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )
        
class InvalidParentCategoryException(PesaPlanException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Parent category must be a top-level category. Nesting beyond 2 levels is not allowed."
        )
        
class CategoryAlreadyExistsException(PesaPlanException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail="A category with this name already exists",
        )

class CategoryHasChildrenException(PesaPlanException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate a category that has active subcategories",
        )

class CategoryHasBudgetsException(PesaPlanException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate a category that has active budgets",
        )
        
class MerchantNotFoundException(PesaPlanException):
    def __init__(self, detail: str = "Merchant not found"):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
            error_code="MERCHANT_NOT_FOUND"
        )
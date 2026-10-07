"""Email Service for sending emails for account verification and password reset"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings
from tenacity import retry, stop_after_attempt, wait_exponential

import logging


logger = logging.getLogger(__name__)

class EmailService:
    """
    Service class for sending emails
    """
    _smtp_pool = None
    
    @classmethod
    def get_smtp_connection(cls):
        """Get or create a persistent SMTP connection"""
        if cls._smtp_pool is None:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
            if settings.SMTP_TLS:
                server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            cls._smtp_pool = server
        return cls._smtp_pool
    
    @staticmethod
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True
    )
    async def send_email_with_retry(email_to: str, subject: str, content: str) -> bool:
        return await EmailService.send_email(email_to, subject, content)
    
    @staticmethod
    async def send_email(
        email_to: str,
        subject: str,
        content: str,
    ) -> bool:
        """Low-level method for sending emails"""
        if not all([settings.SMTP_HOST, settings.SMTP_PORT, settings.SMTP_USER, settings.SMTP_PASSWORD]):
            print("Email settings not configures - skipping email send")
            return False
        
        try:
            # Create an email address
            message = MIMEMultipart("alternative")
            message["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
            message["To"] = email_to
            message["Subject"] = subject
            
            message.attach(MIMEText(content, "html"))
            
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                if settings.SMTP_TLS:
                    server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(message)
            
            return True
        
        except Exception as e:
            logger.info(f"Failed to send email to {email_to}: {e}")
            return False
    
    @staticmethod
    async def send_verification_email(email_to: str, token:str) -> bool:
        """
        Send email verification link to a new user
        """
        logger.info(f"Attempting to send email to {email_to}")
        
        verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
        
        # HTML email template
        html = f"""
        <h2>Welcome to PesaPlan!</h2>
        <p>Thanks for signing up. Please verify your email address by clicking the link below:</p>
        <p><a href="{verification_url}">Verify Email Address</a></p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account with Budget App, please ignore this email.</p>
        <hr>
        <p>Happy budgeting! 🎉</p>
        """
        
        result = await EmailService.send_email(
            email_to=email_to,
            subject="Verify Your Email",
            content=html
        )
        if result:
            logger.info(f"Email sent to {email_to}")
        else:
            logger.error(f"Failed to send email to {email_to}")
            
        return result
    
    @staticmethod
    async def send_password_reset_email(
        email_to: str,
        token: str,
        ) -> bool:
        """
        Send password reset link to user
        """
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        
        html = f"""
        <h2>Password Reset Request</h2>
        <p>We received a request to reset your password. Click the link below to set a new password:</p>
        <p><a href="{reset_url}">Reset Password</a></p>
        <p>This link will expire in 1 hour for security reasons.</p>
        <p>If you didn't request a password reset, you can safely ignore this email.</p>
        <hr>
        <p>Stay secure! 🔒</p>
        """
        
        return await EmailService.send_email(
            email_to=email_to,
            subject="Password Reset - PesaPlan",
            content=html
        )
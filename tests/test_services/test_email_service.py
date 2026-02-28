# tests/test_services/test_email_service.py
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from app.services.email_service import EmailService
from app.config import settings


class TestEmailService:
    """Test the email sending service"""

    @pytest.mark.asyncio
    async def test_send_email_success(self):
        """Test successfully sending an email"""
        # Mock the SMTP server
        mock_smtp = MagicMock()
        mock_server = MagicMock()
        mock_smtp.return_value.__enter__.return_value = mock_server
        
        with patch("smtplib.SMTP", mock_smtp):
            result = await EmailService.send_email(
                receiver="test@example.com",
                subject="Test Subject",
                content="<h1>Test Content</h1>"
            )
            
            assert result is True
            mock_smtp.assert_called_once_with(settings.SMTP_HOST, settings.SMTP_PORT)
            mock_server.starttls.assert_called_once()
            mock_server.login.assert_called_once_with(settings.SMTP_USER, settings.SMTP_PASSWORD)
            mock_server.send_message.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_send_email_no_smtp_config(self):
        """Test sending email when SMTP is not configured"""
        # Temporarily unset SMTP settings
        with patch.object(settings, 'SMTP_HOST', None):
            result = await EmailService.send_email(
                receiver="test@example.com",
                subject="Test Subject",
                content="<h1>Test Content</h1>"
            )
            
            assert result is False
    
    @pytest.mark.asyncio
    async def test_send_email_smtp_error(self):
        """Test SMTP connection error"""
        with patch("smtplib.SMTP", side_effect=Exception("Connection refused")):
            result = await EmailService.send_email(
                receiver="test@example.com",
                subject="Test Subject",
                content="<h1>Test Content</h1>"
            )
            
            assert result is False
    
    @pytest.mark.asyncio
    async def test_send_email_login_error(self):
        """Test SMTP login error"""
        mock_smtp = MagicMock()
        mock_server = MagicMock()
        mock_server.login.side_effect = Exception("Authentication failed")
        mock_smtp.return_value.__enter__.return_value = mock_server
        
        with patch("smtplib.SMTP", mock_smtp):
            result = await EmailService.send_email(
                receiver="test@example.com",
                subject="Test Subject",
                content="<h1>Test Content</h1>"
            )
            
            assert result is False
    
    @pytest.mark.asyncio
    async def test_send_verification_email(self):
        """Test sending verification email"""
        email = "test@example.com"
        token = "test-verification-token"
        
        with patch.object(EmailService, 'send_email', new_callable=AsyncMock) as mock_send:
            mock_send.return_value = True
            
            result = await EmailService.send_verification_email(email, token)
            
            assert result is True
            mock_send.assert_called_once()
            
            # Check that the correct arguments were passed
            args, kwargs = mock_send.call_args
            assert kwargs["email_to"] == email
            assert kwargs["subject"] == "Verify Your Email"
            assert "verify-email" in kwargs["html_content"]
            assert token in kwargs["html_content"]
    
    @pytest.mark.asyncio
    async def test_send_verification_email_failure(self):
        """Test verification email sending failure"""
        email = "test@example.com"
        token = "test-verification-token"
        
        with patch.object(EmailService, 'send_email', new_callable=AsyncMock) as mock_send:
            mock_send.return_value = False
            
            result = await EmailService.send_verification_email(email, token)
            
            assert result is False
    
    @pytest.mark.asyncio
    async def test_send_password_reset_email(self):
        """Test sending password reset email"""
        email = "test@example.com"
        token = "test-reset-token"
        
        with patch.object(EmailService, 'send_email', new_callable=AsyncMock) as mock_send:
            mock_send.return_value = True
            
            result = await EmailService.send_password_reset_email(email, token)
            
            assert result is True
            mock_send.assert_called_once()
            
            # Check that the correct arguments were passed
            args, kwargs = mock_send.call_args
            assert kwargs["email_to"] == email
            assert kwargs["subject"] == "Password Reset - PesaPlan"
            assert "reset-password" in kwargs["html_content"]
            assert token in kwargs["html_content"]
    
    @pytest.mark.asyncio
    async def test_send_password_reset_email_failure(self):
        """Test password reset email sending failure"""
        email = "test@example.com"
        token = "test-reset-token"
        
        with patch.object(EmailService, 'send_email', new_callable=AsyncMock) as mock_send:
            mock_send.return_value = False
            
            result = await EmailService.send_password_reset_email(email, token)
            
            assert result is False
    
    @pytest.mark.asyncio
    async def test_email_content_formatting(self):
        """Test that email content is properly formatted"""
        email = "test@example.com"
        token = "test-token"
        
        with patch.object(EmailService, 'send_email', new_callable=AsyncMock) as mock_send:
            # Test verification email
            await EmailService.send_verification_email(email, token)
            call_args = mock_send.call_args_list[0]
            html_content = call_args.kwargs["html_content"]
            
            # Check verification email content
            assert f"{settings.FRONTEND_URL}/verify-email?token={token}" in html_content
            assert "Welcome to PesaPlan!" in html_content
            assert "24 hours" in html_content
            
            # Reset mock
            mock_send.reset_mock()
            
            # Test password reset email
            await EmailService.send_password_reset_email(email, token)
            call_args = mock_send.call_args_list[0]
            html_content = call_args.kwargs["html_content"]
            
            # Check password reset email content
            assert f"{settings.FRONTEND_URL}/reset-password?token={token}" in html_content
            assert "Password Reset Request" in html_content
            assert "1 hour" in html_content
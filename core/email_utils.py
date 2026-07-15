from django.core.mail import send_mail
from django.conf import settings

def send_email_notification(subject, message, recipient_list):
    """Send email using SendGrid SMTP. Returns True if sent successfully, else False."""
    if not settings.SENDGRID_API_KEY:
        return False
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipient_list,
            fail_silently=False,
        )
        return True
    except Exception:
        return False
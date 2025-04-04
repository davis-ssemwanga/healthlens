from django.db import models
from django.contrib.auth import get_user_model
from .tasks import send_async_email  # Import the Celery task

User = get_user_model()

class Notification(models.Model):
    NOTIFICATION_TYPES = (
        ('appointment_update', 'Appointment Update'),
        ('doctor_availability_change', 'Doctor Availability Change'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Use Celery to send emails asynchronously
        send_async_email.delay(
            'Healthcare Notification',
            self.message,
            [self.user.email]
        )

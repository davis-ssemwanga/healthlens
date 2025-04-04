from datetime import timezone
from django.db import models

from users.models import User

# Create your models here.
class CallSession(models.Model):
    doctor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='doctor_calls')
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='patient_calls')
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=[('active', 'Active'), ('ended', 'Ended')], default='active')

    def end_call(self):
        self.end_time = timezone.now()
        self.status = 'ended'
        self.save()

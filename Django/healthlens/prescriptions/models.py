from django.db import models
from django.core.exceptions import PermissionDenied
from users.models import User

# Create your models here.
class Prescription(models.Model):
    doctor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='prescribed', limit_choices_to={'role': 'doctor'})
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='prescriptions', limit_choices_to={'role': 'patient'})
    medication = models.CharField(max_length=255, default="No medication specified")
    dosage = models.CharField(max_length=255, default="As prescribed")
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.pk and self.doctor.role != 'doctor':  # Corrected from self.doctor.user.role
            raise PermissionDenied("Only doctors can create prescriptions.")
        super().save(*args, **kwargs)
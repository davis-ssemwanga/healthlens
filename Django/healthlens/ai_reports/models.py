# ai_reports/models.py
from django.core.mail import send_mail
from django.db import models
from ai_models.models import AIModel
from prescriptions.models import Prescription
from users.models import User

class Report(models.Model):
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),  # Added this
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('DECLINED', 'Declined'),
    ]
    
    doctor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='generated_reports', limit_choices_to={'role': 'doctor'})
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reports', limit_choices_to={'role': 'patient'})
    title = models.CharField(max_length=255)
    content = models.TextField()
    prescription = models.OneToOneField(Prescription, on_delete=models.CASCADE, null=True, blank=True)
    ai_model = models.ForeignKey(AIModel, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')  # Default is now "DRAFT"
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.ai_model and self.patient:
            latest_ai = AIModel.objects.filter(user=self.patient).order_by('-created_at').first()
            if latest_ai:
                self.ai_model = latest_ai
        super().save(*args, **kwargs)

        # Notify via email only when report is approved
        if self.status == 'APPROVED' and self.doctor:
            send_mail(
                'Report Approved',
                f'Report "{self.title}" for {self.patient} is now approved.',
                'healthlenz@gmail.com',
                [self.doctor.email, self.patient.email]  # Notify patient too
            )

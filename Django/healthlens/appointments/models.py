from django.db import models
from django.core.mail import send_mail
from doctors.models import Doctor
from patients.models import Patient
from users.models import User


# appointments/models.py
class Appointment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('completed', 'Completed'),
        ('canceled', 'Canceled'),
    ]
    APPROVAL_CHOICES = [
        ('waiting', 'Waiting'),
        ('approved', 'Approved'),
        ('declined', 'Declined'),
    ]

    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='patient_appointments')
    doctor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='doctor_appointments')
    date = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    approval_status_patient = models.CharField(max_length=20, choices=APPROVAL_CHOICES, default='waiting')
    approval_status_doctor = models.CharField(max_length=20, choices=APPROVAL_CHOICES, default='waiting')
    modified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    def is_fully_approved(self):
        return self.approval_status_patient == 'approved' and self.approval_status_doctor == 'approved'

    def save(self, *args, **kwargs):
        if self.is_fully_approved():
            self.status = 'confirmed'
            send_mail(
                'Appointment Confirmed',
                f'Your appointment on {self.date} is now confirmed.',
                'noreply@healthlens.com',
                [self.patient.email, self.doctor.email]
            )
        super().save(*args, **kwargs)
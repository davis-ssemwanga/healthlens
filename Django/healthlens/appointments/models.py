from django.db import models
from django.core.mail import send_mail
from users.models import User

class DoctorAvailability(models.Model):
    doctor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='availability')
    date = models.DateField()  # Available date
    start_time = models.TimeField()  # e.g., 09:00
    end_time = models.TimeField()  # e.g., 17:00
    appointment_duration = models.PositiveIntegerField(default=30)  # Duration in minutes, default 30 mins
    fee = models.DecimalField(max_digits=10, decimal_places=2, default=50000.00)  # Doctor's fee

    def __str__(self):
        return f"{self.doctor} - {self.date}"

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
    date = models.DateTimeField()  # Specific date and time of the appointment
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    approval_status_patient = models.CharField(max_length=20, choices=APPROVAL_CHOICES, default='waiting')
    approval_status_doctor = models.CharField(max_length=20, choices=APPROVAL_CHOICES, default='waiting')
    modified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    doctor_availability = models.ForeignKey(DoctorAvailability, on_delete=models.SET_NULL, null=True, blank=True)

    def is_fully_approved(self):
        return self.approval_status_patient == 'approved' and self.approval_status_doctor == 'approved'

    def save(self, *args, **kwargs):
        if self.is_fully_approved() and self.status != 'confirmed':
            self.status = 'confirmed'
            availability = self.doctor_availability or DoctorAvailability.objects.filter(
                doctor=self.doctor, 
                date=self.date.date()
            ).first()
            fee = availability.fee if availability else 50000.00
            send_mail(
                'Appointment Confirmed',
                f'Your appointment on {self.date} is confirmed. Fee: ${fee}.',
                'noreply@healthlens.com',
                [self.patient.email, self.doctor.email]
            )
        super().save(*args, **kwargs)

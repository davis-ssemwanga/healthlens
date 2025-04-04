from django.db import models

from users.models import User

# Create your models here.
class Doctor(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    specialty = models.CharField(max_length=255)
    years_of_experience = models.IntegerField()
    is_online = models.BooleanField(default=False)  # Track if doctor is online
    availability_status = models.CharField(
        max_length=10, 
        choices=[('available', 'Available'), ('on_leave', 'On Leave')],
        default='available'
    )
    def __str__(self):
        return self.user.username

class DoctorLeave(models.Model):
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE)
    start_date = models.DateTimeField()  # Leave start date and time
    end_date = models.DateTimeField()    # Leave end date and time

    def __str__(self):
        return f"{self.doctor.user.username} leave from {self.start_date} to {self.end_date}"
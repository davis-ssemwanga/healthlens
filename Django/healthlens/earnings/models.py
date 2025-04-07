from django.db import models
from appointments.models import Appointment
from users.models import User


class Earning(models.Model):
    doctor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='earnings')
    appointment = models.OneToOneField(Appointment, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date_earned = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.doctor} - ${self.amount} - {self.date_earned}"
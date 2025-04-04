from django.db import models

from users.models import User

# Create your models here.
# Patients Model
class Patient(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    next_of_kin = models.CharField(max_length=255)
    nok_phone_number = models.CharField(max_length=20)

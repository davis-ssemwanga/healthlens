from django.db import models

from users.models import User

# Create your models here.
class Manager(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    department = models.CharField(max_length=255)
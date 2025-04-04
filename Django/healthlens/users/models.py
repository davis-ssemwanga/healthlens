from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser): 
    ROLES = (
        ('patient', 'Patient'),
        ('doctor', 'Doctor'),
        ('manager', 'Manager'),
    )
    role = models.CharField(max_length=10, choices=ROLES) 
    date_of_birth = models.DateField(null=True, blank=True)
    is_verified = models.BooleanField(default=False)

from django.db import models

from doctors.models import Doctor
from patients.models import Patient

class APICallLog(models.Model):
    endpoint = models.CharField(max_length=255)
    method = models.CharField(max_length=10)  # e.g., GET, POST
    timestamp = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True)  # if you want to track the user

    def __str__(self):
        return f'{self.method} request to {self.endpoint} at {self.timestamp}'

class DoctorPatientMatch(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE)
    match_reason = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
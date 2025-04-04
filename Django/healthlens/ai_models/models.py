from django.db import models
from users.models import User

class AIModel(models.Model):
    SOURCE_CHOICES = (
        ('text', 'Text Analysis'),
        ('image', 'Image Analysis'),
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ai_results')
    disease = models.CharField(max_length=100)
    probability = models.FloatField(default=0.)  # Decimal (0-1) or percentage, depending on input
    description = models.TextField(default="N/A")
    precautions = models.JSONField()  # JSON list of precautions
    symptoms = models.TextField(blank=True, null=True)  # Original input text
    image = models.ImageField(upload_to='images/', blank=True, null=True)
    source = models.CharField(max_length=5, choices=SOURCE_CHOICES, default='text')  # New field
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.disease} ({self.probability}) - {self.user.username} - {self.get_source_display()}"
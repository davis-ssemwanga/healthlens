# Generated by Django 5.1.6 on 2025-03-08 23:27

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ai_models', '0002_remove_aimodel_probability_score_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='aimodel',
            name='description',
            field=models.TextField(default='N/A'),
        ),
        migrations.AlterField(
            model_name='aimodel',
            name='probability',
            field=models.FloatField(default=0.0),
        ),
    ]

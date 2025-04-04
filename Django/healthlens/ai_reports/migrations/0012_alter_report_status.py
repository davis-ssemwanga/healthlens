# Generated by Django 5.1.6 on 2025-03-10 03:52

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ai_reports', '0011_alter_report_ai_model_alter_report_prescription_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='report',
            name='status',
            field=models.CharField(choices=[('DRAFT', 'Draft'), ('PENDING', 'Pending'), ('APPROVED', 'Approved'), ('DECLINED', 'Declined')], default='DRAFT', max_length=20),
        ),
    ]

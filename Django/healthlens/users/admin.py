from django.contrib import admin
from django.apps import apps
from django.contrib.admin.sites import AlreadyRegistered

# List of apps that contain models
app_names = [
    "ai_models",
    "ai_reports",
    "api",
    "authentication",
    "chat",
    "managers",
    "patients",
    "users",
    "appointments",
    "calls",
    "doctors",
    "notifications",
    "prescriptions",
]

# Loop through each app and register its models
for app_name in app_names:
    app_models = apps.get_app_config(app_name).get_models()
    for model in app_models:
        try:
            admin.site.register(model)
        except AlreadyRegistered:
            pass  # Ignore if already registered

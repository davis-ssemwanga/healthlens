import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

# Ensure the settings module is set before anything else
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'healthlens.settings')

import healthlens.routing  # Import routing after setting the settings module

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            healthlens.routing.websocket_urlpatterns  # Assuming you have websocket_urlpatterns here
        )
    ),
})

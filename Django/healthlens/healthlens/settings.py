from pathlib import Path
from corsheaders.defaults import default_headers

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = 'django-insecure-l8s4jx9p7j1qa7$0l$+0%6y!zxl393-w1z05$5^$km=r06ieoa'

DEBUG = True

ALLOWED_HOSTS = ['*']

INSTALLED_APPS = [
    "daphne",
    'channels',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'rest_framework_simplejwt',
    'users',
    'appointments',
    'prescriptions',
    'notifications',
    'chat',
    'calls',
    'ai_reports',
    'patients',
    'doctors',
    'managers',
    'authentication',
    'api',
    'ai_models',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'allauth.account.middleware.AccountMiddleware',
]

ROOT_URLCONF = 'healthlens.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'healthlens.wsgi.application'

CORS_ALLOW_ALL_ORIGINS = True

AUTHENTICATION_BACKENDS = [
    'users.auth_backend.EmailBackend',  
    'django.contrib.auth.backends.ModelBackend',  
]

CORS_ALLOWED_ORIGINS = [
    'http://127.0.0.1:3000',  # React app
]

CSRF_TRUSTED_ORIGINS = [
    "http://127.0.0.1:3000",  # React App
]

CORS_ALLOW_HEADERS = list(default_headers) + [
    "access-control-allow-credentials",
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
}

AUTH_USER_MODEL = 'users.User'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'healthlens',  
        'USER': 'admin',    
        'PASSWORD': '@123admin',  
        'HOST': 'localhost',  
        'PORT': '5432',  
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

ASGI_APPLICATION = "healthlens.asgi.application"

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer"
    },
}

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True

STATIC_URL = 'static/'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'healthlenz@gmail.com' 
EMAIL_HOST_PASSWORD = 'bshh ucme lcpt ewox'

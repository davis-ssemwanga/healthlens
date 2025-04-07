from rest_framework.routers import DefaultRouter
from django.urls import path, include
from . import views

# Initialize the router
router = DefaultRouter()

# Register the viewsets with the router
router.register(r'patients', views.PatientViewSet)
router.register(r'patient', views.PatientProfileViewSet, basename='patient-profile')
router.register(r'doctors', views.DoctorViewSet)
router.register(r'doctor/details', views.DoctorDetailsViewSet, basename='doctor-details')
router.register(r'doctor-availability', views.DoctorAvailabilityViewSet, basename='doctor-availability')
router.register(r'appointments', views.AppointmentViewSet)
router.register(r'prescriptions', views.PrescriptionViewSet)
router.register(r'notification', views.NotificationViewSet)
router.register(r'user', views.UserViewSet , basename='user')
router.register(r'users', views.UsersViewSet , basename='users')
router.register(r'doctormatch', views.MatchDoctorViewSet, basename='availability')
router.register(r'conversations', views.ConversationViewSet, basename='conversation')
router.register(r'available-users', views.AvailableUsersViewSet, basename='available-users')
router.register(r'chat', views.MessageViewSet, basename='chat')
router.register(r'messages', views.MessageViewSet, basename='messages'),
router.register(r'messages', views.MessageViewSet, basename='send-message'),
router.register(r'messagereadreceipts', views.MessageReadReceiptViewSet)
router.register(r'notifications', views.NotificationsViewSet)
router.register(r'call', views.CallLogViewSet, basename="calls")
router.register(r'reports', views.ReportViewSet, basename="reports")
router.register(r'aimodels', views.AIModelViewSet, basename='aimodels')
router.register(r'auth', views.AuthenticationViewSet, basename='authentication')
router.register(r'earnings', views.EarningViewSet, basename="earnings")


# Add the URL patterns for the router
urlpatterns = [
    path('', include(router.urls)),  # Include the router's generated URLs
]

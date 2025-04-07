from rest_framework import serializers
from doctors.models import Doctor
from patients.models import Patient
from appointments.models import Appointment, DoctorAvailability
from prescriptions.models import Prescription
from notifications.models import Notification
from users.models import User
from calls.models import CallSession
from ai_reports.models import Report
from ai_models.models import AIModel
from chat.models import ChatLog, Conversation, MessageReadReceipt, Notifications, UserBlock
from django.contrib.auth.hashers import make_password
from .models import DoctorPatientMatch
from earnings.models import Earning


class AuthenticationSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'role']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        # Force role to 'patient' for this signup flow
        validated_data['role'] = 'patient'
        user = User.objects.create_user(**validated_data)
        return user
    
# Doctor Serializer
class DoctorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Doctor 
        fields = [ 'id','user', 'specialty', 'years_of_experience', 'availability_status']

# User Serializer
class UserSerializer(serializers.ModelSerializer):
    doctor = DoctorSerializer(read_only=True)
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'date_of_birth', 'role', 'is_verified', 'doctor']  # Include custom fields
   
    # Custom validation for password (ensure it's only set on update)
    def validate_password(self, value):
        if value:
            return make_password(value)
        return value

# Patient Serializer
class PatientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = '__all__'
#Availabilty serializer
class DoctorAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorAvailability
        fields = ['id','doctor', 'date', 'start_time', 'end_time', 'appointment_duration', 'fee']

# Appointment Serializer
class AppointmentSerializer(serializers.ModelSerializer):
    doctor_availability = DoctorAvailabilitySerializer(many=True, read_only=True, source='doctor.availability')

    class Meta:
        model = Appointment
        fields = '__all__'

# Notification Serializer
class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'

class ConversationSerializer(serializers.ModelSerializer):
    participants = UserSerializer(many=True)

    class Meta:
        model = Conversation
        fields = ['id', 'participants', 'started_at']

class ChatLogSerializer(serializers.ModelSerializer):
    sender = UserSerializer()
    receiver = UserSerializer()
    conversation = ConversationSerializer()
    image = serializers.ImageField(required=False)
    file = serializers.FileField(required=False)

    class Meta:
        model = ChatLog
        fields = ['id', 'sender', 'receiver', 'message_type', 'message', 'status', 'is_read', 'timestamp', 'updated_at', 'conversation', 'image', 'file']

class MessageReadReceiptSerializer(serializers.ModelSerializer):
    chat_log = ChatLogSerializer()
    user = UserSerializer()

    class Meta:
        model = MessageReadReceipt
        fields = ['id', 'chat_log', 'user', 'is_read', 'timestamp']

class NotificationsSerializer(serializers.ModelSerializer):
    user = UserSerializer()

    class Meta:
        model = Notifications
        fields = ['id', 'user', 'message', 'is_read', 'timestamp']

# Call Log Serializer
class CallLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = CallSession
        fields = '__all__'

# AI Report Serializer
class AIReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = '__all__'

# AI Model Serializer
class AIModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIModel
        fields = ['id', 'disease', 'probability', 'description', 'precautions', 'symptoms', 'image', 'source', 'created_at', 'user']
        read_only_fields = ['id', 'created_at', 'user']

class PrescriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prescription
        fields = fields = ['id', 'medication', 'dosage', 'created_at']

class ReportSerializer(serializers.ModelSerializer):
    prescription = PrescriptionSerializer(read_only=True)
    patient = UserSerializer(read_only=True)
    doctor = UserSerializer(read_only=True)
    
    # Add fields for latest text and image AI results
    latest_text_ai = serializers.SerializerMethodField()
    latest_image_ai = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = [
            'id', 'title', 'content', 'prescription', 'patient', 'doctor', 
            'status', 'created_at', 'latest_text_ai', 'latest_image_ai'
        ]
        read_only_fields = ['prescription', 'doctor', 'status', 'created_at']

    def get_latest_text_ai(self, obj):
        # Fetch the latest AIModel with source='text' for this patient
        latest_text = AIModel.objects.filter(
            user=obj.patient if isinstance(obj, Report) else obj.get('patient')
        ).filter(source='text').order_by('-created_at').first()
        return AIModelSerializer(latest_text).data if latest_text else None

    def get_latest_image_ai(self, obj):
        # Fetch the latest AIModel with source='image' for this patient
        latest_image = AIModel.objects.filter(
            user=obj.patient if isinstance(obj, Report) else obj.get('patient')
        ).filter(source='image').order_by('-created_at').first()
        return AIModelSerializer(latest_image).data if latest_image else None

class AIAnalysisSerializer(serializers.Serializer):
    input_data = serializers.CharField(required=False, allow_blank=True)
    image = serializers.ImageField(required=False, allow_null=True)
    

class DoctorPatientMatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorPatientMatch
        fields = '__all__'

class EarningSerializer(serializers.ModelSerializer):
    class Meta:
        model = Earning
        fields = ['id', 'doctor', 'appointment', 'amount', 'date_earned']
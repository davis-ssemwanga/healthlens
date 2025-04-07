from datetime import timedelta
import logging
from django.forms import ValidationError
from django.utils import timezone
from django.shortcuts import get_object_or_404
from ai_models.predict_disease import get_prediction_results, image_analyzer
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import authenticate
from rest_framework.permissions import AllowAny
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.tokens import RefreshToken
from api.models import DoctorPatientMatch
from ai_models.imageProcessor import predict_skin_condition
from users.models import User
from .serializers import AuthenticationSerializer, DoctorAvailabilitySerializer, DoctorPatientMatchSerializer
from patients.models import Patient
from doctors.models import Doctor, DoctorLeave
from appointments.models import Appointment, DoctorAvailability
from prescriptions.models import Prescription
from notifications.models import Notification
from users.models import User
from chat.models import ChatLog, Conversation, MessageReadReceipt, Notifications
from calls.models import CallSession
from ai_reports.models import Report
from ai_models.models import AIModel
from earnings.models import Earning
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Q

from django.contrib.auth import get_user_model
from django.db.models import Sum

logger = logging.getLogger(__name__)

timezone.activate('Africa/Nairobi')

User = get_user_model()
from .serializers import (
    ChatLogSerializer, ConversationSerializer, MessageReadReceiptSerializer, NotificationsSerializer, PatientSerializer, DoctorSerializer, AppointmentSerializer,
    PrescriptionSerializer, NotificationSerializer, UserSerializer,
    CallLogSerializer, AIReportSerializer, AIModelSerializer, AuthenticationSerializer,AIAnalysisSerializer,ReportSerializer,EarningSerializer
)

class AuthenticationViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [AllowAny]

    @action(detail=False, methods=['post'])
    def register(self, request):
        serializer = AuthenticationSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            if User.objects.filter(email=email).exists():
                return Response({'error': 'Email already exists'}, status=status.HTTP_400_BAD_REQUEST)

            # Directly save the user to the database without Redis and OTP
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            
            return Response({
                "user": serializer.data,
                "token": str(refresh.access_token),
                "refresh": str(refresh)
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def login(self, request):
        email = request.data.get("email")
        password = request.data.get("password")
        user = authenticate(request, email=email, password=password)
        if user:
            refresh = RefreshToken.for_user(user)
            serializer = AuthenticationSerializer(user)
            return Response({
                "user": serializer.data,
                "token": str(refresh.access_token),
                "refresh": str(refresh)
            }, status=status.HTTP_200_OK)
        return Response({"error": "Invalid Credentials"}, status=status.HTTP_401_UNAUTHORIZED)

    @action(detail=False, methods=['post'])
    def logout(self, request):
        request.auth.delete()  # If using token-based auth
        return Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def verify(self, request):
        user = request.user
        print(user)
        if user.is_authenticated:
            return Response({"user": AuthenticationSerializer(user).data}, status=status.HTTP_200_OK)
        return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)


class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer

class PatientProfileViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
   # permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='me')
    def get_my_profile(self, request):
        try:
            patient = Patient.objects.get(user=request.user)
            serializer = self.get_serializer(patient)
            return Response(serializer.data)
        except Patient.DoesNotExist:
            return Response({"error": "Patient profile not found"}, status=status.HTTP_404_NOT_FOUND)
        
class DoctorViewSet(viewsets.ModelViewSet):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer

    def get_queryset(self):
        user_id = self.request.query_params.get('user')
        if user_id:
            return Doctor.objects.filter(user__id=user_id)
        return Doctor.objects.all()
    
    def create(self, request, *args, **kwargs):
        print(request.data) 
        # Check if the user is a manager
        if request.user.role != 'manager':
            raise PermissionDenied("You do not have permission to create a doctor.")

        user_data = {
            "username": request.data.get("username"),
            "first_name": request.data.get("first_name"),
            "last_name": request.data.get("last_name"),
            "email": request.data.get("email"),
            "password": request.data.get("password"),
            'role': 'doctor'
        }

        # Create the user
        user_serializer = UserSerializer(data=user_data)
        if user_serializer.is_valid():
            user = user_serializer.save()
            user.set_password(user_data["password"])  # Hash the password
            user.save()

            # Create the doctor entry linked to the user
            doctor_data = {
                "user": user.id,  # Linking the User model to the Doctor model
                "specialty": request.data.get("specialty"),
                "years_of_experience": request.data.get("experience"),
            }
            doctor_serializer = DoctorSerializer(data=doctor_data)
            if doctor_serializer.is_valid():
                doctor_serializer.save()
                return Response(doctor_serializer.data, status=status.HTTP_201_CREATED)
            else:
                user.delete()  # If doctor creation fails, rollback user creation
                return Response(doctor_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        return Response(user_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# For /doctors/details/ (list, update, delete)
class DoctorDetailsViewSet(viewsets.ModelViewSet):
    queryset = User.objects.filter(role="doctor")  # Get only users who are doctors
    serializer_class = UserSerializer
    #permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'put', 'delete']

    def update(self, request, *args, **kwargs):
        if request.user.role != 'manager':
            raise PermissionDenied("Only managers can update doctors.")
        
        instance = self.get_object()
        user_data = {
            "first_name": request.data.get("first_name", instance.first_name),
            "last_name": request.data.get("last_name", instance.last_name),
            "email": request.data.get("email", instance.email),
        }
        
        if "password" in request.data:
            instance.set_password(request.data["password"])

        serializer = self.get_serializer(instance, data=user_data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        if request.user.role != 'manager':
            raise PermissionDenied("Only managers can delete doctors.")

        instance = self.get_object()
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
class DoctorAvailabilityViewSet(viewsets.ModelViewSet):
    queryset = DoctorAvailability.objects.all()
    serializer_class = DoctorAvailabilitySerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return DoctorAvailability.objects.none()

        # Check for doctor query parameter (e.g., ?doctor=5)
        doctor_id = self.request.query_params.get('doctor')
        if doctor_id:
            return DoctorAvailability.objects.filter(doctor_id=doctor_id)

        # If the user is a doctor, show their own availability
        if user.role == 'doctor':
            return DoctorAvailability.objects.filter(doctor=user)

        return DoctorAvailability.objects.none()

    def perform_create(self, serializer):
        # Ensure doctor is set to the authenticated user if they are a doctor
        if self.request.user.role == 'doctor':
            serializer.save(doctor=self.request.user)
        else:
            serializer.save()

class AppointmentViewSet(viewsets.ModelViewSet):
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            return Appointment.objects.filter(Q(patient=user) | Q(doctor=user))
        return Appointment.objects.none()

    def perform_create(self, serializer):
        # Validate time slot availability
        appointment_data = serializer.validated_data
        doctor = appointment_data['doctor']
        appt_time = appointment_data['date']

        # Convert appt_time to EAT if it’s UTC
        if appt_time.tzinfo:  # If timezone-aware (e.g., UTC from frontend)
            appt_time = timezone.localtime(appt_time, timezone.get_current_timezone())
        appt_date = appt_time.date()

        # Check doctor's availability
        availability = DoctorAvailability.objects.filter(doctor=doctor, date=appt_date).first()
        if not availability:
            raise ValidationError("Doctor is not available on this date.")

        # Create timezone-aware start and end times in EAT
        start_datetime = timezone.make_aware(
            timezone.datetime.combine(appt_date, availability.start_time),
            timezone.get_current_timezone()  # EAT
        )
        end_datetime = timezone.make_aware(
            timezone.datetime.combine(appt_date, availability.end_time),
            timezone.get_current_timezone()  # EAT
        )

        # Debug logging
        logger.info(f"appt_time (EAT): {appt_time}")
        logger.info(f"start_datetime (EAT): {start_datetime}")
        logger.info(f"end_datetime (EAT): {end_datetime}")
        logger.info(f"Condition: {start_datetime <= appt_time < end_datetime}")

        # Check if appointment time is within availability
        if not (start_datetime <= appt_time < end_datetime):
            raise ValidationError("Appointment time is outside doctor's availability.")

        # Check for overlapping appointments
        duration = availability.appointment_duration
        appt_end = appt_time + timezone.timedelta(minutes=duration)
        overlapping = Appointment.objects.filter(
            doctor=doctor,
            date__gte=appt_time,
            date__lt=appt_end
        ).exclude(status='canceled')
        
        if overlapping.exists():
            raise ValidationError("This time slot is already booked.")

        # Save appointment with availability reference
        appointment = serializer.save(modified_by=self.request.user, doctor_availability=availability)
        
        # Log earning if fully approved AND time has passed
        if appointment.is_fully_approved() and appointment.date <= timezone.now():
            Earning.objects.create(
                doctor=appointment.doctor,
                appointment=appointment,
                amount=availability.fee
            )

class EarningViewSet(viewsets.ModelViewSet):
    queryset = Earning.objects.all()
    serializer_class = EarningSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and user.role == 'doctor':
            return Earning.objects.filter(doctor=user)
        return Earning.objects.none()

    @action(detail=False, methods=['get'])
    def summary(self, request):
        user = request.user
        if user.role != 'doctor':
            return Response({"error": "Only doctors can view earnings"}, status=403)
        
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        # Daily Earnings: Past appointments today
        daily_earnings = Appointment.objects.filter(
            doctor=user,
            date__gte=today_start,
            date__lte=now,
            approval_status_doctor='approved',
            approval_status_patient='approved'
        ).aggregate(
            total=Sum('doctor_availability__fee')
        )['total'] or 0.00

        # Weekly Earnings: Monday to current day (workweek ends Friday)
        days_since_sunday = now.weekday() + 1 if now.weekday() < 6 else 0
        week_start = today_start - timedelta(days=days_since_sunday)
        if now.weekday() > 4:
            week_end = week_start + timedelta(days=5)
        else:
            week_end = now

        weekly_earnings = Appointment.objects.filter(
            doctor=user,
            date__gte=week_start,
            date__lte=week_end,
            approval_status_doctor='approved',
            approval_status_patient='approved'
        ).aggregate(
            total=Sum('doctor_availability__fee')
        )['total'] or 0.00

        # Monthly Earnings: Last 4 weeks
        month_start = today_start - timedelta(weeks=4)
        monthly_earnings = Appointment.objects.filter(
            doctor=user,
            date__gte=month_start,
            date__lte=now,
            approval_status_doctor='approved',
            approval_status_patient='approved'
        ).aggregate(
            total=Sum('doctor_availability__fee')
        )['total'] or 0.00

        return Response({
            "daily": float(daily_earnings),
            "weekly": float(weekly_earnings),
            "monthly": float(monthly_earnings)
        })
    
class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()  # Query your custom User model
    serializer_class = UserSerializer
    permission_classes = [AllowAny]  # Ensure the user is authenticated to access this viewset

    def get_queryset(self):
        if self.request.user.role == 'patient':
            return User.objects.filter(role='doctor')
        elif self.request.user.role == 'doctor':
            return User.objects.filter(role='patient')
        return User.objects.all()

    # Retrieve user profile
    @action(detail=False, methods=['get'], url_path='profile')
    def get_profile(self, request):
        user = request.user  # Get the currently authenticated user
        serializer = UserSerializer(user)  # Serialize the user data
        return Response(serializer.data)  # Return the serialized data

    # Update user profile (including password change)
    @action(detail=False, methods=['put'], url_path='update')
    def update_profile(self, request):
        user = request.user
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            new_password = request.data.get('newPassword')
            if new_password:
                user.set_password(new_password)  # Properly hash password
            serializer.save()  # Save via serializer to update fields
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UsersViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    #permission_classes = [IsAuthenticated]

    def retrieve(self, request, pk=None):
        patient = get_object_or_404(Patient, user__id=pk)
        serializer = self.get_serializer(patient)
        return Response(serializer.data)
        
class ConversationViewSet(viewsets.ModelViewSet):
    queryset = Conversation.objects.all()
    serializer_class = ConversationSerializer
    #permission_classes = [IsAuthenticated]

    def create(self, request):
        user = request.user
        participant_ids = request.data.get('participants', [])
        if not participant_ids:
            return Response({"error": "At least one participant is required"}, status=400)

        # Ensure the user is not trying to chat with themselves
        if user.id in participant_ids:
            return Response({"error": "Cannot create a conversation with yourself"}, status=400)

        # Check if a conversation already exists between these users
        participants = [user.id] + participant_ids
        existing_conversation = Conversation.objects.filter(participants__id__in=participants).distinct()
        if existing_conversation.exists():
            for conv in existing_conversation:
                if set(conv.participants.values_list('id', flat=True)) == set(participants):
                    serializer = self.get_serializer(conv)
                    return Response(serializer.data)

        # Create a new conversation
        conversation = Conversation.objects.create()
        conversation.participants.add(user)
        for participant_id in participant_ids:
            conversation.participants.add(participant_id)

        serializer = self.get_serializer(conversation)
        return Response(serializer.data, status=201)

class ChatLogViewSet(viewsets.ModelViewSet):
    queryset = ChatLog.objects.all()
    serializer_class = ChatLogSerializer
    #permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return ChatLog.objects.filter(Q(sender=user) | Q(receiver=user))

    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """ Mark a message as read by the receiver """
        chat_log = self.get_object()
        if chat_log.receiver == request.user:
            chat_log.is_read = True
            chat_log.save()

            # Create MessageReadReceipt record
            MessageReadReceipt.objects.create(
                chat_log=chat_log,
                user=request.user,
                is_read=True
            )

            return Response({'status': 'message marked as read'})

        return Response({'error': 'You cannot mark this message as read.'}, status=400)

class AvailableUsersViewSet(viewsets.ViewSet):
    #permission_classes = [IsAuthenticated]

    def list(self, request):
        user = request.user
        # Fetch all users excluding the current user
        available_users = User.objects.exclude(id=user.id)

        # Role-based filtering
        user_role = user.role if hasattr(user, 'role') else None
        if user_role == 'patient':
            # Patients can only chat with doctors
            available_users = available_users.filter(role='doctor')
        # Doctors can chat with everyone (no filtering needed)

        serializer = UserSerializer(available_users, many=True)
        return Response(serializer.data)

class MessageViewSet(viewsets.ViewSet):
    #permission_classes = [IsAuthenticated]

    def retrieve(self, request, pk=None):
        user = request.user
        try:
            conversation = Conversation.objects.get(id=pk, participants=user)
            messages = ChatLog.objects.filter(conversation=conversation)
            serializer = ChatLogSerializer(messages, many=True)
            return Response(serializer.data)
        except Conversation.DoesNotExist:
            return Response({"error": "Conversation not found or you're not a participant"}, status=404)

    @action(detail=True, methods=['post'], url_path='send')
    def send_message(self, request, pk=None):
        user = request.user
        try:
            conversation = Conversation.objects.get(id=pk, participants=user)
            message_data = request.data
            receiver_id = message_data.get('receiver_id')
            message = message_data.get('message')
            message_type = message_data.get('message_type', 'text')

            if not receiver_id or not message:
                return Response({"error": "receiver_id and message are required"}, status=400)

            receiver = User.objects.get(id=receiver_id)
            chat_log = ChatLog.objects.create(
                sender=user,
                receiver=receiver,
                message=message,
                message_type=message_type,
                conversation=conversation,
                sender_role=user.role if hasattr(user, 'role') else 'patient'
            )
            serializer = ChatLogSerializer(chat_log)
            return Response(serializer.data, status=201)

        except Conversation.DoesNotExist:
            return Response({"error": "Conversation not found or you're not a participant"}, status=404)
        except User.DoesNotExist:
            return Response({"error": "Receiver not found"}, status=404)

class MessageReadReceiptViewSet(viewsets.ModelViewSet):
    queryset = MessageReadReceipt.objects.all()
    serializer_class = MessageReadReceiptSerializer
    #permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return MessageReadReceipt.objects.filter(user=user)
    
class NotificationsViewSet(viewsets.ModelViewSet):
    queryset = Notifications.objects.all()
    serializer_class = NotificationsSerializer
    #permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Notification.objects.filter(user=user)

    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """ Mark notification as read """
        notification = self.get_object()
        if notification.user == request.user:
            notification.is_read = True
            notification.save()
            return Response({'status': 'notification marked as read'})

        return Response({'error': 'You cannot mark this notification as read.'}, status=400)



class CallLogViewSet(viewsets.ModelViewSet):
    queryset = CallSession.objects.all()
    serializer_class = CallLogSerializer
    #permission_classes = [permissions.IsAuthenticated]  

    def get_queryset(self):
        """Ensure users can only see their own call logs."""
        user = self.request.user
        if hasattr(user, 'doctor'):
            return CallSession.objects.filter(doctor=user.doctor)
        elif hasattr(user, 'patient'):
            return CallSession.objects.filter(patient=user.patient)
        return CallSession.objects.none()

    @action(detail=False, methods=["post"], url_name="start")
    def start(self, request):
        user = request.user
        doctor_id = request.data.get("doctor_id")
        patient_id = request.data.get("patient_id")

        if not doctor_id or not patient_id:
            return Response({"error": "Missing doctor_id or patient_id"}, status=400)

        try:
            doctor_id = int(doctor_id)
            patient_id = int(patient_id)
            doctor = User.objects.get(id=doctor_id)
            patient = User.objects.get(id=patient_id)

            # Relaxed authorization: allow if user is either doctor or patient
            if user.id not in [doctor_id, patient_id]:
                return Response({"error": "Unauthorized: User not part of this call"}, status=403)

            call_session = CallSession.objects.create(
                doctor=doctor,
                patient=patient,
                status="active"
            )
            return Response(CallLogSerializer(call_session).data, status=201)

        except (Doctor.DoesNotExist, Patient.DoesNotExist):
            return Response({"error": "Invalid doctor or patient ID"}, status=404)
        #except ValueError:
            #return Response({"error": "doctor_id and patient_id must be integers"}, status=400)

        
    @action(detail=False, methods=["post"], url_name="end")
    def end(self, request):
        """End an ongoing call session."""
        session_id = request.data.get("session_id")
        try:
            call_session = CallSession.objects.get(id=session_id, status="active")
            call_session.end_time = timezone.now()
            call_session.status = "ended"
            call_session.save()
            return Response({"message": "Call ended successfully"})
        except CallSession.DoesNotExist:
            return Response({"error": "Invalid or already ended session"}, status=400)

    @action(detail=True, methods=["get"], url_name="status")
    def status(self, request, pk=None):
        """Check if a call session is connected."""
        try:
            call_session = CallSession.objects.get(id=pk)
            is_connected = call_session.status == "active" and call_session.end_time is None
            # Log the status for debugging
            print(f"Call session {pk} status: {call_session.status}, end_time: {call_session.end_time}")
            return Response({"isConnected": is_connected})
        except CallSession.DoesNotExist:
            return Response({"isConnected": False}, status=404)

class AIReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.all()
    serializer_class = AIReportSerializer

def clean_symptoms(symptoms):
    """Helper function to clean symptoms."""
    if isinstance(symptoms, str):
        symptoms = [s.strip() for s in symptoms.split(",")]
    cleaned_symptoms = []
    for symptom in symptoms:
        if symptom:
            cleaned_symptoms.append(symptom.strip().replace(" ", "_").lower())
    return cleaned_symptoms

class AIModelViewSet(viewsets.ViewSet):

    @action(detail=False, methods=['get'])
    def previous_results(self, request):
        user = request.user  # Get the authenticated user
        if not user.is_authenticated:
            return Response({"error": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)
        
        results = AIModel.objects.filter(user=user).order_by('-created_at')  # Filter by user
        serializer = AIModelSerializer(results, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_name='analyze')
    def analyze(self, request):
        try:
            # Step 0: Ensure the user is authenticated
            user = request.user
            if not user.is_authenticated:
                return Response({"error": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)

            # Step 1: Validate the incoming data using the serializer
            serializer = AIAnalysisSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            # Step 2: Extract validated data
            input_text = serializer.validated_data.get('input_data', None)
            image = request.FILES.get('image', None)

            # Step 3: Preprocess inputs
            user_symptoms = []
            image_result = None
            ai_results = None
            
            if not input_text and not image:
                return Response({"error": "No symptoms or image provided."}, status=status.HTTP_400_BAD_REQUEST)

            # Process text input if provided
            if input_text:
                user_symptoms = clean_symptoms(input_text)
                ai_results = get_prediction_results(user_symptoms)
                if isinstance(ai_results, dict) and 'error' in ai_results:
                    return Response({'error': ai_results['error']}, status=status.HTTP_400_BAD_REQUEST)
                if not ai_results or not isinstance(ai_results, list):
                    return Response({'error': 'No valid results returned from the text AI model.'}, status=status.HTTP_400_BAD_REQUEST)

            # Process image input if provided
            if image:
                input_image = predict_skin_condition(image)
                image_result = image_analyzer(input_image)
                if isinstance(image_result, dict) and 'error' in image_result:
                    return Response({'error': image_result['error']}, status=status.HTTP_400_BAD_REQUEST)

            # Step 4: Combine and store results
            final_results = []
            
            if input_text and not image:  # Text only
                final_results = ai_results
            elif image and not input_text:  # Image only
                final_results = [image_result]
            elif input_text and image:  # Both
                final_results = ai_results  # Text results
                final_results.append(image_result)  # Add image result

            # Step 5: Store results in the database with source
            stored_results = []
            for result in final_results:
                required_fields = ['disease', 'probability', 'description', 'precautions']
                if not isinstance(result, dict) or not all(field in result for field in required_fields):
                    continue  # Skip invalid results

                # Determine source: image if this is the image_result, text otherwise
                source = 'image' if result == image_result and image else 'text'

                result_instance = AIModel.objects.create(
                    user=user,
                    disease=result['disease'],
                    probability=result['probability'],
                    description=result['description'],
                    precautions=result['precautions'],
                    symptoms=input_text if input_text else None,
                    image=image if image else None,
                    source=source  # Set the source field
                )
                stored_results.append(result_instance)
                print(f"Stored result: {result_instance}")

            # Step 6: Serialize and return the results
            if not stored_results:
                return Response({'error': 'No valid results to store.'}, status=status.HTTP_400_BAD_REQUEST)

            result_serializer = AIModelSerializer(stored_results, many=True)
            return Response(result_serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            print(f"Unexpected error: {str(e)}")
            return Response({'error': f'An unexpected error occurred: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PrescriptionViewSet(viewsets.ModelViewSet):
    queryset = Prescription.objects.all()
    serializer_class = PrescriptionSerializer

class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer

    def perform_create(self, serializer):
        doctor = self.request.user
        if doctor.role != 'doctor':
            return Response({"error": "Only doctors can create reports"}, status=status.HTTP_403_FORBIDDEN)

        patient_id = self.request.data.get('patientId')
        patient = User.objects.get(id=patient_id, role='patient')
        title = self.request.data.get('title')
        content = self.request.data.get('content')
        medication = self.request.data.get('prescriptions', 'No medication specified')

        prescription = Prescription.objects.create(
            doctor=doctor,
            patient=patient,
            medication=medication,
            dosage='As prescribed'
        )

        # Store as "DRAFT" instead of "PENDING"
        report = Report.objects.create(
            doctor=doctor,
            patient=patient,
            title=title,
            content=content,
            prescription=prescription,
            status='DRAFT'
        )

        serializer = self.get_serializer(report)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'], url_path='patient/(?P<patient_id>\d+)')
    def patient_reports(self, request, patient_id=None):
        reports = Report.objects.filter(patient__id=patient_id).exclude(status='DRAFT').order_by('-created_at')[:5]
        if not reports.exists():
            return Response({"message": "No reports found"}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = self.get_serializer(reports, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='request')
    def request_report(self, request):
        patient = request.user
        if patient.role != 'patient':
            return Response({"error": "Only patients can request reports"}, status=status.HTTP_403_FORBIDDEN)
        
        # Check if a draft report already exists for the patient
        draft_report = Report.objects.filter(patient=patient, status='DRAFT').first()
        
        if not draft_report:
            return Response({"error": "No draft report found for the patient."}, status=status.HTTP_404_NOT_FOUND)
        
        # Change the draft report's status to 'PENDING'
        draft_report.status = 'PENDING'
        draft_report.save()

        # Return the updated report to the patient
        serializer = self.get_serializer(draft_report)
        return Response(serializer.data, status=status.HTTP_200_OK)

        
    @action(detail=True, methods=['post'], url_path='approve')
    def approve_report(self, request, pk=None):
        report = self.get_object()
        
        if request.user.role != 'doctor':
            return Response({"error": "Only doctors can approve reports"}, status=status.HTTP_403_FORBIDDEN)
        if report.doctor != request.user:
            return Response({"error": "Only the creating doctor can approve this report"}, status=status.HTTP_403_FORBIDDEN)
        
        report.status = 'APPROVED'
        report.save()
        serializer = self.get_serializer(report)
        return Response(serializer.data)

            
class MatchDoctorViewSet(viewsets.ModelViewSet):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer

    @action(detail=False, methods=['post'])
    def match_patient_with_doctor(self, request):
        patient_id = request.data.get('patient_id')

        try:
            patient = Patient.objects.get(id=patient_id)

            online_doctors = Doctor.objects.filter(online_status=True)

            matched_doctors = []
            for doctor in online_doctors:
                leave_periods = DoctorLeave.objects.filter(doctor=doctor)
                is_on_leave = any(leave.start_date <= patient.created_at <= leave.end_date for leave in leave_periods)

                if not is_on_leave:
                    matched_doctors.append(doctor)

            if matched_doctors:
                matched_doctor = matched_doctors[0]
                return Response({
                    "message": "Match successful",
                    "doctor": matched_doctor.user.username,
                })
            else:
                return Response({
                    "message": "No doctor available or doctor is on leave",
                }, status=status.HTTP_404_NOT_FOUND)

        except Patient.DoesNotExist:
            return Response({"error": "Patient not found"}, status=status.HTTP_404_NOT_FOUND)

    
    @action(detail=True, methods=['patch','put'])
    def update_availability(self, request, pk=None):
        try:
            doctor = Doctor.objects.get(id=pk)
            availability_status = request.data.get('availability_status')
            if availability_status not in ['available', 'on_leave']:
                return Response({"error": "Invalid availability status"}, status=status.HTTP_400_BAD_REQUEST)
            doctor.availability_status = availability_status
            doctor.save()
            return Response({"message": "Doctor availability status updated successfully"}, status=status.HTTP_200_OK)
        except Doctor.DoesNotExist:
            return Response({"error": "Doctor not found"}, status=status.HTTP_404_NOT_FOUND)
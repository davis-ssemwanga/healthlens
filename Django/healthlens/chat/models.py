from django.db import models
from django.core.mail import send_mail
from users.models import User

class Conversation(models.Model):
    participants = models.ManyToManyField(User)
    started_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Conversation between {', '.join([user.username for user in self.participants.all()])}"


class ChatLog(models.Model):
    MESSAGE_TYPE_CHOICES = [
        ('text', 'Text'),
        ('image', 'Image'),
        ('file', 'File'),
    ]
    
    STATUS_CHOICES = [
        ('sent', 'Sent'),
        ('failed', 'Failed'),
        ('pending', 'Pending'),
    ]

    ROLE_CHOICES = [
        ('doctor', 'Doctor'),
        ('patient', 'Patient'),
    ]
    
    sender = models.ForeignKey(User, related_name='sent_messages', on_delete=models.CASCADE)
    receiver = models.ForeignKey(User, related_name='received_messages', on_delete=models.CASCADE)
    message_type = models.CharField(max_length=10, choices=MESSAGE_TYPE_CHOICES, default='text')
    message = models.TextField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='sent')
    is_read = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Media fields for attachments
    image = models.ImageField(upload_to='chat_images/', null=True, blank=True)
    file = models.FileField(upload_to='chat_files/', null=True, blank=True)
    
    # Conversation threading
    conversation = models.ForeignKey(Conversation, related_name='messages', on_delete=models.CASCADE, default=1)
    
    # User role information
    sender_role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='patient')

    # Read receipt for each user
    read_receipts = models.ManyToManyField(User, through='MessageReadReceipt', related_name='read_messages')

    def __str__(self):
        return f"Chat between {self.sender.username} and {self.receiver.username} at {self.timestamp}"

    def save(self, *args, **kwargs):
        # Check if this is a new message (not an update)
        is_new = self.pk is None
        super().save(*args, **kwargs)  # Save the message first
        
        if is_new:  # Only send notifications for new messages
            self.send_notification()
            self.send_email_notification()

    def send_notification(self):
        """Send a notification to the receiver of the message."""
        Notifications.objects.create(
            user=self.receiver,
            message=f"New message from {self.sender.username}: {self.message[:50]}{'...' if len(self.message) > 50 else ''}"
        )

    def send_email_notification(self):
        """Send an email to the receiver about the new message."""
        subject = f"New Message from {self.sender.username}"
        message = f"Hi {self.receiver.username},\n\nYou have a new message from {self.sender.username}.\n\nLog in to reply\n\nBest,\nHealthlens"
        from_email = 'healthlenz@gmail.com'  # Match your existing email setup
        recipient_list = [self.receiver.email]

        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=from_email,
                recipient_list=recipient_list,
                fail_silently=False,
            )
        except Exception as e:
            # Log the error if email sending fails (optional)
            print(f"Failed to send email to {self.receiver.email}: {str(e)}")

class MessageReadReceipt(models.Model):
    chat_log = models.ForeignKey(ChatLog, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    is_read = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Read receipt for {self.chat_log} by {self.user.username}"


class Notifications(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Notification for {self.user.username}: {self.message}"


class AuditLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    action = models.CharField(max_length=255)
    timestamp = models.DateTimeField(auto_now_add=True)
    chat_log = models.ForeignKey(ChatLog, null=True, blank=True, on_delete=models.SET_NULL)

    def __str__(self):
        return f"{self.user.username} performed action '{self.action}' on {self.timestamp}"


class UserBlock(models.Model):
    blocker = models.ForeignKey(User, related_name='blocked_users', on_delete=models.CASCADE)
    blocked = models.ForeignKey(User, related_name='blockers', on_delete=models.CASCADE)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.blocker.username} blocked {self.blocked.username}"
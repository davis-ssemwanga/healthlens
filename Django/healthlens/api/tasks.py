# 
from django.core.mail import send_mail
import random

def send_otp_email(email, otp):
    subject = 'Verify Your Email'
    message = f'Your OTP is: {otp}'
    from_email = 'healthlenz@gmail.com'
    recipient_list = [email]
    send_mail(subject, message, from_email, recipient_list)

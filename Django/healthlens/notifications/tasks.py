#from celery import shared_task
#from django.core.mail import send_mail

#@shared_task
def send_async_email(subject, message, recipient_list):
#    send_mail(subject, message, 'noreply@healthlens.com', recipient_list)
    return(subject, message, recipient_list)

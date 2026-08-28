import secrets
import string

from django.core.mail import send_mail
from django.db import transaction
from django.conf import settings

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import CustomUser
from .serializers import TeacherCreateUserSerializer


class TeacherCreateUserView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.user_type != 'teacher':
            return Response(
                {
                    'detail': 'Только педагог может создавать пользователей.'
                },
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = TeacherCreateUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        password = self.generate_password()

        with transaction.atomic():
            user = serializer.save(
                username=secrets.token_hex(16),
                base_teacher=request.user.id,
                is_identy=False,
            )

            user.set_password(password)
            user.save(update_fields=['password'])

            send_mail(
                subject='Данные для входа',
                message=(
                    f'Здравствуйте, {user.name} {user.surname}!\n\n'
                    f'Для вас была создана учётная запись.\n\n'
                    f'Email: {user.email}\n'
                    f'Пароль: {password}\n\n'
                    f'Используйте эти данные для входа в систему.'
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )

        return Response(
            {
                'id': str(user.id),
                'email': user.email,
                'name': user.name,
                'surname': user.surname,
                'user_type': user.user_type,
                'message': 'Пользователь создан. Пароль отправлен на email.'
            },
            status=status.HTTP_201_CREATED
        )

    @staticmethod
    def generate_password(length=12):
        alphabet = string.ascii_letters + string.digits

        return ''.join(
            secrets.choice(alphabet)
            for _ in range(length)
        )



class ReturnTypeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({"type": user.user_type}, status=200)

# Create your views here.

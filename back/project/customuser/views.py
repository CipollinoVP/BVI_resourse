import secrets
import string
import requests

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

            text_content = f""""
                Здравствуйте, {user.name} {user.surname}!
                    
                    Для вас была создана учётная запись.
                    Email: {user.email}
                    Пароль: {password}
                    Используйте эти данные для входа в систему.
            """

            html_content = f""""
                            <h3>
                            Здравствуйте, {user.name} {user.surname}!
                            </h3>
                            <p>
                                Для вас была создана учётная запись. <br/>
                                Email: {user.email} <br/>
                                Пароль: {password} <br/><br/>
                                Используйте эти данные для входа в систему.
                            </p>
                        """

            requests.post("http://172.17.0.1:8116/",json={
                    "email": [user.email],
                    "subject": "Данные для входа",
                    "text_message": text_content,
                    "html_message": html_content,
                }
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

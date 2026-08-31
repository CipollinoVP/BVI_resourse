from django.db import models
from django.contrib.auth.models import AbstractUser
import uuid

class CustomUser(AbstractUser):
    USER_TYPE_CHOICES = [
        ('teacher', 'Педагог'),
        ('child', 'Ученик'),
        ('parent', 'Родитель'),
        ('admin', 'Администратор'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField('Email', blank=False, unique=True)
    name = models.CharField(verbose_name="Имя", max_length=100, blank=True, null=True)
    surname = models.CharField(verbose_name="Фамилия", max_length=100, blank=True, null=True)
    phone = models.CharField(verbose_name="Телефон", max_length=100, blank=True, null=True)
    tg_nick = models.CharField(verbose_name="Ник телеграм", max_length=100, blank=True, null=True)
    user_type = models.CharField(verbose_name="Тип пользователя", max_length=20, choices=USER_TYPE_CHOICES, default='child')
    is_identy = models.BooleanField(verbose_name="Подтверждённый пользователь", default=False)
    base_teacher = models.UUIDField(verbose_name="Добавивший педагог", null=True, blank=True)
    commentary = models.CharField(verbose_name="Примечание", max_length=255, blank=True, null=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    @property
    def chat_view(self):
        return f"{self.surname} {self.name[0]}."

    @property
    def bvi_view(self):
        return f"{self.surname} {self.name} ({self.commentary})"

    def __str__(self):
        return self.email

    class Meta:
        verbose_name = 'Пользователи'
        verbose_name_plural = 'Пользователи'

# Create your models here.

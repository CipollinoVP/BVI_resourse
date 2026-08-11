import datetime
import uuid

from django.db import models
from django.contrib.auth import get_user_model
from messenger.models import ClassModel


CustomUser = get_user_model()


weekdays = [
    ("Monday", "Monday"),
    ("Tuesday", "Tuesday"),
    ("Wednesday", "Wednesday"),
    ("Thursday", "Thursday"),
    ("Friday", "Friday"),
    ("Saturday", "Saturday"),
    ("Sunday", "Sunday"),
]


class TeacherModel(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)
    fio = models.CharField(verbose_name="ФИО", max_length=255)

    def __str__(self):
        return self.fio

    class Meta:
        verbose_name = "Педагог (в расписании)"
        verbose_name_plural = "Педагог (в расписании)"



class RegularLessonModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    teacher = models.ForeignKey(TeacherModel, verbose_name="Педагог", on_delete=models.SET_NULL, null=True, blank=True)
    group = models.ForeignKey(ClassModel, verbose_name="Группа", on_delete=models.CASCADE, null=True, blank=True)
    weekday = models.CharField(verbose_name="День недели", choices=weekdays, max_length=20, default="Monday")
    name = models.CharField(verbose_name="Предмет", max_length=100, blank=True, null=True)
    start_time = models.TimeField(verbose_name="Начало", auto_now_add=True)
    finish_time = models.TimeField(verbose_name="Конец", auto_now_add=True)
    start_schedule = models.DateField(verbose_name="Дата начала действия расписания", auto_now_add=True)
    end_schedule = models.DateField(verbose_name="Дата окончания действия расписания", auto_now_add=True)

    def __str__(self):
        return f"{self.name} {self.group.name}"

    class Meta:
        verbose_name = "Регулярные занятия"
        verbose_name_plural = "Регулярные занятия"


class IrregularLessonModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    teacher = models.ForeignKey(TeacherModel, verbose_name="Педагог", on_delete=models.SET_NULL, null=True, blank=True)
    group = models.ForeignKey(ClassModel, verbose_name="Группа", on_delete=models.CASCADE, null=True, blank=True)
    name = models.CharField(verbose_name="Предмет", max_length=100, blank=True, null=True)
    start_time = models.TimeField(verbose_name="Начало", auto_now_add=True)
    finish_time = models.TimeField(verbose_name="Конец", auto_now_add=True)
    date = models.DateField(verbose_name="Дата", default=datetime.date.today)

    def __str__(self):
        return f"{self.name} {self.group.name}"

    class Meta:
        verbose_name = "Разовые занятия"
        verbose_name_plural = "Разовые занятия"


class CancelLessonModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lesson = models.ForeignKey(RegularLessonModel, verbose_name="Отменённое занятие", on_delete=models.CASCADE, null=True, blank=True, related_name="canceled")
    date = models.DateField(verbose_name="Дата отмены", auto_now_add=True)

    class Meta:
        verbose_name = "Отмены занятий"
        verbose_name_plural = "Отмены занятий"

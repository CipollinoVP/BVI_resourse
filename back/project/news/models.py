import uuid

from ckeditor_uploader.fields import RichTextUploadingField
from django.db import models

class News(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    date = models.DateField(verbose_name="Дата", blank=True, null=True)
    title = models.CharField(verbose_name="Заголовок", max_length=300, blank=True, null=True)
    announce = RichTextUploadingField("Текст", blank=True, null=True)

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = "Новость"
        verbose_name_plural = "Новости"
# Create your models here.


class Files(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    file = models.FileField(upload_to="media/")
    name = models.CharField(verbose_name="Имя файла", max_length=300, blank=True, null=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Файл"
        verbose_name_plural = "Файлы"
from django.db import models


class Drawing(models.Model):
    file = models.FileField(verbose_name="Файл", upload_to="media/drawings/")
    child_name = models.CharField(verbose_name="Имя ребёнка", max_length=300, blank=True, null=True)
    theme = models.CharField(verbose_name="Тема занятия", max_length=300, blank=True, null=True)
    title = models.CharField(verbose_name="Название работы", max_length=300, blank=True, null=True)
    date = models.DateField(verbose_name="Дата", blank=True, null=True)

    def __str__(self):
        return self.title or self.theme or self.child_name or f"Рисунок #{self.pk}"

    class Meta:
        verbose_name = "Детский рисунок"
        verbose_name_plural = "Детские рисунки"
        ordering = ("-date", "-id")


class Photo(models.Model):
    file = models.FileField(verbose_name="Файл", upload_to="media/photos/")
    child_name = models.CharField(verbose_name="Имя ребёнка", max_length=300, blank=True, null=True)
    theme = models.CharField(verbose_name="Тема занятия", max_length=300, blank=True, null=True)
    date = models.DateField(verbose_name="Дата", blank=True, null=True)

    def __str__(self):
        return self.theme or self.child_name or f"Фото #{self.pk}"

    class Meta:
        verbose_name = "Фотография за работой"
        verbose_name_plural = "Фотографии за работой"
        ordering = ("-date", "-id")

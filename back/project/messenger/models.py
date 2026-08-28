from django.db import models
import uuid
from ckeditor_uploader.fields import RichTextUploadingField

from django.contrib.auth import get_user_model

CustomUser = get_user_model()

class GroupModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    @property
    def get_parent_class(self):
        # Обращаемся к related_name 'parent_group'
        if hasattr(self, 'parent_group'):
            return self.parent_group  # Это объект ClassModel
        elif hasattr(self, 'child_group'):
            return self.child_group
        else:
            return None


    @property
    def get_group_name(self):
        if hasattr(self, 'parent_group'):
            return f"{self.parent_group.name}: Родители"
        elif hasattr(self, 'child_group'):
            return f"{self.child_group.name}: Дети"
        else:
            return None

    class Meta:
        verbose_name = 'Групповые чаты'
        verbose_name_plural = 'Групповые чаты'


class TypeClassModel(models.Model):
    name = models.CharField(max_length=100)

    class Meta:
        verbose_name = "Тип группы"
        verbose_name_plural = "Типы групп"

class ClassModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    parent_chat = models.OneToOneField(GroupModel, on_delete=models.CASCADE, related_name='parent_group')
    child_chat = models.OneToOneField(GroupModel, on_delete=models.CASCADE, related_name='child_group')

    class Meta:
        verbose_name = 'Группы'
        verbose_name_plural = 'Группы'

    def __str__(self):
        return self.name


class ClassTeacherLink(models.Model):
    group = models.ForeignKey(ClassModel, on_delete=models.CASCADE, related_name='teacher_links')
    teacher = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='class_links')
    last_read_child_chat = models.DateTimeField(blank=True, null=True)
    last_read_parent_chat = models.DateTimeField(blank=True, null=True)

    class Meta:
        verbose_name = 'Таблица связей учитель-класс'
        verbose_name_plural = 'Таблица связей учитель-класс'


class ClassTypesLink(models.Model):
    type_model = models.ForeignKey(TypeClassModel, on_delete=models.CASCADE, related_name='type_links')
    class_model = models.ForeignKey(ClassModel, on_delete=models.CASCADE, related_name='type_links')

    class Meta:
        verbose_name = 'Таблица связей тип-класс'
        verbose_name_plural = 'Таблица связей тип-класс'


class GroupLinkModel(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, blank=True, null=True, related_name='group_links')
    group = models.ForeignKey(GroupModel, on_delete=models.CASCADE, blank=True, null=True, related_name='user_links')
    last_read = models.DateTimeField(auto_now=True, blank=True, null=True)

class MessageInGroupModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group = models.ForeignKey(GroupModel, on_delete=models.CASCADE)
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    message = models.CharField(verbose_name="Сообщение", max_length=300, blank=True, null=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"{self.user.email} {self.created_at}"

    class Meta:
        verbose_name = 'Сообщения в группах'
        verbose_name_plural = 'Сообщения в группах'

class MessageInTeacherChatModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    teacher = models.ForeignKey(CustomUser, on_delete=models.CASCADE, verbose_name="Педагог", related_name='teacher_messages')
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, verbose_name="Пользователь", related_name='student_messages')
    message = models.CharField(verbose_name="Сообщение", max_length=300, blank=True, null=True)
    from_teacher = models.BooleanField(verbose_name="От педагога", default=False)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"{self.user.email} {self.created_at}"

    class Meta:
        verbose_name = 'Сообщения с педагогом'
        verbose_name_plural = 'Сообщения с педагогом'


class DeletedMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    message = models.CharField(verbose_name="Сообщение", max_length=300, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    info_about = models.CharField(verbose_name="Информация о сообщении", max_length=300, blank=True, null=True)

    def __str__(self):
        return f"{self.user.email} {self.created_at}"

    class Meta:
        verbose_name = "Удалённые сообщения"
        verbose_name_plural = "Удалённые сообщения"


class AnnouncementInClass(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    group = models.ForeignKey(ClassModel, on_delete=models.CASCADE)
    date = models.DateField(auto_now_add=True)
    title = models.CharField(verbose_name="Заголовок", max_length=300, blank=True, null=True)
    img = models.ImageField(upload_to="media/")
    announce = RichTextUploadingField("Текст", blank=True, null=True)

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = "Объявления для класса"
        verbose_name_plural = "Объявления для класса"


class AnnouncementGlobal(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    date = models.DateField(auto_now_add=True)
    title = models.CharField(verbose_name="Заголовок", max_length=300, blank=True, null=True)
    img = models.ImageField(upload_to="media/", blank=True, null=True)
    announce = RichTextUploadingField("Текст", blank=True, null=True)
    for_all = models.BooleanField(default=False, verbose_name="Общее")

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = "Объявления общие"
        verbose_name_plural = "Объявления общие"


class AnnounceTypeLink(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    announce = models.ForeignKey(AnnouncementGlobal, on_delete=models.CASCADE, related_name="type_links")
    type_group = models.ForeignKey(TypeClassModel, on_delete=models.CASCADE, related_name="announcement_links")

    class Meta:
        verbose_name = "Таблица связей тип-объявление"
        verbose_name_plural = "Таблица связей тип-объявление"

class TeacherTeacherMetaLink(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="TeacherLinkTeacher")
    companion = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="TeacherLinkCompanion")
    status = models.CharField(max_length=20, choices=[('student', 'student'), ('teacher', 'teacher')], default='student')

    class Meta:
        verbose_name = "Системная информация по чатам препод-препод"
        verbose_name_plural = "Системная информация по чатам препод-препод"
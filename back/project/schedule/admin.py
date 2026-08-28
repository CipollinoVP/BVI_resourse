from django.contrib import admin
from .models import RegularLessonModel, IrregularLessonModel, CancelLessonModel, TeacherModel

admin.site.register(RegularLessonModel)
admin.site.register(IrregularLessonModel)
admin.site.register(CancelLessonModel)
admin.site.register(TeacherModel)
# Register your models here.

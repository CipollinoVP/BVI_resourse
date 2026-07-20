from django.contrib import admin
from .models import RegularLessonModel, IrregularLessonModel, CancelLessonModel

admin.site.register(RegularLessonModel)
admin.site.register(IrregularLessonModel)
admin.site.register(CancelLessonModel)
# Register your models here.

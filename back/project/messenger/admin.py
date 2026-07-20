from django.contrib import admin
from .models import MessageInGroupModel, MessageInTeacherChatModel, ClassModel, GroupModel, GroupLinkModel, DeletedMessage, TypeClassModel, AnnouncementInClass, AnnouncementGlobal, AnnounceTypeLink, ClassTypesLink, ClassTeacherLink

admin.site.register(MessageInGroupModel)
admin.site.register(MessageInTeacherChatModel)
admin.site.register(ClassModel)
admin.site.register(GroupModel)
admin.site.register(GroupLinkModel)
admin.site.register(DeletedMessage)
admin.site.register(TypeClassModel)
admin.site.register(AnnouncementInClass)
admin.site.register(AnnouncementGlobal)
admin.site.register(AnnounceTypeLink)
admin.site.register(ClassTeacherLink)
admin.site.register(ClassTypesLink)
# Register your models here.

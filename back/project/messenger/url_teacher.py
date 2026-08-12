from django.contrib import admin
from django.urls import path
from .views_teacher import GetClassInfoView, GetChatInfo, GetAdminPersonal, AnnouncementGroupAPIView

urlpatterns = [
    path('get_class_info/<uuid:class_uuid>/', GetClassInfoView.as_view(), name='get_class_info'),
    path('chat/<uuid:uuid>/', GetChatInfo.as_view(), name='chat'),
    path('user_chat/<uuid:uuid>/', GetAdminPersonal.as_view(), name='user_chat'),
    path('announcement/group/<uuid:uuid>/', AnnouncementGroupAPIView.as_view(), name='announcements')
]
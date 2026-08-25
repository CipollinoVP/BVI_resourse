from django.urls import path
from .views_teacher import GetClassInfoView, GetChatInfo, GetAdminPersonal, AnnouncementGroupAPIView, \
    GetMessageMonitoringView

urlpatterns = [
    path('get_class_info/<uuid:class_uuid>/', GetClassInfoView.as_view(), name='get_class_info'),
    path('chat/<uuid:uuid>/', GetChatInfo.as_view(), name='chat'),
    path('user_chat/<uuid:uuid>/', GetAdminPersonal.as_view(), name='user_chat'),
    path('announcement/group/<uuid:uuid>/', AnnouncementGroupAPIView.as_view(), name='announcements'),
    path('message_group_monitoring/<uuid:uuid>/', GetMessageMonitoringView.as_view(), name='message_group_monitoring'),
]
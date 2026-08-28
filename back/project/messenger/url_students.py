from django.urls import path
from .views_teacher import GetChatInfo, AnnouncementGroupAPIView
from announcement.views import GlobalAnnouncementsForAllView, \
    GlobalAnnouncementsView

from .views_students import (
    GetTeacherChatsView,
    GetTeacherPersonalChatView,
    GetTeacherPersonalMessageMonitoringView,
    GetTeacherPersonalPaginationView,
)

urlpatterns = [
    path('chat/<uuid:uuid>/', GetChatInfo.as_view(), name='chat'),
    path('announcement/group/<uuid:uuid>/', AnnouncementGroupAPIView.as_view(), name='announcements'),
    path('announcement/default/', GlobalAnnouncementsForAllView.as_view(), name='announcements'),
    path('announcement/user/', GlobalAnnouncementsView.as_view(), name='announcements'),
    path(
        "parent/chats/",
        GetTeacherChatsView.as_view(),
        name="parent-teacher-chats",
    ),

    # Конкретный чат с педагогом
    path(
        "parent/chats/<uuid:uuid>/",
        GetTeacherPersonalChatView.as_view(),
        name="parent-teacher-chat",
    ),

    # Мониторинг
    path(
        "parent/chats/<uuid:uuid>/monitoring/",
        GetTeacherPersonalMessageMonitoringView.as_view(),
        name="parent-teacher-chat-monitoring",
    ),

    # Пагинация
    path(
        "parent/chats/<uuid:uuid>/pagination/",
        GetTeacherPersonalPaginationView.as_view(),
        name="parent-teacher-chat-pagination",
    )
]
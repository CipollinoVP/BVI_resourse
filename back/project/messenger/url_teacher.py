from django.urls import path
from .views_teacher import GetClassInfoView, GetChatInfo, GetAdminPersonal, AnnouncementGroupAPIView, \
    GetMessageMonitoringView, GetPersonalMessageMonitoringView, GetGroupPaginationView, GetPersonalPaginationView, AddParticipantView
from announcement.views import TypeClassCreateView, GroupTagAssignView, GlobalAnnouncementCreateView
from customuser.views import TeacherCreateUserView
from mainapp.views import  TeacherMainView

urlpatterns = [
    path('get_class_info/<uuid:class_uuid>/', GetClassInfoView.as_view(), name='get_class_info'),
    path('chat/<uuid:uuid>/', GetChatInfo.as_view(), name='chat'),
    path('user_chat/<uuid:uuid>/', GetAdminPersonal.as_view(), name='user_chat'),
    path('add_participant/<uuid:uuid>/', AddParticipantView.as_view(), name='user_chat'),
    path('announcement/group/<uuid:uuid>/', AnnouncementGroupAPIView.as_view(), name='announcements'),
    path('message_group_monitoring/<uuid:uuid>/', GetMessageMonitoringView.as_view(), name='message_group_monitoring'),
    path('message_personal_monitoring/<uuid:uuid>/', GetPersonalMessageMonitoringView.as_view(), name='message_personal_monitoring'),
    path('message_group_pagination/<uuid:uuid>/', GetGroupPaginationView.as_view(), name='message_group_pagination'),
    path('message_personal_pagination/<uuid:uuid>/', GetPersonalPaginationView.as_view(), name='message_personal_pagination'),
    path(
        "announcement/tags/",
        TypeClassCreateView.as_view(),
        name="announcement-tag-create",
    ),
    path(
        "announcement/create/",
        GlobalAnnouncementCreateView.as_view(),
        name="announcement-create",
    ),

    # Тэги конкретного класса
    path(
        "announcement/groups/<uuid:class_id>/tags/",
        GroupTagAssignView.as_view(),
        name="announcement-group-tags",
    ),
    path("main/", TeacherMainView.as_view(), name="main"),
    path('create-user/', TeacherCreateUserView.as_view(), name='create_user'),
]
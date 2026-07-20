from django.shortcuts import render, get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.contrib.auth import get_user_model

from schedule.utils import get_schedule_for_week
from .models import GroupModel, ClassModel, GroupLinkModel, MessageInGroupModel, ClassTeacherLink, \
    MessageInTeacherChatModel, AnnouncementInClass


CustomUser = get_user_model()

#Преподские ручки
PAGINATION_SIZE = 20

def get_info_about_users(group_local: GroupModel, group_global: ClassModel, type_group: str, user: CustomUser):
    chat_dict = {"uuid": group_local.id}
    last_messages = MessageInGroupModel.objects.filter(group=group_local).order_by(
        '-created_at')
    if last_messages.count() == 0:
        chat_dict["surname"] = "NONE"
        chat_dict["last_teacher"] = False
        chat_dict["last_message"] = "NONE"
        chat_dict["last_time"] = "NONE"
        chat_dict["is_read"] = True
    else:
        last_message = last_messages.first()
        chat_dict["surname"] = last_message.user.surname
        chat_dict["last_teacher"] = (last_message.user == user)
        chat_dict["last_message"] = last_message.message
        chat_dict["last_time"] = last_message.created_at
        if type_group == "parent":
            last_time_check = ClassTeacherLink.objects.get(group=group_global, teacher=user).last_read_parent_chat
        else:
            last_time_check = ClassTeacherLink.objects.get(group=group_global, teacher=user).last_read_child_chat
        chat_dict["is_read"] = (
                last_time_check is not None and
                last_message.created_at <= last_time_check
        )

    participants = CustomUser.objects.filter(group_links__group=group_local).prefetch_related('student_messages')
    participants_array = []
    for participant in participants:
        participant_result = {
            "uuid": participant.id,
            "surname": participant.surname
        }
        last_messages = MessageInTeacherChatModel.objects.filter(user=participant).order_by('-created_at')
        if last_messages.count() == 0:
            participant_result["last_message"] = None
            participant_result["last_teacher"] = None
            participant_result["last_time"] = None
            participant_result["is_read"] = True
        else:
            last_message = last_messages.first()
            participant_result["last_message"] = last_message.message
            participant_result["last_teacher"] = last_message.from_teacher
            participant_result["last_time"] = last_message.created_at
            participant_result["is_read"] = last_message.is_read
        participants_array.append(participant_result)

    sorted_participants_array = sorted(participants_array, key=lambda i: i["last_time"], reverse=True)

    return chat_dict, sorted_participants_array



class GetClassInfoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, class_uuid):
        user = request.user
        if user.user_type != "teacher":
            Response({"error": "No access"}, status=status.HTTP_403_FORBIDDEN)

        class_group = get_object_or_404(ClassModel, id=class_uuid)
        data = {"name": class_group.name}
        if class_group.parent_chat:
            data["parents_chat"], data["sort_parents"] = get_info_about_users(class_group.parent_chat, class_group,
                                                                              "parent", user)
        if class_group.child_chat:
            data["child_chat"], data["sort_children"] = get_info_about_users(class_group.child_chat, class_group,
                                                                              "child", user)

        announcements = AnnouncementInClass.objects.filter(group=class_group).order_by('-date')
        total_pages = int(announcements.count() / PAGINATION_SIZE)
        pagination = {
            "total_pages": total_pages if announcements.count() % PAGINATION_SIZE == 0 else total_pages + 1,
            "total_count": announcements.count(),
        }
        announcements_result = []
        for announcement in announcements:
            announcement_dict = {
                "uuid": announcement.id,
                "title": announcement.title,
                "date": announcement.date,
                "text": announcement.announce,
                "img": announcement.img.url,
            }
            announcements_result.append(announcement_dict)

        data["announcements"] = {
            "result": announcements_result,
            "pagination": pagination,
        }

        data["schedule"] = get_schedule_for_week(class_group)

        return Response({"data": data}, status=status.HTTP_200_OK)

























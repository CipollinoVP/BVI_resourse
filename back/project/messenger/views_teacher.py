from django.core.paginator import Paginator
from django.utils import timezone

from django.shortcuts import render, get_object_or_404
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.contrib.auth import get_user_model

from schedule.utils import get_schedule_for_week
from .models import GroupModel, ClassModel, GroupLinkModel, MessageInGroupModel, ClassTeacherLink, \
    MessageInTeacherChatModel, AnnouncementInClass, DeletedMessage, TeacherTeacherMetaLink


CustomUser = get_user_model()

#Преподские ручки
PAGINATION_SIZE = 20
PAGINATION_MESSENGER_SIZE = 50

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
            return Response({"error": "No access"}, status=status.HTTP_403_FORBIDDEN)

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


class GetChatInfo(APIView):
    permission_classes = [IsAuthenticated]

    def _get_chat(self, user, uuid):
        chat = get_object_or_404(GroupModel, id=uuid)

        if user.user_type != "teacher":
            if not GroupLinkModel.objects.filter(group=chat, user=user).exists():
                raise PermissionDenied()

        return chat

    def get(self, request, uuid):
        user = request.user
        chat = self._get_chat(request.user, uuid)
        resp_dict = {
            "name_chat": chat.get_group_name,
            "meta": [
                "UUID",
                "text",
                "arriver",
                "sent_datetime",
                "is_read"
            ]
        }
        messages = (
            MessageInGroupModel.objects
            .filter(group=chat)
            .order_by('-created_at')[:PAGINATION_MESSENGER_SIZE]
            .select_related("user")
        )
        if messages:
            pagination_dict = {
                "first": messages[-1].id,
                "last": messages[0].id
            }
            check_query = MessageInGroupModel.objects.filter(
                created_at__lt=messages[-1].created_at,
                group=chat,
            ).exists()
            if check_query:
                pagination_dict["has_next"] = True
            else:
                pagination_dict["has_next"] = False
        else:
            pagination_dict = {
                "first": None,
                "last": None,
                "has_next": False,
            }

        messages_result = []
        for message in messages:
            message_res = [
                message.id,
                message.message,
                message.user.chat_view if message.user is not user else "me",
                message.created_at,
                message.is_read,
            ]
            messages_result.append(message_res)

        resp_dict["messages"] = messages_result
        resp_dict["pagination"] = pagination_dict
        return Response({"data": resp_dict}, status=status.HTTP_200_OK)


    def post(self, request, uuid):
        user = request.user
        chat = self._get_chat(request.user, uuid)

        text = self.request.data.get('text')
        if not text:
           return Response({"error": "No text"}, status=status.HTTP_400_BAD_REQUEST)
        message = MessageInGroupModel.objects.create(
            user=user,
            message=text,
            group=chat
        )
        data = {
            "uuid": message.id,
            "text": message.message
        }
        return Response({"data": data}, status=status.HTTP_201_CREATED)


    def patch(self, request, uuid):
        user = request.user
        chat = self._get_chat(request.user, uuid)

        uuid_changed = self.request.data.get('uuid')
        text = self.request.data.get('text')
        if not text:
           return Response({"error": "No text"}, status=status.HTTP_400_BAD_REQUEST)
        message = get_object_or_404(MessageInGroupModel, pk=uuid_changed, group=chat)

        if message.user != user:
            return Response({"error": "No access"}, status=status.HTTP_403_FORBIDDEN)

        deleted_message = DeletedMessage.objects.create(
            user=user,
            message=message.message,
            info_about=f"{message.created_at} {chat.get_group_name}",
        )
        message.message = text
        message.updated_at = timezone.now()
        message.save()

        data = {
            "uuid": message.id,
            "text": message.message
        }

        return Response({"data": data}, status=status.HTTP_200_OK)


    def delete(self, request, uuid):
        user = request.user
        chat = self._get_chat(request.user, uuid)

        uuid_deleted = self.request.data.get('uuid')
        message = get_object_or_404(MessageInGroupModel, pk=uuid_deleted, group=chat)

        if user.user_type != "teacher":
            if message.user != user:
                return Response({"error": "No access"}, status=status.HTTP_403_FORBIDDEN)

        deleted_message = DeletedMessage.objects.create(
            user=user,
            message=message.message,
            info_about=f"{message.created_at} {chat.get_group_name}",
        )
        message.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)



class GetAdminPersonal(APIView):
    permission_classes = [IsAuthenticated]

    def _get_student(self, user, uuid):
        if user.user_type != "teacher":
            raise PermissionDenied()

        student = get_object_or_404(CustomUser, id=uuid)

        return student


    def _get_is_user_teacher(self, user, student):
        is_user_teacher = True
        if student.user_type == 'teacher':
            link = TeacherTeacherMetaLink.objects.filter(
                user=user,
                companion=student
            ).first()
            if link is None:
                link = TeacherTeacherMetaLink.objects.create(
                    user=user,
                    companion=student,
                    status='teacher'
                )
                link_reserve = TeacherTeacherMetaLink.objects.create(
                    user=student,
                    companion=user,
                    status='student'
                )

            if link.status == "student":
                is_user_teacher = False

        return is_user_teacher


    def get(self, request, uuid):
        user = request.user
        student = self._get_student(user, uuid)
        is_user_teacher = self._get_is_user_teacher(user, student)
        if not is_user_teacher:
            user, student = student, user
        resp_dict = {
            "name_chat": student.chat_view,
            "meta": [
                "UUID",
                "text",
                "arriver",
                "sent_datetime",
                "is_read"
            ]
        }
        messages = []

        messages = (
            MessageInTeacherChatModel.objects
            .filter(teacher=user, user=student)
            .order_by('-created_at')[:PAGINATION_MESSENGER_SIZE]
        )


        if messages:
            pagination_dict = {
                "first": messages[-1].id,
                "last": messages[0].id
            }
            check_query = False
            check_query = MessageInTeacherChatModel.objects.filter(
                created_at__lt=messages[-1].created_at,
                teacher=user, user=student,
            ).exists()
            if check_query:
                pagination_dict["has_next"] = True
            else:
                pagination_dict["has_next"] = False
        else:
            pagination_dict = {
                "first": None,
                "last": None,
                "has_next": False,
            }

        messages_result = []
        if is_user_teacher:
            for message in messages:
                message_res = [
                    message.id,
                    message.message,
                    "me" if message.from_teacher else "not_me",
                    message.created_at,
                    message.is_read,
                ]
                messages_result.append(message_res)
        else:
            for message in messages:
                message_res = [
                    message.id,
                    message.message,
                    "not_me" if message.from_teacher else "me",
                    message.created_at,
                    message.is_read,
                ]
                messages_result.append(message_res)

        resp_dict["messages"] = messages_result
        resp_dict["pagination"] = pagination_dict
        return Response({"data": resp_dict}, status=status.HTTP_200_OK)


    def post(self, request, uuid):
        user = request.user
        student = self._get_student(user, uuid)
        is_user_teacher = self._get_is_user_teacher(user, student)
        text = self.request.data.get('text')
        if not text:
            return Response({"error": "No text"}, status=status.HTTP_400_BAD_REQUEST)

        if not is_user_teacher:
            message = MessageInTeacherChatModel.objects.create(
                teacher=student,
                student=user,
                from_teacher=False,
                message=text
            )
        else:
            message = MessageInTeacherChatModel.objects.create(
                teacher=user,
                student=student,
                from_teacher=True,
                message=text
            )
        data = {
            "uuid": message.id,
            "text": message.message
        }
        return Response({"data": data}, status=status.HTTP_204_NO_CONTENT)


    def patch(self, request, uuid):
        user = request.user
        student = self._get_student(user, uuid)
        is_user_teacher = self._get_is_user_teacher(user, student)
        if not is_user_teacher:
            user, student = student, user

        uuid_changed = self.request.data.get('uuid')
        text = self.request.data.get('text')
        if not text:
           return Response({"error": "No text"}, status=status.HTTP_400_BAD_REQUEST)
        message = get_object_or_404(MessageInTeacherChatModel, pk=uuid_changed, teacher=user, user=student)

        deleted_message = DeletedMessage.objects.create(
            user=user,
            message=message.message,
            info_about=f"{message.created_at} {user.email} {student.email} {message.from_teacher}",
        )
        message.message = text
        message.updated_at = timezone.now()
        message.save()

        data = {
            "uuid": message.id,
            "text": message.message
        }

        return Response({"data": data}, status=status.HTTP_200_OK)


    def delete(self, request, uuid):
        user = request.user
        student = self._get_student(user, uuid)
        is_user_teacher = self._get_is_user_teacher(user, student)
        if not is_user_teacher:
            user, student = student, user

        uuid_deleted = self.request.data.get('uuid')
        message = get_object_or_404(MessageInTeacherChatModel, pk=uuid_deleted, teacher=user, user=student)

        if user.user_type != "teacher":
            if message.user != user:
                return Response({"error": "No access"}, status=status.HTTP_403_FORBIDDEN)

        deleted_message = DeletedMessage.objects.create(
            user=user,
            message=message.message,
            info_about=f"{message.created_at} {user.email} {student.email} {message.from_teacher}",
        )
        message.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)



class AnnouncementGroupAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def _check_access(self, user, uuid):
        if user.user_type != "teacher":
            raise PermissionDenied()

        return get_object_or_404(ClassModel, id=uuid)

    def get(self, request, uuid):
        user = request.user
        group = self._check_access(user, uuid)

        pagination = request.query_params.get("pagination", 10)

        try:
            pagination = int(pagination)
        except (TypeError, ValueError):
            return Response(
                {"detail": "pagination должен быть числом"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if pagination <= 0:
            return Response(
                {"detail": "pagination должен быть больше 0"},
                status=status.HTTP_400_BAD_REQUEST
            )

        announcements = (
            AnnouncementInClass.objects
            .filter(group=group)
            .order_by("-date")
        )

        paginator = Paginator(announcements, pagination)

        current_page = request.query_params.get("page", 1)

        try:
            current_page = int(current_page)
        except (TypeError, ValueError):
            current_page = 1

        if current_page < 1:
            current_page = 1

        page = paginator.get_page(current_page)

        announcements_result = []

        for announcement in page.object_list:
            announcements_result.append([
                str(announcement.id),
                announcement.title,
                announcement.announce,
                announcement.date,
            ])

        data = {
            "meta": [
                "uuid",
                "title",
                "html-text",
                "date",
            ],
            "announcements": announcements_result,
            "pagination": {
                "total_pages": paginator.num_pages,
                "current_page": page.number,
                "total_count": paginator.count,
                "has_next": page.has_next(),
                "has_previous": page.has_previous(),
            }
        }

        return Response(
            {"data": data},
            status=status.HTTP_200_OK
        )

    def post(self, request, uuid):
        user = request.user
        group = self._check_access(user, uuid)

        title = request.data.get("title")
        html_text = request.data.get("html-text")
        datetime_value = request.data.get("date")

        if title is None:
            return Response(
                {"detail": "Необходимо указать title"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if html_text is None:
            return Response(
                {"detail": "Необходимо указать html-text"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if datetime_value is None:
            return Response(
                {"detail": "Необходимо указать datetime"},
                status=status.HTTP_400_BAD_REQUEST
            )

        announcement = AnnouncementInClass.objects.create(
            user=user,
            group=group,
            title=title,
            announce=html_text,
            date=datetime_value,
        )

        return Response(
            {
                "data": {
                    "uuid": str(announcement.id),
                }
            },
            status=status.HTTP_201_CREATED
        )

    def patch(self, request, uuid):
        user = request.user
        group = self._check_access(user, uuid)

        announcement_uuid = request.data.get("uuid")

        if not announcement_uuid:
            return Response(
                {"detail": "Необходимо указать uuid"},
                status=status.HTTP_400_BAD_REQUEST
            )

        announcement = get_object_or_404(
            AnnouncementInClass,
            id=announcement_uuid,
            group=group,
        )

        if "title" in request.data:
            announcement.title = request.data["title"]

        if "html-text" in request.data:
            announcement.announce = request.data["html-text"]

        if "date" in request.data:
            announcement.date = request.data["date"]

        announcement.save()

        return Response(
            {
                "data": {
                    "uuid": str(announcement.id),
                    "title": announcement.title,
                    "html-text": announcement.announce,
                    "date": announcement.date,
                }
            },
            status=status.HTTP_200_OK
        )

    def delete(self, request, uuid):
        user = request.user
        group = self._check_access(user, uuid)

        announcement_uuid = request.data.get("uuid")

        if not announcement_uuid:
            return Response(
                {"detail": "Необходимо указать uuid"},
                status=status.HTTP_400_BAD_REQUEST
            )

        announcement = get_object_or_404(
            AnnouncementInClass,
            id=announcement_uuid,
            group=group,
        )

        announcement.delete()

        return Response(
            {
                "data": {
                    "uuid": str(announcement_uuid),
                }
            },
            status=status.HTTP_200_OK
        )

class AddParticipantView(APIView):
    permission_classes = [IsAuthenticated]

    def _check_access(self, user):
        if user.user_type != "teacher":
            raise PermissionDenied()

        return True











































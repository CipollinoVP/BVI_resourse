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

from django.db.models import Q


CustomUser = get_user_model()

#Преподские ручки
PAGINATION_SIZE = 20
PAGINATION_MESSENGER_SIZE = 50

lib_read_chat = {}
lib_read_teacher = {}


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
        unread_ids = []
        for message in messages:
            message_res = [
                message.id,
                message.message,
                message.user.chat_view if message.user is not user else "me",
                message.created_at,
                message.is_read,
            ]
            messages_result.append(message_res)
            if (not message.is_read) and (message.user != user):
                if not message.is_read and message.user.id != user.id:
                    unread_ids.append(message.id)

        MessageInGroupModel.objects.filter(
            id__in=unread_ids
        ).update(is_read=True)

        lib_read_chat[chat.id] = messages_result[0][0]
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
        lib_read_chat[chat.id] = message.id
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
                if not message.is_read:
                    message.is_read = True
                    message.save()
            lib_read_teacher[(user.id, student.id)] = messages_result[0][0]
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
                if not message.is_read:
                    message.is_read = True
                    message.save()
            lib_read_teacher[(student.id, user.id)] = messages_result[0][0]

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
        lib_read_teacher[(user.id, student.id)] = message.id
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

    def _check_access(self, user, uuid):
        if user.user_type != "teacher":
            raise PermissionDenied()

        chat = get_object_or_404(GroupModel, id=uuid)
        return chat


    def get(self, request, uuid):
        user = request.user
        chat = self._check_access(user, uuid)
        users = CustomUser.objects.all()
        links = list(GroupLinkModel.objects.filter(group=chat).values_list("user", flat=True))
        print(links)
        users_list = []
        users_current = []
        for user in users:
            if user.id in links:
                users_current.append(
                    [user.id, f"{user.surname} {user.name}"]
                )
            else:
                users_list.append(
                    [user.id, f"{user.surname} {user.name}"]
                )
        meta = ["uuid", "full_name"]
        return Response(
            {
                "data": {
                    "meta": meta,
                    "users": users_list,
                    "users_current": users_current,
                }
            },
            status=status.HTTP_200_OK
        )


    def post(self, request, uuid):
        user = request.user
        chat = self._check_access(user, uuid)
        participant_uuid = request.data.get("uuid_user")
        participant = get_object_or_404(CustomUser, uuid=participant_uuid)
        link = GroupLinkModel.objects.get_or_create(
            user=participant,
            group=chat
        )
        return Response({"created": "OK"}, status=status.HTTP_201_CREATED)


    def delete(self, request, uuid):
        user = request.user
        chat = self._check_access(user, uuid)

        participant_uuid = request.data.get("uuid_user")
        participant = get_object_or_404(CustomUser, uuid=participant_uuid)
        link = GroupLinkModel.objects.filter(
            user=participant,
            group=chat
        )

        if link.exists():
            link.first().delete()

        return Response({"deleted": "OK"}, status=status.HTTP_200_OK)


class GetMessageMonitoringView(APIView):
    permission_classes = [IsAuthenticated]

    def _check_access(self, user, chat_uuid):
        try:
            chat = GroupModel.objects.get(id=chat_uuid)
        except GroupModel.DoesNotExist:
            raise PermissionDenied("Чат не найден.")

        class_link = ClassTeacherLink.objects.filter(
            Q(group__parent_chat=chat) | Q(group__child_chat=chat),
            teacher=user
        ).first()

        if (not class_link) and (user.user_type != "teacher"):
            raise PermissionDenied("Вы не привязаны к этому классу.")

        return chat, class_link

    def get(self, request, uuid):
        user = request.user
        chat, class_link = self._check_access(user, uuid)

        last_uuid = request.query_params.get('last')

        if chat.id in lib_read_chat:
            if lib_read_chat[chat.id] is None:
                return Response({"message": "No"}, status=status.HTTP_200_OK)
            if lib_read_chat[chat.id] == last_uuid:
                return Response({"message": "No"}, status=status.HTTP_200_OK)
            else:
                return self._build_response(chat, is_update=True)
        else:
            query = MessageInGroupModel.objects.filter(group=chat).order_by("-created_at")
            if query.exists():
                lib_read_chat[chat.id] = query.first().id
                return self._build_response(chat, is_update=True)
            else:
                lib_read_chat[chat.id] = None
                return Response({"message": "No"}, status=status.HTTP_200_OK)



    def _build_response(self, chat, is_update=False):
        if not is_update:
            pass

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
            has_next = MessageInGroupModel.objects.filter(
                created_at__lt=messages[-1].created_at,
                group=chat,
            ).exists()
            pagination_dict["has_next"] = has_next
        else:
            pagination_dict = {
                "first": None,
                "last": None,
                "has_next": False,
            }

        messages_result = []
        for message in messages:
            sender_name = "me" if message.user == self.request.user else message.user.surname
            message_res = [
                message.id,
                sender_name,  # arriver (отправитель)
                message.created_at,
                message.is_read,
            ]
            messages_result.append(message_res)
            if (not message.is_read) and (message.user != self.request.user):
                message.is_read = True
                message.save()

        data = {
            "message": "Update",
            "meta": [
                "UUID",
                "arriver",
                "sent_datetime",
                "is_read",
            ],
            "messages": messages_result,
            "pagination": pagination_dict
        }

        return Response(data, status=status.HTTP_200_OK)


class GetPersonalMessageMonitoringView(APIView):
    permission_classes = [IsAuthenticated]

    def _check_access(self, user, companion_uuid):
        if user.user_type != "teacher":
            raise PermissionDenied("Доступ только для учителей.")

        try:
            companion = CustomUser.objects.get(id=companion_uuid)
        except CustomUser.DoesNotExist:
            raise PermissionDenied("Пользователь не найден.")

        teacher_status = True

        if companion.user_type == 'teacher':
            link = TeacherTeacherMetaLink.objects.filter(
                user=user,
                companion=companion
            ).first()
            if not link:
                TeacherTeacherMetaLink.objects.create(
                    user=user,
                    companion=companion,
                    status='teacher'
                )
                TeacherTeacherMetaLink.objects.create(
                    user=companion,
                    companion=user,
                    status='student'
                )
            elif link.status != 'teacher':
                teacher_status = False
        return companion, teacher_status

    def get(self, request, uuid):
        user = request.user
        companion, teacher_status = self._check_access(user, uuid)

        last_uuid = request.query_params.get('last')
        memory_key = (user.id, companion.id)

        if memory_key in lib_read_teacher:
            if lib_read_teacher[memory_key] is None:
                return Response({"message": "No"}, status=status.HTTP_200_OK)
            if lib_read_teacher[memory_key] == last_uuid:
                return Response({"message": "No"}, status=status.HTTP_200_OK)
            else:
                return self._build_personal_response(user, companion, is_teacher=teacher_status)
        else:
            if teacher_status:
                query = MessageInTeacherChatModel.objects.filter(teacher=user, user=companion).order_by("-created_at")
            else:
                query = MessageInTeacherChatModel.objects.filter(teacher=companion, user=user).order_by("-created_at")
            if query.exists():
                lib_read_teacher[memory_key] = query.first().id
                return self._build_personal_response(user, companion, is_teacher=teacher_status)
            else:
                lib_read_teacher[memory_key] = None
                return Response({"message": "No"}, status=status.HTTP_200_OK)


    def _build_personal_response(self, user, companion, is_teacher=True):
        """Строит ответ для личных сообщений."""

        if is_teacher:
            messages = (
                MessageInTeacherChatModel.objects
                .filter(teacher=user, user=companion)
                .order_by('-created_at')[:PAGINATION_MESSENGER_SIZE]
            )
        else:
            messages = (
                MessageInTeacherChatModel.objects
                .filter(teacher=companion, user=user)
                .order_by('-created_at')[:PAGINATION_MESSENGER_SIZE]
            )

        # Формируем пагинацию
        if messages:
            pagination_dict = {
                "first": messages[-1].id,
                "last": messages[0].id
            }
            has_next = MessageInTeacherChatModel.objects.filter(
                created_at__lt=messages[-1].created_at,
                teacher=user,
                user=companion,
            ).exists()
            pagination_dict["has_next"] = has_next
        else:
            pagination_dict = {
                "first": None,
                "last": None,
                "has_next": False,
            }

        messages_result = []
        for message in messages:
            if message.from_teacher:
                sender_name = "me" if message.teacher == user else message.teacher.surname
            else:
                sender_name = "me" if message.user == user else message.user.surname

            message_res = [
                message.id,
                sender_name,
                message.created_at,
                message.is_read,
            ]
            messages_result.append(message_res)

        data = {
            "message": "Update",
            "meta": [
                "UUID",
                "arriver",
                "sent_datetime",
                "is_read",
            ],
            "messages": messages_result,
            "pagination": pagination_dict
        }

        return Response(data, status=status.HTTP_200_OK)


class GetGroupPaginationView(APIView):
    permission_classes = [IsAuthenticated]

    def _check_access(self, user, chat_uuid):
        """Проверяет доступ к групповому чату."""
        if user.user_type != "teacher":
            raise PermissionDenied("Доступ только для учителей.")

        try:
            chat = GroupModel.objects.get(id=chat_uuid)
        except GroupModel.DoesNotExist:
            raise PermissionDenied("Чат не найден.")

        # Проверяем привязку учителя к классу
        class_link = ClassTeacherLink.objects.filter(
            Q(group__parent_chat=chat) | Q(group__child_chat=chat),
            teacher=user
        ).first()

        if not class_link:
            raise PermissionDenied("Вы не привязаны к этому классу.")

        return chat

    def get(self, request, uuid):
        user = request.user

        earlier = request.query_params.get('earlier', 'true').lower() == 'true'
        current_limit = request.query_params.get('current_limit')


        if not current_limit:
            return Response(
                {"error": "Необходимо указать current_limit (UUID сообщения)"},
                status=status.HTTP_400_BAD_REQUEST
            )

        chat = self._check_access(user, uuid)

        try:
            anchor_message = MessageInGroupModel.objects.get(id=current_limit, group=chat)
        except MessageInGroupModel.DoesNotExist:
            return Response(
                {"error": "Сообщение не найдено в этом чате"},
                status=status.HTTP_404_NOT_FOUND
            )

        if earlier:
            messages = (
                MessageInGroupModel.objects
                .filter(group=chat, created_at__lt=anchor_message.created_at)
                .order_by('-created_at')[:PAGINATION_MESSENGER_SIZE]
                .select_related("user")
            )
        else:
            messages = (
                MessageInGroupModel.objects
                .filter(group=chat, created_at__gt=anchor_message.created_at)
                .order_by('-created_at')[:PAGINATION_MESSENGER_SIZE]
                .select_related("user")
            )

        if messages:
            pagination_dict = {
                "first": messages[-1].id,
                "last": messages[0].id,
            }

            has_previous = MessageInGroupModel.objects.filter(
                created_at__lt=messages[-1].created_at,
                group=chat,
            ).exists()

            has_next = MessageInGroupModel.objects.filter(
                created_at__gt=messages[0].created_at,
                group=chat,
            ).exists()

            pagination_dict["has_previous"] = has_previous
            pagination_dict["has_next"] = has_next
        else:
            pagination_dict = {
                "first": None,
                "last": None,
                "has_previous": False,
                "has_next": False,
            }

        messages_result = []
        for message in messages:
            sender_name = "me" if message.user == user else message.user.surname
            message_res = [
                message.id,
                sender_name,
                message.created_at,
                message.is_read,
            ]
            messages_result.append(message_res)

        data = {
            "meta": [
                "UUID",
                "arriver",
                "sent_datetime",
                "is_read",
            ],
            "messages": messages_result,
            "pagination": pagination_dict
        }

        return Response(data, status=status.HTTP_200_OK)


class GetPersonalPaginationView(APIView):
    permission_classes = [IsAuthenticated]

    def _check_access(self, user, companion_uuid):
        if user.user_type != "teacher":
            raise PermissionDenied("Доступ только для учителей.")

        try:
            companion = CustomUser.objects.get(id=companion_uuid)
        except CustomUser.DoesNotExist:
            raise PermissionDenied("Пользователь не найден.")

        return companion

    def get(self, request, uuid):
        user = request.user

        earlier = request.query_params.get('earlier', 'true').lower() == 'true'
        current_limit = request.query_params.get('current_limit')

        if not current_limit:
            return Response(
                {"error": "Необходимо указать current_limit (UUID сообщения)"},
                status=status.HTTP_400_BAD_REQUEST
            )

        companion = self._check_access(user, uuid)

        try:
            anchor_message = MessageInTeacherChatModel.objects.get(
                id=current_limit,
                teacher=user,
                user=companion
            )
        except MessageInTeacherChatModel.DoesNotExist:
            return Response(
                {"error": "Сообщение не найдено в этом чате"},
                status=status.HTTP_404_NOT_FOUND
            )

        if earlier:
            messages = (
                MessageInTeacherChatModel.objects
                .filter(
                    teacher=user,
                    user=companion,
                    created_at__lt=anchor_message.created_at
                )
                .order_by('-created_at')[:PAGINATION_MESSENGER_SIZE]
            )
        else:
            messages = (
                MessageInTeacherChatModel.objects
                .filter(
                    teacher=user,
                    user=companion,
                    created_at__gt=anchor_message.created_at
                )
                .order_by('-created_at')[:PAGINATION_MESSENGER_SIZE]
            )

        if messages:
            pagination_dict = {
                "first": messages[-1].id,
                "last": messages[0].id,
            }

            has_previous = MessageInTeacherChatModel.objects.filter(
                created_at__lt=messages[-1].created_at,
                teacher=user,
                user=companion,
            ).exists()

            has_next = MessageInTeacherChatModel.objects.filter(
                created_at__gt=messages[0].created_at,
                teacher=user,
                user=companion,
            ).exists()

            pagination_dict["has_previous"] = has_previous
            pagination_dict["has_next"] = has_next
        else:
            pagination_dict = {
                "first": None,
                "last": None,
                "has_previous": False,
                "has_next": False,
            }

        messages_result = []
        for message in messages:
            if message.from_teacher:
                sender_name = "me" if message.teacher == user else message.teacher.surname
            else:
                sender_name = "me" if message.user == user else message.user.surname

            message_res = [
                message.id,
                sender_name,
                message.created_at,
                message.is_read,
            ]
            messages_result.append(message_res)

        data = {
            "meta": [
                "UUID",
                "arriver",
                "sent_datetime",
                "is_read",
            ],
            "messages": messages_result,
            "pagination": pagination_dict
        }

        return Response(data, status=status.HTTP_200_OK)















































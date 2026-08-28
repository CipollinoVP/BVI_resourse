from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from django.contrib.auth import get_user_model

from .models import (
    MessageInTeacherChatModel,
    DeletedMessage,
)

# Используем тот же словарь, который уже используется
# в views_teacher.py
from .views_teacher import (
    lib_read_teacher,
    PAGINATION_MESSENGER_SIZE,
)


CustomUser = get_user_model()


# ============================================================
# Проверка доступа
# ============================================================

def check_parent_child(user):
    """
    Проверяет, что пользователь является родителем или учеником.
    """

    if user.user_type not in ("parent", "child"):
        raise PermissionDenied(
            "Доступ только для родителей и учеников."
        )


def get_teacher(teacher_uuid):
    """
    Получает педагога по UUID.
    """

    teacher = get_object_or_404(
        CustomUser,
        id=teacher_uuid,
        user_type="teacher",
    )

    return teacher


def get_chat_messages(user, teacher):
    """
    Возвращает все сообщения конкретного личного чата.

    Для parent/child:
        teacher = педагог
        student = текущий пользователь
    """

    return MessageInTeacherChatModel.objects.filter(
        teacher=teacher,
        student=user,
    )


# ============================================================
# Список педагогов / чатов
# ============================================================

class GetTeacherChatsView(APIView):
    """
    Получение списка личных чатов пользователя с педагогами.

    GET /.../teachers/chats/

    Возвращает педагогов, с которыми уже существует переписка.

    Если нужно показывать вообще всех педагогов, независимо
    от наличия сообщений, это легко изменить.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):

        user = request.user
        check_parent_child(user)

        teachers = CustomUser.objects.filter(
            user_type="teacher"
        )

        result = []

        for teacher in teachers:

            last_message = (
                MessageInTeacherChatModel.objects
                .filter(
                    teacher=teacher,
                    student=user,
                )
                .order_by("-created_at")
                .first()
            )

            # Если сообщений ещё нет, такой чат всё равно
            # можно открыть, но он будет без последнего сообщения.
            if last_message is None:
                result.append({
                    "uuid": str(teacher.id),
                    "surname": teacher.surname,
                    "name": teacher.name,
                    "last_message": None,
                    "last_time": None,
                    "last_teacher": None,
                    "is_read": True,
                })
                continue

            result.append({
                "uuid": str(teacher.id),
                "surname": teacher.surname,
                "name": teacher.name,
                "last_message": last_message.message,
                "last_time": last_message.created_at,
                "last_teacher": last_message.from_teacher,
                "is_read": last_message.is_read,
            })

        # Сначала чаты с сообщениями, сортировка по последнему
        # сообщению. Чаты без сообщений отправляем в конец.
        result.sort(
            key=lambda item: (
                item["last_time"] is not None,
                item["last_time"] or timezone.datetime.min.replace(
                    tzinfo=timezone.utc
                ),
            ),
            reverse=True,
        )

        return Response(
            {
                "data": {
                    "teachers": result,
                }
            },
            status=status.HTTP_200_OK,
        )


# ============================================================
# Личный чат parent/child <-> teacher
# ============================================================

class GetTeacherPersonalChatView(APIView):
    """
    Работа с личным чатом родителя/ученика с педагогом.

    GET    - получить сообщения
    POST   - отправить сообщение
    PATCH  - изменить своё сообщение
    DELETE - удалить своё сообщение
    """

    permission_classes = [IsAuthenticated]

    def _check_access(self, user, teacher_uuid):

        check_parent_child(user)

        teacher = get_teacher(teacher_uuid)

        return teacher

    # --------------------------------------------------------
    # GET
    # --------------------------------------------------------

    def get(self, request, uuid):

        user = request.user

        teacher = self._check_access(user, uuid)

        messages = (
            MessageInTeacherChatModel.objects
            .filter(
                teacher=teacher,
                student=user,
            )
            .order_by("-created_at")[:PAGINATION_MESSENGER_SIZE]
        )

        if messages:

            pagination_dict = {
                "first": messages[-1].id,
                "last": messages[0].id,
            }

            has_next = MessageInTeacherChatModel.objects.filter(
                teacher=teacher,
                student=user,
                created_at__lt=messages[-1].created_at,
            ).exists()

            pagination_dict["has_next"] = has_next

        else:

            pagination_dict = {
                "first": None,
                "last": None,
                "has_next": False,
            }

        messages_result = []

        unread_ids = []

        for message in messages:

            if message.from_teacher:
                sender_name = teacher.surname
            else:
                sender_name = "me"

            message_result = [
                message.id,
                message.message,
                sender_name,
                message.created_at,
                message.is_read,
            ]

            messages_result.append(message_result)

            # Помечаем сообщения педагога как прочитанные
            if message.from_teacher and not message.is_read:
                unread_ids.append(message.id)

        if unread_ids:

            MessageInTeacherChatModel.objects.filter(
                id__in=unread_ids
            ).update(is_read=True)

        # Сохраняем последнее прочитанное/увиденное сообщение
        # в общем словаре мониторинга.
        if messages_result:
            lib_read_teacher[
                (user.id, teacher.id)
            ] = messages_result[0][0]

        resp_dict = {
            "name_chat": teacher.chat_view,
            "meta": [
                "UUID",
                "text",
                "arriver",
                "sent_datetime",
                "is_read",
            ],
            "messages": messages_result,
            "pagination": pagination_dict,
        }

        return Response(
            {
                "data": resp_dict
            },
            status=status.HTTP_200_OK,
        )

    # --------------------------------------------------------
    # POST
    # --------------------------------------------------------

    def post(self, request, uuid):

        user = request.user

        teacher = self._check_access(user, uuid)

        text = request.data.get("text")

        if not text:
            return Response(
                {
                    "error": "No text"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        message = MessageInTeacherChatModel.objects.create(
            teacher=teacher,
            student=user,
            from_teacher=False,
            message=text,
        )

        # Обновляем мониторинг
        lib_read_teacher[
            (user.id, teacher.id)
        ] = message.id

        data = {
            "uuid": message.id,
            "text": message.message,
        }

        return Response(
            {
                "data": data
            },
            status=status.HTTP_201_CREATED,
        )

    # --------------------------------------------------------
    # PATCH
    # --------------------------------------------------------

    def patch(self, request, uuid):

        user = request.user

        teacher = self._check_access(user, uuid)

        uuid_changed = request.data.get("uuid")
        text = request.data.get("text")

        if not uuid_changed:
            return Response(
                {
                    "error": "No uuid"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not text:
            return Response(
                {
                    "error": "No text"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        message = get_object_or_404(
            MessageInTeacherChatModel,
            id=uuid_changed,
            teacher=teacher,
            student=user,
        )

        # Родитель/ученик может редактировать только своё сообщение
        if message.from_teacher:
            return Response(
                {
                    "error": "No access"
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        DeletedMessage.objects.create(
            user=user,
            message=message.message,
            info_about=(
                f"{message.created_at} "
                f"{teacher.email} "
                f"{user.email} "
                f"{message.from_teacher}"
            ),
        )

        message.message = text
        message.updated_at = timezone.now()
        message.save(
            update_fields=[
                "message",
                "updated_at",
            ]
        )

        data = {
            "uuid": message.id,
            "text": message.message,
        }

        return Response(
            {
                "data": data
            },
            status=status.HTTP_200_OK,
        )

    # --------------------------------------------------------
    # DELETE
    # --------------------------------------------------------

    def delete(self, request, uuid):

        user = request.user

        teacher = self._check_access(user, uuid)

        uuid_deleted = request.data.get("uuid")

        if not uuid_deleted:
            return Response(
                {
                    "error": "No uuid"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        message = get_object_or_404(
            MessageInTeacherChatModel,
            id=uuid_deleted,
            teacher=teacher,
            student=user,
        )

        # Удалять можно только своё сообщение
        if message.from_teacher:
            return Response(
                {
                    "error": "No access"
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        DeletedMessage.objects.create(
            user=user,
            message=message.message,
            info_about=(
                f"{message.created_at} "
                f"{teacher.email} "
                f"{user.email} "
                f"{message.from_teacher}"
            ),
        )

        message.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )


# ============================================================
# Мониторинг личного чата
# ============================================================

class GetTeacherPersonalMessageMonitoringView(APIView):
    """
    Мониторинг изменений личного чата.

    GET /.../teachers/chats/<uuid>/monitoring/?last=<message_uuid>

    uuid = UUID педагога.

    Если новых сообщений нет:
        {"message": "No"}

    Если появились изменения:
        возвращается список последних сообщений.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, uuid):

        user = request.user

        check_parent_child(user)

        teacher = get_teacher(uuid)

        last_uuid = request.query_params.get("last")

        memory_key = (
            user.id,
            teacher.id,
        )

        # ----------------------------------------------------
        # Уже есть состояние мониторинга
        # ----------------------------------------------------

        if memory_key in lib_read_teacher:

            last_known = lib_read_teacher[memory_key]

            if last_known is None:

                return Response(
                    {
                        "message": "No"
                    },
                    status=status.HTTP_200_OK,
                )

            if str(last_known) == str(last_uuid):

                return Response(
                    {
                        "message": "No"
                    },
                    status=status.HTTP_200_OK,
                )

            return self._build_response(
                user=user,
                teacher=teacher,
            )

        # ----------------------------------------------------
        # Первый запрос мониторинга
        # ----------------------------------------------------

        query = (
            MessageInTeacherChatModel.objects
            .filter(
                teacher=teacher,
                student=user,
            )
            .order_by("-created_at")
        )

        if query.exists():

            lib_read_teacher[memory_key] = query.first().id

            return self._build_response(
                user=user,
                teacher=teacher,
            )

        lib_read_teacher[memory_key] = None

        return Response(
            {
                "message": "No"
            },
            status=status.HTTP_200_OK,
        )

    def _build_response(self, user, teacher):

        messages = (
            MessageInTeacherChatModel.objects
            .filter(
                teacher=teacher,
                student=user,
            )
            .order_by("-created_at")[
                :PAGINATION_MESSENGER_SIZE
            ]
        )

        if messages:

            pagination_dict = {
                "first": messages[-1].id,
                "last": messages[0].id,
            }

            has_next = MessageInTeacherChatModel.objects.filter(
                teacher=teacher,
                student=user,
                created_at__lt=messages[-1].created_at,
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
                sender_name = teacher.surname
            else:
                sender_name = "me"

            message_result = [
                message.id,
                sender_name,
                message.created_at,
                message.is_read,
            ]

            messages_result.append(message_result)

        data = {
            "message": "Update",
            "meta": [
                "UUID",
                "arriver",
                "sent_datetime",
                "is_read",
            ],
            "messages": messages_result,
            "pagination": pagination_dict,
        }

        return Response(
            data,
            status=status.HTTP_200_OK,
        )


# ============================================================
# Пагинация личного чата
# ============================================================

class GetTeacherPersonalPaginationView(APIView):
    """
    Пагинация личного чата parent/child <-> teacher.

    GET /.../teachers/chats/<uuid>/pagination/

    Параметры:

        current_limit = UUID сообщения

        earlier=true
            сообщения ДО current_limit

        earlier=false
            сообщения ПОСЛЕ current_limit
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, uuid):

        user = request.user

        check_parent_child(user)

        teacher = get_teacher(uuid)

        earlier = (
            request.query_params
            .get("earlier", "true")
            .lower() == "true"
        )

        current_limit = request.query_params.get(
            "current_limit"
        )

        if not current_limit:

            return Response(
                {
                    "error": (
                        "Необходимо указать "
                        "current_limit (UUID сообщения)"
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:

            anchor_message = MessageInTeacherChatModel.objects.get(
                id=current_limit,
                teacher=teacher,
                student=user,
            )

        except MessageInTeacherChatModel.DoesNotExist:

            return Response(
                {
                    "error": (
                        "Сообщение не найдено "
                        "в этом чате"
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # ----------------------------------------------------
        # Старые сообщения
        # ----------------------------------------------------

        if earlier:

            messages = (
                MessageInTeacherChatModel.objects
                .filter(
                    teacher=teacher,
                    student=user,
                    created_at__lt=anchor_message.created_at,
                )
                .order_by("-created_at")[
                    :PAGINATION_MESSENGER_SIZE
                ]
            )

        # ----------------------------------------------------
        # Новые сообщения
        # ----------------------------------------------------

        else:

            messages = (
                MessageInTeacherChatModel.objects
                .filter(
                    teacher=teacher,
                    student=user,
                    created_at__gt=anchor_message.created_at,
                )
                .order_by("-created_at")[
                    :PAGINATION_MESSENGER_SIZE
                ]
            )

        # ----------------------------------------------------
        # Pagination info
        # ----------------------------------------------------

        if messages:

            pagination_dict = {
                "first": messages[-1].id,
                "last": messages[0].id,
            }

            has_previous = (
                MessageInTeacherChatModel.objects
                .filter(
                    teacher=teacher,
                    student=user,
                    created_at__lt=messages[-1].created_at,
                )
                .exists()
            )

            has_next = (
                MessageInTeacherChatModel.objects
                .filter(
                    teacher=teacher,
                    student=user,
                    created_at__gt=messages[0].created_at,
                )
                .exists()
            )

            pagination_dict["has_previous"] = has_previous
            pagination_dict["has_next"] = has_next

        else:

            pagination_dict = {
                "first": None,
                "last": None,
                "has_previous": False,
                "has_next": False,
            }

        # ----------------------------------------------------
        # Messages
        # ----------------------------------------------------

        messages_result = []

        for message in messages:

            if message.from_teacher:
                sender_name = teacher.surname
            else:
                sender_name = "me"

            message_result = [
                message.id,
                sender_name,
                message.created_at,
                message.is_read,
            ]

            messages_result.append(message_result)

        data = {
            "meta": [
                "UUID",
                "arriver",
                "sent_datetime",
                "is_read",
            ],
            "messages": messages_result,
            "pagination": pagination_dict,
        }

        return Response(
            data,
            status=status.HTTP_200_OK,
        )
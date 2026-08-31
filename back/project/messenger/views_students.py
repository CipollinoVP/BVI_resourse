from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from django.contrib.auth import get_user_model

from schedule.models import TeacherModel
from schedule.utils import get_schedule_for_week
from .models import (
    MessageInTeacherChatModel,
    DeletedMessage, AnnouncementGlobal, ClassTypesLink, AnnouncementInClass, GroupLinkModel,
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
        user = текущий пользователь
    """

    return MessageInTeacherChatModel.objects.filter(
        teacher=teacher,
        user=user,
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
                    user=user,
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

        # Используем список вместо среза QuerySet для безопасного доступа по индексам
        messages_qs = (
            MessageInTeacherChatModel.objects
            .filter(
                teacher=teacher,
                user=user,
            )
            .order_by("-created_at")
        )

        # Получаем список сообщений с ограничением
        messages_list = list(messages_qs[:PAGINATION_MESSENGER_SIZE])

        if messages_list:
            # Безопасно используем индексы, так как список не пустой
            pagination_dict = {
                "first": messages_list[-1].id,
                "last": messages_list[0].id,
            }

            has_next = MessageInTeacherChatModel.objects.filter(
                teacher=teacher,
                user=user,
                created_at__lt=messages_list[-1].created_at,
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

        for message in messages_list:

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
            user=user,
            from_teacher=False,
            message=text,
        )

        # Обновляем мониторинг
        lib_read_teacher[
            (user.id, teacher.id)
        ] = message.id
        lib_read_teacher[
            (teacher.id, user.id)
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
            user=user,
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
            user=user,
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
    Мониторинг изменений личного чата ученика/родителя с преподавателем.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, uuid):
        user = request.user
        check_parent_child(user)
        teacher = get_teacher(uuid)

        last_uuid = request.query_params.get("last")
        memory_key = (user.id, teacher.id)

        # 1. Если в памяти нет записи или она None - инициализируем
        if memory_key not in lib_read_teacher or lib_read_teacher[memory_key] is None:
            latest_message = MessageInTeacherChatModel.objects.filter(
                teacher=teacher,
                user=user
            ).order_by('-created_at').first()

            if latest_message:
                lib_read_teacher[memory_key] = latest_message.id
                # Возвращаем последнюю пачку сообщений с метаданными и текстом
                return self._build_response(user=user, teacher=teacher)
            else:
                lib_read_teacher[memory_key] = None
                return Response({"message": "No", "data": []}, status=status.HTTP_200_OK)

        # 2. Если сохраненный ID совпадает с last_uuid — новых сообщений нет
        if str(lib_read_teacher[memory_key]) == str(last_uuid):
            return Response({"message": "No", "data": []}, status=status.HTTP_200_OK)

        # 3. Получаем ТОЛЬКО новые сообщения (появившиеся после last_uuid)
        try:
            anchor_message = MessageInTeacherChatModel.objects.get(id=last_uuid)
            new_messages = MessageInTeacherChatModel.objects.filter(
                teacher=teacher,
                user=user,
                created_at__gt=anchor_message.created_at
            ).order_by('created_at')
        except MessageInTeacherChatModel.DoesNotExist:
            return self._build_response(user=user, teacher=teacher)

        # Если новых сообщений нет — возвращаем "No"
        if not new_messages.exists():
            return Response({"message": "No", "data": []}, status=status.HTTP_200_OK)

        # Обновляем последний прочитанный ID в памяти
        lib_read_teacher[memory_key] = new_messages.last().id

        # Формируем ответ только с новыми сообщениями и текстом
        messages_result = []
        unread_ids = []

        for message in new_messages:
            sender_name = teacher.surname if message.from_teacher else "me"

            messages_result.append({
                "id": message.id,
                "text": message.message,  # Добавлен текст сообщения
                "sender": sender_name,
                "created_at": message.created_at.isoformat(),
                "is_read": message.is_read,
            })

            # Проставляем прочтение для новых сообщений от учителей
            if message.from_teacher and not message.is_read:
                unread_ids.append(message.id)

        if unread_ids:
            MessageInTeacherChatModel.objects.filter(id__in=unread_ids).update(is_read=True)

        data = {
            "message": "Update",
            "new_messages": messages_result,
            "last_id": lib_read_teacher[memory_key]
        }

        return Response(data, status=status.HTTP_200_OK)

    def _build_response(self, user, teacher):
        """Полная инициализация/обновление для первой загрузки."""
        messages_qs = MessageInTeacherChatModel.objects.filter(
            teacher=teacher,
            user=user
        ).order_by('-created_at')

        # Получаем список сообщений с ограничением
        messages_list = list(messages_qs[:PAGINATION_MESSENGER_SIZE])

        if messages_list:
            pagination_dict = {
                "first": messages_list[-1].id,
                "last": messages_list[0].id,
                "has_next": messages_qs.filter(
                    created_at__lt=messages_list[-1].created_at
                ).exists()
            }
        else:
            pagination_dict = {
                "first": None,
                "last": None,
                "has_next": False,
            }

        messages_result = []
        unread_ids = []

        for message in messages_list:
            sender_name = teacher.surname if message.from_teacher else "me"

            messages_result.append({
                "id": message.id,
                "text": message.message,  # Добавлен текст сообщения
                "sender": sender_name,
                "created_at": message.created_at.isoformat(),
                "is_read": message.is_read,
            })

            if message.from_teacher and not message.is_read:
                unread_ids.append(message.id)

        if unread_ids:
            MessageInTeacherChatModel.objects.filter(id__in=unread_ids).update(is_read=True)

        data = {
            "message": "Update",
            "meta": ["UUID", "text", "arriver", "sent_datetime", "is_read"],
            "messages": messages_result,
            "pagination": pagination_dict,
            "last_id": messages_list[0].id if messages_list else None
        }

        return Response(data, status=status.HTTP_200_OK)


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
                user=user,
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

            messages_qs = (
                MessageInTeacherChatModel.objects
                .filter(
                    teacher=teacher,
                    user=user,
                    created_at__lt=anchor_message.created_at,
                )
                .order_by("-created_at")
            )
            # Получаем список для безопасного доступа по индексам
            messages_list = list(messages_qs[:PAGINATION_MESSENGER_SIZE])

        # ----------------------------------------------------
        # Новые сообщения
        # ----------------------------------------------------

        else:

            messages_qs = (
                MessageInTeacherChatModel.objects
                .filter(
                    teacher=teacher,
                    user=user,
                    created_at__gt=anchor_message.created_at,
                )
                .order_by("-created_at")
            )
            messages_list = list(messages_qs[:PAGINATION_MESSENGER_SIZE])

        # ----------------------------------------------------
        # Pagination info
        # ----------------------------------------------------

        if messages_list:

            pagination_dict = {
                "first": messages_list[-1].id,
                "last": messages_list[0].id,
            }

            has_previous = (
                MessageInTeacherChatModel.objects
                .filter(
                    teacher=teacher,
                    user=user,
                    created_at__lt=messages_list[-1].created_at,
                )
                .exists()
            )

            has_next = (
                MessageInTeacherChatModel.objects
                .filter(
                    teacher=teacher,
                    user=user,
                    created_at__gt=messages_list[0].created_at,
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

        for message in messages_list:

            if message.from_teacher:
                sender_name = teacher.surname
            else:
                sender_name = "me"

            message_result = [
                message.id,
                message.message,  # ✅ ИСПРАВЛЕНО: Добавлен текст сообщения
                sender_name,
                message.created_at,
                message.is_read,
            ]

            messages_result.append(message_result)

        data = {
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
            data,
            status=status.HTTP_200_OK,
        )


class StudentParentMainView(APIView):
    permission_classes = [
        IsAuthenticated,
    ]

    def get(self, request):
        user = request.user

        # ---------------------------------------------------------
        # Все чаты пользователя
        # ---------------------------------------------------------

        group_links = (
            GroupLinkModel.objects
            .select_related(
                "group",
                "group__parent_group",
                "group__child_group",
            )
            .filter(
                user=user,
            )
        )

        if not group_links.exists():
            return Response(
                {
                    "message": "Пользователь не состоит ни в одной группе"
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # ---------------------------------------------------------
        # Определяем классы пользователя
        # ---------------------------------------------------------

        classes = []

        for group_link in group_links:
            chat = group_link.group

            if hasattr(chat, "parent_group"):
                class_model = chat.parent_group
                chat_type = "parent"

            elif hasattr(chat, "child_group"):
                class_model = chat.child_group
                chat_type = "child"

            else:
                continue

            classes.append(
                {
                    "class": class_model,
                    "chat": chat,
                    "chat_type": chat_type,
                }
            )

        if not classes:
            return Response(
                {
                    "message": "Для пользователя не найден класс"
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # ---------------------------------------------------------
        # UUID классов
        # ---------------------------------------------------------

        class_ids = [
            item["class"].id
            for item in classes
        ]

        # ---------------------------------------------------------
        # Типы всех классов пользователя
        # ---------------------------------------------------------

        class_type_ids = (
            ClassTypesLink.objects
            .filter(
                class_model_id__in=class_ids,
            )
            .values_list(
                "type_model_id",
                flat=True,
            )
            .distinct()
        )

        # ---------------------------------------------------------
        # GLOBAL ОБЪЯВЛЕНИЯ
        #
        # Один запрос:
        #
        #   for_all=True
        #       ИЛИ
        #   type объявления совпадает с типом
        #   любого класса пользователя
        # ---------------------------------------------------------

        global_announcements = (
            AnnouncementGlobal.objects
            .filter(
                Q(for_all=True) |
                Q(
                    type_links__type_group_id__in=class_type_ids,
                )
            )
            .order_by("-date")
            .distinct()
        )

        global_announcements_data = [
            {
                "uuid": str(announcement.id),
                "date": announcement.date,
                "title": announcement.title,
                "img": (
                    announcement.img.url
                    if announcement.img
                    else None
                ),
                "announce": announcement.announce,
            }
            for announcement in global_announcements
        ]

        # ---------------------------------------------------------
        # ОБЪЯВЛЕНИЯ ВНУТРИ КЛАССОВ
        #
        # Тоже можно получить одним запросом для всех классов.
        # ---------------------------------------------------------

        class_announcements = (
            AnnouncementInClass.objects
            .filter(
                group_id__in=class_ids,
            )
            .order_by("-date")
        )

        class_announcements_by_class = {}

        for announcement in class_announcements:
            class_announcements_by_class.setdefault(
                announcement.group_id,
                [],
            ).append(
                {
                    "uuid": str(announcement.id),
                    "date": announcement.date,
                    "title": announcement.title,
                    "img": (
                        announcement.img.url
                        if announcement.img
                        else None
                    ),
                    "announce": announcement.announce,
                }
            )

        # ---------------------------------------------------------
        # ПРЕПОДАВАТЕЛИ
        # ---------------------------------------------------------

        teachers = (
            CustomUser.objects
            .filter(user_type='teacher')
            .order_by("surname")
        )

        teachers_data = [
            {
                "uuid": str(teacher.id),
                "fio": teacher.chat_view,
            }
            for teacher in teachers
        ]

        # ---------------------------------------------------------
        # ДАННЫЕ КЛАССОВ
        # ---------------------------------------------------------

        classes_data = []

        for item in classes:
            class_model = item["class"]
            chat = item["chat"]

            classes_data.append(
                {
                    "class": {
                        "uuid": str(class_model.id),
                        "name": class_model.name,
                    },

                    "chat": {
                        "uuid": str(chat.id),
                        "type": item["chat_type"],
                    },

                    # Старую функцию пока не трогаем
                    "schedule": get_schedule_for_week(
                        class_model
                    ),

                    "announcements": {
                        "class": class_announcements_by_class.get(
                            class_model.id,
                            [],
                        ),
                    },
                }
            )

        # ---------------------------------------------------------
        # RESPONSE
        # ---------------------------------------------------------

        return Response(
            {
                "classes": classes_data,

                "announcements": {
                    "global": global_announcements_data,
                },

                "teachers": teachers_data,
            },
            status=status.HTTP_200_OK,
        )
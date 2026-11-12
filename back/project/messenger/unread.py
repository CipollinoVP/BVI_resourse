"""
Подсчёт и сброс непрочитанных сообщений.

Источники правды:

* групповые чаты, ученики и родители — GroupLinkModel.last_read;
* групповые чаты, педагоги — ClassTeacherLink.last_read_child_chat /
  ClassTeacherLink.last_read_parent_chat;
* личные чаты — MessageInTeacherChatModel.is_read.

Непрочитанным в групповом чате считается чужое сообщение, созданное
позже отметки last_read. Если отметки ещё нет (None), непрочитанными
считаются все чужие сообщения чата.
"""

from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.utils import timezone

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from .models import (
    ClassModel,
    ClassTeacherLink,
    GroupLinkModel,
    MessageInGroupModel,
    MessageInTeacherChatModel,
)

CustomUser = get_user_model()


# ============================================================
# Вспомогательные функции
# ============================================================

def get_chat_class(chat):
    """
    Возвращает (класс, тип чата) для группового чата.

    Тип чата: "parent" или "child". Если чат не привязан
    к классу — (None, None).
    """

    if hasattr(chat, "parent_group"):
        return chat.parent_group, "parent"

    if hasattr(chat, "child_group"):
        return chat.child_group, "child"

    return None, None


def _latest(first, second):
    if first is None:
        return second
    if second is None:
        return first
    return max(first, second)


def get_teacher_last_read(teacher, class_model, chat_type):
    """
    Время последнего прочтения педагогом группового чата класса.
    Возвращает None, если педагог чат ещё не открывал.
    """

    field = (
        "last_read_parent_chat"
        if chat_type == "parent"
        else "last_read_child_chat"
    )

    result = None

    for value in (
        ClassTeacherLink.objects
        .filter(group=class_model, teacher=teacher)
        .values_list(field, flat=True)
    ):
        result = _latest(result, value)

    return result


# ============================================================
# Сброс непрочитанных
# ============================================================

def mark_group_chat_read(user, chat, moment=None):
    """
    Отмечает групповой чат прочитанным для пользователя.

    Ученик / родитель -> GroupLinkModel.last_read
    Педагог           -> ClassTeacherLink.last_read_*_chat
    """

    moment = moment or timezone.now()

    # .update() не вызывает save(), поэтому auto_now не мешает
    # записать именно переданное время.
    GroupLinkModel.objects.filter(
        user=user,
        group=chat,
    ).update(last_read=moment)

    if user.user_type != "teacher":
        return

    class_model, chat_type = get_chat_class(chat)

    if class_model is None:
        return

    field = (
        "last_read_parent_chat"
        if chat_type == "parent"
        else "last_read_child_chat"
    )

    updated = (
        ClassTeacherLink.objects
        .filter(group=class_model, teacher=user)
        .update(**{field: moment})
    )

    if not updated:
        ClassTeacherLink.objects.create(
            group=class_model,
            teacher=user,
            **{field: moment},
        )


def mark_personal_chat_read(teacher, student, reader_is_teacher):
    """
    Отмечает прочитанными входящие сообщения личного чата.

    teacher / student — стороны чата так, как они записаны
    в MessageInTeacherChatModel (поля teacher и user).

    reader_is_teacher=True  — чат открыл тот, кто записан в teacher:
                              прочитаны сообщения from_teacher=False.
    reader_is_teacher=False — чат открыл тот, кто записан в user:
                              прочитаны сообщения from_teacher=True.
    """

    return (
        MessageInTeacherChatModel.objects
        .filter(
            teacher=teacher,
            user=student,
            from_teacher=not reader_is_teacher,
            is_read=False,
        )
        .update(is_read=True)
    )


# ============================================================
# Подсчёт непрочитанных
# ============================================================

def _group_last_read_map(user):
    """
    Возвращает словарь {id группового чата: last_read}
    для всех групповых чатов, доступных пользователю.
    """

    if user.user_type == "teacher":
        # Педагог видит чаты всех классов.
        links = {}

        for class_id, parent_read, child_read in (
            ClassTeacherLink.objects
            .filter(teacher=user)
            .values_list(
                "group_id",
                "last_read_parent_chat",
                "last_read_child_chat",
            )
        ):
            current = links.get(class_id, (None, None))
            links[class_id] = (
                _latest(current[0], parent_read),
                _latest(current[1], child_read),
            )

        result = {}

        for class_id, parent_chat_id, child_chat_id in (
            ClassModel.objects
            .values_list("id", "parent_chat_id", "child_chat_id")
        ):
            parent_read, child_read = links.get(class_id, (None, None))
            result[parent_chat_id] = parent_read
            result[child_chat_id] = child_read

        return result

    result = {}

    for chat_id, last_read in (
        GroupLinkModel.objects
        .filter(user=user, group__isnull=False)
        .values_list("group_id", "last_read")
    ):
        if chat_id in result:
            result[chat_id] = _latest(result[chat_id], last_read)
        else:
            result[chat_id] = last_read

    return result


def get_group_unread_counts(user):
    """
    {id группового чата: количество непрочитанных сообщений}
    для всех групповых чатов пользователя (включая нулевые).
    """

    last_read_map = _group_last_read_map(user)

    counts = {chat_id: 0 for chat_id in last_read_map}

    if not last_read_map:
        return counts

    condition = Q()

    for chat_id, last_read in last_read_map.items():
        chat_condition = Q(group_id=chat_id)

        if last_read is not None:
            chat_condition &= Q(created_at__gt=last_read)

        condition |= chat_condition

    rows = (
        MessageInGroupModel.objects
        .filter(condition)
        .exclude(user=user)
        .values("group_id")
        .annotate(unread=Count("id"))
    )

    for row in rows:
        counts[row["group_id"]] = row["unread"]

    return counts


def get_group_chat_unread(user, chat, last_read):
    """
    Количество непрочитанных сообщений в одном групповом чате.
    """

    messages = (
        MessageInGroupModel.objects
        .filter(group=chat)
        .exclude(user=user)
    )

    if last_read is not None:
        messages = messages.filter(created_at__gt=last_read)

    return messages.count()


def get_personal_unread_counts(user):
    """
    {id собеседника: количество непрочитанных входящих сообщений}.

    Пользователь может быть записан в чате и как teacher,
    и как user (чаты педагог-педагог), поэтому учитываются
    обе стороны.
    """

    counts = {}

    as_teacher = (
        MessageInTeacherChatModel.objects
        .filter(teacher=user, from_teacher=False, is_read=False)
        .values("user_id")
        .annotate(unread=Count("id"))
    )

    for row in as_teacher:
        counts[row["user_id"]] = (
            counts.get(row["user_id"], 0) + row["unread"]
        )

    as_student = (
        MessageInTeacherChatModel.objects
        .filter(user=user, from_teacher=True, is_read=False)
        .values("teacher_id")
        .annotate(unread=Count("id"))
    )

    for row in as_student:
        counts[row["teacher_id"]] = (
            counts.get(row["teacher_id"], 0) + row["unread"]
        )

    return counts


def build_unread_summary(user):
    """
    Полная сводка непрочитанных сообщений пользователя.
    """

    group_counts = get_group_unread_counts(user)
    personal_counts = get_personal_unread_counts(user)

    group_total = sum(group_counts.values())
    personal_total = sum(personal_counts.values())

    classes = {}
    personal_outside_classes = []

    if user.user_type == "teacher":
        # Для бейджа на классе: оба групповых чата класса
        # + личные чаты с участниками этих чатов.
        chat_members = {}

        if personal_counts:
            for chat_id, member_id in (
                GroupLinkModel.objects
                .filter(
                    group__isnull=False,
                    user_id__in=list(personal_counts.keys()),
                )
                .values_list("group_id", "user_id")
            ):
                chat_members.setdefault(chat_id, set()).add(member_id)

        for class_id, parent_chat_id, child_chat_id in (
            ClassModel.objects
            .values_list("id", "parent_chat_id", "child_chat_id")
        ):
            members = (
                chat_members.get(parent_chat_id, set())
                | chat_members.get(child_chat_id, set())
            )

            classes[str(class_id)] = (
                group_counts.get(parent_chat_id, 0)
                + group_counts.get(child_chat_id, 0)
                + sum(personal_counts[member] for member in members)
            )

        # Личные чаты с непрочитанными, собеседник которых не состоит
        # ни в одном чате класса (например, чат педагог-педагог).
        # Отдаём их отдельно, чтобы до них можно было добраться
        # с главной страницы.
        in_classes = set()

        for members in chat_members.values():
            in_classes |= members

        outside_ids = [
            companion_id
            for companion_id, count in personal_counts.items()
            if count and companion_id not in in_classes
        ]

        if outside_ids:
            for companion in (
                CustomUser.objects
                .filter(id__in=outside_ids)
                .order_by("surname", "name")
            ):
                full_name = " ".join(
                    part
                    for part in (companion.surname, companion.name)
                    if part
                )

                personal_outside_classes.append({
                    "uuid": str(companion.id),
                    "name": full_name or companion.email,
                    "unread": personal_counts[companion.id],
                })

    return {
        "total": group_total + personal_total,
        "group_total": group_total,
        "personal_total": personal_total,
        # {uuid группового чата: количество}
        "group_chats": {
            str(chat_id): count
            for chat_id, count in group_counts.items()
        },
        # {uuid собеседника: количество}
        "personal_chats": {
            str(companion_id): count
            for companion_id, count in personal_counts.items()
        },
        # {uuid класса: количество} — только для педагогов
        "classes": classes,
        # Личные чаты вне классов — только для педагогов
        "personal_outside_classes": personal_outside_classes,
    }


# ============================================================
# API
# ============================================================

class UnreadCountersView(APIView):
    """
    GET /api/unread/

    Счётчики непрочитанных сообщений текущего пользователя.
    Работает для педагогов, учеников и родителей.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            build_unread_summary(request.user),
            status=status.HTTP_200_OK,
        )

import requests
from django.contrib.auth import get_user_model
from django.shortcuts import render

from django.db.models import Q
from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.permissions import (
    AllowAny,
    IsAuthenticated,
)
from rest_framework.response import Response
from rest_framework.views import APIView

from messenger.models import (
    TypeClassModel,
    ClassModel,
    ClassTypesLink,
    GroupLinkModel,
    AnnouncementGlobal,
    AnnouncementInClass,
    AnnounceTypeLink, GroupModel,
)

from .serializers import (
    TypeClassSerializer,
    GroupTagAssignSerializer,
    AnnouncementGlobalSerializer,
    AnnouncementInClassSerializer,
)

from .permissions import IsTeacher


CustomUser = get_user_model()

def get_ordering(request):
    """
    Возвращает поле сортировки.

    ?ordering=date
    ?ordering=-date

    По умолчанию новые объявления идут первыми.
    """

    ordering = request.query_params.get(
        "ordering",
        "-date",
    )

    allowed_orderings = {
        "date",
        "-date",
    }

    if ordering not in allowed_orderings:
        ordering = "-date"

    return ordering


class TypeClassCreateView(APIView):
    """
    Создание тэга группы.

    POST /announcement/tags/

    Только teacher.
    """

    permission_classes = [
        IsAuthenticated,
        IsTeacher,
    ]

    def get(self, request):
        all_tags = TypeClassModel.objects.all()
        serializer = TypeClassSerializer(all_tags, many=True)
        return Response(serializer.data)


    def post(self, request):
        serializer = TypeClassSerializer(
            data=request.data
        )

        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )

    def delete(self, request):
        tag = TypeClassModel.objects.get(pk=request.data["id"])
        tag.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class GroupTagAssignView(APIView):
    """
    Присваивание тэгов конкретной группе.

    POST /announcement/groups/<class_id>/tags/

    Только teacher.
    """

    permission_classes = [
        IsAuthenticated,
        IsTeacher,
    ]

    def get(self, request, class_id):
        all_tags = TypeClassModel.objects.all()
        linked_tags = ClassTypesLink.objects.filter(class_model__id=class_id)
        linked_data = []
        for linked_tag in linked_tags:
            linked_data.append({"id": linked_tag.type_model.id, "name": linked_tag.type_model.name})
        serializer = TypeClassSerializer(all_tags, many=True)
        return Response({"all_tags": serializer.data, "linked_tags": linked_data}, status=status.HTTP_200_OK)

    def post(self, request, class_id):
        class_model = get_object_or_404(
            ClassModel,
            id=class_id,
        )

        serializer = GroupTagAssignSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        tag_ids = serializer.validated_data["tags"]

        ClassTypesLink.objects.filter(
            class_model=class_model
        ).delete()

        ClassTypesLink.objects.bulk_create(
            [
                ClassTypesLink(
                    class_model=class_model,
                    type_model_id=tag_id,
                )
                for tag_id in tag_ids
            ]
        )

        return Response(
            {
                "class_id": str(class_model.id),
                "tags": tag_ids,
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, class_id):
        tag = get_object_or_404(TypeClassModel,pk=request.data["id"])
        class_model = get_object_or_404(ClassModel,id=class_id)
        link = get_object_or_404(ClassTypesLink, type_model=tag, class_model=class_model)
        link.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class GlobalAnnouncementCreateView(APIView):
    """
    Создание общего объявления.

    POST /announcement/global/

    Только teacher.
    """

    permission_classes = [
        IsAuthenticated,
        IsTeacher,
    ]

    def post(self, request):
        serializer = AnnouncementGlobalSerializer(
            data=request.data,
            context={
                "request": request,
            },
        )

        serializer.is_valid(
            raise_exception=True
        )

        announcement = serializer.save()

        if announcement.for_all:
            emails = CustomUser.objects.all().values_list(
                "email",
                flat=True,
            )
        else:
            type_ids = announcement.type_links.values_list(
                "type_group__id",
                flat=True,
            )

            emails = (
                CustomUser.objects
                .filter(
                    group_links__group__in=GroupModel.objects.filter(
                        Q(parent_group__type_links__type_model_id__in=type_ids)
                        | Q(child_group__type_links__type_model_id__in=type_ids)
                    )
                )
                .values_list("email", flat=True)
                .distinct()
            )

        print(emails)
        requests.post("http://172.17.0.1:8116/", json={
                "email": [emails],
                "subject": f"Объявление: {announcement.title}",
                "text_message": announcement.announce,
                "html_message": announcement.announce,
            }
        )


        return Response(
            AnnouncementGlobalSerializer(
                announcement,
                context={
                    "request": request,
                },
            ).data,
            status=status.HTTP_201_CREATED,
        )


class GlobalAnnouncementDetailView(APIView):
    """
    Получение / редактирование общего объявления.

    GET   /announcement/global/<id>/
    PATCH /announcement/global/<id>/

    GET доступен авторизованному пользователю
    только если объявление ему доступно.

    PATCH только teacher.
    """

    permission_classes = [
        IsAuthenticated,
    ]

    def get_object(self, pk):
        return get_object_or_404(
            AnnouncementGlobal,
            id=pk,
        )

    def user_can_see(self, user, announcement):
        if announcement.for_all:
            return True

        user_groups = GroupLinkModel.objects.filter(
            user=user,
            group__isnull=False,
        ).values_list(
            "group_id",
            flat=True,
        )

        class_ids = ClassModel.objects.filter(
            Q(parent_chat_id__in=user_groups)
            | Q(child_chat_id__in=user_groups)
        ).values_list(
            "id",
            flat=True,
        )

        user_tag_ids = ClassTypesLink.objects.filter(
            class_model_id__in=class_ids
        ).values_list(
            "type_model_id",
            flat=True,
        )

        return AnnounceTypeLink.objects.filter(
            announce=announcement,
            type_group_id__in=user_tag_ids,
        ).exists()

    def get(self, request, pk):
        announcement = self.get_object(pk)

        if not self.user_can_see(
            request.user,
            announcement,
        ):
            return Response(
                {
                    "detail": "У вас нет доступа к этому объявлению."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = AnnouncementGlobalSerializer(
            announcement,
            context={
                "request": request,
            },
        )

        return Response(serializer.data)

    def patch(self, request, pk):
        if not IsTeacher().has_permission(
            request,
            self,
        ):
            return Response(
                {
                    "detail": "Доступ разрешён только преподавателям."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        announcement = self.get_object(pk)

        serializer = AnnouncementGlobalSerializer(
            announcement,
            data=request.data,
            partial=True,
            context={
                "request": request,
            },
        )

        serializer.is_valid(
            raise_exception=True
        )

        announcement = serializer.save()

        return Response(
            AnnouncementGlobalSerializer(
                announcement,
                context={
                    "request": request,
                },
            ).data
        )


class GlobalAnnouncementsForAllView(APIView):
    """
    Получение общих объявлений для всех.

    GET /announcement/global/all/

    Доступно без авторизации.

    Возвращаются ТОЛЬКО объявления:
        for_all=True
    """

    permission_classes = [
        AllowAny,
    ]

    def get(self, request):
        ordering = get_ordering(request)

        queryset = AnnouncementGlobal.objects.filter(
            for_all=True
        ).order_by(ordering)

        serializer = AnnouncementGlobalSerializer(
            queryset,
            many=True,
            context={
                "request": request,
            },
        )

        return Response(serializer.data)


class GlobalAnnouncementsView(APIView):
    """
    Получение общих объявлений пользователя.

    GET /announcement/global/

    Требует авторизацию.

    Возвращает:

    1. for_all=True
    2. объявления с тэгами классов пользователя

    Дубликаты удаляются.
    """

    permission_classes = [
        IsAuthenticated,
    ]

    def get_user_class_ids(self, user):
        user_group_ids = GroupLinkModel.objects.filter(
            user=user,
            group__isnull=False,
        ).values_list(
            "group_id",
            flat=True,
        )

        return ClassModel.objects.filter(
            Q(parent_chat_id__in=user_group_ids)
            | Q(child_chat_id__in=user_group_ids)
        ).values_list(
            "id",
            flat=True,
        )

    def get(self, request):
        ordering = get_ordering(request)

        class_ids = self.get_user_class_ids(
            request.user
        )

        user_tag_ids = ClassTypesLink.objects.filter(
            class_model_id__in=class_ids
        ).values_list(
            "type_model_id",
            flat=True,
        )

        announcement_ids = AnnounceTypeLink.objects.filter(
            type_group_id__in=user_tag_ids
        ).values_list(
            "announce_id",
            flat=True,
        )

        queryset = AnnouncementGlobal.objects.filter(
            Q(for_all=True)
            | Q(id__in=announcement_ids)
        ).distinct().order_by(ordering)

        serializer = AnnouncementGlobalSerializer(
            queryset,
            many=True,
            context={
                "request": request,
            },
        )

        return Response(serializer.data)

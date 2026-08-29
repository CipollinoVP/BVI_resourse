from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from messenger.models import (
    ClassModel,
    ClassTeacherLink,
    AnnouncementGlobal,
)
from schedule.models import TeacherModel
from schedule.utils import get_schedule_for_teacher


class TeacherMainView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        teacher = request.user

        schedule_teacher = TeacherModel.objects.filter(
            user=request.user
        ).first()

        schedule = []

        if schedule_teacher:
            schedule = get_schedule_for_teacher(schedule_teacher)

        classes = (
            ClassModel.objects
            .prefetch_related("type_links__type_model")
            .order_by("name")
            .distinct()
        )

        announcements = (
            AnnouncementGlobal.objects
            .prefetch_related("type_links__type_group")
            .order_by("-date", "-id")
        )

        data = {
            "classes": [
                {
                    "uuid": class_obj.id,
                    "name": class_obj.name,
                }
                for class_obj in classes
            ],
            "announcements": [
                {
                    "uuid": announcement.id,
                    "date": announcement.date,
                    "title": announcement.title,
                    "img": announcement.img.url if announcement.img else None,
                    "announce": announcement.announce,
                    "tags": [
                        {
                            "uuid": link.type_group.id,
                            "name": link.type_group.name,
                        }
                        for link in announcement.type_links.all()
                    ],
                }
                for announcement in announcements
            ],
            "shedule": schedule
        }

        return Response(data, status=200)
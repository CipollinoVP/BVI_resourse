from django.db.models import Q

from .models import RegularLessonModel, IrregularLessonModel, CancelLessonModel
from datetime import datetime, timedelta
from messenger.models import ClassModel


def get_schedule_for_week(group: ClassModel, start_day: datetime = None):
    if start_day is None:
        start_day = datetime.now()
    finish_day = start_day + timedelta(days=7)

    start_date = start_day.date()
    end_date = finish_day.date()

    regular_lessons = RegularLessonModel.objects.filter(
        Q(group=group) &
        Q(start_schedule__lte=start_date) &  # начало расписания ДО или В start_day
        Q(end_schedule__gte=end_date)  # конец расписания ПОСЛЕ или В finish_day
    ).prefetch_related("canceled")

    irregular_lesson = IrregularLessonModel.objects.filter(group=group)
    cursor = start_day.date()
    schedule = []
    while cursor != end_date:
        weekday = cursor.strftime('%A')
        today_lessons = regular_lessons.filter(weekday=weekday)
        if today_lessons.exists():
            for lesson in today_lessons:
                if CancelLessonModel.objects.filter(lesson=lesson, date=cursor).exists():
                    continue
                else:
                    schedule.append(
                        {
                            "type": "regular",
                            "day": lesson.weekday,
                            "exact_day": cursor.strftime('%Y-%m-%d'),
                            "start_time": lesson.start_time,
                            "finish_time": lesson.finish_time,
                        }
                    )
        check_irregular = irregular_lesson.filter(date=cursor)
        if check_irregular.exists():
            schedule.append(
                {
                    "type": "irregular",
                    "day": weekday,
                    "exact_day": cursor.strftime('%Y-%m-%d'),
                    "start_time": check_irregular.first().start_time,
                    "finish_time": check_irregular.first().finish_time,
                }
            )
        cursor = cursor + timedelta(days=1)
    return schedule


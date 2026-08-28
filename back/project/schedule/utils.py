from django.db.models import Q

from .models import RegularLessonModel, IrregularLessonModel, CancelLessonModel, TeacherModel
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

def get_schedule_for_teacher(
                teacher: TeacherModel,
                start_day: datetime = None,
            ):
    if start_day is None:
        start_day = datetime.now()

    finish_day = start_day + timedelta(days=7)

    start_date = start_day.date()
    end_date = finish_day.date()

    # Регулярные занятия преподавателя,
    # действующие в течение всей запрашиваемой недели
    regular_lessons = (
        RegularLessonModel.objects
        .filter(
            Q(teacher=teacher),
            Q(start_schedule__lte=start_date),
            Q(end_schedule__gte=end_date),
        )
        .select_related("group")
        .prefetch_related("canceled")
    )

    # Разовые занятия преподавателя
    irregular_lessons = (
        IrregularLessonModel.objects
        .filter(
            teacher=teacher,
            date__gte=start_date,
            date__lt=end_date,
        )
        .select_related("group")
    )

    # Заранее получаем отменённые занятия
    canceled_dates = {
        (cancel.lesson_id, cancel.date)
        for cancel in CancelLessonModel.objects.filter(
            lesson__in=regular_lessons,
            date__gte=start_date,
            date__lt=end_date,
        )
    }

    schedule = []

    cursor = start_date

    while cursor != end_date:
        weekday = cursor.strftime("%A")

        # Регулярные занятия
        for lesson in regular_lessons:
            if lesson.weekday != weekday:
                continue

            if (lesson.id, cursor) in canceled_dates:
                continue

            schedule.append(
                {
                    "type": "regular",
                    "day": lesson.weekday,
                    "exact_day": cursor.strftime("%Y-%m-%d"),
                    "name": lesson.name,
                    "start_time": lesson.start_time,
                    "finish_time": lesson.finish_time,
                    "group": {
                        "uuid": lesson.group.id,
                        "name": lesson.group.name,
                    } if lesson.group else None,
                }
            )

        # Разовые занятия
        for lesson in irregular_lessons:
            if lesson.date != cursor:
                continue

            schedule.append(
                {
                    "type": "irregular",
                    "day": weekday,
                    "exact_day": cursor.strftime("%Y-%m-%d"),
                    "name": lesson.name,
                    "start_time": lesson.start_time,
                    "finish_time": lesson.finish_time,
                    "group": {
                        "uuid": lesson.group.id,
                        "name": lesson.group.name,
                    } if lesson.group else None,
                }
            )

        cursor += timedelta(days=1)

    # Сортируем по дате и времени
    schedule.sort(
        key=lambda lesson: (
            lesson["exact_day"],
            lesson["start_time"],
        )
    )

    return schedule


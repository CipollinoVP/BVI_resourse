from rest_framework.permissions import BasePermission


class IsTeacher(BasePermission):
    message = "Доступ разрешён только преподавателям."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        return getattr(request.user, "user_type", None) == "teacher"
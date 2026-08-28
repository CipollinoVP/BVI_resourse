from rest_framework import serializers

from .models import CustomUser


class TeacherCreateUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = [
            'email',
            'name',
            'surname',
            'user_type',
        ]

    def validate_user_type(self, value):
        if value not in ['parent', 'child']:
            raise serializers.ValidationError(
                'Педагог может создавать только пользователей типа "parent" или "child".'
            )

        return value

    def validate_email(self, value):
        value = value.lower().strip()

        if CustomUser.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                'Пользователь с таким email уже существует.'
            )

        return value

    def validate_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError('Имя обязательно.')

        return value.strip()

    def validate_surname(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError('Фамилия обязательна.')

        return value.strip()
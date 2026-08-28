from rest_framework import serializers

from messenger.models import (
    TypeClassModel,
    ClassModel,
    ClassTypesLink,
    AnnouncementGlobal,
    AnnouncementInClass,
    AnnounceTypeLink,
)


class TypeClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = TypeClassModel
        fields = [
            "id",
            "name",
        ]


class GroupTagAssignSerializer(serializers.Serializer):
    tags = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=True,
    )

    def validate_tags(self, value):
        existing_ids = set(
            TypeClassModel.objects.filter(
                id__in=value
            ).values_list("id", flat=True)
        )

        requested_ids = set(value)

        missing = requested_ids - existing_ids

        if missing:
            raise serializers.ValidationError(
                f"Тэги с id {sorted(missing)} не существуют."
            )

        return list(requested_ids)


class AnnouncementGlobalSerializer(serializers.ModelSerializer):
    tags = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=TypeClassModel.objects.all(),
        required=False,
    )

    class Meta:
        model = AnnouncementGlobal
        fields = [
            "id",
            "user",
            "date",
            "title",
            "img",
            "announce",
            "for_all",
            "tags",
        ]
        read_only_fields = [
            "id",
            "user",
            "date",
        ]

    def create(self, validated_data):
        tags = validated_data.pop("tags", [])

        request = self.context.get("request")

        announcement = AnnouncementGlobal.objects.create(
            user=request.user,
            **validated_data,
        )

        AnnounceTypeLink.objects.bulk_create(
            [
                AnnounceTypeLink(
                    announce=announcement,
                    type_group=tag,
                )
                for tag in tags
            ]
        )

        return announcement

    def update(self, instance, validated_data):
        tags = validated_data.pop("tags", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        if tags is not None:
            AnnounceTypeLink.objects.filter(
                announce=instance
            ).delete()

            AnnounceTypeLink.objects.bulk_create(
                [
                    AnnounceTypeLink(
                        announce=instance,
                        type_group=tag,
                    )
                    for tag in tags
                ]
            )

        return instance

    def to_representation(self, instance):
        data = super().to_representation(instance)

        data["tags"] = list(
            AnnounceTypeLink.objects.filter(
                announce=instance
            ).values_list(
                "type_group_id",
                flat=True,
            )
        )

        return data


class AnnouncementInClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnnouncementInClass
        fields = [
            "id",
            "user",
            "group",
            "date",
            "title",
            "img",
            "announce",
        ]
        read_only_fields = [
            "id",
            "user",
            "date",
        ]
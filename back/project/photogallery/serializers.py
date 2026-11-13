from rest_framework import serializers

from .models import Drawing, Photo


class _GalleryItemSerializer(serializers.ModelSerializer):
    # Относительный путь вида /media/drawings/xxx.jpg —
    # фронт сам достраивает его до полного адреса бэкенда.
    file = serializers.SerializerMethodField()

    def get_file(self, obj):
        return obj.file.url if obj.file else None


class DrawingSerializer(_GalleryItemSerializer):
    class Meta:
        model = Drawing
        fields = ('id', 'file', 'child_name', 'theme', 'title', 'date')


class PhotoSerializer(_GalleryItemSerializer):
    class Meta:
        model = Photo
        fields = ('id', 'file', 'child_name', 'theme', 'date')

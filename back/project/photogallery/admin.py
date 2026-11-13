from django.contrib import admin
from django.utils.html import format_html

from .models import Drawing, Photo


class _GalleryAdmin(admin.ModelAdmin):
    list_display = ('preview', 'child_name', 'theme', 'date')
    list_display_links = ('preview', 'child_name')
    search_fields = ('theme', 'child_name')
    search_help_text = 'Поиск по теме занятия и имени ребёнка'
    list_filter = ('date',)
    date_hierarchy = 'date'
    readonly_fields = ('preview_large',)
    list_per_page = 50

    @admin.display(description='Превью')
    def preview(self, obj):
        if not obj.file:
            return '—'
        return format_html(
            '<img src="{}" style="height:60px;width:60px;object-fit:cover;border-radius:6px;" />',
            obj.file.url,
        )

    @admin.display(description='Просмотр')
    def preview_large(self, obj):
        if not obj or not obj.file:
            return '—'
        return format_html('<img src="{}" style="max-height:400px;max-width:100%;" />', obj.file.url)


@admin.register(Drawing)
class DrawingAdmin(_GalleryAdmin):
    list_display = ('preview', 'title', 'child_name', 'theme', 'date')
    list_display_links = ('preview', 'title')
    fields = ('file', 'preview_large', 'title', 'child_name', 'theme', 'date')


@admin.register(Photo)
class PhotoAdmin(_GalleryAdmin):
    fields = ('file', 'preview_large', 'child_name', 'theme', 'date')

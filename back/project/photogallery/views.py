from django.db.models import Q
from rest_framework import generics, pagination
from rest_framework.permissions import AllowAny

from .models import Drawing, Photo
from .serializers import DrawingSerializer, PhotoSerializer


class GalleryPagination(pagination.PageNumberPagination):
    page_size = 12
    page_size_query_param = 'page_size'
    max_page_size = 100


class _GalleryListView(generics.ListAPIView):
    """
    GET-список с пагинацией.
    Параметры: ?page=, ?page_size=, ?search= (по теме занятия и — для рисунков —
    названию работы). По имени ребёнка публично не ищем: имена видны только в админке.
    """
    permission_classes = [AllowAny]
    pagination_class = GalleryPagination
    search_fields = ('theme',)

    def get_queryset(self):
        qs = self.model.objects.all()
        search = self.request.query_params.get('search', '').strip()
        if search:
            cond = Q()
            for field in self.search_fields:
                cond |= Q(**{f'{field}__icontains': search})
            qs = qs.filter(cond)
        return qs


class DrawingListView(_GalleryListView):
    model = Drawing
    serializer_class = DrawingSerializer
    search_fields = ('theme', 'title')


class PhotoListView(_GalleryListView):
    model = Photo
    serializer_class = PhotoSerializer

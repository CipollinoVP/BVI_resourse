from rest_framework import generics, pagination
from rest_framework.permissions import AllowAny
from .models import News
from .serializers import NewsSerializer


class NewsPagination(pagination.PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class NewsListView(generics.ListAPIView):
    queryset = News.objects.all().order_by('-date')  # Сортировка по дате (сначала новые)
    serializer_class = NewsSerializer
    permission_classes = [AllowAny]
    pagination_class = NewsPagination
# Create your views here.

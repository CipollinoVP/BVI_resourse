from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from customuser.views import ReturnTypeView
from news.views import NewsListView
from messenger.unread import UnreadCountersView


urlpatterns = [
    # JWT аутентификация
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    path('api/admin/', include('messenger.url_teacher')),
    path('api/students/', include('messenger.url_students')),
    path('api/type/', ReturnTypeView.as_view(), name='return_type'),
    path('api/news/', NewsListView.as_view(), name='news-list'),
    # Счётчики непрочитанных сообщений (педагоги, ученики, родители)
    path('api/unread/', UnreadCountersView.as_view(), name='unread-counters'),
    # Djoser аутентификация
    path('api/auth/', include('djoser.urls')),
    path('api/auth/', include('djoser.urls.jwt')),
    path('admin/', admin.site.urls),
    path('ckeditor/', include('ckeditor_uploader.urls')),
]

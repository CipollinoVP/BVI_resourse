from django.contrib import admin
from django.urls import path
from .views_teacher import GetClassInfoView

urlpatterns = [
    path('get_class_info/<uuid:class_uuid>/',GetClassInfoView.as_view(), name='get_class_info'),
]
from django.urls import path

from .views import DrawingListView, PhotoListView

urlpatterns = [
    path('drawings/', DrawingListView.as_view(), name='gallery-drawings'),
    path('photos/', PhotoListView.as_view(), name='gallery-photos'),
]

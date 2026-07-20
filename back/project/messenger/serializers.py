from rest_framework import serializers
from .models import ClassModel

class ClassModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClassModel
        fields = '__all__'
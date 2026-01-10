from rest_framework import serializers
from .models import Player

class PlayerSerializer(serializers.ModelSerializer):
    """
    선수 정보 시리얼라이저
    """
    class Meta:
        model = Player
        fields = '__all__'  # 모든 필드 포함

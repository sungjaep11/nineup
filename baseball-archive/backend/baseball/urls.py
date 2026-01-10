from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import PlayerViewSet, get_players_by_position_mysql

router = DefaultRouter()
router.register(r'players', PlayerViewSet)

urlpatterns = [
    # MySQL 테이블 직접 쿼리 API
    path('mysql-players/', get_players_by_position_mysql, name='mysql-players'),
] + router.urls

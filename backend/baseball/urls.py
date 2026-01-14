from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import PlayerViewSet, get_players_by_position_mysql, get_player_images, get_hitter_recent_games, get_pitcher_recent_games, get_2025_hitters, get_2025_pitchers, simulate_at_bat

router = DefaultRouter()
router.register(r'players', PlayerViewSet)

urlpatterns = [
    # MySQL 테이블 직접 쿼리 API
    path('mysql-players/', get_players_by_position_mysql, name='mysql-players'),
    # 선수 이미지 목록 API
    path('player-images/', get_player_images, name='player-images'),
    # 타자 최근 경기 기록 API
    path('hitter-recent-games/', get_hitter_recent_games, name='hitter-recent-games'),
    # 투수 최근 경기 기록 API
    path('pitcher-recent-games/', get_pitcher_recent_games, name='pitcher-recent-games'),
    # 2025 타자 목록 API
    path('hitters-2025/', get_2025_hitters, name='hitters-2025'),
    # 2025 투수 목록 API
    path('pitchers-2025/', get_2025_pitchers, name='pitchers-2025'),
    # 타자 vs 투수 시뮬레이션 API
    path('simulate-at-bat/', simulate_at_bat, name='simulate-at-bat'),
] + router.urls

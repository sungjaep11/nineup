from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from django.db import connection
from django.conf import settings
import os
from .models import Player
from .serializers import PlayerSerializer

class PlayerViewSet(viewsets.ModelViewSet):
    """
    선수 정보 API (기존 SQLite 모델용 - 호환성 유지)
    """
    queryset = Player.objects.all()
    serializer_class = PlayerSerializer
    
    @action(detail=False, methods=['get'])
    def by_position(self, request):
        """
        특정 포지션의 선수들 반환
        GET /api/players/by_position/?position=pitcher
        """
        position = request.query_params.get('position')
        if not position:
            return Response(
                {"detail": "Position parameter is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        players = self.queryset.filter(position=position)
        serializer = self.get_serializer(players, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def all_by_position(self, request):
        """
        모든 포지션별 선수들 반환
        GET /api/players/all_by_position/
        """
        positions = [choice[0] for choice in Player.POSITION_CHOICES]
        data = {}
        
        for position in positions:
            players = self.queryset.filter(position=position)
            serializer = self.get_serializer(players, many=True)
            data[position] = serializer.data
        
        return Response(data)


# ==========================================
# MySQL 테이블 직접 쿼리 (batterlist, pitcherlist)
# ==========================================

# 포지션 매핑: DB 포지션 → 프론트엔드 포지션 키
POSITION_MAPPING = {
    'P': 'pitcher',      # 투수
    'C': 'catcher',      # 포수
    '1B': 'first',       # 1루수
    '2B': 'second',      # 2루수
    '3B': 'third',       # 3루수
    'SS': 'shortstop',   # 유격수
    'LF': 'left',        # 좌익수
    'CF': 'center',      # 중견수
    'RF': 'right',       # 우익수
}

# 포지션별 ID 시작 번호 (중복 방지)
POSITION_ID_OFFSET = {
    'pitcher': 1000,
    'catcher': 2000,
    'first': 3000,
    'second': 4000,
    'third': 5000,
    'shortstop': 6000,
    'left': 7000,
    'center': 8000,
    'right': 9000,
}

# 한글 이름
POSITION_NAMES = {
    'pitcher': '투수',
    'catcher': '포수',
    'first': '1루수',
    'second': '2루수',
    'third': '3루수',
    'shortstop': '유격수',
    'left': '좌익수',
    'center': '중견수',
    'right': '우익수',
}


@api_view(['GET'])
def get_players_by_position_mysql(request):
    """
    MySQL에서 포지션별 선수 데이터 가져오기
    GET /api/mysql-players/
    
    Returns:
    {
      "pitcher": [...],
      "catcher": [...],
      "first": [...],
      ...
    }
    """
    try:
        result = {}
        
        # 1. 투수 데이터 (pitcherlist 테이블)
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 시즌, 팀, 포지션, 이름, ERA, 승, 패, 홀드, 세이브, 탈삼진
                FROM pitcherlist
                WHERE 포지션 = 'P'
            """)
            columns = [col[0] for col in cursor.description]
            pitchers = [dict(zip(columns, row)) for row in cursor.fetchall()]
            
            # 프론트엔드 형식으로 변환
            result['pitcher'] = [
                {
                    'id': POSITION_ID_OFFSET['pitcher'] + idx + 1,  # 1001, 1002, 1003...
                    'name': p['이름'],
                    'team': p['팀'],
                    'position': 'pitcher',
                    'back_number': idx + 1,  # 등번호가 없으면 임시로 ID 사용
                    'era': p['ERA'],
                    'wins': p['승'],
                    'losses': p['패'],
                    'holds': p['홀드'],
                    'saves': p['세이브'],
                    'strikeouts': p['탈삼진'],
                }
                for idx, p in enumerate(pitchers)
            ]
        
        # 2. 타자 데이터 (batterlist 테이블)
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 시즌, 팀, 포지션, 이름, 타율, 타점, 홈런, 도루
                FROM batterlist
            """)
            columns = [col[0] for col in cursor.description]
            batters = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        # 포지션별로 그룹화
        for db_position, frontend_position in POSITION_MAPPING.items():
            if db_position == 'P':
                continue  # 투수는 이미 처리함
            
            position_players = [b for b in batters if b['포지션'] == db_position]
            
            result[frontend_position] = [
                {
                    'id': POSITION_ID_OFFSET[frontend_position] + idx + 1,  # 포지션별 고유 ID
                    'name': p['이름'],
                    'team': p['팀'],
                    'position': frontend_position,
                    'back_number': idx + 1,  # 등번호가 없으면 임시로 ID 사용
                    'batting_average': float(p['타율']) if p['타율'] else 0,
                    'rbis': p['타점'],
                    'home_runs': p['홈런'],
                    'stolen_bases': p['도루'],
                }
                for idx, p in enumerate(position_players)
            ]
        
        return Response(result, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response(
            {'error': str(e), 'detail': 'MySQL 쿼리 중 오류가 발생했습니다.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def get_player_images(request):
    """
    선수 이미지 목록 가져오기
    GET /api/player-images/
    
    Returns:
    [
      {
        "id": "1",
        "playerName": "네일",
        "position": "pitcher",
        "playerId": 1,
        "imageUrl": "http://10.0.2.2:8000/media/네일_1.jpg",
        "fileName": "네일_1.jpg"
      },
      ...
    ]
    """
    try:
        player_images_dir = settings.MEDIA_ROOT
        
        if not os.path.exists(player_images_dir):
            return Response(
                {'error': 'player_images 폴더가 없습니다.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # 모든 이미지 파일 찾기
        image_files = []
        for filename in os.listdir(player_images_dir):
            if filename.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                # 파일명에서 선수 이름 추출 (예: "네일_1.jpg" -> "네일")
                player_name = filename.split('_')[0]
                
                image_files.append({
                    'id': filename,
                    'playerName': player_name,
                    'fileName': filename,
                    'imageUrl': f"{request.build_absolute_uri(settings.MEDIA_URL)}{filename}"
                })
        
        return Response(image_files, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

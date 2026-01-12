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
# MySQL 테이블 직접 쿼리 (kbo_hitters_top150, kbo_pitchers_top150)
# KBO 공식 사이트 크롤링 데이터 (2024 시즌)
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

# 한글 포지션 → 영문 포지션 매핑 (수비 테이블용)
POSITION_KR_TO_EN = {
    '포수': 'C',
    '1루수': '1B',
    '2루수': '2B',
    '3루수': '3B',
    '유격수': 'SS',
    '좌익수': 'LF',
    '중견수': 'CF',
    '우익수': 'RF',
    '지명타자': 'DH',
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
        
        # 1. 투수 데이터 (kbo_pitchers_top150 테이블 - 크롤링 데이터)
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT `순위`, `선수명`, `팀명`, `ERA`, `G`, `W`, `L`, `SV`, `HLD`, `WPCT`, `IP`, `H`, `HR`, `BB`, `HBP`, `SO`, `R`, `ER`, `WHIP`
                FROM `kbo_pitchers_top150`
                ORDER BY `G` DESC
            """)
            columns = [col[0] for col in cursor.description]
            pitchers = [dict(zip(columns, row)) for row in cursor.fetchall()]
            
            # 프론트엔드 형식으로 변환
            result['pitcher'] = [
                {
                    'id': POSITION_ID_OFFSET['pitcher'] + idx + 1,  # 1001, 1002, 1003...
                    'name': p['선수명'],
                    'team': p['팀명'],
                    'position': 'pitcher',
                    'back_number': int(p['순위']) if p['순위'] else idx + 1,  # 순위를 등번호로 사용
                    'era': float(p['ERA']) if p['ERA'] else 0,
                    'wins': int(p['W']) if p['W'] else 0,
                    'losses': int(p['L']) if p['L'] else 0,
                    'holds': int(p['HLD']) if p['HLD'] else 0,
                    'saves': int(p['SV']) if p['SV'] else 0,
                    'strikeouts': int(p['SO']) if p['SO'] else 0,
                }
                for idx, p in enumerate(pitchers)
            ]
        
        # 2. 타자 데이터 (kbo_hitters_top150 + kbo_defense_positions INNER JOIN)
        # SQL JOIN으로 포지션 정보와 merge - 포지션 정보가 있는 선수만 표시
        for db_position, frontend_position in POSITION_MAPPING.items():
            if db_position == 'P':
                continue  # 투수는 이미 처리함
            
            with connection.cursor() as cursor:
                # INNER JOIN 사용: 포지션 정보가 있는 선수만 가져오기
                # 영문 포지션(C, 1B 등)을 한글 포지션(포수, 1루수 등)으로 변환
                position_kr = {v: k for k, v in POSITION_KR_TO_EN.items()}.get(db_position, '')
                if not position_kr:
                    continue  # 매핑되지 않은 포지션은 스킵
                
                # 포지션_영문 컬럼이 있는지 확인 후 쿼리 실행
                # 도루 대신 득점(R) 사용
                cursor.execute("""
                    SELECT 
                        h.`순위`, 
                        h.`선수명`, 
                        h.`팀명`, 
                        d.`포지션` AS `포지션_한글`,
                        h.`AVG`, 
                        h.`G`, 
                        h.`PA`, 
                        h.`AB`, 
                        h.`R`, 
                        h.`H`, 
                        h.`2B`, 
                        h.`3B`, 
                        h.`HR`, 
                        h.`TB`, 
                        h.`RBI`, 
                        h.`SAC`, 
                        h.`SF`,
                        COALESCE(h.`R`, 0) AS `R`
                    FROM `kbo_hitters_top150` h
                    INNER JOIN `kbo_defense_positions` d 
                        ON h.`선수명` = d.`선수명` 
                        AND h.`팀명` = d.`팀명`
                    WHERE d.`포지션` = %s
                    ORDER BY h.`TB` DESC
                """, [position_kr])
                columns = [col[0] for col in cursor.description]
                position_players = [dict(zip(columns, row)) for row in cursor.fetchall()]
            
            # 프론트엔드 형식으로 변환
            result[frontend_position] = [
                {
                    'id': POSITION_ID_OFFSET[frontend_position] + idx + 1,
                    'name': p['선수명'],
                    'team': p['팀명'],
                    'position': frontend_position,
                    'back_number': int(p['순위']) if p['순위'] else idx + 1,
                    'batting_average': float(p['AVG']) if p['AVG'] else 0,
                    'rbis': int(p['RBI']) if p['RBI'] else 0,
                    'home_runs': int(p['HR']) if p['HR'] else 0,
                    'stolen_bases': int(p['R']) if p['R'] is not None else 0,  # 도루 대신 득점(R) 사용
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

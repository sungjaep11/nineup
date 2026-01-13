from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from django.db import connection
import pymysql
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
            
            # IP 문자열을 소수점으로 변환하는 함수
            def parse_ip(ip_str):
                """'180 2/3' 형식의 IP를 소수점으로 변환"""
                if not ip_str:
                    return 0.0
                try:
                    ip_str = str(ip_str).strip()
                    # 공백으로 분리
                    parts = ip_str.split()
                    if len(parts) == 1:
                        # "80" 같은 경우
                        return float(parts[0])
                    elif len(parts) == 2:
                        # "47 2/3" 같은 경우
                        whole = float(parts[0])
                        fraction = parts[1]
                        if '/' in fraction:
                            num, den = map(int, fraction.split('/'))
                            return whole + (num / den)
                        return whole
                    else:
                        return float(ip_str)
                except (ValueError, AttributeError):
                    return 0.0
            
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
                    'whip': float(p['WHIP']) if p['WHIP'] else 0,
                    'innings_pitched': parse_ip(p.get('IP')),
                    'walks': int(p['BB']) if p.get('BB') is not None else 0,
                }
                for idx, p in enumerate(pitchers)
            ]
        
        # 2. 타자 데이터 (kbo_hitters_top150 + kbo_defense_positions INNER JOIN)
        # SQL JOIN으로 포지션 정보와 merge - 포지션 정보가 있는 선수만 표시
        for db_position, frontend_position in POSITION_MAPPING.items():
            if db_position == 'P':
                continue  # 투수는 이미 처리함
            
            # 영문 포지션을 한글 포지션으로 변환 (DB의 POS 컬럼이 한글일 수 있음)
            # POSITION_KR_TO_EN의 역매핑 생성
            position_en_to_kr = {v: k for k, v in POSITION_KR_TO_EN.items()}
            position_kr = position_en_to_kr.get(db_position)
            
            if not position_kr:
                continue  # 매핑되지 않은 포지션은 스킵
            
            with connection.cursor() as cursor:
                # INNER JOIN 사용: 포지션 정보가 있는 선수만 가져오기
                # d.POS는 한글 포지션(포수, 1루수 등)이므로 position_kr을 사용
                # 도루 대신 득점(R) 사용
                cursor.execute("""
                    SELECT 
                        h.`순위`, 
                        h.`선수명`, 
                        h.`팀명`, 
                        d.`POS` AS `포지션_영문`,
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
                        COALESCE(h.`R`, 0) AS `R`,
                        d.`FPCT` AS `수비율`
                    FROM `kbo_hitters_top150` h
                    INNER JOIN `kbo_defense_positions` d 
                        ON h.`선수명` = d.`선수명` 
                        AND h.`팀명` = d.`팀명`
                    WHERE d.`POS` = %s
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
                    'fielding_percentage': float(p['수비율']) if p.get('수비율') is not None and p.get('수비율') != '' else None,
                    'at_bats': int(p['AB']) if p.get('AB') is not None else 0,
                    'total_bases': int(p['TB']) if p.get('TB') is not None else 0,
                    'hits': int(p['H']) if p.get('H') is not None else 0,
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
    선수 이미지 목록 가져오기 (S3 URL 사용)
    GET /api/player-images/?names=류현진&names=김광현
    
    Query Parameters:
        names: 선수 이름 목록 (여러 개 가능)
    
    Returns:
    [
      {
        "id": "1",
        "playerName": "류현진",
        "playerId": 1001,
        "imageUrl": "https://s3...amazonaws.com/players/류현진_1.jpg",
        "fileName": "류현진_1.jpg",
        "imageType": "1"
      },
      ...
    ]
    """
    try:
        from config.db_config import DB_CONFIG
        
        player_names = request.query_params.getlist('names')
        
        if not player_names:
            return Response([], status=status.HTTP_200_OK)
        
        print(f"🔍 요청된 선수들: {player_names}")
        
        conn = pymysql.connect(**DB_CONFIG)
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        try:
            placeholders = ','.join(['%s'] * len(player_names))
            cursor.execute(f"""
                SELECT 
                    player_id,
                    player_name,
                    image_1,
                    image_2,
                    image_3,
                    profile_img
                FROM photo_data
                WHERE player_name IN ({placeholders})
            """, player_names)
            
            players = cursor.fetchall()
            print(f"✅ DB에서 {len(players)}명의 선수 데이터 조회 완료")
            
            image_files = []
            for player in players:
                player_name = player.get('player_name')
                player_id = player.get('player_id')
                print(f"📋 처리 중: {player_name} (player_id: {player_id})")
                
                image_types = [
                    ('1', player.get('image_1')),
                    ('2', player.get('image_2')),
                    ('3', player.get('image_3')),
                    ('profile', player.get('profile_img'))
                ]
                
                for image_type, image_url in image_types:
                    if image_url:
                        image_files.append({
                            'id': f"{player_name}_{image_type}",
                            'playerName': player_name,
                            'playerId': player_id,
                            'imageUrl': image_url,
                            'fileName': f"{player_name}_{image_type}.jpg",
                            'imageType': image_type
                        })
                    else:
                        print(f"   ⚠️ {image_type} 이미지 없음")
            
            print(f"📸 총 {len(image_files)}개의 이미지 반환")
            
            return Response(image_files, status=status.HTTP_200_OK)
        finally:
            conn.close()
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {'error': str(e), 'detail': '이미지 API 처리 중 오류가 발생했습니다.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

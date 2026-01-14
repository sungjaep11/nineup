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
def get_hitter_recent_games(request):
    """
    타자 최근 경기 기록 가져오기
    GET /api/hitter-recent-games/?player_name=양의지
    
    Query Parameters:
        player_name: 선수 이름
    
    Returns:
    [
      {
        "일자": "09.04",
        "상대": "NC",
        "H": "4",
        "AB": "5",
        "AVG": "0.800",
        ...
      },
      ...
    ]
    """
    try:
        from config.db_config import DB_CONFIG
        
        player_name = request.query_params.get('player_name')
        
        if not player_name:
            return Response(
                {'error': 'player_name 파라미터가 필요합니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        print(f"🔍 요청된 선수: {player_name}")
        
        conn = pymysql.connect(**DB_CONFIG)
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        try:
            cursor.execute("""
                SELECT 
                    `일자`, `상대`, `AVG`, `PA`, `AB`, `R`, `H`, 
                    `2B`, `3B`, `HR`, `RBI`, `SB`, `CS`, `BB`, `HBP`, `SO`, `GDP`
                FROM `hitter_recent_games_log`
                WHERE `선수명` = %s
                ORDER BY `일자` ASC
            """, (player_name,))
            
            games = cursor.fetchall()
            print(f"✅ {player_name}의 최근 {len(games)}경기 데이터 조회 완료")
            
            return Response(games, status=status.HTTP_200_OK)
        finally:
            conn.close()
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {'error': str(e), 'detail': '최근 경기 데이터 조회 중 오류가 발생했습니다.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def get_pitcher_recent_games(request):
    """
    투수 최근 경기 기록 가져오기
    GET /api/pitcher-recent-games/?player_name=류현진
    
    Query Parameters:
        player_name: 선수 이름
    
    Returns:
    [
      {
        "일자": "09.04",
        "상대": "NC",
        "IP": "6.0",
        "ER": "1",
        ...
      },
      ...
    ]
    """
    try:
        from config.db_config import DB_CONFIG
        
        player_name = request.query_params.get('player_name')
        
        if not player_name:
            return Response(
                {'error': 'player_name 파라미터가 필요합니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        print(f"🔍 요청된 투수: {player_name}")
        
        conn = pymysql.connect(**DB_CONFIG)
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        try:
            cursor.execute("""
                SELECT 
                    `일자`, `상대`, `결과`, `ERA`, `TBF`, `IP`, `H`, 
                    `HR`, `BB`, `HBP`, `SO`, `R`, `ER`, `AVG`
                FROM `pitcher_recent_games_log`
                WHERE `선수명` = %s
                ORDER BY `일자` ASC
            """, (player_name,))
            
            games = cursor.fetchall()
            print(f"✅ {player_name}의 최근 {len(games)}경기 데이터 조회 완료")
            
            return Response(games, status=status.HTTP_200_OK)
        finally:
            conn.close()
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {'error': str(e), 'detail': '최근 경기 데이터 조회 중 오류가 발생했습니다.'},
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


@api_view(['GET'])
def get_2025_hitters(request):
    """
    2025 타자 목록 가져오기
    GET /api/hitters-2025/
    
    Returns:
    [
      {
        "player_id": "76232",
        "선수명": "양의지",
        "AVG": "0.337",
        "G": "130",
        ...
      },
      ...
    ]
    """
    try:
        from config.db_config import DB_CONFIG
        
        conn = pymysql.connect(**DB_CONFIG)
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        try:
            cursor.execute("""
                SELECT 
                    `player_id`, `선수명`, `AVG`, `G`, `PA`, `AB`, `R`, `H`, 
                    `2B`, `3B`, `HR`, `TB`, `RBI`, `SAC`, `SF`, `SB`, `CS`, 
                    `BB`, `IBB`, `HBP`, `SO`, `GDP`, `SLG`, `OBP`, `OPS`
                FROM `2025_score_hitters`
                ORDER BY `선수명`
            """)
            
            hitters = cursor.fetchall()
            print(f"✅ 2025 타자 {len(hitters)}명 조회 완료")
            
            return Response(hitters, status=status.HTTP_200_OK)
        finally:
            conn.close()
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {'error': str(e), 'detail': '타자 목록 조회 중 오류가 발생했습니다.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def get_2025_pitchers(request):
    """
    2025 투수 목록 가져오기
    GET /api/pitchers-2025/
    
    Returns:
    [
      {
        "player_id": "76715",
        "선수명": "류현진",
        "ERA": "3.23",
        "G": "26",
        ...
      },
      ...
    ]
    """
    try:
        from config.db_config import DB_CONFIG
        
        conn = pymysql.connect(**DB_CONFIG)
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        try:
            cursor.execute("""
                SELECT 
                    `player_id`, `선수명`, `ERA`, `G`, `CG`, `SHO`, `W`, `L`, 
                    `SV`, `HLD`, `WPCT`, `TBF`, `NP`, `IP`, `H`, `2B`, `3B`, `HR`,
                    `SAC`, `SF`, `BB`, `IBB`, `SO`, `WP`, `BK`, `R`, `ER`, 
                    `BSV`, `WHIP`, `AVG`, `QS`
                FROM `2025_score_pitchers`
                ORDER BY `선수명`
            """)
            
            pitchers = cursor.fetchall()
            print(f"✅ 2025 투수 {len(pitchers)}명 조회 완료")
            
            return Response(pitchers, status=status.HTTP_200_OK)
        finally:
            conn.close()
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {'error': str(e), 'detail': '투수 목록 조회 중 오류가 발생했습니다.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def _simulate_single_at_bat(batter, pitcher, league_avg=0.270):
    """
    단일 타석 시뮬레이션 실행 (내부 함수)
    Returns: ('HR'|'3B'|'2B'|'1B'|'BB'|'SO'|'OUT', bases)
    """
    import random
    
    # 투수 데이터 전처리
    tbf = float(pitcher.get('TBF', 1))
    p_bb_rate = float(pitcher.get('BB', 0)) / tbf if tbf > 0 else 0.08
    p_so_rate = float(pitcher.get('SO', 0)) / tbf if tbf > 0 else 0.18
    p_avg = float(pitcher.get('AVG', 0.270))
    
    # 타자 데이터 전처리
    pa = float(batter.get('PA', 1))
    ab = float(batter.get('AB', 1))
    b_bb_rate = float(batter.get('BB', 0)) / pa if pa > 0 else 0.08
    b_so_rate = float(batter.get('SO', 0)) / pa if pa > 0 else 0.18
    b_avg = float(batter.get('AVG', 0.280))
    
    # 안타 수
    total_hits = float(batter.get('H', 0))
    if total_hits == 0:
        total_hits = ab * b_avg  # 타율로 추정
    
    # Log5 공식
    def calc_log5(batter_rate, pitcher_rate):
        if pitcher_rate is None:
            return batter_rate
        odds = (batter_rate * pitcher_rate) / league_avg
        prob = odds / (odds + (1 - batter_rate) * (1 - pitcher_rate) / (1 - league_avg))
        return prob
    
    # 시뮬레이션 실행
    roll = random.random()
    
    # 삼진 확률 (타자와 투수의 평균)
    prob_so = (b_so_rate + p_so_rate) / 2
    prob_so = min(prob_so, 0.5)  # 최대 50%로 제한
    
    # 볼넷 확률 (타자와 투수의 평균)
    prob_bb = (b_bb_rate + p_bb_rate) / 2
    prob_bb = min(prob_bb, 0.3)  # 최대 30%로 제한
    
    # 확률 정규화 (합이 1이 되도록)
    total_prob = prob_so + prob_bb
    if total_prob > 0.8:  # 합이 너무 크면 조정
        scale = 0.8 / total_prob
        prob_so *= scale
        prob_bb *= scale
    
    # 1단계: 삼진/볼넷/인플레이 결정
    if roll < prob_so:
        return ('SO', 0)
    elif roll < prob_so + prob_bb:
        return ('BB', 1)
    
    # 2단계: 인플레이 타구 -> 안타 vs 아웃 결정
    hit_prob = calc_log5(b_avg, p_avg)
    roll_hit = random.random()
    
    if roll_hit > hit_prob:
        return ('OUT', 0)
    
    # 3단계: 안타 종류 결정
    if total_hits > 0:
        ratio_hr = float(batter.get('HR', 0)) / total_hits
        ratio_3b = float(batter.get('3B', 0)) / total_hits
        ratio_2b = float(batter.get('2B', 0)) / total_hits
        # 비율 정규화 (합이 1을 넘지 않도록)
        total_ratio = ratio_hr + ratio_3b + ratio_2b
        if total_ratio > 1.0:
            scale = 1.0 / total_ratio
            ratio_hr *= scale
            ratio_3b *= scale
            ratio_2b *= scale
    else:
        # 기본값 (일반적인 타자 비율)
        ratio_hr = 0.05
        ratio_3b = 0.01
        ratio_2b = 0.15
    
    roll_type = random.random()
    
    if roll_type < ratio_hr:
        return ('HR', 4)
    elif roll_type < ratio_hr + ratio_3b:
        return ('3B', 3)
    elif roll_type < ratio_hr + ratio_3b + ratio_2b:
        return ('2B', 2)
    else:
        return ('1B', 1)


@api_view(['POST'])
def simulate_at_bat(request):
    """
    타자 vs 투수 몬테카를로 시뮬레이션 실행 (2000회)
    POST /api/simulate-at-bat/
    
    Request Body:
    {
      "batter": {
        "name": "양의지",
        "AVG": 0.337,
        "H": 153,
        "2B": 27,
        "3B": 1,
        "HR": 20,
        "BB": 50,
        "SO": 63,
        "PA": 517,
        "AB": 454
      },
      "pitcher": {
        "name": "류현진",
        "TBF": 574,
        "BB": 25,
        "SO": 122,
        "AVG": 0.267,
        "H": 144,
        "HR": 12
      }
    }
    
    Returns:
    {
      "result": "HR",
      "text": "담장을 넘어갑니다! 양의지의 시원한 홈런!",
      "bases": 4,
      "statistics": {
        "total_simulations": 2000,
        "distribution": {
          "HR": 0.15,
          "3B": 0.01,
          "2B": 0.12,
          "1B": 0.28,
          "BB": 0.08,
          "SO": 0.18,
          "OUT": 0.18
        },
        "average_bases": 1.2,
        "hit_rate": 0.56,
        "on_base_rate": 0.64
      }
    }
    """
    try:
        batter = request.data.get('batter')
        pitcher = request.data.get('pitcher')
        
        if not batter or not pitcher:
            return Response(
                {'error': 'batter와 pitcher 데이터가 필요합니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 리그 평균 타율
        league_avg = 0.270
        
        # 몬테카를로 시뮬레이션: 2000회 실행
        SIMULATION_COUNT = 2000
        results = []
        result_counts = {
            'HR': 0, '3B': 0, '2B': 0, '1B': 0,
            'BB': 0, 'SO': 0, 'OUT': 0
        }
        total_bases = 0
        
        for _ in range(SIMULATION_COUNT):
            result_type, bases = _simulate_single_at_bat(batter, pitcher, league_avg)
            results.append(result_type)
            result_counts[result_type] += 1
            total_bases += bases
        
        # 통계 계산
        distribution = {
            result_type: count / SIMULATION_COUNT
            for result_type, count in result_counts.items()
        }
        
        average_bases = total_bases / SIMULATION_COUNT
        
        # 안타율 (안타 / 전체)
        hit_rate = (result_counts['HR'] + result_counts['3B'] + 
                   result_counts['2B'] + result_counts['1B']) / SIMULATION_COUNT
        
        # 출루율 (안타 + 볼넷) / 전체
        on_base_rate = hit_rate + (result_counts['BB'] / SIMULATION_COUNT)
        
        # 가장 많이 나온 결과를 대표 결과로 선택
        most_common_result = max(result_counts.items(), key=lambda x: x[1])[0]
        
        # 대표 결과에 맞는 텍스트 생성
        batter_name = batter.get('name', '타자')
        pitcher_name = pitcher.get('name', '투수')
        bases_map = {'HR': 4, '3B': 3, '2B': 2, '1B': 1, 'BB': 1, 'SO': 0, 'OUT': 0}
        
        commentary = {
            'HR': f"담장을 넘어갑니다! {batter_name}의 시원한 홈런!",
            '3B': f"우중간을 완전히 가릅니다! {batter_name}, 3루까지 전력 질주!",
            '2B': f"좌익수 키를 넘기는 장타! 2루타입니다.",
            '1B': f"깔끔한 중전 안타!",
            'BB': f"볼넷으로 걸어나갑니다. {batter_name}의 선구안이 좋네요.",
            'SO': f"헛스윙 삼진! {pitcher_name}의 구위가 압도적입니다.",
            'OUT': f"유격수 땅볼 아웃."
        }
        
        return Response({
            'result': most_common_result,
            'text': commentary[most_common_result],
            'bases': bases_map[most_common_result],
            'statistics': {
                'total_simulations': SIMULATION_COUNT,
                'distribution': distribution,
                'average_bases': round(average_bases, 3),
                'hit_rate': round(hit_rate, 3),
                'on_base_rate': round(on_base_rate, 3),
                'counts': result_counts
            }
        })
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {'error': str(e), 'detail': '시뮬레이션 실행 중 오류가 발생했습니다.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

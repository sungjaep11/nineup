import os
import re
import pymysql
from pymysql import cursors

from icrawler.builtin import BingImageCrawler

# ==========================================
# MySQL 데이터베이스 설정
# ==========================================
from config.db_config import DB_USER, DB_PASSWORD, DB_HOST, DB_NAME, DB_PORT

def get_players_from_db():
    """
    MySQL에서 타자와 투수 선수 명단을 모두 가져옵니다.
    타자: kbo_hitters_top150 + kbo_defense_positions JOIN
    투수: kbo_pitchers_top150
    반환 형식: [{'name': 선수명, 'team': 팀명, 'position': 포지션}, ...]
    """
    all_players = []
    
    try:
        connection = pymysql.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            port=int(DB_PORT),
            cursorclass=cursors.DictCursor
        )
        
        print("=" * 60)
        print("📊 MySQL에서 선수 명단 가져오는 중...")
        print("=" * 60)
        
        # 1. 타자 선수 정보 가져오기 (팀명, 포지션 포함)
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT DISTINCT h.`선수명`, h.`팀명`, d.`포지션`
                FROM `kbo_hitters_top150` h
                INNER JOIN `kbo_defense_positions` d 
                    ON h.`선수명` = d.`선수명` 
                    AND h.`팀명` = d.`팀명`
            """)
            hitters = cursor.fetchall()
            for row in hitters:
                all_players.append({
                    'name': row['선수명'],
                    'team': row['팀명'],
                    'position': row['포지션']
                })
            print(f"✅ 타자: {len(hitters)}명")
        
        # 2. 투수 선수 정보 가져오기 (팀명 포함, 포지션은 "투수")
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT DISTINCT `선수명`, `팀명`
                FROM `kbo_pitchers_top150`
            """)
            pitchers = cursor.fetchall()
            for row in pitchers:
                all_players.append({
                    'name': row['선수명'],
                    'team': row['팀명'],
                    'position': '투수'
                })
            print(f"✅ 투수: {len(pitchers)}명")
        
        connection.close()
        
        # 중복 제거 (같은 선수명, 팀명, 포지션 조합)
        unique_players = []
        seen = set()
        for player in all_players:
            key = (player['name'], player['team'], player['position'])
            if key not in seen:
                seen.add(key)
                unique_players.append(player)
        
        # 선수명 기준으로 정렬
        unique_players.sort(key=lambda x: x['name'])
        print(f"✅ 총 {len(unique_players)}명의 고유 선수 (중복 제거 후)")
        print("=" * 60)
        
        return unique_players
        
    except Exception as e:
        print(f"❌ 데이터베이스 연결 오류: {e}")
        print("💡 하드코딩된 선수 명단을 사용합니다.")
        # 에러 발생 시 빈 리스트 반환 (또는 기본 명단 사용 가능)
        return []

def clean_search_term(name):
    """선수명 끝의 영문자 제거"""
    return re.sub(r'[A-Z]$', '', name)

def download_kbo_images(player_list):
    """
    선수 이미지를 다운로드합니다.
    player_list: [{'name': 선수명, 'team': 팀명, 'position': 포지션}, ...] 형식
    """
    save_dir = 'player_images'
    if not os.path.exists(save_dir):
        os.makedirs(save_dir)

    print(f"총 {len(player_list)}명의 선수 이미지를 각각 3장씩 다운로드합니다 (Bing)...")

    for player in player_list:
        player_name = player['name']
        team_name = player['team']
        position = player['position']
        
        # 검색 키워드: {팀명} {포지션} {선수명}
        cleaned_name = clean_search_term(player_name)
        search_keyword = f"{team_name} {position} {cleaned_name}"
        
        crawler = BingImageCrawler(
            storage={'root_dir': save_dir},
            log_level='CRITICAL'
        )

        print(f"[{player_name} ({team_name} {position})] 이미지 3장 수집 중...")
        print(f"  검색 키워드: {search_keyword}")

        crawler.crawl(
            keyword=search_keyword,
            max_num=3,    # 3장으로 변경
            file_idx_offset=0, # 매 선수마다 000001번부터 파일명 시작하도록 강제 초기화
            filters=dict(type='photo'),
            overwrite=True
        )

        # 3장의 파일을 순회하며 이름 변경 (000001 -> 선수_1, 000002 -> 선수_2...)
        count = 0
        for i in range(1, 4): # 1, 2, 3
            # 확장자가 jpg, jpeg, png 중 무엇일지 모르니 확인
            for ext in ['.jpg', '.jpeg', '.png']:
                src_file_name = f"{i:06d}{ext}" # 예: 000001.jpg
                src_path = os.path.join(save_dir, src_file_name)
                
                target_file_name = f"{player_name}_{i}{ext}" # 예: 류현진_1.jpg
                target_path = os.path.join(save_dir, target_file_name)

                if os.path.exists(src_path):
                    # 기존에 같은 이름 파일 있으면 삭제
                    if os.path.exists(target_path):
                        os.remove(target_path)
                    
                    os.rename(src_path, target_path)
                    count += 1
                    break # 확장자를 찾았으니 다음 번호로 넘어감
        
        print(f"  -> {count}장 저장 완료")

if __name__ == "__main__":
    # MySQL에서 선수 명단 가져오기
    players = get_players_from_db()
    
    if not players:
        print("❌ 선수 명단을 가져올 수 없습니다. 스크립트를 종료합니다.")
        exit(1)
    
    print(f"\n🚀 총 {len(players)}명의 선수 이미지 다운로드를 시작합니다...\n")
    
    # 이미지 다운로드 실행
    download_kbo_images(players)
    
    print("\n" + "=" * 60)
    print("✅ 모든 선수 이미지 다운로드 완료!")
    print("=" * 60)
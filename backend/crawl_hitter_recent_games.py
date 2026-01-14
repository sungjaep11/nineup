"""
KBO 타자 2025 성적 크롤링 스크립트
https://www.koreabaseball.com/Record/Player/HitterDetail/Basic.aspx?playerId=76232
각 선수의 상세 페이지에서 "2025 성적" 테이블을 크롤링하여 DB에 저장
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import pymysql
from pymysql.cursors import DictCursor
import time
from config.db_config import DB_CONFIG

# 선수 상세 페이지 URL 패턴
HITTER_DETAIL_URL = "https://www.koreabaseball.com/Record/Player/HitterDetail/Basic.aspx?playerId={id}"

def setup_driver(headless=True):
    """Chrome 드라이버 설정"""
    chrome_options = Options()
    if headless:
        chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-gpu')
    chrome_options.add_argument('--window-size=1920,1080')
    chrome_options.add_argument('user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    return driver

def get_players_from_db():
    """
    kbo_hitters_top150 테이블에서 선수명과 player_id를 가져옵니다.
    player_id가 있는 선수만 조회합니다.
    """
    try:
        conn = pymysql.connect(**DB_CONFIG)
        cursor = conn.cursor(DictCursor)
        
        # 선수명과 player_id 조회 (player_id가 NULL이 아닌 경우만)
        query = """
            SELECT DISTINCT `선수명`, `player_id`, `팀명`
            FROM `kbo_hitters_top150`
            WHERE `player_id` IS NOT NULL AND `player_id` != ''
            ORDER BY `선수명`
        """
        cursor.execute(query)
        players = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        print(f"✅ DB에서 {len(players)}명의 선수 조회 완료")
        return players
        
    except Exception as e:
        print(f"❌ DB 조회 오류: {e}")
        import traceback
        traceback.print_exc()
        return []

def crawl_recent_10_games(driver, player_id, player_name):
    """
    선수 상세 페이지에서 "최근 10경기" 테이블을 크롤링합니다.
    
    Args:
        driver: Selenium WebDriver
        player_id: 선수 ID (예: "76232")
        player_name: 선수명 (예: "양의지")
    
    Returns:
        list: 최근 10경기 기록 리스트 (각 경기는 딕셔너리)
    """
    try:
        # 1. 선수 상세 페이지로 이동
        detail_url = HITTER_DETAIL_URL.format(id=player_id)
        driver.get(detail_url)
        print(f"  📄 {player_name} (ID: {player_id}) 상세 페이지 로딩 중...")
        time.sleep(2)  # 페이지 로딩 대기
        
        # 2. "최근 10경기" 테이블 찾기
        wait = WebDriverWait(driver, 10)
        
        # 여러 셀렉터 시도
        table_selectors = [
            "table.tData",
            "table[summary*='최근']",
            "table[summary*='10경기']",
            "div.record_result table",
            "table.table_basic",
            "//table[contains(., '최근 10경기')]",
            "//table[contains(., '일자')]"
        ]
        
        table = None
        for selector in table_selectors:
            try:
                if selector.startswith("//"):
                    # XPath 사용
                    table = wait.until(EC.presence_of_element_located((By.XPATH, selector)))
                else:
                    # CSS 셀렉터 사용
                    table = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, selector)))
                
                # 테이블에 "최근 10경기" 또는 "일자" 컬럼이 있는지 확인
                table_text = table.text
                if '일자' in table_text or '최근' in table_text:
                    print(f"  ✓ 테이블 발견: {selector}")
                    break
            except Exception:
                continue
        
        if not table:
            print(f"  ⚠️ {player_name}: 최근 10경기 테이블을 찾을 수 없습니다.")
            return []
        
        # 3. 테이블 데이터 파싱
        rows = table.find_elements(By.CSS_SELECTOR, "tbody tr")
        
        recent_games = []
        for row in rows:
            try:
                cols = row.find_elements(By.TAG_NAME, "td")
                
                # 최근 10경기 테이블 구조:
                # 일자, 상대, AVG, PA, AB, R, H, 2B, 3B, HR, RBI, SB, CS, BB, HBP, SO, GDP
                if len(cols) >= 10:  # 최소 컬럼 개수 확인
                    game_data = {
                        'player_id': player_id,
                        '선수명': player_name,
                        '일자': cols[0].text.strip() if len(cols) > 0 else '',
                        '상대': cols[1].text.strip() if len(cols) > 1 else '',
                        'AVG': cols[2].text.strip() if len(cols) > 2 else '',
                        'PA': cols[3].text.strip() if len(cols) > 3 else '',
                        'AB': cols[4].text.strip() if len(cols) > 4 else '',
                        'R': cols[5].text.strip() if len(cols) > 5 else '',
                        'H': cols[6].text.strip() if len(cols) > 6 else '',
                        '2B': cols[7].text.strip() if len(cols) > 7 else '',
                        '3B': cols[8].text.strip() if len(cols) > 8 else '',
                        'HR': cols[9].text.strip() if len(cols) > 9 else '',
                        'RBI': cols[10].text.strip() if len(cols) > 10 else '',
                        'SB': cols[11].text.strip() if len(cols) > 11 else '',
                        'CS': cols[12].text.strip() if len(cols) > 12 else '',
                        'BB': cols[13].text.strip() if len(cols) > 13 else '',
                        'HBP': cols[14].text.strip() if len(cols) > 14 else '',
                        'SO': cols[15].text.strip() if len(cols) > 15 else '',
                        'GDP': cols[16].text.strip() if len(cols) > 16 else '',
                    }
                    
                    # "합계" 행은 제외
                    if game_data['일자'] != '합계' and game_data['일자']:
                        recent_games.append(game_data)
                
            except Exception as e:
                print(f"  ⚠️ 행 파싱 실패: {e}")
                continue
        
        print(f"  ✅ {player_name}: {len(recent_games)}경기 데이터 수집 완료")
        return recent_games
        
    except Exception as e:
        print(f"  ❌ {player_name} (ID: {player_id}) 크롤링 오류: {e}")
        import traceback
        traceback.print_exc()
        return []

def create_hitter_log_table(cursor, conn):
    """
    타자로그 테이블을 생성합니다.
    기존 테이블이 있으면 삭제하고 새로 생성합니다.
    """
    try:
        # 기존 테이블 삭제
        cursor.execute("DROP TABLE IF EXISTS `hitter_recent_games_log`")
        conn.commit()
        print("✅ 기존 테이블 삭제 완료")
        
        # 새 테이블 생성
        create_table_query = """
        CREATE TABLE `hitter_recent_games_log` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `player_id` VARCHAR(20) NOT NULL,
            `선수명` VARCHAR(50) NOT NULL,
            `일자` VARCHAR(20),
            `상대` VARCHAR(20),
            `AVG` VARCHAR(10),
            `PA` VARCHAR(10),
            `AB` VARCHAR(10),
            `R` VARCHAR(10),
            `H` VARCHAR(10),
            `2B` VARCHAR(10),
            `3B` VARCHAR(10),
            `HR` VARCHAR(10),
            `RBI` VARCHAR(10),
            `SB` VARCHAR(10),
            `CS` VARCHAR(10),
            `BB` VARCHAR(10),
            `HBP` VARCHAR(10),
            `SO` VARCHAR(10),
            `GDP` VARCHAR(10),
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX `idx_player_id` (`player_id`),
            INDEX `idx_선수명` (`선수명`),
            INDEX `idx_일자` (`일자`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
        
        cursor.execute(create_table_query)
        conn.commit()
        print("✅ 타자로그 테이블 생성 완료")
        
    except Exception as e:
        print(f"❌ 테이블 생성 오류: {e}")
        import traceback
        traceback.print_exc()
        raise

def save_games_to_db(cursor, conn, games_data):
    """
    크롤링한 경기 데이터를 DB에 저장합니다.
    
    Args:
        cursor: DB 커서
        conn: DB 연결
        games_data: 경기 데이터 리스트
    """
    if not games_data:
        return
    
    try:
        insert_query = """
        INSERT INTO `hitter_recent_games_log` 
        (`player_id`, `선수명`, `일자`, `상대`, `AVG`, `PA`, `AB`, `R`, `H`, `2B`, `3B`, `HR`, `RBI`, `SB`, `CS`, `BB`, `HBP`, `SO`, `GDP`)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        for game in games_data:
            cursor.execute(insert_query, (
                game['player_id'],
                game['선수명'],
                game['일자'],
                game['상대'],
                game['AVG'],
                game['PA'],
                game['AB'],
                game['R'],
                game['H'],
                game['2B'],
                game['3B'],
                game['HR'],
                game['RBI'],
                game['SB'],
                game['CS'],
                game['BB'],
                game['HBP'],
                game['SO'],
                game['GDP']
            ))
        
        conn.commit()
        print(f"  💾 {len(games_data)}경기 데이터 저장 완료")
        
    except Exception as e:
        print(f"  ❌ DB 저장 오류: {e}")
        conn.rollback()
        import traceback
        traceback.print_exc()

def crawl_2025_score(driver, player_id, player_name, debug=False):
    """
    선수 상세 페이지에서 "2025 성적" 테이블을 크롤링합니다.
    두 개의 별도 테이블에서 데이터를 추출합니다.
    """
    try:
        # 1. 선수 상세 페이지로 이동
        detail_url = HITTER_DETAIL_URL.format(id=player_id)
        driver.get(detail_url)
        time.sleep(1.5)  # 페이지 로딩 대기
        
        # 2. 두 개의 별도 테이블 찾기
        # 첫 번째 테이블: 팀명, AVG 포함
        # 두 번째 테이블: BB, IBB 포함
        tables = driver.find_elements(By.TAG_NAME, "table")
        table1 = None  # 첫 번째 테이블 (팀명, AVG)
        table2 = None  # 두 번째 테이블 (BB, IBB)
        
        for table in tables:
            table_text = table.text
            # 첫 번째 테이블 찾기 (팀명, AVG 포함)
            if not table1 and "팀명" in table_text and "AVG" in table_text:
                table1 = table
                print("  ✅ 첫 번째 테이블 발견 (팀명, AVG 포함)")
            # 두 번째 테이블 찾기 (BB, IBB 포함)
            elif not table2 and "BB" in table_text and "IBB" in table_text:
                table2 = table
                print("  ✅ 두 번째 테이블 발견 (BB, IBB 포함)")
        
        if not table1:
            print(f"  ⚠️ {player_name}: 첫 번째 성적 테이블(팀명, AVG) 없음")
            return None
        
        if not table2:
            print(f"  ⚠️ {player_name}: 두 번째 성적 테이블(BB, IBB) 없음")
            return None

        # 3. 첫 번째 테이블에서 데이터 행 추출
        rows1 = table1.find_elements(By.TAG_NAME, "tr")
        data_row1 = None
        
        for i, row in enumerate(rows1):
            text = row.text.strip()
            cols = row.find_elements(By.TAG_NAME, "td")
            
            # 헤더 행 건너뛰기
            if "팀명" in text and "AVG" in text:
                print(f"  ✅ 첫 번째 헤더 행 발견: {text[:50]}...")
                continue
            
            # 데이터 행 찾기 (16개 컬럼: 팀명(0), AVG(1), G(2), PA(3), AB(4), R(5), H(6), 2B(7), 3B(8), HR(9), TB(10), RBI(11), SB(12), CS(13), SAC(14), SF(15))
            if text and len(cols) == 16:
                data_row1 = row
                print(f"  ✅ 첫 번째 데이터 행 발견 (컬럼 수: {len(cols)}): {text[:50]}...")
                break
        
        # 4. 두 번째 테이블에서 데이터 행 추출
        rows2 = table2.find_elements(By.TAG_NAME, "tr")
        data_row2 = None
        
        for i, row in enumerate(rows2):
            text = row.text.strip()
            cols = row.find_elements(By.TAG_NAME, "td")
            
            # 헤더 행 건너뛰기
            if "BB" in text and "IBB" in text:
                print(f"  ✅ 두 번째 헤더 행 발견: {text[:50]}...")
                continue
            
            # 데이터 행 찾기 (13개 컬럼: BB, IBB, HBP, SO, GDP, SLG, OBP, E, SB%, MH, OPS, RISP, PH-BA)
            if text and len(cols) == 13:
                data_row2 = row
                print(f"  ✅ 두 번째 데이터 행 발견 (컬럼 수: {len(cols)}): {text[:50]}...")
                break
        
        if not data_row1 or not data_row2:
            print(f"  ⚠️ {player_name}: 데이터 행 부족 (첫 번째: {data_row1 is not None}, 두 번째: {data_row2 is not None})")
            return None

        # 5. 컬럼 파싱
        cols1 = data_row1.find_elements(By.TAG_NAME, "td")
        cols2 = data_row2.find_elements(By.TAG_NAME, "td")

        def get_val(cols, idx):
            return cols[idx].text.strip() if len(cols) > idx else ''

        # 디버깅: 실제 컬럼 개수 확인
        print(f"  📊 {player_name}: Row1 컬럼 수={len(cols1)}, Row2 컬럼 수={len(cols2)}")

        # 첫 번째 행: 팀명(0), AVG(1), G(2), PA(3), AB(4), R(5), H(6), 2B(7), 3B(8), HR(9), TB(10), RBI(11), SB(12), CS(13), SAC(14), SF(15) - 16개 컬럼
        # 두 번째 행: BB(0), IBB(1), HBP(2), SO(3), GDP(4), SLG(5), OBP(6), E(7), SB%(8), MH(9), OPS(10), RISP(11), PH-BA(12) - 13개 컬럼

        score_data = {
            'player_id': player_id,
            '선수명': player_name,
            
            # --- Row 1 Data ---
            'AVG':  get_val(cols1, 1) if len(cols1) > 1 else '',  # 0: 팀명, 1: AVG
            'G':    get_val(cols1, 2) if len(cols1) > 2 else '',
            'PA':   get_val(cols1, 3) if len(cols1) > 3 else '',
            'AB':   get_val(cols1, 4) if len(cols1) > 4 else '',
            'R':    get_val(cols1, 5) if len(cols1) > 5 else '',
            'H':    get_val(cols1, 6) if len(cols1) > 6 else '',
            '2B':   get_val(cols1, 7) if len(cols1) > 7 else '',
            '3B':   get_val(cols1, 8) if len(cols1) > 8 else '',
            'HR':   get_val(cols1, 9) if len(cols1) > 9 else '',
            'TB':   get_val(cols1, 10) if len(cols1) > 10 else '',
            'RBI':  get_val(cols1, 11) if len(cols1) > 11 else '',
            'SB':   get_val(cols1, 12) if len(cols1) > 12 else '',
            'CS':   get_val(cols1, 13) if len(cols1) > 13 else '',
            'SAC':  get_val(cols1, 14) if len(cols1) > 14 else '',
            'SF':   get_val(cols1, 15) if len(cols1) > 15 else '',  # 첫 번째 테이블의 마지막 컬럼
            
            # --- Row 2 Data ---
            'BB':   get_val(cols2, 0) if len(cols2) > 0 else '',
            'IBB':  get_val(cols2, 1) if len(cols2) > 1 else '',
            'HBP':  get_val(cols2, 2) if len(cols2) > 2 else '',
            'SO':   get_val(cols2, 3) if len(cols2) > 3 else '',
            'GDP':  get_val(cols2, 4) if len(cols2) > 4 else '',
            'SLG':  get_val(cols2, 5) if len(cols2) > 5 else '',
            'OBP':  get_val(cols2, 6) if len(cols2) > 6 else '',
            'OPS':  get_val(cols2, 10) if len(cols2) > 10 else '',  # OPS는 10번 인덱스
        }
        
        print(f"  ✅ {player_name}: 2025 성적 데이터 수집 완료 (AVG: {score_data['AVG']}, BB: {score_data['BB']}, SO: {score_data['SO']})")
        return score_data

    except Exception as e:
        print(f"  ❌ {player_name} (ID: {player_id}) 크롤링 오류: {e}")
        if debug:
            import traceback
            traceback.print_exc()
        return None

def create_2025_score_hitter_table(cursor, conn):
    """
    2025 성적 타자 테이블 생성
    """
    try:
        query = """
        CREATE TABLE IF NOT EXISTS `2025_score_hitters` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `player_id` VARCHAR(20) NOT NULL,
            `선수명` VARCHAR(50) NOT NULL,
            `G` VARCHAR(10),
            `PA` VARCHAR(10),
            `AB` VARCHAR(10),
            `R` VARCHAR(10),
            `H` VARCHAR(10),
            `2B` VARCHAR(10),
            `3B` VARCHAR(10),
            `HR` VARCHAR(10),
            `TB` VARCHAR(10),
            `RBI` VARCHAR(10),
            `SAC` VARCHAR(10),      -- 희생번트 (확인됨)
            `SF` VARCHAR(10),       -- 희생플라이 (확인됨)
            `SB` VARCHAR(10),
            `CS` VARCHAR(10),
            `BB` VARCHAR(10),
            `IBB` VARCHAR(10),
            `HBP` VARCHAR(10),
            `SO` VARCHAR(10),
            `GDP` VARCHAR(10),
            `AVG` VARCHAR(10),
            `OBP` VARCHAR(10),
            `SLG` VARCHAR(10),
            `OPS` VARCHAR(10),
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY `unique_player` (`player_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
        cursor.execute(query)
        conn.commit()
        print("✅ DB 테이블(2025_score_hitters) 확인/생성 완료")
        
    except Exception as e:
        print(f"❌ 테이블 생성 오류: {e}")
        raise

def save_2025_score_to_db(cursor, conn, score_data):
    """
    2025 성적 데이터 저장 (수정된 딕셔너리 키 반영)
    """
    if not score_data:
        return
    
    try:
        # INSERT 쿼리 (모든 컬럼 명시)
        insert_query = """
        INSERT INTO `2025_score_hitters` 
        (`player_id`, `선수명`, `G`, `PA`, `AB`, `R`, `H`, `2B`, `3B`, `HR`, `TB`, `RBI`, 
         `SAC`, `SF`, `SB`, `CS`, `BB`, `IBB`, `HBP`, `SO`, `GDP`, `AVG`, `OBP`, `SLG`, `OPS`)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            `선수명` = VALUES(`선수명`),
            `G` = VALUES(`G`),
            `PA` = VALUES(`PA`),
            `AB` = VALUES(`AB`),
            `R` = VALUES(`R`),
            `H` = VALUES(`H`),
            `2B` = VALUES(`2B`),
            `3B` = VALUES(`3B`),
            `HR` = VALUES(`HR`),
            `TB` = VALUES(`TB`),
            `RBI` = VALUES(`RBI`),
            `SAC` = VALUES(`SAC`),
            `SF` = VALUES(`SF`),
            `SB` = VALUES(`SB`),
            `CS` = VALUES(`CS`),
            `BB` = VALUES(`BB`),
            `IBB` = VALUES(`IBB`),
            `HBP` = VALUES(`HBP`),
            `SO` = VALUES(`SO`),
            `GDP` = VALUES(`GDP`),
            `AVG` = VALUES(`AVG`),
            `OBP` = VALUES(`OBP`),
            `SLG` = VALUES(`SLG`),
            `OPS` = VALUES(`OPS`)
        """
        
        # 딕셔너리에서 안전하게 값 추출 (.get 사용)
        cursor.execute(insert_query, (
            score_data['player_id'],
            score_data['선수명'],
            score_data.get('G', ''),
            score_data.get('PA', ''),
            score_data.get('AB', ''),
            score_data.get('R', ''),
            score_data.get('H', ''),
            score_data.get('2B', ''),
            score_data.get('3B', ''),
            score_data.get('HR', ''),
            score_data.get('TB', ''),
            score_data.get('RBI', ''),
            score_data.get('SAC', ''),  # 추가됨
            score_data.get('SF', ''),   # 추가됨
            score_data.get('SB', ''),
            score_data.get('CS', ''),
            score_data.get('BB', ''),
            score_data.get('IBB', ''),
            score_data.get('HBP', ''),
            score_data.get('SO', ''),
            score_data.get('GDP', ''),
            score_data.get('AVG', ''),
            score_data.get('OBP', ''),
            score_data.get('SLG', ''),
            score_data.get('OPS', ''),
        ))
        
        conn.commit()
        print(f"  💾 {score_data['선수명']} 데이터 저장 완료")
        
    except Exception as e:
        print(f"  ❌ DB 저장 오류 ({score_data['선수명']}): {e}")
        conn.rollback()

def main():
    """메인 크롤링 함수"""
    import sys
    
    # 디버그 모드 확인 (명령줄 인자로 --debug 전달 시)
    debug_mode = '--debug' in sys.argv
    
    print("=" * 80)
    print("🏆 KBO 타자 2025 성적 크롤링 시작")
    if debug_mode:
        print("🔍 디버그 모드 활성화")
    print("=" * 80)
    
    driver = None
    conn = None
    
    try:
        # 1. DB 연결
        conn = pymysql.connect(**DB_CONFIG)
        cursor = conn.cursor(DictCursor)
        
        # 2. 2025 성적 테이블 생성
        create_2025_score_hitter_table(cursor, conn)
        
        # 3. DB에서 선수 목록 가져오기
        players = get_players_from_db()
        
        if not players:
            print("⚠️ 크롤링할 선수가 없습니다.")
            return
        
        # 4. Selenium 드라이버 초기화
        driver = setup_driver(headless=not debug_mode)  # 디버그 모드면 headless 비활성화
        
        # 5. 각 선수의 2025 성적 데이터 크롤링
        score_success_count = 0
        score_fail_count = 0
        
        for idx, player in enumerate(players, 1):
            player_name = player['선수명']
            player_id = player['player_id']
            team_name = player.get('팀명', '')
            
            print(f"\n[{idx}/{len(players)}] {player_name} ({team_name}) - ID: {player_id}")
            
            try:
                # 2025 성적 데이터 크롤링
                score_data = crawl_2025_score(driver, player_id, player_name, debug=debug_mode)
                
                if score_data:
                    # DB에 저장
                    save_2025_score_to_db(cursor, conn, score_data)
                    score_success_count += 1
                else:
                    print(f"  ⚠️ {player_name}: 2025 성적 데이터가 없습니다.")
                    score_fail_count += 1
                
                # 요청 간격 (서버 부하 방지)
                time.sleep(1)
                
            except Exception as e:
                print(f"  ❌ {player_name} 처리 중 오류: {e}")
                score_fail_count += 1
                if debug_mode:
                    import traceback
                    traceback.print_exc()
                continue
        
        # 6. 결과 출력
        print("\n" + "=" * 80)
        print("📊 크롤링 결과")
        print("=" * 80)
        print(f"✅ 2025 성적 성공: {score_success_count}명")
        print(f"❌ 2025 성적 실패: {score_fail_count}명")
        print("=" * 80)
        
    except Exception as e:
        print(f"❌ 크롤링 오류: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        if driver:
            driver.quit()
            print("\n✅ 브라우저 종료")
        if conn:
            conn.close()
            print("✅ DB 연결 종료")

if __name__ == "__main__":
    main()


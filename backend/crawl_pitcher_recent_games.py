import time

import pymysql

# ✅ 요청하신대로 외부 파일에서 DB 설정 가져오기
from config.db_config import DB_CONFIG
from pymysql.cursors import DictCursor
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager

# 투수 상세 페이지 URL 패턴
PITCHER_DETAIL_URL = "https://www.koreabaseball.com/Record/Player/PitcherDetail/Basic.aspx?playerId={id}"

# ==========================================
# 1. 크롤링 및 DB 유틸리티 함수
# ==========================================

def setup_driver():
    """Selenium Chrome 드라이버 설정"""
    chrome_options = Options()
    chrome_options.add_argument('--headless')  # 화면 안 띄우고 실행
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--window-size=1920,1080')
    chrome_options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36')
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    return driver

def create_pitcher_table(conn):
    """DB 테이블 생성 (없으면 생성)"""
    try:
        with conn.cursor() as cursor:
            # 2025 성적 투수 테이블 스키마
            query = """
            CREATE TABLE IF NOT EXISTS `2025_score_pitchers` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `player_id` VARCHAR(20) NOT NULL,
                `선수명` VARCHAR(50) NOT NULL,
                
                -- Row 1 데이터
                `ERA` VARCHAR(10), `G` VARCHAR(10), `CG` VARCHAR(10), `SHO` VARCHAR(10),
                `W` VARCHAR(10), `L` VARCHAR(10), `SV` VARCHAR(10), `HLD` VARCHAR(10),
                `WPCT` VARCHAR(10), `TBF` VARCHAR(10), `NP` VARCHAR(10), `IP` VARCHAR(10),
                `H` VARCHAR(10), `2B` VARCHAR(10), `3B` VARCHAR(10), `HR` VARCHAR(10),
                
                -- Row 2 데이터
                `SAC` VARCHAR(10), `SF` VARCHAR(10), `BB` VARCHAR(10), `IBB` VARCHAR(10),
                `SO` VARCHAR(10), `WP` VARCHAR(10), `BK` VARCHAR(10), `R` VARCHAR(10),
                `ER` VARCHAR(10), `BSV` VARCHAR(10), `WHIP` VARCHAR(10), `AVG` VARCHAR(10),
                `QS` VARCHAR(10),
                
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY `unique_player` (`player_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            """
            cursor.execute(query)
            conn.commit()
            print("✅ DB 테이블(2025_score_pitchers) 확인/생성 완료")
    except Exception as e:
        print(f"❌ 테이블 생성 오류: {e}")
        raise

def save_to_db(conn, data):
    """크롤링한 데이터를 DB에 저장 (Upsert)"""
    if not data:
        return

    try:
        columns = list(data.keys())
        # 컬럼명과 값을 SQL 쿼리용으로 가공
        placeholders = ', '.join(['%s'] * len(columns))
        columns_str = ', '.join([f"`{c}`" for c in columns])
        # ON DUPLICATE KEY UPDATE 구문 생성 (player_id 제외하고 업데이트)
        update_str = ', '.join([f"`{c}`=VALUES(`{c}`)" for c in columns if c != 'player_id'])
        
        sql = f"""
            INSERT INTO `2025_score_pitchers` ({columns_str})
            VALUES ({placeholders})
            ON DUPLICATE KEY UPDATE {update_str}
        """
        
        with conn.cursor() as cursor:
            cursor.execute(sql, list(data.values()))
        conn.commit()
        print(f"  💾 DB 저장 완료: {data['선수명']} (ERA: {data['ERA']}, BB: {data['BB']})")
        
    except Exception as e:
        print(f"  ❌ DB 저장 실패: {e}")

# ==========================================
# 2. 핵심 크롤링 로직 (2단 테이블 완벽 파싱)
# ==========================================

def crawl_pitcher_stats(driver, player_id, player_name):
    """
    특정 투수의 2025 성적 크롤링
    """
    url = PITCHER_DETAIL_URL.format(id=player_id)
    driver.get(url)
    time.sleep(1.5) # 페이지 로딩 대기

    try:
        # 1. "2025 성적" 섹션 찾기
        # 페이지에서 "2025 성적" 텍스트를 포함하는 요소 찾기
        try:
            # h6 태그나 다른 요소에서 "2025 성적" 찾기
            year_2025_elements = driver.find_elements(By.XPATH, "//*[contains(text(), '2025 성적')]")
            if not year_2025_elements:
                # 테이블 내에서 찾기
                year_2025_elements = driver.find_elements(By.XPATH, "//table//*[contains(text(), '2025')]")
        except Exception:
            year_2025_elements = []
        
        # 2. 두 개의 별도 테이블 찾기
        # 첫 번째 테이블: 팀명, ERA 포함
        # 두 번째 테이블: SAC, SF 포함
        tables = driver.find_elements(By.TAG_NAME, "table")
        table1 = None  # 첫 번째 테이블 (팀명, ERA)
        table2 = None  # 두 번째 테이블 (SAC, SF)
        
        for table in tables:
            table_text = table.text
            # 첫 번째 테이블 찾기 (팀명, ERA 포함)
            if not table1 and "팀명" in table_text and "ERA" in table_text:
                table1 = table
                print("  ✅ 첫 번째 테이블 발견 (팀명, ERA 포함)")
            # 두 번째 테이블 찾기 (SAC, SF 포함)
            elif not table2 and "SAC" in table_text and "SF" in table_text:
                table2 = table
                print("  ✅ 두 번째 테이블 발견 (SAC, SF 포함)")
        
        if not table1:
            print(f"  ⚠️ {player_name}: 첫 번째 성적 테이블(팀명, ERA) 없음")
            return None
        
        if not table2:
            print(f"  ⚠️ {player_name}: 두 번째 성적 테이블(SAC, SF) 없음")
            return None

        # 3. 첫 번째 테이블에서 데이터 행 추출
        rows1 = table1.find_elements(By.TAG_NAME, "tr")
        data_row1 = None
        
        for i, row in enumerate(rows1):
            text = row.text.strip()
            cols = row.find_elements(By.TAG_NAME, "td")
            
            # 헤더 행 건너뛰기
            if "팀명" in text and "ERA" in text:
                print(f"  ✅ 첫 번째 헤더 행 발견: {text[:50]}...")
                continue
            
            # 데이터 행 찾기 (17개 컬럼)
            if text and len(cols) == 17:
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
            if "SAC" in text and "SF" in text:
                print(f"  ✅ 두 번째 헤더 행 발견: {text[:50]}...")
                continue
            
            # 데이터 행 찾기 (13개 컬럼)
            if text and len(cols) == 13:
                data_row2 = row
                print(f"  ✅ 두 번째 데이터 행 발견 (컬럼 수: {len(cols)}): {text[:50]}...")
                break
        
        if not data_row1 or not data_row2:
            print(f"  ⚠️ {player_name}: 데이터 행 부족 (첫 번째: {data_row1 is not None}, 두 번째: {data_row2 is not None})")
            return None

        # 5. 컬럼 파싱
        # 첫 번째 행: 팀명 ~ HR
        cols1 = data_row1.find_elements(By.TAG_NAME, "td")
        # 두 번째 행: SAC ~ QS
        cols2 = data_row2.find_elements(By.TAG_NAME, "td")

        def get_val(cols, idx):
            return cols[idx].text.strip() if len(cols) > idx else ''

        # 디버깅: 실제 컬럼 개수 확인
        print(f"  📊 {player_name}: Row1 컬럼 수={len(cols1)}, Row2 컬럼 수={len(cols2)}")
        if len(cols1) > 0:
            print(f"     Row1 첫 컬럼: '{cols1[0].text.strip()}'")
        if len(cols2) > 0:
            print(f"     Row2 첫 컬럼: '{cols2[0].text.strip()}'")

        result = {
            'player_id': player_id,
            '선수명': player_name,
            
            # --- Row 1 Data ---
            # 첫 번째 행: 팀명(0), ERA(1), G(2), CG(3), SHO(4), W(5), L(6), SV(7), HLD(8), WPCT(9), TBF(10), NP(11), IP(12), H(13), 2B(14), 3B(15), HR(16)
            'ERA':  get_val(cols1, 1) if len(cols1) > 1 else '', # 0: 팀명, 1: ERA
            'G':    get_val(cols1, 2) if len(cols1) > 2 else '',
            'CG':   get_val(cols1, 3) if len(cols1) > 3 else '',
            'SHO':  get_val(cols1, 4) if len(cols1) > 4 else '',
            'W':    get_val(cols1, 5) if len(cols1) > 5 else '',
            'L':    get_val(cols1, 6) if len(cols1) > 6 else '',
            'SV':   get_val(cols1, 7) if len(cols1) > 7 else '',
            'HLD':  get_val(cols1, 8) if len(cols1) > 8 else '',
            'WPCT': get_val(cols1, 9) if len(cols1) > 9 else '',
            'TBF':  get_val(cols1, 10) if len(cols1) > 10 else '',
            'NP':   get_val(cols1, 11) if len(cols1) > 11 else '',
            'IP':   get_val(cols1, 12) if len(cols1) > 12 else '',
            'H':    get_val(cols1, 13) if len(cols1) > 13 else '',
            '2B':   get_val(cols1, 14) if len(cols1) > 14 else '',
            '3B':   get_val(cols1, 15) if len(cols1) > 15 else '',
            'HR':   get_val(cols1, 16) if len(cols1) > 16 else '',
            
            # --- Row 2 Data ---
            # 두 번째 행: SAC(0), SF(1), BB(2), IBB(3), SO(4), WP(5), BK(6), R(7), ER(8), BSV(9), WHIP(10), AVG(11), QS(12)
            'SAC':  get_val(cols2, 0) if len(cols2) > 0 else '',
            'SF':   get_val(cols2, 1) if len(cols2) > 1 else '',
            'BB':   get_val(cols2, 2) if len(cols2) > 2 else '',
            'IBB':  get_val(cols2, 3) if len(cols2) > 3 else '',
            'SO':   get_val(cols2, 4) if len(cols2) > 4 else '',
            'WP':   get_val(cols2, 5) if len(cols2) > 5 else '',
            'BK':   get_val(cols2, 6) if len(cols2) > 6 else '',
            'R':    get_val(cols2, 7) if len(cols2) > 7 else '',
            'ER':   get_val(cols2, 8) if len(cols2) > 8 else '',
            'BSV':  get_val(cols2, 9) if len(cols2) > 9 else '',
            'WHIP': get_val(cols2, 10) if len(cols2) > 10 else '',
            'AVG':  get_val(cols2, 11) if len(cols2) > 11 else '',
            'QS':   get_val(cols2, 12) if len(cols2) > 12 else ''
        }
        
        return result

    except Exception as e:
        print(f"  ❌ 크롤링 에러 ({player_name}): {e}")
        import traceback
        traceback.print_exc()
        return None

# ==========================================
# 3. 메인 실행 함수
# ==========================================

def get_target_players(conn):
    """
    kbo_pitchers_top150 테이블에서 선수명과 player_id를 가져옵니다.
    player_id가 있는 선수만 조회합니다.
    """
    cursor = None
    try:
        cursor = conn.cursor(DictCursor)
        
        # 선수명과 player_id 조회 (player_id가 NULL이 아닌 경우만)
        query = """
            SELECT DISTINCT `선수명`, `player_id`, `팀명`
            FROM `kbo_pitchers_top150`
            WHERE `player_id` IS NOT NULL AND `player_id` != ''
            ORDER BY `선수명`
        """
        cursor.execute(query)
        players = cursor.fetchall()
        
        print(f"✅ DB에서 {len(players)}명의 투수 조회 완료")
        return players
        
    except Exception as e:
        print(f"❌ DB 조회 오류: {e}")
        import traceback
        traceback.print_exc()
        return []
    finally:
        if cursor:
            cursor.close()

def main():
    conn = None
    driver = None
    try:
        # 1. DB 연결 (DB_CONFIG 이용)
        conn = pymysql.connect(**DB_CONFIG)
        print("🔌 DB 연결 성공")
        
        # 2. 테이블 생성
        create_pitcher_table(conn)
        
        # 3. 대상 선수 가져오기
        target_players = get_target_players(conn)
        print(f"\n🚀 총 {len(target_players)}명의 투수 데이터 수집 시작...\n")

        # 4. 브라우저 설정
        driver = setup_driver()
        
        # 5. 크롤링 루프
        for idx, player in enumerate(target_players, 1):
            p_id = player['player_id']
            p_name = player['선수명']
            
            print(f"\n[{idx}/{len(target_players)}] {p_name} 데이터 수집 중... (ID: {p_id})")
            
            data = crawl_pitcher_stats(driver, p_id, p_name)
            
            if data:
                save_to_db(conn, data)
            else:
                print(f"  ⚠️ {p_name}: 데이터 수집 실패")
            
            time.sleep(1.5)  # 서버 부하 방지

    except Exception as e:
        print(f"❌ 치명적 오류 발생: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if driver:
            driver.quit()
        if conn:
            conn.close()
        print("\n✨ 작업 종료")

if __name__ == "__main__":
    main()
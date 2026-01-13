"""
KBO 타자 최근 10경기 기록 크롤링 스크립트
https://www.koreabaseball.com/Record/Player/HitterDetail/Basic.aspx?playerId=76232
각 선수의 상세 페이지에서 "최근 10경기" 테이블을 크롤링하여 DB에 저장
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
import re
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
            except:
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

def main():
    """메인 크롤링 함수"""
    print("=" * 80)
    print("🏆 KBO 타자 최근 10경기 기록 크롤링 시작")
    print("=" * 80)
    
    driver = None
    conn = None
    
    try:
        # 1. DB 연결
        conn = pymysql.connect(**DB_CONFIG)
        cursor = conn.cursor(DictCursor)
        
        # 2. 타자로그 테이블 생성
        create_hitter_log_table(cursor, conn)
        
        # 3. DB에서 선수 목록 가져오기
        players = get_players_from_db()
        
        if not players:
            print("⚠️ 크롤링할 선수가 없습니다.")
            return
        
        # 4. Selenium 드라이버 초기화
        driver = setup_driver(headless=True)
        
        # 5. 각 선수의 최근 10경기 데이터 크롤링
        total_games = 0
        success_count = 0
        fail_count = 0
        
        for idx, player in enumerate(players, 1):
            player_name = player['선수명']
            player_id = player['player_id']
            team_name = player.get('팀명', '')
            
            print(f"\n[{idx}/{len(players)}] {player_name} ({team_name}) - ID: {player_id}")
            
            try:
                # 최근 10경기 데이터 크롤링
                games = crawl_recent_10_games(driver, player_id, player_name)
                
                if games:
                    # DB에 저장
                    save_games_to_db(cursor, conn, games)
                    total_games += len(games)
                    success_count += 1
                else:
                    print(f"  ⚠️ {player_name}: 경기 데이터가 없습니다.")
                    fail_count += 1
                
                # 요청 간격 (서버 부하 방지)
                time.sleep(1)
                
            except Exception as e:
                print(f"  ❌ {player_name} 처리 중 오류: {e}")
                fail_count += 1
                continue
        
        # 6. 결과 출력
        print("\n" + "=" * 80)
        print("📊 크롤링 결과")
        print("=" * 80)
        print(f"✅ 성공: {success_count}명")
        print(f"❌ 실패: {fail_count}명")
        print(f"📈 총 수집 경기 수: {total_games}경기")
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


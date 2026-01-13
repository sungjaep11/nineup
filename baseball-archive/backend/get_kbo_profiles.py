from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import pymysql
import re
import time
import requests
import os
from urllib.parse import urljoin

# ==========================================
# 1. DB 설정 (get_images.py와 동일하게)
# ==========================================
from config.db_config import DB_USER, DB_PASSWORD, DB_HOST, DB_NAME, DB_PORT

# ==========================================
# 2. 선수 상세 페이지 URL 패턴 설정
# ==========================================
# {id} 부분이 선수 ID로 교체됩니다.
PITCHER_DETAIL_URL = "https://www.koreabaseball.com/Record/Player/PitcherDetail/Basic.aspx?playerId={id}"
HITTER_DETAIL_URL = "https://www.koreabaseball.com/Record/Player/HitterDetail/Basic.aspx?playerId={id}"

# ==========================================
# 3. 이미지 URL 패턴 설정
# ==========================================
# 선수 상세 페이지에서 이미지를 찾지 못할 경우 사용할 대체 이미지 URL
IMAGE_URL_PATTERN = "https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/person/middle/2025/{id}.jpg"

def get_player_id_from_kbo(driver, player_name, player_type="타자"):
    """
    KBO 검색 페이지에서 선수 ID를 추출합니다.
    player_type: "타자" 또는 "투수"
    """
    try:
        # 1. KBO 검색 페이지로 이동
        search_url = f"https://www.koreabaseball.com/Player/Search.aspx?searchWord={player_name}"
        driver.get(search_url)
        time.sleep(1)  # 페이지 로딩 대기
        
        # 2. 검색 결과에서 선수 상세 페이지 링크 찾기
        # 타자: HitterDetail, 투수: PitcherDetail
        if player_type == "투수":
            # 투수 상세 페이지 링크 찾기
            # 예: <a href="/Record/Player/PitcherDetail/Basic.aspx?playerId=65949">...</a>
            link_selectors = [
                "a[href*='PitcherDetail']",
                "a[href*='playerId=']"
            ]
        else:
            # 타자 상세 페이지 링크 찾기
            # 예: <a href="/Record/Player/HitterDetail/Basic.aspx?playerId=55730">...</a>
            link_selectors = [
                "a[href*='HitterDetail']",
                "a[href*='playerId=']"
            ]
        
        # 여러 셀렉터 시도
        href = None
        for selector in link_selectors:
            try:
                link_element = driver.find_element(By.CSS_SELECTOR, selector)
                href = link_element.get_attribute("href")
                if href and 'playerId=' in href:
                    break
            except Exception:
                continue
        
        if not href:
            return None
        
        # 정규표현식으로 playerId 추출
        match = re.search(r'playerId=(\d+)', href)
        if match:
            return match.group(1)
        else:
            return None
    except Exception as e:
        print(f"  ⚠️ ID 추출 실패: {e}")
        return None

def get_image_from_detail_page(driver, player_id, player_type="타자"):
    """
    선수 상세 페이지에서 이미지를 찾아서 다운로드합니다.
    player_type: "타자" 또는 "투수"
    """
    try:
        # 1. 선수 상세 페이지 URL 생성
        if player_type == "투수":
            detail_url = PITCHER_DETAIL_URL.format(id=player_id)
        else:
            detail_url = HITTER_DETAIL_URL.format(id=player_id)
        
        # 2. 선수 상세 페이지로 이동
        driver.get(detail_url)
        time.sleep(1)  # 페이지 로딩 대기
        
        # 3. 페이지에서 이미지 찾기 (여러 방법 시도)
        image_url = None
        
        # 방법 1: 선수 정보 섹션의 img 태그 찾기 (가장 가능성 높음)
        try:
            # 선수명이 있는 섹션 근처의 이미지 찾기
            # KBO 페이지 구조: 선수명 옆이나 위에 프로필 이미지가 있을 가능성
            img_selectors = [
                "img[src*='person']",
                "img[src*='player']",
                "img[src*='profile']",
                "img[src*='KBO_IMAGE']",
                "img[src*='naverncp']",
                "img[src*='6ptotvmi5753']",  # 실제 이미지 CDN 도메인
                ".player-info img",
                ".player-detail img",
                "div.player img",
                "h2 + img",  # 선수명(h2) 다음에 오는 이미지
                "h3 + img",
                "table img",  # 테이블 내 이미지
                "img"  # 모든 이미지 (마지막 수단)
            ]
            
            for selector in img_selectors:
                try:
                    img_elements = driver.find_elements(By.CSS_SELECTOR, selector)
                    for img in img_elements:
                        src = img.get_attribute("src")
                        if src:
                            # 프로필 이미지로 보이는 URL 필터링
                            if any(keyword in src.lower() for keyword in ['person', 'player', 'profile', 'kbo_image', 'naverncp', 'middle']):
                                # 너무 작은 이미지나 아이콘 제외 (일반적으로 프로필은 100px 이상)
                                try:
                                    width = img.get_attribute("width")
                                    height = img.get_attribute("height")
                                    if width and height:
                                        w, h = int(width), int(height)
                                        if w >= 50 and h >= 50:  # 최소 크기 체크
                                            image_url = src
                                            print(f"  📸 이미지 발견 (방법1-{selector}): {src[:80]}...")
                                            break
                                except Exception:
                                    # 크기 정보가 없어도 일단 사용
                                    image_url = src
                                    print(f"  📸 이미지 발견 (방법1-{selector}): {src[:80]}...")
                                    break
                        if image_url:
                            break
                    if image_url:
                        break
                except Exception:
                    continue
        except Exception as e:
            print(f"  ⚠️ 이미지 찾기 오류: {e}")
        
        # 방법 2: 배경 이미지로 사용된 경우
        if not image_url:
            try:
                elements_with_bg = driver.find_elements(By.CSS_SELECTOR, "[style*='background-image']")
                for elem in elements_with_bg:
                    style = elem.get_attribute("style")
                    match = re.search(r'url\(["\']?([^"\']+)["\']?\)', style)
                    if match:
                        bg_url = match.group(1)
                        if any(keyword in bg_url.lower() for keyword in ['person', 'player', 'profile', 'kbo_image', 'naverncp']):
                            image_url = bg_url
                            print(f"  📸 배경 이미지 발견: {bg_url[:80]}...")
                            break
            except Exception:
                pass
        
        # 방법 3: 페이지 소스에서 직접 이미지 URL 패턴 찾기
        if not image_url:
            try:
                page_source = driver.page_source
                # KBO 이미지 URL 패턴 찾기
                pattern = r'https?://[^"\s]+(?:person|player|profile|KBO_IMAGE|naverncp)[^"\s]+\.(?:jpg|jpeg|png)'
                matches = re.findall(pattern, page_source, re.IGNORECASE)
                if matches:
                    # 첫 번째 매칭된 이미지 사용
                    image_url = matches[0]
                    print(f"  📸 페이지 소스에서 이미지 발견: {image_url[:80]}...")
            except Exception:
                pass
        
        # 4. 이미지 URL을 찾지 못한 경우 디버깅 정보 출력 및 대체 URL 사용
        if not image_url:
            print("  ⚠️ 페이지에서 이미지를 찾지 못했습니다. 대체 URL 사용")
            # 디버깅용: 페이지 소스 일부 저장
            try:
                page_source_snippet = driver.page_source[:5000]  # 처음 5000자만
                with open(f'debug_page_{player_id}.html', 'w', encoding='utf-8') as f:
                    f.write(page_source_snippet)
                print(f"  💾 디버깅용 페이지 소스 저장: debug_page_{player_id}.html")
            except Exception:
                pass
            image_url = IMAGE_URL_PATTERN.format(id=player_id)
        else:
            # 상대 경로인 경우 절대 경로로 변환
            if image_url.startswith('/'):
                image_url = urljoin("https://www.koreabaseball.com", image_url)
            elif not image_url.startswith('http'):
                image_url = urljoin(detail_url, image_url)
        
        # 5. 이미지 다운로드
        response = requests.get(image_url, timeout=10)
        response.raise_for_status()
        
        return response.content
        
    except Exception as e:
        print(f"  ⚠️ 이미지 다운로드 실패: {e}")
        return None

def update_table_images(cursor, conn, table_name, driver, player_type="타자"):
    """
    특정 테이블의 선수들에게 실제 이미지 파일을 다운로드하여 DB에 저장합니다.
    """
    try:
        # 테이블에 image_data 컬럼(BLOB)이 있는지 확인하고 없으면 추가
        try:
            cursor.execute(f"ALTER TABLE `{table_name}` ADD COLUMN `image_data` LONGBLOB NULL")
            conn.commit()
            print(f"✅ `{table_name}` 테이블에 `image_data` 컬럼(BLOB) 추가 완료")
        except Exception:
            # 이미 컬럼이 존재하는 경우 무시
            pass
        
        # 테이블에 player_id 컬럼이 있는지 확인하고 없으면 추가
        try:
            cursor.execute(f"ALTER TABLE `{table_name}` ADD COLUMN `player_id` VARCHAR(20) NULL")
            conn.commit()
            print(f"✅ `{table_name}` 테이블에 `player_id` 컬럼 추가 완료")
        except Exception:
            # 이미 컬럼이 존재하는 경우 무시
            pass
        
        # 이미지가 없거나 player_id가 없는 선수들 가져오기
        cursor.execute(f"""
            SELECT DISTINCT `선수명`, `팀명`, 
                   CASE WHEN `image_data` IS NULL THEN 0 ELSE 1 END as has_image,
                   CASE WHEN `player_id` IS NULL THEN 0 ELSE 1 END as has_player_id
            FROM `{table_name}` 
            WHERE `image_data` IS NULL OR `player_id` IS NULL
        """)
        players = cursor.fetchall()
        
        if len(players) == 0:
            print(f"✅ {player_type} 테이블(`{table_name}`): 이미지와 player_id가 모두 있는 선수가 없습니다.")
            return
        
        print(f"\n🚀 {player_type} 테이블(`{table_name}`): 총 {len(players)}명의 선수를 처리합니다...")
        
        success_count = 0
        fail_count = 0
        
        for player in players:
            player_name = player['선수명']
            team_name = player['팀명']
            has_image = player['has_image'] == 1
            has_player_id = player['has_player_id'] == 1
            
            try:
                # 1. 선수 ID 추출 (타자/투수 구분)
                player_id = get_player_id_from_kbo(driver, player_name, player_type)
                
                if player_id:
                    # 2. 이미지가 없는 경우에만 이미지 다운로드
                    if not has_image:
                        image_data = get_image_from_detail_page(driver, player_id, player_type)
                        
                        if image_data:
                            # 3. DB에 이미지 바이너리 데이터와 선수 ID 저장
                            sql = f"UPDATE `{table_name}` SET `image_data` = %s, `player_id` = %s WHERE `선수명` = %s AND `팀명` = %s"
                            cursor.execute(sql, (image_data, player_id, player_name, team_name))
                            conn.commit()
                            
                            # 4. player_images 폴더에 파일로도 저장
                            save_dir = 'player_images'
                            if not os.path.exists(save_dir):
                                os.makedirs(save_dir)
                            
                            # 파일명: {선수명}_profile.jpg
                            file_extension = '.jpg'  # 기본값
                            profile_filename = f"{player_name}_profile{file_extension}"
                            profile_path = os.path.join(save_dir, profile_filename)
                            
                            # 파일로 저장
                            with open(profile_path, 'wb') as f:
                                f.write(image_data)
                            
                            image_size_kb = len(image_data) / 1024
                            print(f"  ✅ {player_name} ({team_name}) - ID: {player_id}, 이미지 크기: {image_size_kb:.1f} KB")
                            print(f"     💾 파일 저장: {profile_path}")
                            success_count += 1
                        else:
                            print(f"  ⚠️ {player_name} ({team_name}): 이미지 다운로드 실패")
                            fail_count += 1
                    else:
                        # 이미지가 있지만 player_id가 없는 경우: player_id만 업데이트
                        if not has_player_id:
                            sql = f"UPDATE `{table_name}` SET `player_id` = %s WHERE `선수명` = %s AND `팀명` = %s"
                            cursor.execute(sql, (player_id, player_name, team_name))
                            conn.commit()
                            print(f"  ✅ {player_name} ({team_name}) - player_id 업데이트: {player_id}")
                            success_count += 1
                        else:
                            # 둘 다 있는 경우는 스킵 (이론적으로는 여기 올 일이 없음)
                            print(f"  ⚠️ {player_name} ({team_name}): 이미지와 player_id가 모두 있습니다. 스킵합니다.")
                else:
                    print(f"  ⚠️ {player_name} ({team_name}): 선수 ID를 찾을 수 없음")
                    fail_count += 1
                
            except Exception as e:
                print(f"  ❌ {player_name} ({team_name}): 오류 발생 ({e})")
                fail_count += 1
            
            # 너무 빠르면 차단될 수 있으니 0.5초 휴식
            time.sleep(0.5)
        
        print(f"\n📊 {player_type} 테이블 결과: 성공 {success_count}명, 실패 {fail_count}명")
        
    except Exception as e:
        print(f"❌ {player_type} 테이블 처리 중 오류: {e}")

def update_images_with_new_pattern():
    """
    kbo_hitters_top150와 kbo_pitchers_top150 테이블에 실제 이미지 파일을 다운로드하여 저장합니다.
    """
    # 브라우저 몰래 실행 (Headless)
    options = webdriver.ChromeOptions()
    options.add_argument('headless')
    
    # 윈도우/맥 호환성을 위한 User-Agent 설정
    options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36")
    
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    
    conn = pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        port=int(DB_PORT),
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )
    cursor = conn.cursor()

    try:
        print("=" * 60)
        print("🏆 KBO 선수 프로필 이미지 URL 추가 시작")
        print("=" * 60)
        
        # 1. 타자 테이블 처리
        update_table_images(cursor, conn, 'kbo_hitters_top150', driver, "타자")
        
        # 2. 투수 테이블 처리
        update_table_images(cursor, conn, 'kbo_pitchers_top150', driver, "투수")
        
        print("\n" + "=" * 60)
        print("🎉 모든 작업이 완료되었습니다!")
        print("=" * 60)

    finally:
        driver.quit()
        conn.close()

if __name__ == "__main__":
    update_images_with_new_pattern()
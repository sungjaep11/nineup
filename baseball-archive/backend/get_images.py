import os
import re
import shutil

import pymysql
# DB 설정 (기존과 동일하다고 가정)
from config.db_config import DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USER
from icrawler.builtin import GoogleImageCrawler  # Bing -> Google 변경
from pymysql import cursors

# get_players_from_db 함수는 기존과 동일하게 유지

def clean_search_term(name):
    """선수명 끝의 영문자 제거"""
    return re.sub(r'[A-Z]$', '', name)

def download_kbo_images(player_list):
    """
    선수 이미지를 다운로드합니다.
    """
    base_dir = 'player_images'
    if not os.path.exists(base_dir):
        os.makedirs(base_dir)

    print(f"총 {len(player_list)}명의 선수 이미지를 각각 3장씩 다운로드합니다 (Google)...")

    for player in player_list:
        player_name = clean_search_term(player['name'])
        team_name = player['team']
        
        # [핵심 변경 1] 검색어 최적화
        # '포지션'을 빼고 'KBO'를 추가하여 야구 관련 이미지만 나오도록 유도
        search_keyword = f"KBO {team_name} {player_name}"
        
        # 선수별 임시 폴더 생성 (이미지 섞임 방지)
        temp_dir = os.path.join(base_dir, "temp")
        if not os.path.exists(temp_dir):
            os.makedirs(temp_dir)

        # [핵심 변경 2] GoogleImageCrawler 사용
        crawler = GoogleImageCrawler(
            storage={'root_dir': temp_dir},
            feeder_threads=1,
            parser_threads=1,
            downloader_threads=4, # 너무 빠르면 차단될 수 있으니 적당히 조절
            log_level='ERROR'
        )

        print(f"[{player_name} ({team_name})] 이미지 수집 중... (키워드: {search_keyword})")

        # [핵심 변경 3] 필터 추가 (선택 사항)
        # type='face'를 쓰면 얼굴 위주, 'photo'는 일반 사진. 
        # 야구 선수는 'face'로 하면 너무 증명사진만 나올 수 있어 'photo' 유지 추천.
        filters = dict(type='photo') 

        try:
            crawler.crawl(
                keyword=search_keyword,
                max_num=3,
                filters=filters,
                overwrite=True
            )
        except Exception as e:
            print(f"  -> 크롤링 중 에러 발생: {e}")
            continue

        # 다운로드된 파일을 이름 변경하여 상위 폴더로 이동
        downloaded_files = os.listdir(temp_dir)
        downloaded_files.sort() # 순서 보장

        count = 0
        for idx, filename in enumerate(downloaded_files):
            if idx >= 3: break # 3장까지만 처리
            
            name, ext = os.path.splitext(filename)
            if ext.lower() not in ['.jpg', '.jpeg', '.png']:
                continue

            # 최종 파일명: 류현진_1.jpg
            final_filename = f"{player_name}_{idx+1}{ext}"
            src_path = os.path.join(temp_dir, filename)
            dst_path = os.path.join(base_dir, final_filename)

            # 이동
            shutil.move(src_path, dst_path)
            count += 1
        
        print(f"  -> {count}장 저장 완료")
        
        # 임시 폴더 비우기 (다음 선수를 위해)
        for file in os.listdir(temp_dir):
            os.remove(os.path.join(temp_dir, file))
        os.rmdir(temp_dir)

if __name__ == "__main__":
    # players = get_players_from_db() # 실제 사용 시 주석 해제
    
    # 테스트용 더미 데이터
    players = [
        {'name': '류현진', 'team': '한화', 'position': '투수'},
        {'name': '구자욱', 'team': '삼성', 'position': '외야수'},
        {'name': '김도영', 'team': 'KIA', 'position': '내야수'}
    ]
    
    download_kbo_images(players)
import boto3
import pymysql
import os
import sys
import mimetypes
import re

# 상위 디렉토리 경로 추가 (config 모듈 접근을 위해)
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

# db_config는 backend/config 폴더에 있음 (gitignore에 포함되어 커밋되지 않음)
from config.db_config import DB_CONFIG

# ==========================================
# 1. AWS S3 설정
# ==========================================
# AWS 자격 증명은 config/aws_config.py에서 가져옵니다
try:
    from config.aws_config import AWS_ACCESS_KEY, AWS_SECRET_KEY, BUCKET_NAME, REGION
except ImportError:
    # aws_config.py가 없으면 환경 변수 또는 placeholder 사용
    AWS_ACCESS_KEY = os.getenv('AWS_ACCESS_KEY_ID', 'your-aws-access-key-id')
    AWS_SECRET_KEY = os.getenv('AWS_SECRET_ACCESS_KEY', 'your-aws-secret-access-key')
    BUCKET_NAME = os.getenv('AWS_BUCKET_NAME', 'your-bucket-name')
    REGION = os.getenv('AWS_REGION', 'ap-northeast-2')

IMAGE_FOLDER = 'player_images'

def upload_s3_and_update_db():
    # 1. S3 연결
    s3 = boto3.client('s3', 
                      aws_access_key_id=AWS_ACCESS_KEY,
                      aws_secret_access_key=AWS_SECRET_KEY,
                      region_name=REGION)
    print("✅ S3 연결 성공!")

    # 2. DB 연결
    conn = pymysql.connect(**DB_CONFIG)
    cursor = conn.cursor()

    files = os.listdir(IMAGE_FOLDER)
    print(f"🚀 {len(files)}개의 이미지를 S3로 전송합니다...")

    try:
        for filename in files:
            if not filename.lower().endswith(('.jpg', '.png', '.jpeg')):
                continue

            # 파일 경로
            file_path = os.path.join(IMAGE_FOLDER, filename)
            
            # 선수 이름 추출 (예: 류현진_1.jpg -> 류현진, 류현진_profile.jpg -> 류현진)
            # 파일명 형식: {선수명}_1.jpg, {선수명}_2.jpg, {선수명}_3.jpg, {선수명}_profile.jpg
            name_without_ext = os.path.splitext(filename)[0]
            match = re.match(r'^(.+?)_(1|2|3|profile)$', name_without_ext)
            if match:
                player_name = match.group(1)
                image_type = match.group(2)
            else:
                # 형식이 맞지 않으면 건너뜀
                print(f"⚠️ 건너뜀: 파일명 형식 오류 ({filename})")
                continue

            # S3에 저장될 파일 이름 (중복 방지를 위해 폴더링 추천)
            # 예: players/류현진_1.jpg
            s3_file_name = f"players/{filename}"

            try:
                # (1) S3 업로드
                # ContentType을 설정해야 브라우저에서 바로 보입니다.
                content_type = mimetypes.guess_type(file_path)[0] or 'image/jpeg'
                
                s3.upload_file(
                    file_path, 
                    BUCKET_NAME, 
                    s3_file_name,
                    ExtraArgs={'ContentType': content_type}
                )

                # (2) URL 생성
                image_url = f"https://{BUCKET_NAME}.s3.{REGION}.amazonaws.com/{s3_file_name}"

                # (3) 이미지 타입별 컬럼 매핑 (기존 컬럼 사용)
                column_map = {
                    '1': 'image_1',
                    '2': 'image_2',
                    '3': 'image_3',
                    'profile': 'profile_img'
                }
                
                target_column = column_map.get(image_type)
                if not target_column:
                    print(f"⚠️ 알 수 없는 이미지 타입: {image_type}")
                    continue
                
                # (4) 컬럼 타입이 LONGBLOB이면 VARCHAR로 변경 (URL 저장을 위해)
                try:
                    # 컬럼 타입 확인 및 변경
                    cursor.execute("""
                        SELECT DATA_TYPE 
                        FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_SCHEMA = %s 
                        AND TABLE_NAME = 'photo_data' 
                        AND COLUMN_NAME = %s
                    """, (DB_CONFIG['db'], target_column))
                    
                    result = cursor.fetchone()
                    if result and result.get('DATA_TYPE') in ('longblob', 'blob', 'mediumblob'):
                        # LONGBLOB → VARCHAR(500)로 변경
                        cursor.execute("ALTER TABLE photo_data MODIFY COLUMN {} VARCHAR(500)".format(target_column))
                        conn.commit()
                        print(f"✅ {target_column} 컬럼 타입을 VARCHAR(500)으로 변경 완료")
                except Exception as e:
                    # 컬럼이 없거나 이미 VARCHAR 타입이면 무시
                    print(f"  ℹ️ {target_column} 컬럼 타입 확인/변경: {e}")

                # (5) DB 업데이트 또는 삽입 (기존 컬럼에 URL 저장)
                # 먼저 해당 선수가 있는지 확인
                cursor.execute("SELECT id FROM photo_data WHERE player_name = %s", (player_name,))
                existing_row = cursor.fetchone()
                
                if existing_row:
                    # 기존 행이 있으면 UPDATE
                    sql = f"UPDATE photo_data SET {target_column} = %s WHERE player_name = %s"
                    cursor.execute(sql, (image_url, player_name))
                    conn.commit()
                    print(f"🔄 업데이트: {player_name} ({image_type}) -> {image_url}")
                else:
                    # 기존 행이 없으면 INSERT (player_id는 NULL로, 나중에 채울 수 있음)
                    sql = f"INSERT INTO photo_data (player_name, {target_column}) VALUES (%s, %s)"
                    cursor.execute(sql, (player_name, image_url))
                    conn.commit()
                    print(f"✨ 신규등록: {player_name} ({image_type}) -> {image_url}")

            except Exception as e:
                print(f"❌ {player_name} 업로드 실패: {e}")

    finally:
        conn.close()
        print("\n🎉 모든 이미지가 S3로 이동했습니다!")

if __name__ == "__main__":
    upload_s3_and_update_db()

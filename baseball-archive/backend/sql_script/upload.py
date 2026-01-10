import pandas as pd
from sqlalchemy import create_engine
import glob
import os
import re

# ==========================================
# 1. 내 DB 정보 입력 (여기를 수정하세요!)
# ==========================================
DB_USER = 'admin'                       # AWS RDS 아이디 (보통 admin)
DB_PASSWORD = 'wldus08095**'       # AWS RDS 비밀번호
DB_HOST = 'baseball-db.c1awk62uemxb.ap-northeast-2.rds.amazonaws.com'         # AWS 엔드포인트 (긴 주소)
DB_PORT = '3306'
DB_NAME = 'baseball-db'                    # 데이터베이스 이름

# ==========================================
# 2. 실행 코드 (자동으로 모든 .xlsx, .csv 파일 업로드)
# ==========================================

def clean_table_name(filename):
    """파일명을 테이블명으로 변환 (예: batterlist.xlsx -> batter_list)"""
    # 확장자 제거
    name = os.path.splitext(filename)[0]
    # 특수문자를 _로 변환
    name = re.sub(r'[^a-zA-Z0-9가-힣]', '_', name)
    # 연속된 _를 하나로
    name = re.sub(r'_+', '_', name)
    # 앞뒤 _제거
    name = name.strip('_')
    # 소문자로 변환
    name = name.lower()
    return name

try:
    # (1) DB 연결 엔진 생성
    connection_str = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    engine = create_engine(connection_str)
    print("=" * 60)
    print("✅ 데이터베이스 연결 성공!")
    print("=" * 60)

    # (2) 현재 폴더에서 모든 .xlsx, .xls, .csv 파일 찾기
    excel_files = glob.glob('*.xlsx') + glob.glob('*.xls')
    csv_files = glob.glob('*.csv')
    all_files = excel_files + csv_files
    
    if not all_files:
        print("\n❌ 업로드할 파일이 없습니다!")
        print("💡 .xlsx, .xls, .csv 파일을 현재 폴더에 넣어주세요.")
        exit()
    
    print(f"\n📂 발견된 파일: {len(all_files)}개")
    for i, file in enumerate(all_files, 1):
        file_size = os.path.getsize(file) / 1024  # KB로 변환
        print(f"  {i}. {file} ({file_size:.1f} KB)")
    
    print("\n" + "=" * 60)
    print("📤 업로드 시작...")
    print("=" * 60)
    
    # (3) 각 파일을 순회하며 업로드
    success_count = 0
    fail_count = 0
    
    for idx, file_name in enumerate(all_files, 1):
        try:
            print(f"\n[{idx}/{len(all_files)}] 📂 '{file_name}' 처리 중...")
            
            # 파일 읽기
            if file_name.endswith('.xlsx') or file_name.endswith('.xls'):
                # 엑셀 파일
                df = pd.read_excel(file_name)
            else:
                # CSV 파일 (한글 깨짐 방지)
                try:
                    df = pd.read_csv(file_name, encoding='cp949')
                except UnicodeDecodeError:
                    df = pd.read_csv(file_name, encoding='utf-8')
            
            # 테이블명 생성 (파일명 기반)
            table_name = clean_table_name(file_name)
            
            # DB에 업로드
            df.to_sql(name=table_name, con=engine, if_exists='replace', index=False)
            
            print(f"  ✅ 성공! 총 {len(df)}행 → '{table_name}' 테이블 생성")
            success_count += 1
            
        except Exception as e:
            print(f"  ❌ 실패: {e}")
            fail_count += 1
    
    # (4) 최종 결과
    print("\n" + "=" * 60)
    print("📊 업로드 완료!")
    print("=" * 60)
    print(f"✅ 성공: {success_count}개")
    print(f"❌ 실패: {fail_count}개")
    print("=" * 60)
    
    if success_count > 0:
        print("\n💡 확인: python check_data.py")

except Exception as e:
    print("\n" + "=" * 60)
    print("❌ 오류가 발생했습니다:")
    print("=" * 60)
    print(e)
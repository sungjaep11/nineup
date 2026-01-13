"""
pitcher_table과 hitter_table의 구조와 샘플 데이터를 확인하는 스크립트
"""

import pymysql
from pymysql import cursors

# ==========================================
# DB 설정
# ==========================================
from config.db_config import DB_USER, DB_PASSWORD, DB_HOST, DB_NAME, DB_PORT

def check_tables():
    """
    pitcher_table과 hitter_table의 구조와 샘플 데이터를 확인합니다.
    """
    try:
        conn = pymysql.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            port=int(DB_PORT),
            charset='utf8mb4',
            cursorclass=cursors.DictCursor
        )
        cursor = conn.cursor()
        
        tables = {
            'pitcher': 'kbo_pitchers_top150',
            'hitter': 'kbo_hitters_top150'
        }
        
        print("=" * 80)
        print("📊 Pitcher & Hitter 테이블 구조 확인")
        print("=" * 80)
        
        for table_type, table_name in tables.items():
            print(f"\n{'='*80}")
            print(f"📋 테이블: `{table_name}` ({table_type.upper()})")
            print(f"{'='*80}")
            
            # 테이블 구조 확인
            cursor.execute(f"DESCRIBE `{table_name}`")
            columns = cursor.fetchall()
            
            print(f"\n📐 테이블 구조 ({len(columns)}개 컬럼):")
            print("-" * 80)
            print(f"{'컬럼명':<20} {'타입':<20} {'NULL':<10} {'키':<10} {'기본값':<15}")
            print("-" * 80)
            for col in columns:
                col_name = col['Field']
                col_type = col['Type']
                col_null = col['Null']
                col_key = col['Key']
                col_default = str(col['Default']) if col['Default'] is not None else 'NULL'
                print(f"{col_name:<20} {col_type:<20} {col_null:<10} {col_key:<10} {col_default:<15}")
            
            # 전체 행 개수 확인
            cursor.execute(f"SELECT COUNT(*) as count FROM `{table_name}`")
            total_rows = cursor.fetchone()['count']
            print(f"\n📊 총 데이터 개수: {total_rows}행")
            
            # 샘플 데이터 확인 (처음 5행)
            cursor.execute(f"SELECT * FROM `{table_name}` LIMIT 5")
            samples = cursor.fetchall()
            
            if samples:
                print(f"\n📝 샘플 데이터 (처음 5행):")
                print("-" * 80)
                for idx, row in enumerate(samples, 1):
                    print(f"\n[행 {idx}]")
                    for key, value in row.items():
                        # 이미지 데이터는 너무 길어서 표시하지 않음
                        if key in ['image_data']:
                            if value:
                                data_size = len(value) if isinstance(value, bytes) else 0
                                print(f"  {key}: <바이너리 데이터, {data_size} bytes>")
                            else:
                                print(f"  {key}: NULL")
                        elif key in ['image_url']:
                            # URL이 너무 길면 일부만 표시
                            url_str = str(value) if value else 'NULL'
                            if len(url_str) > 60:
                                print(f"  {key}: {url_str[:60]}...")
                            else:
                                print(f"  {key}: {url_str}")
                        else:
                            # 일반 데이터는 그대로 표시
                            value_str = str(value) if value is not None else 'NULL'
                            if len(value_str) > 50:
                                print(f"  {key}: {value_str[:50]}...")
                            else:
                                print(f"  {key}: {value_str}")
        
        # 추가 정보: 포지션 정보가 있는지 확인
        print(f"\n{'='*80}")
        print("📋 추가 정보: 포지션 테이블 확인")
        print(f"{'='*80}")
        
        # kbo_defense_positions 테이블 확인
        cursor.execute("SHOW TABLES LIKE 'kbo_defense_positions'")
        defense_table = cursor.fetchone()
        
        if defense_table:
            print("\n✅ `kbo_defense_positions` 테이블이 존재합니다.")
            cursor.execute("SELECT COUNT(*) as count FROM `kbo_defense_positions`")
            defense_count = cursor.fetchone()['count']
            print(f"   총 {defense_count}행의 포지션 데이터")
            
            # 샘플 데이터
            cursor.execute("SELECT * FROM `kbo_defense_positions` LIMIT 3")
            defense_samples = cursor.fetchall()
            if defense_samples:
                print("\n   샘플 데이터:")
                for idx, row in enumerate(defense_samples, 1):
                    print(f"   [{idx}] {row}")
        else:
            print("\n⚠️ `kbo_defense_positions` 테이블이 없습니다.")
        
        conn.close()
        
        print(f"\n{'='*80}")
        print("✅ 확인 완료")
        print(f"{'='*80}")
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_tables()



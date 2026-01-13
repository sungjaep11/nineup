"""
'kbo_'로 시작하는 테이블을 제외하고 모든 테이블을 삭제하는 스크립트

⚠️ 주의: 이 스크립트는 'kbo_'로 시작하지 않는 모든 테이블을 삭제합니다.
데이터 복구가 불가능하므로 신중하게 사용하세요.
"""

import pymysql
from pymysql import cursors

# ==========================================
# DB 설정
# ==========================================
from config.db_config import DB_USER, DB_PASSWORD, DB_HOST, DB_NAME, DB_PORT

def delete_non_kbo_tables():
    """
    'kbo_'로 시작하는 테이블을 제외하고 모든 테이블을 삭제합니다.
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
        
        print("=" * 80)
        print("🗑️  'kbo_'로 시작하지 않는 테이블 삭제 스크립트")
        print("=" * 80)
        
        # 모든 테이블 목록 가져오기
        cursor.execute("SHOW TABLES")
        all_tables = cursor.fetchall()
        
        if not all_tables:
            print("\n❌ 테이블이 없습니다.")
            conn.close()
            return
        
        # 테이블명 추출
        table_names = [list(table.values())[0] for table in all_tables]
        
        # 'kbo_'로 시작하는 테이블과 그렇지 않은 테이블 분리
        kbo_tables = [t for t in table_names if t.startswith('kbo_')]
        non_kbo_tables = [t for t in table_names if not t.startswith('kbo_')]
        
        print(f"\n📊 테이블 분석:")
        print("-" * 80)
        print(f"  전체 테이블: {len(table_names)}개")
        print(f"  'kbo_'로 시작하는 테이블: {len(kbo_tables)}개 (보존)")
        print(f"  삭제 대상 테이블: {len(non_kbo_tables)}개")
        
        if len(kbo_tables) > 0:
            print(f"\n✅ 보존될 테이블 (kbo_로 시작):")
            for idx, table in enumerate(kbo_tables, 1):
                cursor.execute(f"SELECT COUNT(*) as count FROM `{table}`")
                row_count = cursor.fetchone()['count']
                print(f"  {idx}. {table} ({row_count}행)")
        
        if len(non_kbo_tables) > 0:
            print(f"\n❌ 삭제될 테이블:")
            for idx, table in enumerate(non_kbo_tables, 1):
                cursor.execute(f"SELECT COUNT(*) as count FROM `{table}`")
                row_count = cursor.fetchone()['count']
                print(f"  {idx}. {table} ({row_count}행)")
        else:
            print(f"\n✅ 삭제할 테이블이 없습니다.")
            conn.close()
            return
        
        # 사용자 확인
        print("\n" + "=" * 80)
        print("⚠️  경고: 위 테이블들이 삭제됩니다!")
        print("=" * 80)
        print(f"총 {len(non_kbo_tables)}개의 테이블이 삭제됩니다.")
        print("이 작업은 되돌릴 수 없습니다.")
        print("\n계속하시겠습니까? (yes 입력 시 삭제): ", end='')
        
        confirmation = input().strip().lower()
        if confirmation != 'yes':
            print("❌ 취소되었습니다.")
            conn.close()
            return
        
        print(f"\n🗑️  테이블 삭제 시작...")
        print("=" * 80)
        
        deleted_count = 0
        failed_count = 0
        
        for table_name in non_kbo_tables:
            try:
                print(f"  삭제 중: {table_name}...", end=' ')
                cursor.execute(f"DROP TABLE `{table_name}`")
                conn.commit()
                print("✅ 완료")
                deleted_count += 1
            except Exception as e:
                print(f"❌ 실패: {e}")
                failed_count += 1
        
        print("=" * 80)
        print(f"🎉 삭제 완료!")
        print(f"  ✅ 성공: {deleted_count}개")
        if failed_count > 0:
            print(f"  ❌ 실패: {failed_count}개")
        print("=" * 80)
        
        # 삭제 후 남은 테이블 확인
        cursor.execute("SHOW TABLES")
        remaining_tables = cursor.fetchall()
        remaining_names = [list(t.values())[0] for t in remaining_tables]
        
        print(f"\n📊 삭제 후 남은 테이블: {len(remaining_names)}개")
        for idx, table in enumerate(remaining_names, 1):
            cursor.execute(f"SELECT COUNT(*) as count FROM `{table}`")
            row_count = cursor.fetchone()['count']
            print(f"  {idx}. {table} ({row_count}행)")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    delete_non_kbo_tables()


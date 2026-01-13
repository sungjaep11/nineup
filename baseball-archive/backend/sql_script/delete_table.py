import pymysql
import sys
import os

# 상위 디렉토리의 db_config import를 위해 경로 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.db_config import DB_USER, DB_PASSWORD, DB_HOST, DB_NAME, DB_PORT

# 삭제할 테이블 이름
TABLE_TO_DELETE = 'batter_list'

print("=" * 60)
print("🗑️  테이블 삭제 스크립트")
print("=" * 60)

try:
    # (1) 데이터베이스 연결
    print(f"\n⏳ '{DB_NAME}' 데이터베이스에 연결 중...")
    connection = pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        port=DB_PORT
    )
    print("✅ 연결 성공!")
    
    cursor = connection.cursor()
    
    # (2) 테이블 존재 확인
    cursor.execute("SHOW TABLES")
    tables = [table[0] for table in cursor.fetchall()]
    
    print(f"\n📋 현재 테이블 목록: {len(tables)}개")
    for idx, table in enumerate(tables, 1):
        if table == TABLE_TO_DELETE:
            print(f"  {idx}. {table} ← 삭제 대상")
        else:
            print(f"  {idx}. {table}")
    
    # (3) 테이블 삭제
    if TABLE_TO_DELETE in tables:
        print(f"\n⏳ '{TABLE_TO_DELETE}' 테이블 삭제 중...")
        cursor.execute(f"DROP TABLE `{TABLE_TO_DELETE}`")
        connection.commit()
        print(f"✅ '{TABLE_TO_DELETE}' 테이블이 삭제되었습니다!")
    else:
        print(f"\n❌ '{TABLE_TO_DELETE}' 테이블이 존재하지 않습니다.")
        print("💡 이미 삭제되었거나 생성되지 않았습니다.")
    
    # (4) 삭제 후 테이블 목록 확인
    cursor.execute("SHOW TABLES")
    tables_after = [table[0] for table in cursor.fetchall()]
    
    print(f"\n📊 삭제 후 남은 테이블: {len(tables_after)}개")
    if tables_after:
        for idx, table in enumerate(tables_after, 1):
            print(f"  {idx}. {table}")
    else:
        print("  (테이블 없음)")
    
    cursor.close()
    connection.close()
    
    print("\n" + "=" * 60)
    print("🎉 완료!")
    print("=" * 60)

except pymysql.err.OperationalError as e:
    error_code = e.args[0]
    error_message = e.args[1]
    
    if error_code == 1049:
        print(f"\n❌ 데이터베이스 '{DB_NAME}'가 없습니다!")
        print("💡 먼저 'python create_database.py'를 실행하세요.")
    else:
        print(f"\n❌ 오류 발생: {error_message}")

except Exception as e:
    print(f"\n❌ 오류 발생: {e}")
    print(f"오류 타입: {type(e).__name__}")


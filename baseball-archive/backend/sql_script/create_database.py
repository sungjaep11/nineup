import pymysql

# ==========================================
# AWS RDS 접속 정보 (upload.py와 동일하게)
# ==========================================
DB_USER = 'admin'
DB_PASSWORD = 'wldus08095**'
DB_HOST = 'baseball-db.c1awk62uemxb.ap-northeast-2.rds.amazonaws.com'
DB_PORT = 3306
DB_NAME = 'baseball-db'

print("=" * 60)
print("🔧 데이터베이스 생성 스크립트")
print("=" * 60)

try:
    # (1) 먼저 서버에만 연결 (데이터베이스 지정 안 함)
    print(f"\n⏳ {DB_HOST} 서버에 연결 중...")
    connection = pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        port=DB_PORT
    )
    print("✅ 서버 연결 성공!")
    
    cursor = connection.cursor()
    
    # (2) 데이터베이스 생성
    print(f"\n⏳ '{DB_NAME}' 데이터베이스 생성 중...")
    cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
    print(f"✅ 데이터베이스 '{DB_NAME}' 생성 완료!")
    
    # (3) 생성된 데이터베이스 확인
    cursor.execute("SHOW DATABASES")
    databases = cursor.fetchall()
    
    print("\n" + "=" * 60)
    print("📊 현재 존재하는 데이터베이스 목록:")
    print("=" * 60)
    for db in databases:
        if db[0] == DB_NAME:
            print(f"  ✅ {db[0]} ← 방금 생성됨!")
        else:
            print(f"     {db[0]}")
    
    cursor.close()
    connection.close()
    
    print("\n" + "=" * 60)
    print("🎉 성공! 이제 'python upload.py'를 실행하세요!")
    print("=" * 60)

except pymysql.err.OperationalError as e:
    print(f"\n❌ 연결 오류: {e}")
    print("\n💡 확인 사항:")
    print("  1. AWS 보안 그룹에서 3306 포트가 열려있나요?")
    print("  2. DB_HOST, DB_USER, DB_PASSWORD가 정확한가요?")
    print("  3. RDS 인스턴스 상태가 '사용 가능'인가요?")

except Exception as e:
    print(f"\n❌ 오류 발생: {e}")
    print(f"\n오류 타입: {type(e).__name__}")

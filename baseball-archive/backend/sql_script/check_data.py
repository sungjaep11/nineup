import pymysql

# ==========================================
# AWS RDS 접속 정보
# ==========================================
DB_USER = 'admin'
DB_PASSWORD = 'wldus08095**'
DB_HOST = 'baseball-db.c1awk62uemxb.ap-northeast-2.rds.amazonaws.com'
DB_PORT = 3306
DB_NAME = 'baseball-db'

print("=" * 60)
print("🔍 데이터 확인 스크립트")
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
    
    # (2) 테이블 목록 확인
    print("\n" + "=" * 60)
    print("📋 현재 존재하는 테이블:")
    print("=" * 60)
    cursor.execute("SHOW TABLES")
    tables = cursor.fetchall()
    
    if not tables:
        print("❌ 테이블이 없습니다!")
        print("💡 'python upload.py'를 먼저 실행하세요.")
    else:
        for idx, table in enumerate(tables, 1):
            table_name = table[0]
            # 각 테이블의 행 개수 확인
            cursor.execute(f"SELECT COUNT(*) FROM `{table_name}`")
            count = cursor.fetchone()[0]
            print(f"  {idx}. {table_name} ({count}행)")
    
    # (3) 각 테이블 데이터 미리보기
    if tables:
        for table in tables:
            table_name = table[0]
            
            print("\n" + "=" * 60)
            print(f"📊 테이블: {table_name}")
            print("=" * 60)
            
            # 전체 개수 확인
            cursor.execute(f"SELECT COUNT(*) FROM `{table_name}`")
            count = cursor.fetchone()[0]
            print(f"✅ 총 {count}행의 데이터")
            
            # 처음 3행 출력
            print(f"\n📝 처음 3행 미리보기:")
            print("-" * 60)
            cursor.execute(f"SELECT * FROM `{table_name}` LIMIT 3")
            results = cursor.fetchall()
            
            # 컬럼 이름 가져오기
            cursor.execute(f"SHOW COLUMNS FROM `{table_name}`")
            columns = [col[0] for col in cursor.fetchall()]
            
            # 헤더 출력
            header = " | ".join(columns[:5])  # 처음 5개 컬럼만
            if len(columns) > 5:
                header += " | ..."
            print(header)
            print("-" * 60)
            
            # 데이터 출력
            for row in results:
                row_data = [str(item) if item is not None else "NULL" for item in row[:5]]
                row_str = " | ".join(row_data)
                if len(row) > 5:
                    row_str += " | ..."
                print(row_str)
    
    cursor.close()
    connection.close()
    
    print("\n" + "=" * 60)
    print("🎉 확인 완료!")
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


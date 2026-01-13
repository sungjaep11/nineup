"""
MySQL 데이터베이스에 직접 쿼리 실행하는 스크립트
사용법: python query_db.py "SELECT * FROM kbo_hitters_top150 LIMIT 5"
"""

import pymysql
import sys
from pymysql.cursors import DictCursor
from config.db_config import DB_CONFIG

def execute_query(query):
    """SQL 쿼리 실행"""
    try:
        conn = pymysql.connect(**DB_CONFIG)
        cursor = conn.cursor(DictCursor)
        
        print("=" * 80)
        print("🔍 쿼리 실행 중...")
        print("=" * 80)
        print(f"SQL: {query}\n")
        
        cursor.execute(query)
        
        # SELECT 쿼리인 경우 결과 출력
        if query.strip().upper().startswith('SELECT'):
            results = cursor.fetchall()
            
            if results:
                print(f"✅ 결과: {len(results)}행\n")
                
                # 컬럼명 출력
                columns = list(results[0].keys())
                print(" | ".join(columns))
                print("-" * 80)
                
                # 데이터 출력 (최대 100행)
                for idx, row in enumerate(results[:100], 1):
                    values = [str(row[col]) if row[col] is not None else 'NULL' for col in columns]
                    # 너무 긴 값은 잘라서 표시
                    values = [v[:50] + '...' if len(v) > 50 else v for v in values]
                    print(" | ".join(values))
                
                if len(results) > 100:
                    print(f"\n... (총 {len(results)}행 중 100행만 표시)")
            else:
                print("⚠️ 결과가 없습니다.")
        else:
            # INSERT, UPDATE, DELETE 등의 경우
            conn.commit()
            affected_rows = cursor.rowcount
            print(f"✅ 실행 완료! 영향받은 행: {affected_rows}개")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()

def interactive_mode():
    """대화형 모드"""
    print("=" * 80)
    print("🗄️  MySQL 데이터베이스 쿼리 실행기")
    print("=" * 80)
    print("\n💡 사용법:")
    print("  - SQL 쿼리를 입력하고 Enter를 누르세요")
    print("  - 종료하려면 'exit' 또는 'quit'를 입력하세요")
    print("  - 여러 줄 쿼리는 세미콜론(;)으로 끝나야 합니다")
    print("\n" + "=" * 80 + "\n")
    
    query_buffer = []
    
    while True:
        try:
            if query_buffer:
                prompt = "... "
            else:
                prompt = "mysql> "
            
            line = input(prompt).strip()
            
            if not line:
                continue
            
            if line.lower() in ['exit', 'quit', 'q']:
                print("👋 종료합니다.")
                break
            
            query_buffer.append(line)
            
            # 세미콜론으로 끝나면 쿼리 실행
            if line.endswith(';'):
                query = ' '.join(query_buffer)
                query_buffer = []
                print()
                execute_query(query)
                print()
        
        except KeyboardInterrupt:
            print("\n\n👋 종료합니다.")
            break
        except EOFError:
            print("\n\n👋 종료합니다.")
            break

def check_table_structure(table_name):
    """테이블 구조 확인"""
    try:
        conn = pymysql.connect(**DB_CONFIG)
        cursor = conn.cursor(DictCursor)
        
        print("=" * 80)
        print(f"📋 테이블 구조: `{table_name}`")
        print("=" * 80)
        
        # 테이블 구조 조회
        cursor.execute(f"DESCRIBE `{table_name}`")
        columns = cursor.fetchall()
        
        print(f"\n{'컬럼명':<25} {'타입':<25} {'NULL':<10} {'키':<10} {'기본값':<15}")
        print("-" * 80)
        for col in columns:
            col_name = col['Field']
            col_type = col['Type']
            col_null = col['Null']
            col_key = col['Key']
            col_default = str(col['Default']) if col['Default'] is not None else 'NULL'
            print(f"{col_name:<25} {col_type:<25} {col_null:<10} {col_key:<10} {col_default:<15}")
        
        # 행 개수 확인
        cursor.execute(f"SELECT COUNT(*) as count FROM `{table_name}`")
        count = cursor.fetchone()['count']
        print(f"\n📊 총 데이터 개수: {count}행")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # 명령어 인자로 쿼리 전달
        query = ' '.join(sys.argv[1:])
        execute_query(query)
    elif len(sys.argv) == 2 and sys.argv[1] in ['-i', '--interactive']:
        # 대화형 모드
        interactive_mode()
    else:
        # 사용법 출력
        print("=" * 80)
        print("🗄️  MySQL 데이터베이스 쿼리 실행기")
        print("=" * 80)
        print("\n사용법:")
        print("  1. 직접 쿼리 실행:")
        print("     python query_db.py \"SELECT * FROM kbo_hitters_top150 LIMIT 5\"")
        print("\n  2. 대화형 모드:")
        print("     python query_db.py -i")
        print("     또는")
        print("     python query_db.py --interactive")
        print("\n  3. 테이블 구조 확인:")
        print("     python query_db.py \"DESCRIBE kbo_hitters_top150\"")
        print("\n예제 쿼리:")
        print("  - 테이블 목록: SHOW TABLES")
        print("  - 컬럼 확인: DESCRIBE kbo_hitters_top150")
        print("  - player_id 확인: SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='kbo_hitters_top150' AND COLUMN_NAME='player_id'")
        print("=" * 80)


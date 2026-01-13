"""
수비율(FPCT) 컬럼이 있는 테이블 확인
"""

import pymysql
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.db_config import DB_USER, DB_PASSWORD, DB_HOST, DB_NAME, DB_PORT

conn = pymysql.connect(host=DB_HOST, user=DB_USER, password=DB_PASSWORD, database=DB_NAME, port=DB_PORT, charset='utf8mb4')
cursor = conn.cursor()

print('='*80)
print('수비율(FPCT) 컬럼이 있는 테이블 확인')
print('='*80)

cursor.execute('SHOW TABLES')
tables = [t[0] for t in cursor.fetchall()]

for table in tables:
    cursor.execute(f'SHOW COLUMNS FROM `{table}`')
    columns = [col[0] for col in cursor.fetchall()]
    
    # FPCT, 수비율, FLD 등 수비 관련 컬럼 찾기
    defense_cols = [col for col in columns if 'FPCT' in col.upper() or '수비율' in col or 'FLD' in col.upper() or 'E' == col or 'A' == col or 'PO' == col or 'DP' == col]
    
    if defense_cols:
        print(f'\n=== {table} ===')
        print('수비 관련 컬럼:')
        for col in defense_cols:
            cursor.execute(f'SHOW COLUMNS FROM `{table}` WHERE Field = %s', [col])
            col_info = cursor.fetchone()
            if col_info:
                print(f'  {col_info[0]}: {col_info[1]}')
        
        # 샘플 데이터 확인
        if 'FPCT' in str(defense_cols).upper() or '수비율' in str(defense_cols):
            fpct_col = [col for col in defense_cols if 'FPCT' in col.upper() or '수비율' in col][0]
            cursor.execute(f'SELECT `선수명`, `팀명`, `{fpct_col}` FROM `{table}` WHERE `{fpct_col}` IS NOT NULL LIMIT 5')
            samples = cursor.fetchall()
            if samples:
                print(f'\n샘플 데이터 ({fpct_col}):')
                for row in samples:
                    print(f'  {row[0]} ({row[1]}): {row[2]}')

cursor.close()
conn.close()

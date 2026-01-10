import pandas as pd

print("=" * 60)
print("📊 batterlist.xlsx 파일 내용 확인")
print("=" * 60)

try:
    # 엑셀 파일 읽기
    df = pd.read_excel('batterlist.xlsx')
    
    print(f"\n✅ 파일 읽기 성공!")
    print(f"📝 총 {len(df)}행의 데이터가 있습니다.\n")
    
    print("=" * 60)
    print("📋 컬럼(열) 목록:")
    print("=" * 60)
    for i, col in enumerate(df.columns, 1):
        print(f"  {i}. {col}")
    
    print("\n" + "=" * 60)
    print("📊 처음 5행 미리보기:")
    print("=" * 60)
    print(df.head())
    
    print("\n" + "=" * 60)
    print("📊 마지막 5행:")
    print("=" * 60)
    print(df.tail())
    
    print("\n" + "=" * 60)
    print("📈 데이터 통계:")
    print("=" * 60)
    print(f"행 개수: {len(df)}")
    print(f"열 개수: {len(df.columns)}")
    
except FileNotFoundError:
    print("\n❌ 'batterlist.xlsx' 파일을 찾을 수 없습니다!")
    print("💡 파일이 현재 디렉토리에 있는지 확인하세요.")
    
except Exception as e:
    print(f"\n❌ 오류 발생: {e}")


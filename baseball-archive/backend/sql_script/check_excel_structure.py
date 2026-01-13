import pandas as pd
import os

print("=" * 60)
print("📊 엑셀 파일 구조 확인")
print("=" * 60)

# 파일 경로 (상대 경로로 찾기)
batter_file = None
pitcher_file = None

# 현재 위치에서 파일 찾기
for root, dirs, files in os.walk('.'):
    for file in files:
        if file == 'batterlist.xlsx':
            batter_file = os.path.join(root, file)
        elif file == 'pitcherlist.xlsx':
            pitcher_file = os.path.join(root, file)

# batterlist.xlsx 확인
if batter_file:
    print(f"\n📂 파일: {batter_file}")
    print("=" * 60)
    try:
        df_batter = pd.read_excel(batter_file)
        
        print(f"✅ 총 {len(df_batter)}행")
        print(f"\n📋 컬럼 목록 ({len(df_batter.columns)}개):")
        for i, col in enumerate(df_batter.columns, 1):
            print(f"  {i}. {col}")
        
        print(f"\n📊 처음 5행:")
        print("-" * 60)
        print(df_batter.head())
        
        print(f"\n📊 포지션 종류:")
        print("-" * 60)
        if '포지션' in df_batter.columns:
            positions = df_batter['포지션'].unique()
            for pos in positions:
                count = len(df_batter[df_batter['포지션'] == pos])
                print(f"  {pos}: {count}명")
        else:
            print("  '포지션' 컬럼을 찾을 수 없습니다.")
            print(f"  실제 컬럼: {list(df_batter.columns)}")
            
    except Exception as e:
        print(f"❌ 오류: {e}")
else:
    print("\n❌ batterlist.xlsx 파일을 찾을 수 없습니다.")

# pitcherlist.xlsx 확인
if pitcher_file:
    print(f"\n\n📂 파일: {pitcher_file}")
    print("=" * 60)
    try:
        df_pitcher = pd.read_excel(pitcher_file)
        
        print(f"✅ 총 {len(df_pitcher)}행")
        print(f"\n📋 컬럼 목록 ({len(df_pitcher.columns)}개):")
        for i, col in enumerate(df_pitcher.columns, 1):
            print(f"  {i}. {col}")
        
        print(f"\n📊 처음 5행:")
        print("-" * 60)
        print(df_pitcher.head())
        
    except Exception as e:
        print(f"❌ 오류: {e}")
else:
    print("\n❌ pitcherlist.xlsx 파일을 찾을 수 없습니다.")

print("\n" + "=" * 60)
print("🎉 확인 완료!")
print("=" * 60)



"""
타자 데이터와 수비 포지션 데이터 merge 스크립트
kbo_hitters_top150 + kbo_defense_positions → kbo_hitters_with_positions
"""

import pandas as pd
import os

def main():
    print("=" * 60)
    print("🔀 타자 + 포지션 데이터 Merge")
    print("=" * 60)
    
    # 데이터 파일 경로
    hitters_file = 'backend/data/kbo_hitters_top150.csv'
    defense_file = 'backend/data/kbo_defense_positions.csv'
    
    # 파일 존재 확인
    if not os.path.exists(hitters_file):
        print(f"❌ 타자 데이터 파일이 없습니다: {hitters_file}")
        return
    
    if not os.path.exists(defense_file):
        print(f"❌ 수비 포지션 데이터 파일이 없습니다: {defense_file}")
        print("💡 먼저 'python backend/crawl_kbo_defense.py'를 실행하세요!")
        return
    
    # 데이터 로드
    print(f"\n📂 타자 데이터 로드: {hitters_file}")
    df_hitters = pd.read_csv(hitters_file, encoding='utf-8-sig')
    print(f"  ✓ {len(df_hitters)}명의 타자 데이터")
    
    print(f"\n📂 수비 포지션 데이터 로드: {defense_file}")
    df_defense = pd.read_csv(defense_file, encoding='utf-8-sig')
    print(f"  ✓ {len(df_defense)}명의 포지션 정보")
    
    # 한글 포지션 → 영문 포지션 매핑
    position_mapping = {
        '포수': 'C',
        '1루수': '1B',
        '2루수': '2B',
        '3루수': '3B',
        '유격수': 'SS',
        '좌익수': 'LF',
        '중견수': 'CF',
        '우익수': 'RF',
        '지명타자': 'DH',
    }
    
    # 수비 데이터의 포지션을 영문으로 변환
    df_defense['포지션_영문'] = df_defense['포지션'].map(position_mapping)
    
    # Merge (선수명 기준, left join - 타자 데이터 모두 유지)
    print("\n🔀 데이터 Merge 중...")
    df_merged = pd.merge(
        df_hitters, 
        df_defense[['선수명', '포지션', '포지션_영문']], 
        on='선수명', 
        how='left'
    )
    
    # 포지션이 없는 선수 확인
    no_position = df_merged[df_merged['포지션'].isna()]
    if len(no_position) > 0:
        print(f"\n⚠️ 포지션 정보가 없는 선수: {len(no_position)}명")
        print("  (수비 기록이 없거나 선수명이 일치하지 않음)")
        for idx, row in no_position.iterrows():
            print(f"    - {row['선수명']} ({row['팀명']})")
    
    # 포지션이 있는 선수만 필터링
    df_with_position = df_merged[df_merged['포지션'].notna()]
    print(f"\n✅ 포지션 정보가 있는 선수: {len(df_with_position)}명")
    
    # 포지션별 통계
    print("\n📊 포지션별 타자 수:")
    position_counts = df_with_position['포지션'].value_counts()
    for pos, count in position_counts.items():
        eng_pos = position_mapping.get(pos, '?')
        print(f"  {pos} ({eng_pos}): {count}명")
    
    # CSV 저장
    output_csv = 'backend/data/kbo_hitters_with_positions.csv'
    df_with_position.to_csv(output_csv, index=False, encoding='utf-8-sig')
    print(f"\n✅ CSV 저장 완료: {output_csv}")
    
    # 엑셀 저장
    output_excel = 'backend/data/kbo_hitters_with_positions.xlsx'
    df_with_position.to_excel(output_excel, index=False, engine='openpyxl')
    print(f"✅ Excel 저장 완료: {output_excel}")
    
    print("=" * 60)
    print("🎉 Merge 완료!")
    print("=" * 60)
    
    # 데이터 미리보기
    print("\n📋 Merge된 데이터 미리보기:")
    print(df_with_position[['순위', '선수명', '팀명', '포지션', '포지션_영문', 'AVG', 'HR', 'RBI']].head(20).to_string(index=False))
    
    print("\n💡 다음 단계:")
    print("  1. python backend/sql_script/upload.py  # MySQL에 업로드")
    print("  2. Django views.py 수정 (kbo_hitters_with_positions 테이블 사용)")

if __name__ == "__main__":
    main()



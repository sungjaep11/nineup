/**
 * 구단별 색상 매핑
 */

export interface TeamColors {
  primary: string;  // 메인 컬러 (막대 그래프용)
  secondary: string; // 강조/보조 컬러 (선 그래프용)
}

export const TEAM_COLORS: Record<string, TeamColors> = {
  '삼성': {
    primary: '#074CA1',      // 블루
    secondary: '#FFFFFF',     // 화이트
  },
  'KIA': {
    primary: '#EA0029',       // 레드
    secondary: '#06141F',     // 미드나잇 네이비
  },
  '롯데': {
    primary: '#002955',       // 헤리티지 네이비
    secondary: '#D00F31',     // 헤리티지 레드
  },
  '두산': {
    primary: '#131230',       // 다크 네이비
    secondary: '#ED1C24',     // 허슬두 레드
  },
  '한화': {
    primary: '#F37321',       // 오렌지
    secondary: '#000000',     // 블랙
  },
  'LG': {
    primary: '#C30452',       // 트윈스 핑크/레드
    secondary: '#000000',     // 블랙
  },
  'SSG': {
    primary: '#CE0E2D',       // 랜더스 레드
    secondary: '#FFB81C',     // 옐로우 골드
  },
  '키움': {
    primary: '#820024',       // 버건디
    secondary: '#FFFFFF',     // 화이트
  },
  'NC': {
    primary: '#315288',       // 마린 블루
    secondary: '#AF917B',     // 골드
  },
  'KT': {
    primary: '#000000',       // 블랙
    secondary: '#EC1C24',     // 매직 레드
  },
};

/**
 * 팀명에서 구단 색상 가져오기
 */
export const getTeamColors = (teamName: string | undefined): TeamColors => {
  if (!teamName) {
    return { primary: '#7896AA', secondary: '#FFFFFF' }; // 기본 색상
  }

  // 정확한 매칭 시도
  if (TEAM_COLORS[teamName]) {
    return TEAM_COLORS[teamName];
  }

  // 부분 매칭 시도
  for (const [key, colors] of Object.entries(TEAM_COLORS)) {
    if (teamName.includes(key) || key.includes(teamName)) {
      return colors;
    }
  }

  // 기본 색상 반환
  return { primary: '#7896AA', secondary: '#FFFFFF' };
};

/**
 * 색상에 투명도 추가
 */
export const addOpacity = (color: string, opacity: number): string => {
  // hex 색상을 rgba로 변환
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};


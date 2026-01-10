export type PlayerPosition = 
  | 'pitcher'     // 투수
  | 'catcher'     // 포수
  | 'first'       // 1루수
  | 'second'      // 2루수
  | 'shortstop'   // 유격수
  | 'third'       // 3루수
  | 'left'        // 좌익수
  | 'center'      // 중견수
  | 'right';      // 우익수

export interface Player {
  id: number;
  name: string;
  team: string;
  position: PlayerPosition;
  back_number: number;  // 백엔드 API 형식에 맞춤
  
  // 타자 통계 (선택적)
  batting_average?: number;  // 타율
  home_runs?: number;  // 홈런
  rbis?: number;  // 타점
  stolen_bases?: number;  // 도루
  
  // 투수 통계 (선택적)
  era?: number;  // 평균자책점
  wins?: number;  // 승
  losses?: number;  // 패
  holds?: number;  // 홀드
  saves?: number;  // 세이브
  strikeouts?: number;  // 탈삼진
}

// 포지션 이름 표시용
export const POSITION_NAMES: Record<PlayerPosition, string> = {
  pitcher: '투수',
  catcher: '포수',
  first: '1루수',
  second: '2루수',
  shortstop: '유격수',
  third: '3루수',
  left: '좌익수',
  center: '중견수',
  right: '우익수',
};

// 2025 시즌 유명 투수 선수
export const PITCHERS: Player[] = [
  { id: 1, name: '양현종', team: 'KIA 타이거즈', position: 'pitcher', back_number: 54 },
  { id: 2, name: '고영표', team: 'KT 위즈', position: 'pitcher', back_number: 32 },
  { id: 3, name: '원태인', team: '삼성 라이온즈', position: 'pitcher', back_number: 19 },
  { id: 4, name: '임찬규', team: 'LG 트윈스', position: 'pitcher', back_number: 30 },
  { id: 5, name: '페디', team: '두산 베어스', position: 'pitcher', back_number: 47 },
];

// 2025 시즌 유명 포수 선수
export const CATCHERS: Player[] = [
  { id: 6, name: '양의지', team: '두산 베어스', position: 'catcher', back_number: 25 },
  { id: 7, name: '강민호', team: '롯데 자이언츠', position: 'catcher', back_number: 27 },
  { id: 8, name: '박동원', team: 'LG 트윈스', position: 'catcher', back_number: 5 },
  { id: 9, name: '유강남', team: 'NC 다이노스', position: 'catcher', back_number: 23 },
  { id: 10, name: '한승택', team: '한화 이글스', position: 'catcher', back_number: 24 },
];

// 2025 시즌 유명 1루수 선수
export const FIRST_BASEMEN: Player[] = [
  { id: 11, name: '최정', team: 'SSG 랜더스', position: 'first', back_number: 14 },
  { id: 12, name: '박병호', team: 'KT 위즈', position: 'first', back_number: 52 },
  { id: 13, name: '나성범', team: 'KIA 타이거즈', position: 'first', back_number: 27 },
  { id: 14, name: '서건창', team: '키움 히어로즈', position: 'first', back_number: 8 },
  { id: 15, name: '최형우', team: 'KIA 타이거즈', position: 'first', back_number: 34 },
];

// 2025 시즌 유명 2루수 선수
export const SECOND_BASEMEN: Player[] = [
  { id: 16, name: '김혜성', team: '키움 히어로즈', position: 'second', back_number: 2 },
  { id: 17, name: '오지환', team: 'LG 트윈스', position: 'second', back_number: 24 },
  { id: 18, name: '김선빈', team: 'KIA 타이거즈', position: 'second', back_number: 23 },
  { id: 19, name: '최주환', team: 'SSG 랜더스', position: 'second', back_number: 44 },
  { id: 20, name: '박민우', team: 'NC 다이노스', position: 'second', back_number: 10 },
];

// 2025 시즌 유명 유격수 선수
export const SHORTSTOPS: Player[] = [
  { id: 21, name: '김하성', team: 'LA 다저스', position: 'shortstop', back_number: 6 },
  { id: 22, name: '박민우', team: 'NC 다이노스', position: 'shortstop', back_number: 1 },
  { id: 23, name: '오태곤', team: 'KT 위즈', position: 'shortstop', back_number: 30 },
  { id: 24, name: '안치홍', team: '한화 이글스', position: 'shortstop', back_number: 5 },
  { id: 25, name: '김선우', team: 'KIA 타이거즈', position: 'shortstop', back_number: 37 },
];

// 2025 시즌 유명 3루수 선수
export const THIRD_BASEMEN: Player[] = [
  { id: 26, name: '김도영', team: 'KIA 타이거즈', position: 'third', back_number: 5 },
  { id: 27, name: '강백호', team: 'KT 위즈', position: 'third', back_number: 50 },
  { id: 28, name: '허경민', team: '두산 베어스', position: 'third', back_number: 31 },
  { id: 29, name: '박건우', team: '삼성 라이온즈', position: 'third', back_number: 40 },
  { id: 30, name: '김재환', team: '키움 히어로즈', position: 'third', back_number: 24 },
];

// 2025 시즌 유명 좌익수 선수
export const LEFT_FIELDERS: Player[] = [
  { id: 31, name: '이정후', team: 'SF 자이언츠', position: 'left', back_number: 1 },
  { id: 32, name: '소크라테스', team: '두산 베어스', position: 'left', back_number: 9 },
  { id: 33, name: '노시환', team: '한화 이글스', position: 'left', back_number: 31 },
  { id: 34, name: '황성빈', team: 'KT 위즈', position: 'left', back_number: 8 },
  { id: 35, name: '박해민', team: 'LG 트윈스', position: 'left', back_number: 10 },
];

// 2025 시즌 유명 중견수 선수
export const CENTER_FIELDERS: Player[] = [
  { id: 36, name: '김상수', team: 'KIA 타이거즈', position: 'center', back_number: 11 },
  { id: 37, name: '멜', team: 'SSG 랜더스', position: 'center', back_number: 5 },
  { id: 38, name: '이우성', team: '키움 히어로즈', position: 'center', back_number: 19 },
  { id: 39, name: '홍창기', team: 'LG 트윈스', position: 'center', back_number: 50 },
  { id: 40, name: '지석훈', team: 'NC 다이노스', position: 'center', back_number: 13 },
];

// 2025 시즌 유명 우익수 선수
export const RIGHT_FIELDERS: Player[] = [
  { id: 41, name: '박석민', team: 'NC 다이노스', position: 'right', back_number: 53 },
  { id: 42, name: '양창섭', team: 'KT 위즈', position: 'right', back_number: 39 },
  { id: 43, name: '박찬호', team: 'LG 트윈스', position: 'right', back_number: 7 },
  { id: 44, name: '고종욱', team: 'KIA 타이거즈', position: 'right', back_number: 15 },
  { id: 45, name: '조병현', team: '한화 이글스', position: 'right', back_number: 37 },
];

// 모든 선수 데이터를 포지션별로 가져오는 함수
export function getPlayersByPosition(position: PlayerPosition): Player[] {
  switch (position) {
    case 'pitcher': return PITCHERS;
    case 'catcher': return CATCHERS;
    case 'first': return FIRST_BASEMEN;
    case 'second': return SECOND_BASEMEN;
    case 'shortstop': return SHORTSTOPS;
    case 'third': return THIRD_BASEMEN;
    case 'left': return LEFT_FIELDERS;
    case 'center': return CENTER_FIELDERS;
    case 'right': return RIGHT_FIELDERS;
    default: return [];
  }
}


/**
 * 야구 시뮬레이션 관련 API 호출 함수들
 */

import { API_ENDPOINTS, API_HEADERS } from '../config/api';

export interface Hitter2025 {
  player_id: string;
  선수명: string;
  AVG?: string;
  G?: string;
  PA?: string;
  AB?: string;
  H?: string;
  '2B'?: string;
  '3B'?: string;
  HR?: string;
  BB?: string;
  SO?: string;
  [key: string]: any;
}

export interface Pitcher2025 {
  player_id: string;
  선수명: string;
  ERA?: string;
  G?: string;
  TBF?: string;
  BB?: string;
  SO?: string;
  AVG?: string;
  H?: string;
  HR?: string;
  [key: string]: any;
}

export interface SimulationStatistics {
  total_simulations: number;
  distribution: {
    HR: number;
    '3B': number;
    '2B': number;
    '1B': number;
    BB: number;
    SO: number;
    OUT: number;
  };
  average_bases: number;
  hit_rate: number;
  on_base_rate: number;
  counts: {
    HR: number;
    '3B': number;
    '2B': number;
    '1B': number;
    BB: number;
    SO: number;
    OUT: number;
  };
}

export interface SimulationResult {
  result: 'HR' | '3B' | '2B' | '1B' | 'BB' | 'SO' | 'OUT';
  text: string;
  bases: number;
  statistics: SimulationStatistics;
}

export interface BatterData {
  name: string;
  AVG: number;
  H: number;
  '2B': number;
  '3B': number;
  HR: number;
  BB: number;
  SO: number;
  PA: number;
  AB: number;
}

export interface PitcherData {
  name: string;
  TBF: number;
  BB: number;
  SO: number;
  AVG: number;
  H: number;
  HR: number;
}

/**
 * 2025 타자 목록 가져오기
 */
export const get2025Hitters = async (): Promise<Hitter2025[]> => {
  try {
    const response = await fetch(API_ENDPOINTS.hitters2025, {
      method: 'GET',
      headers: API_HEADERS,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching 2025 hitters:', error);
    throw error;
  }
};

/**
 * 2025 투수 목록 가져오기
 */
export const get2025Pitchers = async (): Promise<Pitcher2025[]> => {
  try {
    const response = await fetch(API_ENDPOINTS.pitchers2025, {
      method: 'GET',
      headers: API_HEADERS,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching 2025 pitchers:', error);
    throw error;
  }
};

/**
 * 타자 vs 투수 시뮬레이션 실행
 */
export const simulateAtBat = async (
  batter: BatterData,
  pitcher: PitcherData
): Promise<SimulationResult> => {
  try {
    const response = await fetch(API_ENDPOINTS.simulateAtBat, {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify({ batter, pitcher }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error simulating at bat:', error);
    throw error;
  }
};


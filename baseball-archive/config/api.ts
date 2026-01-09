/**
 * API 설정 파일
 * Django 백엔드 서버와 통신하기 위한 설정
 */

import { Platform } from 'react-native';

// 환경에 따른 API URL 설정
const getApiUrl = () => {
  if (__DEV__) {
    // 개발 환경
    if (Platform.OS === 'android') {
      // Android 에뮬레이터는 10.0.2.2를 사용
      return 'http://10.0.2.2:8000';
    } else if (Platform.OS === 'ios') {
      // iOS 시뮬레이터는 localhost 사용 가능
      return 'http://localhost:8000';
    }
    // 실제 기기에서 테스트하는 경우 (컴퓨터 IP로 변경 필요)
    return 'http://192.168.0.10:8000';
  }
  
  // 프로덕션 환경 (실제 배포 시)
  return 'https://your-production-api.com';
};

export const API_URL = getApiUrl();
export const API_ENDPOINTS = {
  players: `${API_URL}/api/players/`,
  playersByPosition: (position: string) => `${API_URL}/api/players/by_position/?position=${position}`,
  allPlayersByPosition: `${API_URL}/api/players/all_by_position/`,
  playerDetail: (id: number) => `${API_URL}/api/players/${id}/`,
};

// API 호출 시 공통으로 사용할 헤더
export const API_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};


/**
 * 선수 관련 API 호출 함수들
 */

import { API_ENDPOINTS, API_HEADERS } from '../config/api';
import { Player, PlayerPosition } from '../types/player';

/**
 * 모든 선수 목록 가져오기
 */
export const getAllPlayers = async (): Promise<Player[]> => {
  try {
    const response = await fetch(API_ENDPOINTS.players, {
      method: 'GET',
      headers: API_HEADERS,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching all players:', error);
    throw error;
  }
};

/**
 * 특정 포지션의 선수들 가져오기
 */
export const getPlayersByPosition = async (position: PlayerPosition): Promise<Player[]> => {
  try {
    const response = await fetch(API_ENDPOINTS.playersByPosition(position), {
      method: 'GET',
      headers: API_HEADERS,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching players for position ${position}:`, error);
    throw error;
  }
};

/**
 * 모든 포지션별 선수 목록 가져오기 (한 번에)
 */
export const getAllPlayersByPosition = async (): Promise<Record<PlayerPosition, Player[]>> => {
  try {
    const response = await fetch(API_ENDPOINTS.allPlayersByPosition, {
      method: 'GET',
      headers: API_HEADERS,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching all players by position:', error);
    throw error;
  }
};

/**
 * 특정 선수 상세 정보 가져오기
 */
export const getPlayerDetail = async (id: number): Promise<Player> => {
  try {
    const response = await fetch(API_ENDPOINTS.playerDetail(id), {
      method: 'GET',
      headers: API_HEADERS,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching player detail for id ${id}:`, error);
    throw error;
  }
};

/**
 * 새 선수 생성
 */
export const createPlayer = async (playerData: Omit<Player, 'id'>): Promise<Player> => {
  try {
    const response = await fetch(API_ENDPOINTS.players, {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify(playerData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating player:', error);
    throw error;
  }
};

/**
 * 선수 정보 수정
 */
export const updatePlayer = async (id: number, playerData: Partial<Player>): Promise<Player> => {
  try {
    const response = await fetch(API_ENDPOINTS.playerDetail(id), {
      method: 'PATCH',
      headers: API_HEADERS,
      body: JSON.stringify(playerData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error updating player ${id}:`, error);
    throw error;
  }
};

/**
 * 선수 삭제
 */
export const deletePlayer = async (id: number): Promise<void> => {
  try {
    const response = await fetch(API_ENDPOINTS.playerDetail(id), {
      method: 'DELETE',
      headers: API_HEADERS,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error(`Error deleting player ${id}:`, error);
    throw error;
  }
};


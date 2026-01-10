import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Player, PlayerPosition, POSITION_NAMES } from '../types/player';
import { getMysqlPlayersByPosition } from '../services/playerService'; // MySQL API 사용

interface PlayerSelectorProps {
  selectedPlayers: Partial<Record<PlayerPosition, Player>>;
  onPlayerSelect: (position: PlayerPosition, player: Player) => void;
}

export default function PlayerSelector({ selectedPlayers, onPlayerSelect }: PlayerSelectorProps) {
  // 어떤 포지션이 펼쳐져 있는지 저장
  const [expandedPosition, setExpandedPosition] = useState<PlayerPosition | null>(null);
  
  // API에서 가져온 선수 데이터
  const [playersData, setPlayersData] = useState<Record<PlayerPosition, Player[]> | null>(null);
  
  // 로딩 상태
  const [loading, setLoading] = useState<boolean>(true);
  
  // 에러 상태
  const [error, setError] = useState<string | null>(null);

  // 모든 포지션 목록
  const positions: PlayerPosition[] = [
    'pitcher',
    'catcher',
    'first',
    'second',
    'shortstop',
    'third',
    'left',
    'center',
    'right',
  ];

  // 컴포넌트 마운트 시 MySQL에서 선수 데이터 가져오기
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('📊 MySQL에서 선수 데이터 가져오는 중...');
        // MySQL API에서 모든 포지션별 선수 데이터 가져오기
        const data = await getMysqlPlayersByPosition();
        console.log('✅ 선수 데이터 로드 완료!', Object.keys(data));
        setPlayersData(data);
      } catch (err) {
        console.error('❌ Error loading MySQL players:', err);
        setError('MySQL 선수 데이터를 불러오는데 실패했습니다. Django 서버와 MySQL 연결을 확인해주세요.');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  // 포지션 펼치기/접기
  const togglePosition = (position: PlayerPosition) => {
    if (expandedPosition === position) {
      // 같은 포지션 클릭 → 접기
      setExpandedPosition(null);
    } else {
      // 다른 포지션 클릭 → 펼치기
      setExpandedPosition(position);
    }
  };

  // 선수 선택
  const handlePlayerSelect = (position: PlayerPosition, player: Player) => {
    // 부모 컴포넌트에 선택 정보 전달
    onPlayerSelect(position, player);
    
    // 선택 후 자동으로 리스트 닫기
    setExpandedPosition(null);
  };

  // 로딩 중일 때
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#ffcc80" />
        <Text style={styles.loadingText}>선수 데이터를 불러오는 중...</Text>
      </View>
    );
  }

  // 에러 발생 시
  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            setLoading(true);
            setError(null);
            // 재시도
            getAllPlayersByPosition()
              .then(data => setPlayersData(data))
              .catch(err => setError('선수 데이터를 불러오는데 실패했습니다.'))
              .finally(() => setLoading(false));
          }}
        >
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 데이터가 없을 때
  if (!playersData) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>선수 데이터가 없습니다.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>선수 선택</Text>
        <Text style={styles.subtitle}>각 포지션별로 선수를 선택하세요</Text>
      </View>

      {/* 포지션 리스트 (세로로 나열) */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
        bounces={true}
        scrollEnabled={true}
        alwaysBounceVertical={true}>
        {positions.map((position) => {
          const players = playersData[position] || [];  // API에서 가져온 데이터 사용
          const expanded = expandedPosition === position;
          const selectedPlayer = selectedPlayers[position];

          return (
            <View key={position} style={styles.positionSection}>
              {/* 포지션 헤더 (클릭 가능) */}
              <TouchableOpacity
                style={[
                  styles.positionHeader,
                  expanded && styles.positionHeaderExpanded,
                ]}
                onPress={() => togglePosition(position)}>
                <View style={styles.positionHeaderLeft}>
                  <Text style={styles.positionIcon}>
                    {expanded ? '▼' : '▶'}
                  </Text>
                  <Text style={styles.positionName}>
                    {POSITION_NAMES[position]}
                  </Text>
                </View>

                {/* 선택된 선수 정보 표시 */}
                <View style={styles.selectedPlayerInfo}>
                  {selectedPlayer ? (
                    <>
                      <Text style={styles.selectedPlayerName}>
                        {selectedPlayer.name}
                      </Text>
                      <Text style={styles.selectedPlayerDetail}>
                        #{selectedPlayer.back_number}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.noSelection}>선택 안됨</Text>
                  )}
                </View>
              </TouchableOpacity>

              {/* 선수 리스트 (펼쳐진 경우만 표시) */}
              {expanded && (
                <View style={styles.playerListContainer}>
                  {players.map((player) => (
                    <TouchableOpacity
                      key={player.id}
                      style={[
                        styles.playerCard,
                        selectedPlayer?.id === player.id && styles.selectedCard,
                      ]}
                      onPress={() => handlePlayerSelect(position, player)}>
                      <View style={styles.checkboxContainer}>
                        <View style={[
                          styles.checkbox,
                          selectedPlayer?.id === player.id && styles.checkboxSelected,
                        ]}>
                          {selectedPlayer?.id === player.id && (
                            <Text style={styles.checkmark}>✓</Text>
                          )}
                        </View>
                      </View>
                      
                      <View style={styles.playerInfo}>
                        <View style={styles.playerHeader}>
                          <Text style={styles.playerName}>{player.name}</Text>
                          <Text style={styles.backNumber}>#{player.back_number}</Text>
                        </View>
                        <Text style={styles.teamName}>{player.team}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    display: 'none',
  },
  title: {
    display: 'none',
  },
  subtitle: {
    display: 'none',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#ffffff',
  },
  errorText: {
    fontSize: 16,
    color: '#ff6b6b',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#ffcc80',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5d4037',
  },
  scrollView: {
    flex: 1,
    width: '100%',
    minHeight: 0,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
    paddingTop: 10,
  },
  positionSection: {
    marginBottom: 1,
  },
  positionHeader: {
    backgroundColor: '#6d4c41',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#5d4037',
    minHeight: 60,
    borderRadius: 12,
    marginHorizontal: 12,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  positionHeaderExpanded: {
    backgroundColor: '#8d6e63',
    borderBottomColor: '#a1887f',
    borderBottomWidth: 2,
  },
  positionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0,
  },
  positionIcon: {
    fontSize: 14,
    color: '#ffcc80',
    marginRight: 12,
    width: 20,
  },
  positionName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    minWidth: 60,
  },
  selectedPlayerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginLeft: 16,
  },
  selectedPlayerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffcc80',
    marginRight: 6,
  },
  selectedPlayerDetail: {
    fontSize: 14,
    color: '#ffffff',
    backgroundColor: '#8d6e63',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  noSelection: {
    fontSize: 14,
    color: '#a1887f',
    fontStyle: 'italic',
  },
  playerListContainer: {
    backgroundColor: '#4e342e',
    paddingVertical: 8,
  },
  playerCard: {
    backgroundColor: '#6d4c41',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#ffcc80',
    backgroundColor: '#8d6e63',
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#a1887f',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  checkboxSelected: {
    backgroundColor: '#ffcc80',
    borderColor: '#ffcc80',
  },
  checkmark: {
    color: '#5d4037',
    fontSize: 14,
    fontWeight: 'bold',
  },
  playerInfo: {
    flex: 1,
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginRight: 8,
  },
  backNumber: {
    fontSize: 14,
    color: '#ffcc80',
    fontWeight: '600',
  },
  teamName: {
    fontSize: 13,
    color: '#efebe9',
  },
});

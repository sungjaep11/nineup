import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { getMysqlPlayersByPosition } from '../services/playerService'; // MySQL API 사용
import { Player, PlayerPosition, POSITION_NAMES } from '../types/player';

interface PlayerSelectorProps {
  selectedPlayers: Partial<Record<PlayerPosition, Player>>;
  onPlayerSelect: (position: PlayerPosition, player: Player | null) => void;
  startingPitcher: Player | null;
  reliefPitchers: Player[];
  onStartingPitcherSelect: (player: Player | null) => void;
  onReliefPitcherSelect: (player: Player | null) => void;
}

export default function PlayerSelector({ 
  selectedPlayers, 
  onPlayerSelect,
  startingPitcher,
  reliefPitchers,
  onStartingPitcherSelect,
  onReliefPitcherSelect
}: PlayerSelectorProps) {
  // 어떤 포지션이 펼쳐져 있는지 저장
  const [expandedPosition, setExpandedPosition] = useState<PlayerPosition | 'starting' | 'relief' | null>(null);
  
  // API에서 가져온 선수 데이터
  const [playersData, setPlayersData] = useState<Record<PlayerPosition, Player[]> | null>(null);
  
  // 로딩 상태
  const [loading, setLoading] = useState<boolean>(true);
  
  // 에러 상태
  const [error, setError] = useState<string | null>(null);

  // 모든 포지션 목록 (투수 제외)
  const positions: PlayerPosition[] = [
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
  const togglePosition = (position: PlayerPosition | 'starting' | 'relief') => {
    if (expandedPosition === position) {
      // 같은 포지션 클릭 → 접기
      setExpandedPosition(null);
    } else {
      // 다른 포지션 클릭 → 펼치기
      setExpandedPosition(position);
    }
  };

  // 선발 투수 선택 핸들러
  const handleStartingPitcherSelect = (player: Player) => {
    // 이미 선택된 선수를 다시 클릭하면 선택 해제
    if (startingPitcher && startingPitcher.id === player.id) {
      onStartingPitcherSelect(null);
    } else {
      // 선발 투수 선택 시 불펜에서 제거
      if (reliefPitchers.some(p => p.id === player.id)) {
        onReliefPitcherSelect(player);
      }
      onStartingPitcherSelect(player);
    }
    setExpandedPosition(null);
  };

  // 불펜 투수 선택 핸들러
  const handleReliefPitcherSelect = (player: Player) => {
    // 이미 선택된 선수를 다시 클릭하면 선택 해제
    if (reliefPitchers.some(p => p.id === player.id)) {
      onReliefPitcherSelect(player);
    } else {
      // 불펜 4명 제한
      if (reliefPitchers.length >= 4) {
        return; // 최대 4명까지만 선택 가능
      }
      // 불펜 투수 선택 시 선발에서 제거
      if (startingPitcher && startingPitcher.id === player.id) {
        onStartingPitcherSelect(null);
      }
      onReliefPitcherSelect(player);
    }
    // 불펜은 여러 명 선택하므로 리스트 닫지 않음
  };

  // 선수 선택/해제 (토글)
  const handlePlayerSelect = (position: PlayerPosition, player: Player) => {
    const currentSelectedPlayer = selectedPlayers[position];
    
    // 이미 선택된 선수를 다시 클릭하면 선택 해제
    if (currentSelectedPlayer && currentSelectedPlayer.id === player.id) {
      onPlayerSelect(position, null);
    } else {
      // 새로운 선수 선택
      onPlayerSelect(position, player);
    }
    
    // 선택/해제 후 자동으로 리스트 닫기
    setExpandedPosition(null);
  };

  // 로딩 중일 때
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#7896AA" />
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
            getMysqlPlayersByPosition()
              .then((data: Record<PlayerPosition, Player[]>) => setPlayersData(data))
              .catch((err: Error) => setError('선수 데이터를 불러오는데 실패했습니다.'))
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
        {/* 선발 투수 섹션 */}
        {playersData && playersData.pitcher && (
          <View style={styles.positionSection}>
            <TouchableOpacity
              style={[
                styles.positionHeader,
                expandedPosition === 'starting' && styles.positionHeaderExpanded,
              ]}
              onPress={() => togglePosition('starting')}>
              <View style={styles.positionHeaderLeft}>
                <Text style={styles.positionIcon}>
                  {expandedPosition === 'starting' ? '▼' : '▶'}
                </Text>
                <Text style={styles.positionName}>선발 투수</Text>
              </View>
              <View style={styles.selectedPlayerInfo}>
                {startingPitcher ? (
                  <Text style={styles.selectedPlayerName}>
                    {startingPitcher.name}
                  </Text>
                ) : (
                  <Text style={styles.noSelection}>선택 안됨</Text>
                )}
              </View>
            </TouchableOpacity>
            {expandedPosition === 'starting' && (
              <View style={styles.playerListContainer}>
                {playersData.pitcher
                  .filter(p => !reliefPitchers.some(rp => rp.id === p.id))
                  .map((player, index) => (
                    <TouchableOpacity
                      key={`starting-${player.id}-${index}`}
                      style={[
                        styles.playerCard,
                        startingPitcher?.id === player.id && styles.selectedCard,
                      ]}
                      onPress={() => handleStartingPitcherSelect(player)}>
                      <View style={styles.checkboxContainer}>
                        <View style={[
                          styles.checkbox,
                          startingPitcher?.id === player.id && styles.checkboxSelected,
                        ]}>
                          {startingPitcher?.id === player.id && (
                            <Text style={styles.checkmark}>✓</Text>
                          )}
                        </View>
                      </View>
                      <View style={styles.playerInfo}>
                        <View style={styles.playerHeader}>
                          <Text style={styles.playerName}>{player.name}</Text>
                        </View>
                        <Text style={styles.teamName}>{player.team}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
              </View>
            )}
          </View>
        )}

        {/* 불펜 투수 섹션 */}
        {playersData && playersData.pitcher && (
          <View style={styles.positionSection}>
            <TouchableOpacity
              style={[
                styles.positionHeader,
                expandedPosition === 'relief' && styles.positionHeaderExpanded,
              ]}
              onPress={() => togglePosition('relief')}>
              <View style={styles.positionHeaderLeft}>
                <Text style={styles.positionIcon}>
                  {expandedPosition === 'relief' ? '▼' : '▶'}
                </Text>
                <Text style={styles.positionName}>불펜 투수</Text>
              </View>
              <View style={styles.selectedPlayerInfo}>
                {reliefPitchers.length > 0 ? (
                  <Text style={styles.selectedPlayerName}>
                    {reliefPitchers.length}명 선택됨
                  </Text>
                ) : (
                  <Text style={styles.noSelection}>선택 안됨</Text>
                )}
              </View>
            </TouchableOpacity>
            {expandedPosition === 'relief' && (
              <View style={styles.playerListContainer}>
                {playersData.pitcher
                  .filter(p => !startingPitcher || startingPitcher.id !== p.id)
                  .map((player, index) => {
                    const isSelected = reliefPitchers.some(rp => rp.id === player.id);
                    const isDisabled = reliefPitchers.length >= 4 && !isSelected;
                    return (
                      <TouchableOpacity
                        key={`relief-${player.id}-${index}`}
                        style={[
                          styles.playerCard,
                          isSelected && styles.selectedCard,
                          isDisabled && styles.disabledCard,
                        ]}
                        onPress={() => !isDisabled && handleReliefPitcherSelect(player)}
                        disabled={isDisabled}>
                        <View style={styles.checkboxContainer}>
                          <View style={[
                            styles.checkbox,
                            isSelected && styles.checkboxSelected,
                            isDisabled && styles.checkboxDisabled,
                          ]}>
                            {isSelected && (
                              <Text style={styles.checkmark}>✓</Text>
                            )}
                          </View>
                        </View>
                        <View style={styles.playerInfo}>
                          <View style={styles.playerHeader}>
                            <Text style={[
                              styles.playerName,
                              isDisabled && styles.disabledText
                            ]}>
                              {player.name}
                            </Text>
                          </View>
                          <Text style={[
                            styles.teamName,
                            isDisabled && styles.disabledText
                          ]}>
                            {player.team}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
              </View>
            )}
          </View>
        )}

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
                    <Text style={styles.selectedPlayerName}>
                      {selectedPlayer.name}
                    </Text>
                  ) : (
                    <Text style={styles.noSelection}>선택 안됨</Text>
                  )}
                </View>
              </TouchableOpacity>

              {/* 선수 리스트 (펼쳐진 경우만 표시) */}
              {expanded && (
                <View style={styles.playerListContainer}>
                  {players.map((player, index) => (
                    <TouchableOpacity
                      key={`${position}-${player.id}-${index}`}
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
    color: '#3D5566',
  },
  errorText: {
    fontSize: 16,
    color: '#ff6b6b',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#7896AA',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(100, 130, 150, 0.2)',
    minHeight: 60,
    borderRadius: 12,
    marginHorizontal: 12,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  positionHeaderExpanded: {
    backgroundColor: '#F0F4F7',
    borderBottomColor: 'rgba(100, 130, 150, 0.3)',
    borderBottomWidth: 2,
  },
  positionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0,
  },
  positionIcon: {
    fontSize: 14,
    color: '#7896AA',
    marginRight: 12,
    width: 20,
  },
  positionName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3D5566',
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
    color: '#7896AA',
    marginRight: 6,
  },
  selectedPlayerDetail: {
    fontSize: 14,
    color: '#FFFFFF',
    backgroundColor: '#7896AA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  noSelection: {
    fontSize: 14,
    color: '#757575',
    fontStyle: 'italic',
  },
  playerListContainer: {
    backgroundColor: '#F0F4F7',
    paddingVertical: 8,
  },
  playerCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#7896AA',
    backgroundColor: '#F0F4F7',
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  checkboxSelected: {
    backgroundColor: '#7896AA',
    borderColor: '#7896AA',
  },
  checkmark: {
    color: '#FFFFFF',
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
    color: '#3D5566',
    marginRight: 8,
  },
  backNumber: {
    fontSize: 14,
    color: '#7896AA',
    fontWeight: '600',
  },
  teamName: {
    fontSize: 13,
    color: '#757575',
  },
  disabledCard: {
    opacity: 0.5,
  },
  checkboxDisabled: {
    borderColor: '#BDBDBD',
  },
  disabledText: {
    color: '#BDBDBD',
  },
});

import { BlurView } from 'expo-blur';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { getMysqlPlayersByPosition } from '../services/playerService';
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
  const [expandedPosition, setExpandedPosition] = useState<PlayerPosition | 'starting' | 'relief' | null>(null);
  const [playersData, setPlayersData] = useState<Record<PlayerPosition, Player[]> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  const teams = ['KIA', 'KT', '삼성', 'LG', '두산', '롯데', 'NC', '한화', '키움', 'SSG'];
  const teamDisplayNames: Record<string, string> = {
    'KIA': 'KIA 타이거즈', 'KT': 'KT 위즈', '삼성': '삼성 라이온즈', 'LG': 'LG 트윈스',
    '두산': '두산 베어스', '롯데': '롯데 자이언츠', 'NC': 'NC 다이노스', '한화': '한화 이글스',
    '키움': '키움 히어로즈', 'SSG': 'SSG 랜더스',
  };
  const positions: PlayerPosition[] = ['catcher', 'first', 'second', 'shortstop', 'third', 'left', 'center', 'right'];

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('📊 MySQL에서 선수 데이터 가져오는 중...');
        const data = await getMysqlPlayersByPosition();
        console.log('✅ 선수 데이터 로드 완료!', Object.keys(data));
        setPlayersData(data);
      } catch (err) {
        console.error('❌ Error loading MySQL players:', err);
        setError('MySQL 선수 데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchPlayers();
  }, []);

  const togglePosition = (position: PlayerPosition | 'starting' | 'relief') => {
    if (expandedPosition === position) setExpandedPosition(null);
    else setExpandedPosition(position);
  };

  const handleStartingPitcherSelect = (player: Player) => {
    if (startingPitcher && startingPitcher.id === player.id) {
      onStartingPitcherSelect(null);
    } else {
      if (reliefPitchers.some(p => p.id === player.id)) onReliefPitcherSelect(player);
      onStartingPitcherSelect(player);
    }
    setExpandedPosition(null);
  };

  const handleReliefPitcherSelect = (player: Player) => {
    if (reliefPitchers.some(p => p.id === player.id)) {
      onReliefPitcherSelect(player);
    } else {
      if (reliefPitchers.length >= 4) return;
      if (startingPitcher && startingPitcher.id === player.id) onStartingPitcherSelect(null);
      onReliefPitcherSelect(player);
      if (reliefPitchers.length === 3) setExpandedPosition(null);
    }
  };

  const handlePlayerSelect = (position: PlayerPosition, player: Player) => {
    const currentSelectedPlayer = selectedPlayers[position];
    if (currentSelectedPlayer && currentSelectedPlayer.id === player.id) {
      onPlayerSelect(position, null);
    } else {
      onPlayerSelect(position, player);
    }
    setExpandedPosition(null);
  };

  const filterPlayersByTeam = (players: Player[]) => {
    if (!selectedTeam) return players;
    return players.filter(player => {
      const playerTeam = player.team || '';
      return playerTeam === selectedTeam || playerTeam.startsWith(selectedTeam);
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingText}>선수 데이터를 불러오는 중...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            setLoading(true); setError(null);
            getMysqlPlayersByPosition().then(setPlayersData).catch(() => setError('실패')).finally(() => setLoading(false));
          }}
        >
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!playersData) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>선수 데이터가 없습니다.</Text>
      </View>
    );
  }

  const blurIntensity = Platform.OS === 'android' ? 30 : 20;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>선수 선택</Text>
        <Text style={styles.subtitle}>각 포지션별로 선수를 선택하세요</Text>
      </View>

      {/* 팀 필터 */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          <TouchableOpacity
            style={[styles.filterChip, !selectedTeam && styles.filterChipActive]}
            onPress={() => setSelectedTeam(null)}
          >
            <Text style={[styles.filterChipText, !selectedTeam && styles.filterChipTextActive]}>전체</Text>
          </TouchableOpacity>
          {teams.map((team) => (
            <TouchableOpacity
              key={team}
              style={[styles.filterChip, selectedTeam === team && styles.filterChipActive]}
              onPress={() => setSelectedTeam(team)}
            >
              <Text style={[styles.filterChipText, selectedTeam === team && styles.filterChipTextActive]}>
                {teamDisplayNames[team] || team}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 포지션 리스트 */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        
        {/* 선발 투수 섹션 */}
        {playersData && playersData.pitcher && (
          <View style={styles.positionSection}>
            <TouchableOpacity
              style={styles.positionHeaderContainer}
              onPress={() => togglePosition('starting')}
              activeOpacity={0.8}
            >
              <BlurView 
                intensity={blurIntensity} 
                tint="light" 
                style={[styles.glassView, styles.positionHeaderContent]}
              >
                <View style={styles.positionHeaderLeft}>
                  <Text style={styles.positionIcon}>{expandedPosition === 'starting' ? '▼' : '▶'}</Text>
                  <Text style={styles.positionName}>선발 투수</Text>
                </View>
                <View style={styles.selectedPlayerInfo}>
                  {startingPitcher ? (
                    <Text style={styles.selectedPlayerName}>{startingPitcher.name}</Text>
                  ) : (
                    <Text style={styles.noSelection}>선택 안됨</Text>
                  )}
                </View>
              </BlurView>
            </TouchableOpacity>
            
            {expandedPosition === 'starting' && (
              <View style={styles.playerListTransparent}>
                {filterPlayersByTeam(playersData.pitcher)
                  .filter(p => !reliefPitchers.some(rp => rp.id === p.id))
                  .map((player, index) => (
                    <TouchableOpacity
                      key={`starting-${player.id}-${index}`}
                      style={styles.playerCardContainer}
                      onPress={() => handleStartingPitcherSelect(player)}
                      activeOpacity={0.8}
                    >
                      <BlurView 
                        intensity={blurIntensity} 
                        tint="light"
                        style={[
                          styles.glassView,
                          styles.playerCardContent,
                          startingPitcher?.id === player.id && styles.selectedCardBlur,
                        ]}
                      >
                        <View style={styles.checkboxContainer}>
                          <View style={[
                            styles.checkbox,
                            startingPitcher?.id === player.id && styles.checkboxSelected,
                          ]}>
                            {startingPitcher?.id === player.id && <Text style={styles.checkmark}>✓</Text>}
                          </View>
                        </View>
                        <View style={styles.playerInfo}>
                          <View style={styles.playerHeader}>
                            <Text style={styles.playerName}>{player.name}</Text>
                          </View>
                          <Text style={styles.teamName}>{player.team}</Text>
                        </View>
                      </BlurView>
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
              style={styles.positionHeaderContainer}
              onPress={() => togglePosition('relief')}
              activeOpacity={0.8}
            >
              <BlurView 
                intensity={blurIntensity} 
                tint="light" 
                style={[styles.glassView, styles.positionHeaderContent]}
              >
                <View style={styles.positionHeaderLeft}>
                  <Text style={styles.positionIcon}>{expandedPosition === 'relief' ? '▼' : '▶'}</Text>
                  <Text style={styles.positionName}>불펜 투수</Text>
                </View>
                <View style={styles.selectedPlayerInfo}>
                  {reliefPitchers.length > 0 ? (
                    <Text style={styles.selectedPlayerName}>{reliefPitchers.length}명 선택됨</Text>
                  ) : (
                    <Text style={styles.noSelection}>선택 안됨</Text>
                  )}
                </View>
              </BlurView>
            </TouchableOpacity>
            {expandedPosition === 'relief' && (
              <View style={styles.playerListTransparent}>
                {filterPlayersByTeam(playersData.pitcher)
                  .filter(p => !startingPitcher || startingPitcher.id !== p.id)
                  .map((player, index) => {
                    const isSelected = reliefPitchers.some(rp => rp.id === player.id);
                    const isDisabled = reliefPitchers.length >= 4 && !isSelected;
                    return (
                      <TouchableOpacity
                        key={`relief-${player.id}-${index}`}
                        style={[styles.playerCardContainer, isDisabled && styles.disabledCardContainer]}
                        onPress={() => !isDisabled && handleReliefPitcherSelect(player)}
                        disabled={isDisabled}
                        activeOpacity={0.8}
                      >
                         <BlurView 
                            intensity={blurIntensity} 
                            tint="light"
                            style={[
                              styles.glassView,
                              styles.playerCardContent,
                              isSelected && styles.selectedCardBlur,
                            ]}
                          >
                        <View style={styles.checkboxContainer}>
                          <View style={[
                            styles.checkbox,
                            isSelected && styles.checkboxSelected,
                            isDisabled && styles.checkboxDisabled,
                          ]}>
                            {isSelected && <Text style={styles.checkmark}>✓</Text>}
                          </View>
                        </View>
                        <View style={styles.playerInfo}>
                          <View style={styles.playerHeader}>
                            <Text style={[styles.playerName, isDisabled && styles.disabledText]}>{player.name}</Text>
                          </View>
                          <Text style={[styles.teamName, isDisabled && styles.disabledText]}>{player.team}</Text>
                        </View>
                      </BlurView>
                      </TouchableOpacity>
                    );
                  })}
              </View>
            )}
          </View>
        )}

        {/* 나머지 포지션 섹션 */}
        {positions.map((position) => {
          const players = playersData[position] || [];
          const expanded = expandedPosition === position;
          const selectedPlayer = selectedPlayers[position];

          return (
            <View key={position} style={styles.positionSection}>
              <TouchableOpacity
                style={styles.positionHeaderContainer}
                onPress={() => togglePosition(position)}
                activeOpacity={0.8}
              >
                 <BlurView 
                  intensity={blurIntensity} 
                  tint="light" 
                  style={[styles.glassView, styles.positionHeaderContent]}
                >
                <View style={styles.positionHeaderLeft}>
                  <Text style={styles.positionIcon}>{expanded ? '▼' : '▶'}</Text>
                  <Text style={styles.positionName}>{POSITION_NAMES[position]}</Text>
                </View>

                <View style={styles.selectedPlayerInfo}>
                  {selectedPlayer ? (
                    <Text style={styles.selectedPlayerName}>{selectedPlayer.name}</Text>
                  ) : (
                    <Text style={styles.noSelection}>선택 안됨</Text>
                  )}
                </View>
                </BlurView>
              </TouchableOpacity>

              {expanded && (
                 <View style={styles.playerListTransparent}>
                  {filterPlayersByTeam(players).map((player, index) => (
                    <TouchableOpacity
                      key={`${position}-${player.id}-${index}`}
                      style={styles.playerCardContainer}
                      onPress={() => handlePlayerSelect(position, player)}
                      activeOpacity={0.8}
                    >
                       <BlurView 
                          intensity={blurIntensity} 
                          tint="light"
                          style={[
                            styles.glassView,
                            styles.playerCardContent,
                            selectedPlayer?.id === player.id && styles.selectedCardBlur,
                          ]}
                        >
                      <View style={styles.checkboxContainer}>
                        <View style={[
                          styles.checkbox,
                          selectedPlayer?.id === player.id && styles.checkboxSelected,
                        ]}>
                          {selectedPlayer?.id === player.id && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                      </View>
                      
                      <View style={styles.playerInfo}>
                        <View style={styles.playerHeader}>
                          <Text style={styles.playerName}>{player.name}</Text>
                        </View>
                        <Text style={styles.teamName}>{player.team}</Text>
                      </View>
                    </BlurView>
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
  container: { flex: 1, backgroundColor: 'transparent' },
  header: { display: 'none' },
  title: { display: 'none' },
  subtitle: { display: 'none' },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#FFFFFF' },
  errorText: { fontSize: 16, color: '#ff6b6b', textAlign: 'center', paddingHorizontal: 20 },
  retryButton: { marginTop: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryButtonText: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  scrollView: { flex: 1, width: '100%', minHeight: 0 },
  scrollContent: { flexGrow: 1, paddingBottom: 40, paddingTop: 10 },
  positionSection: { marginBottom: 2 },

  // [중요] Glassmorphism 공통 스타일 - 테두리 제거
  glassView: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    // borderColor: 'rgba(255, 255, 255, 0.2)', // [삭제] 테두리 제거
    // borderWidth: 1, // [삭제] 테두리 제거
    overflow: 'hidden',
  },

  // 헤더
  positionHeaderContainer: {
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  positionHeaderContent: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 60,
    borderRadius: 12,
  },
  positionHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 0 },
  positionIcon: { fontSize: 14, color: '#333333', marginRight: 12, width: 20 },
  positionName: { fontSize: 18, fontWeight: 'bold', color: '#000000', minWidth: 60 },
  selectedPlayerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginLeft: 16 },
  selectedPlayerName: { fontSize: 16, fontWeight: '600', color: '#000000', marginRight: 6 },
  selectedPlayerDetail: { fontSize: 14, color: '#FFFFFF', backgroundColor: '#7896AA', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  noSelection: { fontSize: 14, color: '#555555', fontStyle: 'italic' },

  // 필터
  filterContainer: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: 'transparent', borderBottomWidth: 0 },
  filterScrollContent: { paddingRight: 20 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.08)', marginRight: 8 },
  filterChipActive: { backgroundColor: 'rgba(120, 150, 170, 0.5)' },
  filterChipText: { fontSize: 13, color: '#000000', fontWeight: '600' },
  filterChipTextActive: { color: '#FFFFFF', fontWeight: '600' },

  // 리스트 컨테이너 - 배경/블러 제거 (완전 투명)
  playerListTransparent: {
    backgroundColor: 'transparent', 
    paddingVertical: 4,
  },

  // 선수 카드
  playerCardContainer: {
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  playerCardContent: {
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  // [수정] 선택된 카드 테두리 제거
  selectedCardBlur: {
    backgroundColor: 'rgba(120, 150, 170, 0.3)',
    // borderColor: '#7896AA', // [삭제] 테두리 제거
    // borderWidth: 1.5, // [삭제] 테두리 제거
  },

  checkboxContainer: { marginRight: 12 },
  // [수정] 체크박스 테두리 제거
  checkbox: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.3)' },
  // checkbox: { ..., borderWidth: 2, borderColor: '#555555', backgroundColor: 'transparent' }, // [삭제됨]
  checkboxSelected: { backgroundColor: '#7896AA' },
  // checkboxSelected: { ..., borderColor: '#7896AA' }, // [삭제됨]
  checkmark: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  playerInfo: { flex: 1 },
  playerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  playerName: { fontSize: 16, fontWeight: 'bold', color: '#000000', marginRight: 8 },
  backNumber: { fontSize: 14, color: '#333333', fontWeight: '600' },
  teamName: { fontSize: 13, color: '#444444' },
  disabledCardContainer: { opacity: 0.5 },
  checkboxDisabled: { backgroundColor: 'rgba(0, 0, 0, 0.1)' }, // [수정] 비활성 체크박스 배경색 변경
  // checkboxDisabled: { borderColor: '#999999' }, // [삭제됨]
  disabledText: { color: '#666666' },
});
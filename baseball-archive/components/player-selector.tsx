import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Player, PlayerPosition, POSITION_NAMES, getPlayersByPosition } from '../types/player';

interface PlayerSelectorProps {
  selectedPlayers: Partial<Record<PlayerPosition, Player>>;
  onPlayerSelect: (position: PlayerPosition, player: Player) => void;
}

export default function PlayerSelector({ selectedPlayers, onPlayerSelect }: PlayerSelectorProps) {
  // 어떤 포지션이 펼쳐져 있는지 저장
  const [expandedPosition, setExpandedPosition] = useState<PlayerPosition | null>(null);

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
          const players = getPlayersByPosition(position);
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
                        #{selectedPlayer.backNumber}
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
                          <Text style={styles.backNumber}>#{player.backNumber}</Text>
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

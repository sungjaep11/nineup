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

export default function PlayerSelector() {
  const [selectedPosition, setSelectedPosition] = useState<PlayerPosition>('pitcher');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

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

  const players = getPlayersByPosition(selectedPosition);

  const handlePlayerSelect = (player: Player) => {
    setSelectedPlayer(player);
  };

  const handlePositionChange = (position: PlayerPosition) => {
    setSelectedPosition(position);
    setSelectedPlayer(null); // 포지션 변경 시 선택 초기화
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>선수 선택</Text>
      </View>

      {/* 포지션 선택 탭 (2줄로 표시) */}
      <View style={styles.tabWrapper}>
        {/* 첫 번째 줄: 투수 ~ 유격수 */}
        <View style={styles.tabRow}>
          {positions.slice(0, 5).map((position) => (
            <TouchableOpacity
              key={position}
              style={[
                styles.tab,
                selectedPosition === position && styles.activeTab,
              ]}
              onPress={() => handlePositionChange(position)}>
              <Text
                style={[
                  styles.tabText,
                  selectedPosition === position && styles.activeTabText,
                ]}>
                {POSITION_NAMES[position]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* 두 번째 줄: 3루수 ~ 우익수 */}
        <View style={styles.tabRow}>
          {positions.slice(5).map((position) => (
            <TouchableOpacity
              key={position}
              style={[
                styles.tab,
                selectedPosition === position && styles.activeTab,
              ]}
              onPress={() => handlePositionChange(position)}>
              <Text
                style={[
                  styles.tabText,
                  selectedPosition === position && styles.activeTabText,
                ]}>
                {POSITION_NAMES[position]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 선수 리스트 */}
      <ScrollView style={styles.playerList}>
        {players.map((player) => (
          <TouchableOpacity
            key={player.id}
            style={[
              styles.playerCard,
              selectedPlayer?.id === player.id && styles.selectedCard,
            ]}
            onPress={() => handlePlayerSelect(player)}>
            <View style={styles.playerInfo}>
              <View style={styles.playerHeader}>
                <Text style={styles.playerName}>{player.name}</Text>
                <Text style={styles.backNumber}>#{player.backNumber}</Text>
              </View>
              <Text style={styles.teamName}>{player.team}</Text>
            </View>
            {selectedPlayer?.id === player.id && (
              <View style={styles.checkmark}>
                <Text style={styles.checkmarkText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 선택된 선수 표시 */}
      {selectedPlayer && (
        <View style={styles.selectedPlayerContainer}>
          <Text style={styles.selectedLabel}>선택된 선수:</Text>
          <Text style={styles.selectedPlayerText}>
            [{POSITION_NAMES[selectedPlayer.position]}] {selectedPlayer.name} (#{selectedPlayer.backNumber}) - {selectedPlayer.team}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  tabWrapper: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 3,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    flex: 1,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#2196F3',
  },
  tabText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  playerList: {
    flex: 1,
    padding: 20,
  },
  playerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#2196F3',
    backgroundColor: '#E3F2FD',
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginRight: 8,
  },
  backNumber: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '600',
  },
  teamName: {
    fontSize: 14,
    color: '#888888',
  },
  checkmark: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  selectedPlayerContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  selectedLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  selectedPlayerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
});

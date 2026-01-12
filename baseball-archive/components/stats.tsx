import React, { useMemo } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { G, Path, Text as SvgText } from 'react-native-svg';
import { Player, PlayerPosition } from '../types/player';

const { width } = Dimensions.get('window');

interface StatsProps {
  selectedPlayers: Partial<Record<PlayerPosition, Player>>;
  startingPitcher?: Player | null;
  reliefPitchers?: Player[];
}

interface TeamStats {
  // 타자 통계
  battingAvg: number; // 타율
  rbis: number; // 타점
  homeRuns: number; // 홈런
  runs: number; // 득점
  
  // 투수 통계
  era: number; // 평균자책점
  wins: number; // 승
  losses: number; // 패
  saves: number; // 세이브
  holds: number; // 홀드
  strikeouts: number; // 탈삼진
  
}

interface TeamAbilities {
  power: number; // 파워 (0-100)
  accuracy: number; // 정확도 (0-100)
  running: number; // 주루 (0-100)
  defense: number; // 수비 (0-100)
  pitching: number; // 투수력 (0-100)
}

export default function Stats({ selectedPlayers, startingPitcher, reliefPitchers = [] }: StatsProps) {
  // 선택된 선수 중 타자와 투수 분리
  const batters = useMemo(() => {
    const positions: PlayerPosition[] = ['catcher', 'first', 'second', 'shortstop', 'third', 'left', 'center', 'right'];
    return positions
      .map(pos => selectedPlayers[pos])
      .filter((p): p is Player => p !== undefined);
  }, [selectedPlayers]);

  const pitchers = useMemo(() => {
    const allPitchers: Player[] = [];
    if (startingPitcher) {
      allPitchers.push(startingPitcher);
    }
    allPitchers.push(...reliefPitchers);
    return allPitchers;
  }, [startingPitcher, reliefPitchers]);

  // 통계 계산
  const teamStats = useMemo((): TeamStats => {
    const stats: TeamStats = {
      battingAvg: 0,
      rbis: 0,
      homeRuns: 0,
      runs: 0,
      era: 0,
      wins: 0,
      losses: 0,
      saves: 0,
      holds: 0,
      strikeouts: 0,
    };

    if (batters.length > 0) {
      // 타자 통계 평균 계산
      const totalAvg = batters.reduce((sum, p) => sum + (p.batting_average || 0), 0);
      const totalRbis = batters.reduce((sum, p) => sum + (p.rbis || 0), 0);
      const totalHr = batters.reduce((sum, p) => sum + (p.home_runs || 0), 0);
      const totalRuns = batters.reduce((sum, p) => sum + (p.stolen_bases || 0), 0); // 백엔드에서 득점을 stolen_bases로 매핑

      stats.battingAvg = totalAvg / batters.length;
      stats.rbis = totalRbis / batters.length;
      stats.homeRuns = totalHr / batters.length;
      stats.runs = totalRuns / batters.length;
    }

    if (pitchers.length > 0) {
      // 투수 통계 평균 계산
      const totalEra = pitchers.reduce((sum, p) => sum + (p.era || 0), 0);
      const totalWins = pitchers.reduce((sum, p) => sum + (p.wins || 0), 0);
      const totalLosses = pitchers.reduce((sum, p) => sum + (p.losses || 0), 0);
      const totalSaves = pitchers.reduce((sum, p) => sum + (p.saves || 0), 0);
      const totalHolds = pitchers.reduce((sum, p) => sum + (p.holds || 0), 0);
      const totalK = pitchers.reduce((sum, p) => sum + (p.strikeouts || 0), 0);

      stats.era = totalEra / pitchers.length;
      stats.wins = totalWins / pitchers.length;
      stats.losses = totalLosses / pitchers.length;
      stats.saves = totalSaves / pitchers.length;
      stats.holds = totalHolds / pitchers.length;
      stats.strikeouts = totalK / pitchers.length;
    }

    return stats;
  }, [batters, pitchers]);

  // 팀 능력치 계산 (0-100 스케일)
  const teamAbilities = useMemo((): TeamAbilities => {
    // 파워: 홈런 기준 (0-60개를 0-100으로 변환)
    const power = Math.min(100, (teamStats.homeRuns / 60) * 100);

    // 정확도: 타율 기준 (0-0.400을 0-100으로 변환)
    const accuracy = Math.min(100, (teamStats.battingAvg / 0.400) * 100);

    // 득점력: 득점 기준 (0-100점을 0-100으로 변환)
    const scoring = Math.min(100, (teamStats.runs / 100) * 100);

    // 수비: 타율과 홈런 기반 (간단한 계산)
    const defense = (accuracy * 0.6 + power * 0.4);

    // 투수력: ERA 기준 (0-6.0을 역으로 100-0으로 변환, 낮을수록 좋음)
    const pitching = teamStats.era > 0 
      ? Math.max(0, Math.min(100, ((6.0 - teamStats.era) / 6.0) * 100))
      : 50; // ERA 데이터가 없으면 평균값

    return {
      power: Math.round(power),
      accuracy: Math.round(accuracy),
      running: Math.round(scoring),
      defense: Math.round(defense),
      pitching: Math.round(pitching),
    };
  }, [teamStats]);

  // 예상 승률 계산 (피타고라스 승률 비슷한 방식)
  const expectedWinRate = useMemo(() => {
    const abilities = teamAbilities;
    
    // 능력치 기반 승률 계산 (간단한 공식)
    // 공격력(파워, 정확도, 주루)과 수비력(수비, 투수력)의 평균
    const offense = (abilities.power + abilities.accuracy + abilities.running) / 3;
    const defense = (abilities.defense + abilities.pitching) / 2;
    const totalAbility = (offense * 0.5 + defense * 0.5) / 100;

    // 0.4 ~ 0.6 범위로 정규화 (최소 0.4, 최대 0.6)
    const winRate = 0.4 + (totalAbility * 0.2);
    return Math.max(0.3, Math.min(0.7, winRate));
  }, [teamAbilities]);

  // 팀 성향 분석
  const teamAnalysis = useMemo(() => {
    const { power, accuracy, running, defense, pitching } = teamAbilities;
    
    const traits: string[] = [];
    
    if (power >= 70) {
      traits.push('장타력이 좋은');
    }
    if (running >= 70) {
      traits.push('득점력이 좋은');
    }
    if (accuracy >= 70 && power >= 60) {
      traits.push('타격 능력이 좋은');
    }
    if (pitching >= 70) {
      traits.push('투수 자원이 좋은');
    }
    if (defense >= 70) {
      traits.push('수비 안정감이 있는');
    }
    
    if (traits.length === 0) {
      return '균형 잡힌';
    }
    
    return traits.join('·');
  }, [teamAbilities]);

  // 승률 멘트
  const winRateMessage = useMemo(() => {
    if (expectedWinRate >= 0.600) {
      return '이대로면 한국시리즈 우승 확정!';
    } else if (expectedWinRate >= 0.500) {
      return '가을야구 진출이 유력합니다.';
    } else if (expectedWinRate >= 0.400) {
      return '중위권 싸움이 치열하겠네요.';
    } else {
      return '리빌딩이 시급합니다...';
    }
  }, [expectedWinRate]);

  // 승률에 따른 배경색 계산
  const winRateBackgroundColor = useMemo(() => {
    if (expectedWinRate >= 0.600) {
      return '#E8F5E9'; // 초록색 계열 (좋음)
    } else if (expectedWinRate >= 0.500) {
      return '#E3F2FD'; // 파란색 계열 (양호)
    } else if (expectedWinRate >= 0.400) {
      return '#FFF9C4'; // 노란색 계열 (보통)
    } else {
      return '#FFEBEE'; // 빨간색 계열 (나쁨)
    }
  }, [expectedWinRate]);

  // 예상 순위 계산 (KBO는 10개 팀)
  const expectedRank = useMemo(() => {
    // 예상 승률을 기준으로 순위 계산
    // 승률이 높을수록 순위가 높음 (1위가 최고)
    // 예상 승률 0.7 -> 1위
    // 예상 승률 0.6 -> 2-3위
    // 예상 승률 0.5 -> 5-6위
    // 예상 승률 0.4 -> 8-9위
    // 예상 승률 0.3 -> 10위
    
    if (expectedWinRate >= 0.650) {
      return 1;
    } else if (expectedWinRate >= 0.600) {
      return 2;
    } else if (expectedWinRate >= 0.550) {
      return 3;
    } else if (expectedWinRate >= 0.525) {
      return 4;
    } else if (expectedWinRate >= 0.500) {
      return 5;
    } else if (expectedWinRate >= 0.475) {
      return 6;
    } else if (expectedWinRate >= 0.450) {
      return 7;
    } else if (expectedWinRate >= 0.400) {
      return 8;
    } else if (expectedWinRate >= 0.350) {
      return 9;
    } else {
      return 10;
    }
  }, [expectedWinRate]);

  // 최적 타순 계산
  const optimalLineup = useMemo(() => {
    if (batters.length === 0) return [];

    // 각 선수의 통계를 기반으로 타순별 점수 계산
    const playersWithScores = batters.map(player => {
      const avg = player.batting_average || 0;
      const hr = player.home_runs || 0;
      const rbi = player.rbis || 0;
      const runs = player.stolen_bases || 0; // 백엔드에서 득점을 stolen_bases로 매핑

      // 타순별 적합도 점수 계산
      const scores = {
        // 1번: 출루율 + 득점력 (타율 + 득점)
        leadoff: avg * 100 + runs * 2,
        // 2번: 출루율 + 약간의 득점력 (타율 중심)
        second: avg * 120 + runs * 1,
        // 3번: 가장 높은 타율
        third: avg * 150,
        // 4번: 홈런 + 타점 (거포)
        cleanup: (hr * 10) + (rbi * 5),
        // 5번: 홈런 + 타점 (4번 보완)
        fifth: (hr * 8) + (rbi * 4),
        // 6번: 타점 중심
        sixth: rbi * 6 + avg * 80,
        // 7-9번: 나머지
        bottom: avg * 60 + rbi * 2,
      };

      return { player, scores };
    });

    // 타순별로 최적 선수 선택
    const lineup: (Player | null)[] = [null, null, null, null, null, null, null, null, null];
    const used = new Set<number>();

    // 1번: 출루율 + 득점력이 높은 선수
    const leadoff = playersWithScores
      .filter(p => !used.has(p.player.id))
      .sort((a, b) => b.scores.leadoff - a.scores.leadoff)[0];
    if (leadoff) {
      lineup[0] = leadoff.player;
      used.add(leadoff.player.id);
    }

    // 2번: 출루율이 높은 선수
    const second = playersWithScores
      .filter(p => !used.has(p.player.id))
      .sort((a, b) => b.scores.second - a.scores.second)[0];
    if (second) {
      lineup[1] = second.player;
      used.add(second.player.id);
    }

    // 3번: 가장 높은 타율
    const third = playersWithScores
      .filter(p => !used.has(p.player.id))
      .sort((a, b) => b.scores.third - a.scores.third)[0];
    if (third) {
      lineup[2] = third.player;
      used.add(third.player.id);
    }

    // 4번: 홈런 + 타점이 가장 높은 선수
    const cleanup = playersWithScores
      .filter(p => !used.has(p.player.id))
      .sort((a, b) => b.scores.cleanup - a.scores.cleanup)[0];
    if (cleanup) {
      lineup[3] = cleanup.player;
      used.add(cleanup.player.id);
    }

    // 5번: 두 번째로 높은 홈런 + 타점
    const fifth = playersWithScores
      .filter(p => !used.has(p.player.id))
      .sort((a, b) => b.scores.fifth - a.scores.fifth)[0];
    if (fifth) {
      lineup[4] = fifth.player;
      used.add(fifth.player.id);
    }

    // 6번: 타점 중심
    const sixth = playersWithScores
      .filter(p => !used.has(p.player.id))
      .sort((a, b) => b.scores.sixth - a.scores.sixth)[0];
    if (sixth) {
      lineup[5] = sixth.player;
      used.add(sixth.player.id);
    }

    // 7-9번: 나머지 선수들을 타율 순으로 배치
    const remaining = playersWithScores
      .filter(p => !used.has(p.player.id))
      .sort((a, b) => b.scores.bottom - a.scores.bottom);

    remaining.forEach((p, idx) => {
      if (idx < 3 && lineup[6 + idx] === null) {
        lineup[6 + idx] = p.player;
      }
    });

    return lineup.filter((p): p is Player => p !== null);
  }, [batters]);

  // 오각형 그래프 컴포넌트
  const PentagonChart = ({ abilities, size = 200 }: { abilities: TeamAbilities; size?: number }) => {
    const center = size / 2;
    const radius = size / 2 - 30;
    const angles = [90, 18, -54, -126, -198]; // 5개 꼭짓점의 각도 (도 단위)

    // 각 능력치를 좌표로 변환
    const points = angles.map((angle, index) => {
      const value = [
        abilities.power,
        abilities.accuracy,
        abilities.running,
        abilities.defense,
        abilities.pitching
      ][index];
      const rad = (angle * Math.PI) / 180;
      const distance = (value / 100) * radius;
      const x = center + distance * Math.cos(rad);
      const y = center - distance * Math.sin(rad);
      return { x, y };
    });

    // 폴리곤 경로 생성
    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

    // 격자선 그리기
    const gridLines = [0.25, 0.5, 0.75, 1.0].map(scale => {
      const gridPoints = angles.map(angle => {
        const rad = (angle * Math.PI) / 180;
        const distance = scale * radius;
        const x = center + distance * Math.cos(rad);
        const y = center - distance * Math.sin(rad);
        return { x, y };
      });
      const gridPath = gridPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
      return gridPath;
    });

    return (
      <View style={styles.chartContainer}>
        <Svg width={size} height={size}>
          {/* 격자선 */}
          {gridLines.map((path, i) => (
            <Path key={i} d={path} fill="none" stroke="#E0E0E0" strokeWidth="1" opacity={0.5} />
          ))}
          
          {/* 능력치 영역 */}
          <Path
            d={pathData}
            fill="#7896AA"
            fillOpacity={0.4}
            stroke="#7896AA"
            strokeWidth="2"
          />
          
          {/* 축선 */}
          {angles.map((angle, index) => {
            const rad = (angle * Math.PI) / 180;
            const x = center + radius * Math.cos(rad);
            const y = center - radius * Math.sin(rad);
            const labels = ['파워', '정확도', '득점력', '수비', '투수력'];
            const labelX = center + (radius + 20) * Math.cos(rad);
            const labelY = center - (radius + 20) * Math.sin(rad);
            
            return (
              <G key={index}>
                <Path
                  d={`M ${center} ${center} L ${x} ${y}`}
                  stroke="#BDBDBD"
                  strokeWidth="1"
                  opacity={0.3}
                />
                <SvgText
                  x={labelX}
                  y={labelY + 4}
                  fontSize="12"
                  fill="#424242"
                  textAnchor="middle"
                >
                  {labels[index]}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </View>
    );
  };

  const hasData = batters.length > 0 || pitchers.length > 0;

  if (!hasData) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>선수를 선택하면 통계가 표시됩니다.</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={true}
    >
      {/* 타자 통계 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>타자 평균 기록</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>타율</Text>
            <Text style={styles.statValue}>{teamStats.battingAvg.toFixed(3)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>타점</Text>
            <Text style={styles.statValue}>{teamStats.rbis.toFixed(1)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>홈런</Text>
            <Text style={styles.statValue}>{teamStats.homeRuns.toFixed(1)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>득점</Text>
            <Text style={styles.statValue}>{teamStats.runs.toFixed(1)}</Text>
          </View>
        </View>
      </View>

      {/* 선발 투수 통계 */}
      {startingPitcher && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>선발 투수 기록</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>평균자책점</Text>
              <Text style={styles.statValue}>{(startingPitcher.era || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>승</Text>
              <Text style={styles.statValue}>{startingPitcher.wins || 0}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>패</Text>
              <Text style={styles.statValue}>{startingPitcher.losses || 0}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>탈삼진</Text>
              <Text style={styles.statValue}>{startingPitcher.strikeouts || 0}</Text>
            </View>
          </View>
        </View>
      )}

      {/* 불펜 투수 통계 */}
      {reliefPitchers.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>불펜 투수 평균 기록</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>평균자책점</Text>
              <Text style={styles.statValue}>
                {reliefPitchers.length > 0 
                  ? (reliefPitchers.reduce((sum, p) => sum + (p.era || 0), 0) / reliefPitchers.length).toFixed(2)
                  : '0.00'}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>세이브</Text>
              <Text style={styles.statValue}>
                {reliefPitchers.length > 0
                  ? (reliefPitchers.reduce((sum, p) => sum + (p.saves || 0), 0) / reliefPitchers.length).toFixed(1)
                  : '0.0'}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>홀드</Text>
              <Text style={styles.statValue}>
                {reliefPitchers.length > 0
                  ? (reliefPitchers.reduce((sum, p) => sum + (p.holds || 0), 0) / reliefPitchers.length).toFixed(1)
                  : '0.0'}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>탈삼진</Text>
              <Text style={styles.statValue}>
                {reliefPitchers.length > 0
                  ? (reliefPitchers.reduce((sum, p) => sum + (p.strikeouts || 0), 0) / reliefPitchers.length).toFixed(1)
                  : '0.0'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* 최적 타순 */}
      {batters.length > 0 && optimalLineup.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>최적의 타순</Text>
          <View style={styles.lineupContainer}>
            {optimalLineup.map((player, index) => (
              <View 
                key={player.id} 
                style={[
                  styles.lineupItem,
                  index === optimalLineup.length - 1 && styles.lineupItemLast
                ]}
              >
                <View style={styles.lineupNumber}>
                  <Text style={styles.lineupNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.lineupPlayerInfo}>
                  <Text style={styles.lineupPlayerName}>{player.name}</Text>
                  <Text style={styles.lineupPlayerStats}>
                    타율 {(player.batting_average || 0).toFixed(3)} | 
                    홈런 {player.home_runs || 0} | 
                    타점 {player.rbis || 0} | 
                    득점 {player.stolen_bases || 0}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 팀 능력치 오각형 그래프 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>팀 능력치</Text>
        <PentagonChart abilities={teamAbilities} />
        <View style={styles.teamAnalysis}>
          <Text style={styles.teamAnalysisText}>
            이 팀은 <Text style={styles.teamTrait}>{teamAnalysis}</Text> 팀입니다.
          </Text>
        </View>
      </View>

      {/* 예상 승률 */}
      {hasData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>예상 승률</Text>
          <View style={[styles.winRateContainer, { backgroundColor: winRateBackgroundColor }]}>
            <Text style={styles.winRateValue}>{(expectedWinRate * 100).toFixed(1)}%</Text>
            <Text style={styles.winRateMessage}>{winRateMessage}</Text>
          </View>
          <Text style={styles.rankText}>예상 순위: {expectedRank}위</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3D5566',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: (width - 60) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statLabel: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3D5566',
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#424242',
  },
  teamAnalysis: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
  },
  teamAnalysisText: {
    fontSize: 16,
    color: '#424242',
    textAlign: 'center',
  },
  teamTrait: {
    fontWeight: 'bold',
    color: '#1976D2',
  },
  winRateContainer: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  winRateValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#7896AA',
    marginBottom: 12,
  },
  winRateMessage: {
    fontSize: 18,
    color: '#424242',
    textAlign: 'center',
  },
  rankText: {
    fontSize: 24,
    color: '#7896AA',
    textAlign: 'center',
    marginTop: 20,
    fontWeight: 'bold',
  },
  lineupContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lineupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  lineupItemLast: {
    borderBottomWidth: 0,
  },
  lineupNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7896AA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  lineupNumberText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  lineupPlayerInfo: {
    flex: 1,
  },
  lineupPlayerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3D5566',
    marginBottom: 4,
  },
  lineupPlayerStats: {
    fontSize: 13,
    color: '#757575',
  },
});

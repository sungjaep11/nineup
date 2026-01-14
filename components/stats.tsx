import { BlurView } from 'expo-blur';
import React, { useMemo, useState, useEffect } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  Image
} from 'react-native';
import Svg, { G, Path, Text as SvgText } from 'react-native-svg';
import { Player, PlayerPosition } from '../types/player';
import { get2025Pitchers, get2025Hitters, simulateAtBat, Pitcher2025, Hitter2025, SimulationResult } from '../services/simulationService';

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
  fieldingPercentage: number; // 수비율
  totalBases: number; // 총 루타
  hits: number; // 안타
  atBats: number; // 타수
  
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
  // 시뮬레이션 관련 state
  const [selectedBatter, setSelectedBatter] = useState<Player | null>(null);
  const [selectedPitcher, setSelectedPitcher] = useState<Pitcher2025 | null>(null);
  const [pitchers2025, setPitchers2025] = useState<Pitcher2025[]>([]);
  const [hitters2025, setHitters2025] = useState<Hitter2025[]>([]);
  const [loadingPitchers, setLoadingPitchers] = useState(false);
  const [loadingHitters, setLoadingHitters] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [showBatterModal, setShowBatterModal] = useState(false);
  const [showPitcherModal, setShowPitcherModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showDetailedStats, setShowDetailedStats] = useState(false);

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

  // 2025 투수 목록 가져오기
  useEffect(() => {
    const fetchPitchers = async () => {
      try {
        setLoadingPitchers(true);
        const data = await get2025Pitchers();
        setPitchers2025(data);
      } catch (error) {
        console.error('Error fetching 2025 pitchers:', error);
      } finally {
        setLoadingPitchers(false);
      }
    };
    fetchPitchers();
  }, []);

  // 2025 타자 목록 가져오기 (선택된 타자와 매칭하기 위해)
  useEffect(() => {
    const fetchHitters = async () => {
      try {
        setLoadingHitters(true);
        const data = await get2025Hitters();
        setHitters2025(data);
      } catch (error) {
        console.error('Error fetching 2025 hitters:', error);
      } finally {
        setLoadingHitters(false);
      }
    };
    fetchHitters();
  }, []);

  // 시뮬레이션 실행
  const handleSimulate = async () => {
    if (!selectedBatter || !selectedPitcher) {
      return;
    }

    // 선택된 타자의 2025 성적 찾기
    const batter2025 = hitters2025.find(h => h.선수명 === selectedBatter.name);
    if (!batter2025) {
      alert('선택한 타자의 2025 성적 데이터를 찾을 수 없습니다.');
      return;
    }

    try {
      setSimulating(true);
      
      const batterData = {
        name: selectedBatter.name,
        AVG: parseFloat(batter2025.AVG || '0'),
        H: parseFloat(batter2025.H || '0'),
        '2B': parseFloat((batter2025 as any)['2B'] || '0'),
        '3B': parseFloat((batter2025 as any)['3B'] || '0'),
        HR: parseFloat(batter2025.HR || '0'),
        BB: parseFloat(batter2025.BB || '0'),
        SO: parseFloat(batter2025.SO || '0'),
        PA: parseFloat(batter2025.PA || '0'),
        AB: parseFloat(batter2025.AB || '0'),
      };

      const pitcherData = {
        name: selectedPitcher.선수명,
        TBF: parseFloat(selectedPitcher.TBF || '0'),
        BB: parseFloat(selectedPitcher.BB || '0'),
        SO: parseFloat(selectedPitcher.SO || '0'),
        AVG: parseFloat(selectedPitcher.AVG || '0'),
        H: parseFloat(selectedPitcher.H || '0'),
        HR: parseFloat(selectedPitcher.HR || '0'),
      };

      const result = await simulateAtBat(batterData, pitcherData);
      setSimulationResult(result);
      setShowDetailedStats(false); // 상세분석은 기본적으로 접힌 상태
      setShowResultModal(true); // 결과 모달 표시
    } catch (error) {
      console.error('Error simulating at bat:', error);
      alert('시뮬레이션 실행 중 오류가 발생했습니다.');
    } finally {
      setSimulating(false);
    }
  };

  // 통계 계산
  const teamStats = useMemo((): TeamStats => {
    const stats: TeamStats = {
      battingAvg: 0,
      rbis: 0,
      homeRuns: 0,
      runs: 0,
      fieldingPercentage: 0,
      totalBases: 0,
      hits: 0,
      atBats: 0,
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
      const totalFpct = batters.reduce((sum, p) => sum + (p.fielding_percentage || 0), 0);
      const totalTB = batters.reduce((sum, p) => sum + (p.total_bases || 0), 0);
      const totalH = batters.reduce((sum, p) => sum + (p.hits || 0), 0);
      const totalAB = batters.reduce((sum, p) => sum + (p.at_bats || 0), 0);

      stats.battingAvg = totalAvg / batters.length;
      stats.rbis = totalRbis / batters.length;
      stats.homeRuns = totalHr / batters.length;
      stats.runs = totalRuns / batters.length;
      stats.fieldingPercentage = totalFpct / batters.length;
      stats.totalBases = totalTB;
      stats.hits = totalH;
      stats.atBats = totalAB;
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
    // 파워: (TB-H)/AB 기준 (장타율의 일종, 안타를 제외한 추가 루타율)
    // (TB-H)/AB 범위: 0-0.350을 0-100으로 변환
    const tbMinusH = teamStats.totalBases - teamStats.hits;
    const power = (teamStats.atBats > 0)
      ? Math.min(100, ((tbMinusH / teamStats.atBats) / 0.350) * 100)
      : Math.min(100, (teamStats.homeRuns / 60) * 100); // 폴백: 홈런 기준

    // 정확도: 타율 기준 (0-0.400을 0-100으로 변환)
    const accuracy = Math.min(100, (teamStats.battingAvg / 0.400) * 100);

    // 득점력: 득점 기준 (0-100점을 0-100으로 변환)
    const scoring = Math.min(100, (teamStats.runs / 100) * 100);

    // 수비: 수비율 기준 (0.850-1.000을 0-100으로 변환, 완화된 범위)
    const defense = teamStats.fieldingPercentage > 0
      ? Math.max(0, Math.min(100, ((teamStats.fieldingPercentage - 0.850) / 0.150) * 100))
      : (accuracy * 0.6 + power * 0.4); // 수비율 데이터가 없으면 기존 계산 사용

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

    // 0.35 ~ 0.65 범위로 정규화 (더 완화된 범위)
    const winRate = 0.35 + (totalAbility * 0.30);
    return Math.max(0.25, Math.min(0.75, winRate));
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
    } else if (expectedWinRate >= 0.300) {
      return '하위권 탈출을 노려야 합니다.';
    } else {
      return '리빌딩이 시급합니다...';
    }
  }, [expectedWinRate]);

  // 예상 순위 계산 (KBO는 10개 팀)
  const expectedRank = useMemo(() => {
    // 예상 승률을 기준으로 순위 계산 (더 완화된 구간)
    // 승률이 높을수록 순위가 높음 (1위가 최고)
    
    if (expectedWinRate >= 0.600) {
      return 1;
    } else if (expectedWinRate >= 0.550) {
      return 2;
    } else if (expectedWinRate >= 0.500) {
      return 3;
    } else if (expectedWinRate >= 0.475) {
      return 4;
    } else if (expectedWinRate >= 0.450) {
      return 5;
    } else if (expectedWinRate >= 0.425) {
      return 6;
    } else if (expectedWinRate >= 0.400) {
      return 7;
    } else if (expectedWinRate >= 0.375) {
      return 8;
    } else if (expectedWinRate >= 0.350) {
      return 9;
    } else {
      return 10;
    }
  }, [expectedWinRate]);

  // 순위에 따른 배경색 계산
  const rankBackgroundColor = useMemo(() => {
    if (expectedRank === 1) {
      return '#FFF9C4'; // 금색/노란색 계열 (1위 - 최고)
    } else if (expectedRank >= 2 && expectedRank <= 3) {
      return '#E8F5E9'; // 초록색 계열 (2-3위 - 우수)
    } else if (expectedRank >= 4 && expectedRank <= 5) {
      return '#E3F2FD'; // 파란색 계열 (4-5위 - 양호)
    } else if (expectedRank >= 6 && expectedRank <= 7) {
      return '#FFF9C4'; // 노란색 계열 (6-7위 - 보통)
    } else if (expectedRank >= 8 && expectedRank <= 9) {
      return '#FFE0B2'; // 주황색 계열 (8-9위 - 주의)
    } else {
      return '#FFEBEE'; // 빨간색 계열 (10위 - 나쁨)
    }
  }, [expectedRank]);

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
          <BlurView intensity={80} tint="light" style={styles.statCard}>
            <Text style={styles.statLabel}>타율</Text>
            <Text style={styles.statValue}>{teamStats.battingAvg.toFixed(3)}</Text>
          </BlurView>
          <BlurView intensity={80} tint="light" style={styles.statCard}>
            <Text style={styles.statLabel}>타점</Text>
            <Text style={styles.statValue}>{teamStats.rbis.toFixed(1)}</Text>
          </BlurView>
          <BlurView intensity={80} tint="light" style={styles.statCard}>
            <Text style={styles.statLabel}>홈런</Text>
            <Text style={styles.statValue}>{teamStats.homeRuns.toFixed(1)}</Text>
          </BlurView>
          <BlurView intensity={80} tint="light" style={styles.statCard}>
            <Text style={styles.statLabel}>득점</Text>
            <Text style={styles.statValue}>{teamStats.runs.toFixed(1)}</Text>
          </BlurView>
        </View>
      </View>

      {/* 선발 투수 통계 */}
      {startingPitcher && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>선발 투수 기록</Text>
          <View style={styles.statsGrid}>
            <BlurView intensity={80} tint="light" style={styles.statCard}>
              <Text style={styles.statLabel}>평균자책점</Text>
              <Text style={styles.statValue}>{(startingPitcher.era || 0).toFixed(2)}</Text>
            </BlurView>
            <BlurView intensity={80} tint="light" style={styles.statCard}>
              <Text style={styles.statLabel}>승</Text>
              <Text style={styles.statValue}>{startingPitcher.wins || 0}</Text>
            </BlurView>
            <BlurView intensity={80} tint="light" style={styles.statCard}>
              <Text style={styles.statLabel}>패</Text>
              <Text style={styles.statValue}>{startingPitcher.losses || 0}</Text>
            </BlurView>
            <BlurView intensity={80} tint="light" style={styles.statCard}>
              <Text style={styles.statLabel}>탈삼진</Text>
              <Text style={styles.statValue}>{startingPitcher.strikeouts || 0}</Text>
            </BlurView>
          </View>
        </View>
      )}

      {/* 불펜 투수 통계 */}
      {reliefPitchers.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>불펜 투수 평균 기록</Text>
          <View style={styles.statsGrid}>
            <BlurView intensity={80} tint="light" style={styles.statCard}>
              <Text style={styles.statLabel}>평균자책점</Text>
              <Text style={styles.statValue}>
                {reliefPitchers.length > 0 
                  ? (reliefPitchers.reduce((sum, p) => sum + (p.era || 0), 0) / reliefPitchers.length).toFixed(2)
                  : '0.00'}
              </Text>
            </BlurView>
            <BlurView intensity={80} tint="light" style={styles.statCard}>
              <Text style={styles.statLabel}>세이브</Text>
              <Text style={styles.statValue}>
                {reliefPitchers.length > 0
                  ? (reliefPitchers.reduce((sum, p) => sum + (p.saves || 0), 0) / reliefPitchers.length).toFixed(1)
                  : '0.0'}
              </Text>
            </BlurView>
            <BlurView intensity={80} tint="light" style={styles.statCard}>
              <Text style={styles.statLabel}>홀드</Text>
              <Text style={styles.statValue}>
                {reliefPitchers.length > 0
                  ? (reliefPitchers.reduce((sum, p) => sum + (p.holds || 0), 0) / reliefPitchers.length).toFixed(1)
                  : '0.0'}
              </Text>
            </BlurView>
            <BlurView intensity={80} tint="light" style={styles.statCard}>
              <Text style={styles.statLabel}>탈삼진</Text>
              <Text style={styles.statValue}>
                {reliefPitchers.length > 0
                  ? (reliefPitchers.reduce((sum, p) => sum + (p.strikeouts || 0), 0) / reliefPitchers.length).toFixed(1)
                  : '0.0'}
              </Text>
            </BlurView>
          </View>
        </View>
      )}

      {/* 최적 타순 */}
      {batters.length > 0 && optimalLineup.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>최적의 타순</Text>
          <BlurView intensity={80} tint="light" style={styles.lineupContainer}>
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
          </BlurView>
        </View>
      )}

      {/* 팀 능력치 오각형 그래프 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>팀 능력치</Text>
        <PentagonChart abilities={teamAbilities} />
        <BlurView intensity={80} tint="light" style={styles.teamAnalysis}>
          <Text style={styles.teamAnalysisText}>
            이 팀은 <Text style={styles.teamTrait}>{teamAnalysis}</Text> 팀입니다.
          </Text>
        </BlurView>
      </View>

      {/* 예상 승률 */}
      {hasData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>예상 성적</Text>
          <View style={styles.predictionRow}>
            <BlurView intensity={80} tint="light" style={[styles.predictionCard, { backgroundColor: rankBackgroundColor }]}>
              <Text style={styles.predictionLabel}>예상 승률</Text>
              <Text style={styles.predictionValue}>{(expectedWinRate * 100).toFixed(1)}%</Text>
            </BlurView>
            <BlurView intensity={80} tint="light" style={[styles.predictionCard, { backgroundColor: rankBackgroundColor }]}>
              <Text style={styles.predictionLabel}>예상 순위</Text>
              <Text style={styles.predictionValue}>{expectedRank}위</Text>
            </BlurView>
          </View>
          <BlurView intensity={80} tint="light" style={[styles.predictionMessageCard, { backgroundColor: rankBackgroundColor }]}>
            <Text style={styles.predictionMessage}>{winRateMessage}</Text>
          </BlurView>
        </View>
      )}

      {/* 타자 vs 투수 시뮬레이션 */}
      {batters.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚾ 타자 vs 투수 시뮬레이션</Text>
          
          {/* 타자 선택 */}
          <BlurView intensity={80} tint="light" style={styles.simulationCard}>
            <Text style={styles.simulationLabel}>타자 선택</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowBatterModal(true)}
            >
              <Text style={styles.selectButtonText}>
                {selectedBatter ? selectedBatter.name : '타자 선택'}
              </Text>
            </TouchableOpacity>
          </BlurView>

          {/* 투수 선택 */}
          <BlurView intensity={80} tint="light" style={styles.simulationCard}>
            <Text style={styles.simulationLabel}>투수 선택</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowPitcherModal(true)}
              disabled={loadingPitchers}
            >
              {loadingPitchers ? (
                <ActivityIndicator size="small" color="#7896AA" />
              ) : (
                <Text style={styles.selectButtonText}>
                  {selectedPitcher ? selectedPitcher.선수명 : '투수 선택'}
                </Text>
              )}
            </TouchableOpacity>
          </BlurView>

          {/* 타자 vs 투수 시각화 */}
          {selectedBatter && selectedPitcher && (
            <BlurView intensity={80} tint="light" style={styles.vsContainer}>
              <View style={styles.playerVsCard}>
                <View style={styles.playerInfo}>
                  <Image 
                    source={require('../assets/images/player.png')} 
                    style={styles.playerImage}
                  />
                  <Text style={styles.playerName}>{selectedBatter.name}</Text>
                  <Text style={styles.playerLabel}>타자</Text>
                </View>
                <Text style={styles.vsText}>VS</Text>
                <View style={styles.playerInfo}>
                  <Image 
                    source={require('../assets/images/player.png')} 
                    style={styles.playerImage}
                  />
                  <Text style={styles.playerName}>{selectedPitcher.선수명}</Text>
                  <Text style={styles.playerLabel}>투수</Text>
                </View>
              </View>
            </BlurView>
          )}

          {/* 시뮬레이션 실행 버튼 */}
          <TouchableOpacity
            style={[
              styles.simulateButton,
              (!selectedBatter || !selectedPitcher || simulating) && styles.simulateButtonDisabled
            ]}
            onPress={handleSimulate}
            disabled={!selectedBatter || !selectedPitcher || simulating}
          >
            {simulating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.simulateButtonText}>시뮬레이션 실행</Text>
            )}
          </TouchableOpacity>

        </View>
      )}

      {/* 타자 선택 모달 */}
      <Modal
        visible={showBatterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBatterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={100} tint="light" style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>타자 선택</Text>
              <TouchableOpacity onPress={() => setShowBatterModal(false)}>
                <Text style={styles.modalClose}>닫기</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={batters.filter(batter => {
                // 2025 성적 데이터가 있는 타자만 표시
                return hitters2025.some(h => h.선수명 === batter.name);
              })}
              keyExtractor={(item) => item.id.toString()}
              ListEmptyComponent={
                <View style={styles.modalLoading}>
                  <Text style={styles.modalLoadingText}>
                    {loadingHitters ? '타자 데이터를 불러오는 중...' : '2025 성적 데이터가 있는 타자가 없습니다.'}
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const hitter2025 = hitters2025.find(h => h.선수명 === item.name);
                return (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      selectedBatter?.id === item.id && styles.modalItemSelected
                    ]}
                    onPress={() => {
                      setSelectedBatter(item);
                      setShowBatterModal(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{item.name}</Text>
                    <Text style={styles.modalItemSubtext}>
                      {item.team} | 타율: {hitter2025?.AVG || 'N/A'}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </BlurView>
        </View>
      </Modal>

      {/* 투수 선택 모달 */}
      <Modal
        visible={showPitcherModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPitcherModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={100} tint="light" style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>투수 선택</Text>
              <TouchableOpacity onPress={() => setShowPitcherModal(false)}>
                <Text style={styles.modalClose}>닫기</Text>
              </TouchableOpacity>
            </View>
            {loadingPitchers ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color="#7896AA" />
                <Text style={styles.modalLoadingText}>투수 목록을 불러오는 중...</Text>
              </View>
            ) : (
              <FlatList
                data={pitchers2025}
                keyExtractor={(item) => item.player_id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      selectedPitcher?.player_id === item.player_id && styles.modalItemSelected
                    ]}
                    onPress={() => {
                      setSelectedPitcher(item);
                      setShowPitcherModal(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{item.선수명}</Text>
                    <Text style={styles.modalItemSubtext}>
                      ERA: {item.ERA || 'N/A'} | SO: {item.SO || 'N/A'}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </BlurView>
        </View>
      </Modal>

      {/* 시뮬레이션 결과 모달 */}
      <Modal
        visible={showResultModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowResultModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={100} tint="light" style={styles.resultModalContent}>
            <View style={styles.resultModalHeader}>
              <Text style={styles.resultModalTitle}>시뮬레이션 결과</Text>
              <TouchableOpacity onPress={() => setShowResultModal(false)}>
                <Text style={styles.modalClose}>닫기</Text>
              </TouchableOpacity>
            </View>
            
            {simulationResult && (
              <ScrollView style={styles.resultModalBody} showsVerticalScrollIndicator={false}>
                {/* 대표 결과 */}
                <View style={styles.resultModalMain}>
                  <View style={styles.resultBadge}>
                    <Text style={styles.resultType}>{simulationResult.result}</Text>
                  </View>
                  <Text style={styles.resultText}>{simulationResult.text}</Text>
                  <Text style={styles.resultBases}>진루: {simulationResult.bases}루</Text>
                </View>
                
                {/* 상세분석 토글 버튼 */}
                {simulationResult.statistics && (
                  <TouchableOpacity
                    style={styles.detailToggleButton}
                    onPress={() => setShowDetailedStats(!showDetailedStats)}
                  >
                    <Text style={styles.detailToggleText}>
                      {showDetailedStats ? '▼' : '▶'} 상세분석
                    </Text>
                  </TouchableOpacity>
                )}
                
                {/* 통계 정보 (토글에 따라 표시/숨김) */}
                {simulationResult.statistics && showDetailedStats && (
                  <View style={styles.statisticsContainer}>
                    <Text style={styles.statisticsTitle}>
                      몬테카를로 시뮬레이션 ({simulationResult.statistics.total_simulations}회)
                    </Text>
                    
                    {/* 주요 통계 */}
                    <View style={styles.statisticsRow}>
                      <View style={styles.statisticsItem}>
                        <Text style={styles.statisticsLabel}>안타율</Text>
                        <Text style={styles.statisticsValue}>
                          {(simulationResult.statistics.hit_rate * 100).toFixed(1)}%
                        </Text>
                      </View>
                      <View style={styles.statisticsItem}>
                        <Text style={styles.statisticsLabel}>출루율</Text>
                        <Text style={styles.statisticsValue}>
                          {(simulationResult.statistics.on_base_rate * 100).toFixed(1)}%
                        </Text>
                      </View>
                      <View style={styles.statisticsItem}>
                        <Text style={styles.statisticsLabel}>평균 진루</Text>
                        <Text style={styles.statisticsValue}>
                          {simulationResult.statistics.average_bases.toFixed(2)}루
                        </Text>
                      </View>
                    </View>
                    
                    {/* 결과 분포 */}
                    <View style={styles.distributionContainer}>
                      <Text style={styles.distributionTitle}>결과 분포</Text>
                      {Object.entries(simulationResult.statistics.distribution).map(([key, value]) => (
                        <View key={key} style={styles.distributionRow}>
                          <Text style={styles.distributionLabel}>{key}</Text>
                          <View style={styles.distributionBarContainer}>
                            <View 
                              style={[
                                styles.distributionBar, 
                                { width: `${value * 100}%` }
                              ]} 
                            />
                          </View>
                          <Text style={styles.distributionValue}>
                            {(value * 100).toFixed(1)}%
                          </Text>
                          <Text style={styles.distributionCount}>
                            ({simulationResult.statistics.counts[key as keyof typeof simulationResult.statistics.counts]}회)
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </ScrollView>
            )}
          </BlurView>
        </View>
      </Modal>
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
    marginBottom: 24,
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
    width: '100%',
  },
  statCard: {
    width: (width - 56) / 2, // 20 (section padding) * 2 + 16 (gap between cards)
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    overflow: 'hidden',
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
    backgroundColor: 'rgba(240, 244, 247, 0.5)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    overflow: 'hidden',
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
  predictionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  predictionCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  predictionLabel: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 12,
    fontWeight: '600',
  },
  predictionValue: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#7896AA',
    textAlign: 'center',
  },
  predictionMessageCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    overflow: 'hidden',
  },
  predictionMessageLabel: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 12,
    fontWeight: '600',
  },
  predictionMessage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#424242',
    textAlign: 'center',
    lineHeight: 22,
  },
  lineupContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    padding: 12,
    overflow: 'hidden',
  },
  lineupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
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
  // 시뮬레이션 스타일
  simulationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  simulationLabel: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 8,
    fontWeight: '600',
  },
  selectButton: {
    backgroundColor: 'rgba(120, 150, 170, 0.3)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  selectButtonText: {
    fontSize: 16,
    color: '#3D5566',
    fontWeight: '600',
  },
  simulateButton: {
    backgroundColor: '#7896AA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  simulateButtonDisabled: {
    backgroundColor: '#BDBDBD',
    opacity: 0.6,
  },
  simulateButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  resultCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    alignItems: 'center',
    overflow: 'hidden',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3D5566',
    marginBottom: 12,
  },
  resultBadge: {
    backgroundColor: '#7896AA',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 12,
  },
  resultType: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  resultText: {
    fontSize: 16,
    color: '#424242',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  resultBases: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  // 통계 정보 스타일
  statisticsContainer: {
    marginTop: 20,
    width: '100%',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(120, 150, 170, 0.3)',
  },
  statisticsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3D5566',
    marginBottom: 16,
    textAlign: 'center',
  },
  statisticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statisticsItem: {
    alignItems: 'center',
    flex: 1,
  },
  statisticsLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
  },
  statisticsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3D5566',
  },
  distributionContainer: {
    marginTop: 12,
  },
  distributionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3D5566',
    marginBottom: 12,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  distributionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3D5566',
    width: 30,
  },
  distributionBarContainer: {
    flex: 1,
    height: 20,
    backgroundColor: 'rgba(120, 150, 170, 0.2)',
    borderRadius: 10,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  distributionBar: {
    height: '100%',
    backgroundColor: '#7896AA',
    borderRadius: 10,
  },
  distributionValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3D5566',
    width: 45,
    textAlign: 'right',
  },
  distributionCount: {
    fontSize: 11,
    color: '#757575',
    width: 50,
    textAlign: 'right',
  },
  // 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3D5566',
  },
  modalClose: {
    fontSize: 16,
    color: '#7896AA',
    fontWeight: '600',
  },
  modalLoading: {
    padding: 40,
    alignItems: 'center',
  },
  modalLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#757575',
  },
  modalItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  modalItemSelected: {
    backgroundColor: 'rgba(120, 150, 170, 0.2)',
  },
  modalItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3D5566',
    marginBottom: 4,
  },
  modalItemSubtext: {
    fontSize: 14,
    color: '#757575',
  },
  // 타자 vs 투수 시각화 스타일
  vsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    overflow: 'hidden',
  },
  playerVsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  playerInfo: {
    alignItems: 'center',
    flex: 1,
  },
  playerImage: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
    marginBottom: 8,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3D5566',
    marginBottom: 4,
  },
  playerLabel: {
    fontSize: 12,
    color: '#757575',
  },
  vsText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#7896AA',
    marginHorizontal: 20,
  },
  // 시뮬레이션 결과 모달 스타일
  resultModalContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    margin: 20,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  resultModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  resultModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#3D5566',
  },
  resultModalBody: {
    padding: 20,
  },
  resultModalMain: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(120, 150, 170, 0.3)',
  },
  detailToggleButton: {
    backgroundColor: 'rgba(120, 150, 170, 0.2)',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  detailToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3D5566',
  },
});

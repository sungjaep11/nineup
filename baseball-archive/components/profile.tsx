import { BlurView } from 'expo-blur';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import Svg, { G, Path, Text as SvgText, Rect, Line, Circle } from 'react-native-svg';
import { API_URL, API_ENDPOINTS, API_HEADERS } from '../config/api';
import { Player } from '../types/player';
import { getTeamColors, addOpacity } from '../constants/teamColors';

const { width } = Dimensions.get('window');

interface ProfileProps {
  player: Player | null;
  visible: boolean;
  onClose: () => void;
}

// 팀 이름을 로고 파일명으로 매핑
const getTeamLogo = (teamName: string): any => {
  if (!teamName) return null;
  
  const teamLogoMap: Record<string, any> = {
    'KIA 타이거즈': require('../assets/images/logos/tigers.png'),
    'KT 위즈': require('../assets/images/logos/wiz.png'),
    '삼성 라이온즈': require('../assets/images/logos/lions.png'),
    'LG 트윈스': require('../assets/images/logos/twins.png'),
    '두산 베어스': require('../assets/images/logos/bears.png'),
    '롯데 자이언츠': require('../assets/images/logos/giants.png'),
    'NC 다이노스': require('../assets/images/logos/dinos.png'),
    '한화 이글스': require('../assets/images/logos/eagles.png'),
    '키움 히어로즈': require('../assets/images/logos/heroes.png'),
    'SSG 랜더스': require('../assets/images/logos/landers.png'),
    // 추가 변형 형태들
    'KIA': require('../assets/images/logos/tigers.png'),
    'KT': require('../assets/images/logos/wiz.png'),
    '삼성': require('../assets/images/logos/lions.png'),
    'LG': require('../assets/images/logos/twins.png'),
    '두산': require('../assets/images/logos/bears.png'),
    '롯데': require('../assets/images/logos/giants.png'),
    'NC': require('../assets/images/logos/dinos.png'),
    '한화': require('../assets/images/logos/eagles.png'),
    '키움': require('../assets/images/logos/heroes.png'),
    'SSG': require('../assets/images/logos/landers.png'),
  };
  
  // 정확한 매칭 시도
  if (teamLogoMap[teamName]) {
    return teamLogoMap[teamName];
  }
  
  // 부분 매칭 시도 (팀명에 포함된 경우)
  for (const [key, logo] of Object.entries(teamLogoMap)) {
    if (teamName.includes(key) || key.includes(teamName)) {
      return logo;
    }
  }
  
  console.log('팀 로고를 찾을 수 없음:', teamName);
  return null;
};

interface PlayerAbilities {
  stat1: number; // 타자: 파워, 투수: 제구 (0-100)
  stat2: number; // 타자: 정확도, 투수: 탈삼진 능력 (0-100)
  stat3: number; // 타자: 득점력, 투수: 피안타 억제력 (0-100)
  stat4: number; // 타자: 수비, 투수: 위기관리 (0-100)
  stat5: number; // 체력 (0-100)
  isPitcher: boolean; // 투수 여부
}

interface RecentGameData {
  일자: string;
  상대: string;
  H: string;
  AB: string;
  AVG: string;
}

export default function Profile({ player, visible, onClose }: ProfileProps) {
  // 프로필 이미지 URL 상태
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  
  // 최근 경기 데이터 상태
  const [recentGames, setRecentGames] = useState<RecentGameData[]>([]);
  const [gamesLoading, setGamesLoading] = useState(false);

  // 프로필 이미지 가져오기
  useEffect(() => {
    if (!player || !visible) {
      setProfileImageUrl(null);
      return;
    }

    const fetchProfileImage = async () => {
      try {
        setImageLoading(true);
        const namesParam = `names=${encodeURIComponent(player.name)}`;
        const url = `${API_URL}/api/player-images/?${namesParam}`;
        
        const response = await fetch(url);
        if (!response.ok) {
          console.log('프로필 이미지 API 응답 오류:', response.status);
          return;
        }
        
        const data = await response.json();
        // profile 타입의 이미지 찾기
        const profileImage = data.find((img: any) => img.imageType === 'profile');
        if (profileImage && profileImage.imageUrl) {
          setProfileImageUrl(profileImage.imageUrl);
        } else {
          setProfileImageUrl(null);
        }
      } catch (error) {
        console.error('프로필 이미지 로드 실패:', error);
        setProfileImageUrl(null);
      } finally {
        setImageLoading(false);
      }
    };

    fetchProfileImage();
  }, [player, visible]);

  // 최근 경기 데이터 가져오기 (타자만)
  useEffect(() => {
    if (!player || !visible || player.batting_average === undefined) {
      setRecentGames([]);
      return;
    }

    const fetchRecentGames = async () => {
      try {
        setGamesLoading(true);
        const url = API_ENDPOINTS.hitterRecentGames(player.name);
        const response = await fetch(url, {
          method: 'GET',
          headers: API_HEADERS,
        });

        if (!response.ok) {
          console.log('최근 경기 데이터 API 응답 오류:', response.status);
          return;
        }

        const data = await response.json();
        setRecentGames(data);
      } catch (error) {
        console.error('최근 경기 데이터 로드 실패:', error);
        setRecentGames([]);
      } finally {
        setGamesLoading(false);
      }
    };

    fetchRecentGames();
  }, [player, visible]);

  // 선수 능력치 계산
  const playerAbilities = useMemo((): PlayerAbilities => {
    if (!player) {
      return { stat1: 0, stat2: 0, stat3: 0, stat4: 0, stat5: 0, isPitcher: false };
    }

    // 타자 통계 기반 능력치 계산
    if (player.batting_average !== undefined || player.home_runs !== undefined || player.rbis !== undefined) {
      // 파워: (TB-H)/AB 기준 (장타율의 일종, 안타를 제외한 추가 루타율)
      // (TB-H)/AB 범위: 0-0.350을 0-100으로 변환 (실제 최대값 약 0.330)
      const tbMinusH = (player.total_bases || 0) - (player.hits || 0);
      const power = (player.at_bats && player.at_bats > 0)
        ? Math.min(100, ((tbMinusH / player.at_bats) / 0.350) * 100)
        : Math.min(100, ((player.home_runs || 0) / 50) * 100); // 폴백: 홈런 기준

      // 정확도: 타율 기준 (0-0.400을 0-100으로 변환)
      const accuracy = Math.min(100, ((player.batting_average || 0) / 0.400) * 100);

      // 득점력: 득점 기준 (0-100점을 0-100으로 변환)
      const scoring = Math.min(100, ((player.stolen_bases || 0) / 100) * 100);

      // 수비: 수비율 기준 (0.850-1.000을 0-100으로 변환, 완화된 범위)
      // 수비율이 있으면 사용, 없으면 타율과 홈런 기반 계산
      let defense: number;
      if (player.fielding_percentage !== undefined && player.fielding_percentage !== null && player.fielding_percentage > 0) {
        // 수비율을 0-100 스케일로 변환 (0.850-1.000 범위)
        // 0.850 이하는 0점, 1.000은 100점
        // 박해민 0.997 → (0.997 - 0.850) / 0.150 * 100 = 98점
        defense = Math.max(0, Math.min(100, ((player.fielding_percentage - 0.850) / 0.150) * 100));
      } else {
        // 수비율 데이터가 없으면 기존 계산 사용
        defense = (accuracy * 0.6 + power * 0.4);
      }

      // 체력: 타수(AB) 기반 (0-600을 0-100으로 변환)
      const stamina = Math.min(100, ((player.at_bats || 0) / 600) * 100);

      return {
        stat1: Math.round(power),
        stat2: Math.round(accuracy),
        stat3: Math.round(scoring),
        stat4: Math.round(defense),
        stat5: Math.round(stamina),
        isPitcher: false,
      };
    }

    // 투수 통계 기반 능력치 계산
    if (player.era !== undefined) {
      // 제구: BB*9/IP 기준 (볼넷/9이닝, 낮을수록 좋음)
      // BB*9/IP 범위: 0-12를 역으로 100-0으로 변환 (더 완화된 기준)
      // 최고 수준 투수(1.0 이하)는 거의 만점에 가까운 점수
      const bbPer9 = (player.innings_pitched && player.innings_pitched > 0 && player.walks !== undefined)
        ? (player.walks * 9) / player.innings_pitched
        : 3.0; // 기본값 (평균 수준)
      // 더 완만한 곡선: 제곱근을 사용하여 최고 구간을 더 넓게
      const normalized = Math.max(0, Math.min(1, (12.0 - bbPer9) / 12.0));
      const control = Math.max(0, Math.min(100, Math.pow(normalized, 0.7) * 100));

      // 탈삼진 능력: 탈삼진 기준 (0-200개를 0-100으로 변환)
      const strikeoutAbility = Math.min(100, ((player.strikeouts || 0) / 200) * 100);

      // 피안타 억제력: ERA와 탈삼진 기반 (ERA가 낮고 탈삼진이 높을수록 좋음)
      const hitSuppression = (control * 0.6 + strikeoutAbility * 0.4);

      // 위기관리: WHIP + ERA를 역정규화 (낮을수록 좋음)
      const inverseNormalize = (value: number, min: number, max: number): number => {
        if (value <= min) return 100;
        if (value >= max) return 0;
        return ((max - value) / (max - min)) * 100;
      };
      
      const whipEraSum = (player.whip || 0) + (player.era || 0);
      // WHIP + ERA 범위: 최소 0.5 (최고), 최대 10 (최악)
      const clutch = inverseNormalize(whipEraSum, 0.5, 10);

      // 체력: 이닝 수(IP) 기반 (0-150 이닝을 0-100으로 변환)
      const stamina = Math.min(100, ((player.innings_pitched || 0) / 150) * 100);

      return {
        stat1: Math.round(control),
        stat2: Math.round(strikeoutAbility),
        stat3: Math.round(hitSuppression),
        stat4: Math.round(clutch),
        stat5: Math.round(stamina),
        isPitcher: true,
      };
    }

    // 통계가 없으면 기본값
    return { stat1: 50, stat2: 50, stat3: 50, stat4: 50, stat5: 50, isPitcher: false };
  }, [player]);

  // 오각형 그래프 컴포넌트
  const PentagonChart = ({ abilities, size = 200 }: { abilities: PlayerAbilities; size?: number }) => {
    const padding = 50; // 라벨을 위한 여유 공간
    const svgSize = size + padding * 2;
    const center = svgSize / 2;
    const radius = size / 2 - 30;
    const angles = [90, 18, -54, -126, -198]; // 5개 꼭짓점의 각도 (도 단위)

    // 각 능력치를 좌표로 변환
    const points = angles.map((angle, index) => {
      const value = [
        abilities.stat1,
        abilities.stat2,
        abilities.stat3,
        abilities.stat4,
        abilities.stat5
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

    // 타자/투수에 따라 다른 라벨 사용
    const labels = abilities.isPitcher
      ? ['제구', '탈삼진 능력', '피안타 억제력', '위기관리', '체력']
      : ['파워', '정확도', '득점력', '수비', '체력'];

    return (
      <View style={styles.chartContainer}>
        <Svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
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
            const labelX = center + (radius + 30) * Math.cos(rad);
            const labelY = center - (radius + 30) * Math.sin(rad);
            
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
                  fontSize="14"
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

  // 최근 성적 변화 추이 그래프 컴포넌트
  const RecentPerformanceChart = () => {
    const [visibleBars, setVisibleBars] = useState(0);
    const [visibleLines, setVisibleLines] = useState(0);
    const [barHeights, setBarHeights] = useState<number[]>([]);

    if (gamesLoading) {
      return (
        <View style={styles.chartLoadingContainer}>
          <ActivityIndicator size="small" color="#7896AA" />
        </View>
      );
    }

    if (recentGames.length === 0) {
      return null;
    }

    const chartWidth = width * 0.8;
    const chartHeight = 200;
    const padding = 40;
    const chartInnerWidth = chartWidth - padding * 2;
    const chartInnerHeight = chartHeight - padding * 2;

    // 데이터 처리
    const processedData = recentGames.map(game => {
      const h = parseInt(game.H || '0', 10);
      const ab = parseInt(game.AB || '0', 10);
      const avg = ab > 0 ? h / ab : 0;
      return {
        date: game.일자,
        hits: h,
        avg: avg,
      };
    });

    // 최대값 계산 (Y축 스케일링용)
    const maxHits = Math.max(...processedData.map(d => d.hits), 1);
    const maxAvg = Math.max(...processedData.map(d => d.avg), 0.1);

    // 애니메이션 효과: 순차적으로 표시
    useEffect(() => {
      setVisibleBars(0);
      setVisibleLines(0);
      setBarHeights(new Array(processedData.length).fill(0));
      
      // 막대 그래프 순차 표시 및 높이 증가 애니메이션
      processedData.forEach((data, index) => {
        const fullHeight = (data.hits / maxHits) * chartInnerHeight;
        const delay = index * 150;
        
        setTimeout(() => {
          setVisibleBars(prev => prev + 1);
          
          // 막대 높이를 점진적으로 증가
          const steps = 20;
          const stepHeight = fullHeight / steps;
          let currentStep = 0;
          
          const heightInterval = setInterval(() => {
            currentStep++;
            setBarHeights(prev => {
              const newHeights = [...prev];
              newHeights[index] = stepHeight * currentStep;
              return newHeights;
            });
            
            if (currentStep >= steps) {
              clearInterval(heightInterval);
            }
          }, 20); // 20ms마다 증가 (총 400ms)
        }, delay);
      });
      
      // 꺾은선 그래프 순차 표시 (날짜 순서대로)
      const lineInterval = setInterval(() => {
        setVisibleLines(prev => {
          if (prev < processedData.length) {
            return prev + 1;
          }
          clearInterval(lineInterval);
          return prev;
        });
      }, 200);
      
      return () => {
        // cleanup은 각 setTimeout과 setInterval이 자체적으로 처리
      };
    }, [processedData.length, maxHits, chartInnerHeight]);

    // 타율 증가 여부 판단 (최근 3경기 평균 vs 이전 3경기 평균)
    let isAvgIncreasing = false;
    if (processedData.length >= 6) {
      const recent3 = processedData.slice(-3);
      const previous3 = processedData.slice(-6, -3);
      const recentAvg = recent3.reduce((sum, d) => sum + d.avg, 0) / 3;
      const previousAvg = previous3.reduce((sum, d) => sum + d.avg, 0) / 3;
      isAvgIncreasing = recentAvg > previousAvg;
    } else if (processedData.length >= 2) {
      const recent2 = processedData.slice(-2);
      const previous2 = processedData.slice(-4, -2);
      if (previous2.length > 0) {
        const recentAvg = recent2.reduce((sum, d) => sum + d.avg, 0) / recent2.length;
        const previousAvg = previous2.reduce((sum, d) => sum + d.avg, 0) / previous2.length;
        isAvgIncreasing = recentAvg > previousAvg;
      }
    }

    // 구단 색상 가져오기
    const teamColors = getTeamColors(player?.team);
    const barColor = addOpacity(teamColors.primary, 0.6);
    const lineColor = teamColors.secondary;

    // 좌표 계산 함수
    const getX = (index: number) => padding + (index / (processedData.length - 1 || 1)) * chartInnerWidth;
    const getYForHits = (hits: number) => padding + chartInnerHeight - (hits / maxHits) * chartInnerHeight;
    const getYForAvg = (avg: number) => padding + chartInnerHeight - (avg / maxAvg) * chartInnerHeight;

    return (
      <View style={styles.recentChartContainer}>
        <Text style={styles.recentChartTitle}>최근 성적 변화 추이</Text>
        <View style={styles.chartWrapper}>
          <Svg width={chartWidth} height={chartHeight}>
            {/* 범례 (오른쪽 상단, 가로 배치) */}
            <G>
              {/* 막대 그래프 범례 */}
              <Rect
                x={chartWidth - 155}
                y={8}
                width={12}
                height={12}
                fill={barColor}
                rx={2}
              />
              <SvgText
                x={chartWidth - 140}
                y={18}
                fontSize="9"
                fill="#666666"
              >
                안타 수(H)
              </SvgText>
              
              {/* 꺾은선 그래프 범례 */}
              <Line
                x1={chartWidth - 85}
                y1={14}
                x2={chartWidth - 73}
                y2={14}
                stroke={lineColor}
                strokeWidth="2"
                strokeLinecap="round"
              />
              <Circle
                cx={chartWidth - 79}
                cy={14}
                r={3}
                fill={lineColor}
              />
              <SvgText
                x={chartWidth - 70}
                y={18}
                fontSize="9"
                fill="#666666"
              >
                일별 타율(H/AB)
              </SvgText>
            </G>
            {/* Y축 그리드선 (안타 수 기준) */}
            {[0, 0.25, 0.5, 0.75, 1.0].map(scale => {
              const y = padding + chartInnerHeight - scale * chartInnerHeight;
              return (
                <Line
                  key={`grid-${scale}`}
                  x1={padding}
                  y1={y}
                  x2={padding + chartInnerWidth}
                  y2={y}
                  stroke="#E0E0E0"
                  strokeWidth="1"
                  opacity={0.3}
                />
              );
            })}

            {/* 막대 그래프 (안타 수) - 아래에서 위로 증가 애니메이션 */}
            {processedData.map((data, index) => {
              if (index >= visibleBars) return null;
              
              const x = getX(index);
              const barWidth = chartInnerWidth / processedData.length * 0.6;
              const barX = x - barWidth / 2;
              const fullBarHeight = (data.hits / maxHits) * chartInnerHeight;
              const currentBarHeight = barHeights[index] || 0;
              const barY = padding + chartInnerHeight - currentBarHeight;
              
              return (
                <Rect
                  key={`bar-${index}`}
                  x={barX}
                  y={barY}
                  width={barWidth}
                  height={currentBarHeight}
                  fill={barColor}
                  rx={4}
                />
              );
            })}

            {/* 꺾은선 그래프 (타율) - 날짜 순서대로 순차 표시 */}
            {processedData.length > 1 && processedData.map((data, index) => {
              if (index === 0 || index > visibleLines) return null;
              
              const x1 = getX(index - 1);
              const y1 = getYForAvg(processedData[index - 1].avg);
              const x2 = getX(index);
              const y2 = getYForAvg(data.avg);
              
              return (
                <Line
                  key={`line-${index}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={lineColor}
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              );
            })}

            {/* 타율 점 - 순차적으로 나타남 */}
            {processedData.map((data, index) => {
              if (index >= visibleLines) return null;
              
              const x = getX(index);
              const y = getYForAvg(data.avg);
              
              return (
                <Circle
                  key={`dot-${index}`}
                  cx={x}
                  cy={y}
                  r={4}
                  fill={lineColor}
                />
              );
            })}

            {/* X축 라벨 (일자) */}
            {processedData.map((data, index) => {
              const x = getX(index);
              return (
                <SvgText
                  key={`label-${index}`}
                  x={x}
                  y={chartHeight - 10}
                  fontSize="10"
                  fill="#666666"
                  textAnchor="middle"
                >
                  {data.date}
                </SvgText>
              );
            })}
          </Svg>
        </View>
        
        {/* 타율 증가 멘트 */}
        {isAvgIncreasing && (
          <Text style={styles.avgIncreaseMessage}>최근 타격감이 올라오고 있어요!</Text>
        )}
      </View>
    );
  };

  if (!player) return null;

  const blurIntensity = Platform.OS === 'android' ? 50 : 30;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <BlurView
            intensity={80}
            tint="light"
            style={styles.profileCard}
          >
            {/* 닫기 버튼 */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>

            {/* 프로필 사진과 팀 로고 */}
            <View style={styles.profileImageContainer}>
              {profileImageUrl ? (
                <Image
                  source={{ uri: profileImageUrl }}
                  style={styles.profileImage}
                  resizeMode="cover"
                  onError={() => {
                    console.error('프로필 이미지 로드 실패:', profileImageUrl);
                    setProfileImageUrl(null);
                  }}
                />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Text style={styles.profileImageText}>
                    {player.name.charAt(0)}
                  </Text>
                </View>
              )}
              {/* 팀 로고 - 사진 아래에 살짝 겹치게 */}
              {(() => {
                const teamLogo = getTeamLogo(player.team);
                if (teamLogo) {
                  return (
                    <View style={styles.teamLogoContainer}>
                      <Image 
                        source={teamLogo} 
                        style={styles.teamLogo}
                        resizeMode="contain"
                      />
                    </View>
                  );
                }
                return null;
              })()}
            </View>

            {/* 선수 이름 */}
            <View style={styles.playerInfo}>
              <Text style={styles.playerName}>{player.name}</Text>
              {!getTeamLogo(player.team) && (
                <Text style={styles.playerTeam}>{player.team}</Text>
              )}
            </View>

            {/* 최근 성적 변화 추이 그래프 (타자만) */}
            {player.batting_average !== undefined && (
              <RecentPerformanceChart />
            )}

            {/* 통계 섹션 */}
            <View style={styles.statsSection}>
              {/* 타자 통계 */}
              {player.batting_average !== undefined && (
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>타율</Text>
                  <Text style={styles.statValue}>
                    {(player.batting_average || 0).toFixed(3)}
                  </Text>
                </View>
              )}
              {player.home_runs !== undefined && (
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>홈런</Text>
                  <Text style={styles.statValue}>{player.home_runs || 0}</Text>
                </View>
              )}
              {player.rbis !== undefined && (
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>타점</Text>
                  <Text style={styles.statValue}>{player.rbis || 0}</Text>
                </View>
              )}
              {player.stolen_bases !== undefined && (
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>득점</Text>
                  <Text style={styles.statValue}>{player.stolen_bases || 0}</Text>
                </View>
              )}
              {/* 투수 통계 */}
              {player.era !== undefined && (
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>평균자책점</Text>
                  <Text style={styles.statValue}>
                    {(player.era || 0).toFixed(2)}
                  </Text>
                </View>
              )}
              {(player.wins !== undefined || player.losses !== undefined || player.saves !== undefined || player.holds !== undefined) && (
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>승/패/세이브/홀드</Text>
                  <Text style={styles.statValue}>
                    {player.wins || 0}/{player.losses || 0}/{player.saves || 0}/{player.holds || 0}
                  </Text>
                </View>
              )}
              {player.strikeouts !== undefined && (
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>탈삼진</Text>
                  <Text style={styles.statValue}>{player.strikeouts || 0}</Text>
                </View>
              )}
            </View>

            {/* 오각형 그래프 */}
            <View style={styles.chartSection}>
              <PentagonChart abilities={playerAbilities} size={220} />
            </View>
          </BlurView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  profileCard: {
    width: width * 0.9,
    maxWidth: 400,
    backgroundColor: 'rgba(240, 244, 247, 0.5)',
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  profileImageContainer: {
    marginTop: 12,
    marginBottom: 12,
    alignItems: 'center',
    position: 'relative',
  },
  profileImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    zIndex: 2,
  },
  profileImagePlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(120, 150, 170, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    zIndex: 2,
  },
  profileImageText: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  teamLogoContainer: {
    position: 'absolute',
    top: 100,
    zIndex: 3,
  },
  playerInfo: {
    alignItems: 'center',
    marginTop: 48,
    marginBottom: 16,
  },
  playerName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  playerTeam: {
    fontSize: 18,
    color: '#333333',
    marginBottom: 4,
  },
  teamLogo: {
    width: 80,
    height: 80,
  },
  playerPosition: {
    fontSize: 16,
    color: '#666666',
  },
  statsSection: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 8,
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  statLabel: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 16,
    color: '#000000',
    fontWeight: 'bold',
  },
  chartSection: {
    alignItems: 'center',
    width: '100%',
    marginTop: -40,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 16,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  recentChartContainer: {
    width: '100%',
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  recentChartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
    marginLeft: 4,
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
  },
  chartLoadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avgIncreaseMessage: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});

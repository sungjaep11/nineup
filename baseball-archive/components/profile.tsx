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
} from 'react-native';
import Svg, { G, Path, Text as SvgText } from 'react-native-svg';
import { Player } from '../types/player';
import { API_URL } from '../config/api';

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

export default function Profile({ player, visible, onClose }: ProfileProps) {
  // 프로필 이미지 URL 상태
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

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

  // 선수 능력치 계산
  const playerAbilities = useMemo((): PlayerAbilities => {
    if (!player) {
      return { stat1: 0, stat2: 0, stat3: 0, stat4: 0, stat5: 0, isPitcher: false };
    }

    // 타자 통계 기반 능력치 계산
    if (player.batting_average !== undefined || player.home_runs !== undefined || player.rbis !== undefined) {
      // 파워: 홈런 기준 (0-50개를 0-100으로 변환)
      const power = Math.min(100, ((player.home_runs || 0) / 50) * 100);

      // 정확도: 타율 기준 (0-0.400을 0-100으로 변환)
      const accuracy = Math.min(100, ((player.batting_average || 0) / 0.400) * 100);

      // 득점력: 득점 기준 (0-100점을 0-100으로 변환)
      const scoring = Math.min(100, ((player.stolen_bases || 0) / 100) * 100);

      // 수비: 타율과 홈런 기반
      const defense = (accuracy * 0.6 + power * 0.4);

      // 체력: 타점과 득점 기반 (0-150을 0-100으로 변환)
      const stamina = Math.min(100, (((player.rbis || 0) + (player.stolen_bases || 0)) / 150) * 100);

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
      // 제구: ERA 기준 (낮을수록 좋음, 0-6.0을 역으로 100-0으로 변환)
      const control = player.era > 0 
        ? Math.max(0, Math.min(100, ((6.0 - player.era) / 6.0) * 100))
        : 50;

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

      // 체력: 승/패/세이브/홀드 합계 기반 (0-50을 0-100으로 변환)
      const stamina = Math.min(100, (((player.wins || 0) + (player.saves || 0) + (player.holds || 0)) / 50) * 100);

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

            {/* 프로필 사진 */}
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
            </View>

            {/* 선수 정보 */}
            <View style={styles.playerInfo}>
              <Text style={styles.playerName}>{player.name}</Text>
              {(() => {
                const teamLogo = getTeamLogo(player.team);
                if (teamLogo) {
                  return (
                    <Image 
                      source={teamLogo} 
                      style={styles.teamLogo}
                      resizeMode="contain"
                    />
                  );
                }
                return <Text style={styles.playerTeam}>{player.team}</Text>;
              })()}
            </View>

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
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(120, 150, 170, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  profileImageText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  playerInfo: {
    alignItems: 'center',
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
    marginTop: 8,
  },
  playerPosition: {
    fontSize: 16,
    color: '#666666',
  },
  statsSection: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  statLabel: {
    fontSize: 17,
    color: '#333333',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 19,
    color: '#000000',
    fontWeight: 'bold',
  },
  chartSection: {
    alignItems: 'center',
    width: '100%',
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
});

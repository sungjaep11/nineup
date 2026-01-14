import { BlurView } from 'expo-blur';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback, // Added this import
  View
} from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { API_ENDPOINTS, API_HEADERS, API_URL } from '../config/api';
import { addOpacity, getTeamColors } from '../constants/teamColors';
import { Player } from '../types/player';

const { width, height } = Dimensions.get('window');

interface ProfileProps {
  player: Player | null;
  visible: boolean;
  onClose: () => void;
}

// Map team names to logo files
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
  
  if (teamLogoMap[teamName]) {
    return teamLogoMap[teamName];
  }
  
  for (const [key, logo] of Object.entries(teamLogoMap)) {
    if (teamName.includes(key) || key.includes(teamName)) {
      return logo;
    }
  }
  
  console.log('Team logo not found:', teamName);
  return null;
};

interface PlayerAbilities {
  stat1: number; // Power / Control
  stat2: number; // Accuracy / Strikeouts
  stat3: number; // Scoring / Hit Suppression
  stat4: number; // Defense / Clutch
  stat5: number; // Stamina
  isPitcher: boolean;
}

interface RecentGameData {
  일자: string;
  상대: string;
  H: string;
  AB: string;
  AVG: string;
  HR?: string;
  RBI?: string;
  R?: string;
  PA?: string;
}

interface RecentPitcherGameData {
  일자: string;
  상대: string;
  IP: string;
  ER: string;
  결과: string;
}

export default function Profile({ player, visible, onClose }: ProfileProps) {
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  
  const [recentGames, setRecentGames] = useState<RecentGameData[]>([]);
  const [gamesLoading, setGamesLoading] = useState(false);
  
  const [recentPitcherGames, setRecentPitcherGames] = useState<RecentPitcherGameData[]>([]);
  const [pitcherGamesLoading, setPitcherGamesLoading] = useState(false);

  const pentagonChartOpacity = useRef(new Animated.Value(0)).current;
  const pentagonChartScale = useRef(new Animated.Value(0.8)).current;
  const [pentagonChartLoading, setPentagonChartLoading] = useState(true);
  
  const [recentChartBarHeights, setRecentChartBarHeights] = useState<number[]>([]);
  const [pitcherChartBarHeights, setPitcherChartBarHeights] = useState<number[]>([]);
  
  const [recentChartLineOpacity, setRecentChartLineOpacity] = useState<number[]>([]);
  const [recentChartDotOpacity, setRecentChartDotOpacity] = useState<number[]>([]);
  const [pitcherChartLineOpacity, setPitcherChartLineOpacity] = useState<number[]>([]);
  const [pitcherChartDotOpacity, setPitcherChartDotOpacity] = useState<number[]>([]);

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
          return;
        }
        
        const data = await response.json();
        const profileImage = data.find((img: any) => img.imageType === 'profile');
        if (profileImage && profileImage.imageUrl) {
          setProfileImageUrl(profileImage.imageUrl);
        } else {
          setProfileImageUrl(null);
        }
      } catch (error) {
        console.error('Profile image load failed:', error);
        setProfileImageUrl(null);
      } finally {
        setImageLoading(false);
      }
    };

    fetchProfileImage();
  }, [player, visible]);

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
          return;
        }

        const data = await response.json();
        setRecentGames(data);
      } catch (error) {
        console.error('Recent games load failed:', error);
        setRecentGames([]);
      } finally {
        setGamesLoading(false);
      }
    };

    fetchRecentGames();
  }, [player, visible]);

  useEffect(() => {
    if (!player || !visible || player.era === undefined) {
      setRecentPitcherGames([]);
      return;
    }

    const fetchRecentPitcherGames = async () => {
      try {
        setPitcherGamesLoading(true);
        const url = API_ENDPOINTS.pitcherRecentGames(player.name);
        const response = await fetch(url, {
          method: 'GET',
          headers: API_HEADERS,
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        setRecentPitcherGames(data);
      } catch (error) {
        console.error('Pitcher recent games load failed:', error);
        setRecentPitcherGames([]);
      } finally {
        setPitcherGamesLoading(false);
      }
    };

    fetchRecentPitcherGames();
  }, [player, visible]);

  useEffect(() => {
    if (visible && player) {
      setPentagonChartLoading(true);
      setTimeout(() => {
        setPentagonChartLoading(false);
        Animated.parallel([
          Animated.timing(pentagonChartOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.spring(pentagonChartScale, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
        ]).start();
      }, 300);
    } else {
      pentagonChartOpacity.setValue(0);
      pentagonChartScale.setValue(0.8);
      setPentagonChartLoading(true);
    }
  }, [visible, player]);

  useEffect(() => {
    if (!gamesLoading && recentGames.length > 0) {
      const chartHeight = 200;
      const padding = 40;
      const chartInnerHeight = chartHeight - padding * 2;
      const maxHits = Math.max(...recentGames.map(game => parseInt(game.H || '0', 10)), 1);
      
      const targetHeights = recentGames.map(game => {
        const hits = parseInt(game.H || '0', 10);
        return (hits / maxHits) * chartInnerHeight;
      });
      
      setRecentChartBarHeights(new Array(recentGames.length).fill(0));
      setRecentChartLineOpacity(new Array(Math.max(0, recentGames.length - 1)).fill(0));
      setRecentChartDotOpacity(new Array(recentGames.length).fill(0));
      
      const barAnimations = targetHeights.map((targetHeight, index) => {
        const animatedValue = new Animated.Value(0);
        
        return new Promise<void>((resolve) => {
          animatedValue.addListener(({ value }) => {
            setRecentChartBarHeights(prev => {
              const newHeights = [...prev];
              newHeights[index] = value;
              return newHeights;
            });
          });
          
          Animated.timing(animatedValue, {
            toValue: targetHeight,
            duration: 600,
            delay: index * 50,
            useNativeDriver: false,
          }).start(() => {
            resolve();
          });
        });
      });
      
      Promise.all(barAnimations).then(() => {
        const lineAnimations = Array.from({ length: Math.max(0, recentGames.length - 1) }, (_, index) => {
          const animatedValue = new Animated.Value(0);
          
          return new Promise<void>((resolve) => {
            animatedValue.addListener(({ value }) => {
              setRecentChartLineOpacity(prev => {
                const newOpacity = [...prev];
                newOpacity[index] = value;
                return newOpacity;
              });
            });
            
            Animated.timing(animatedValue, {
              toValue: 1,
              duration: 400,
              delay: index * 30,
              useNativeDriver: false,
            }).start(() => {
              resolve();
            });
          });
        });
        
        const dotAnimations = recentGames.map((_, index) => {
          const animatedValue = new Animated.Value(0);
          
          return new Promise<void>((resolve) => {
            animatedValue.addListener(({ value }) => {
              setRecentChartDotOpacity(prev => {
                const newOpacity = [...prev];
                newOpacity[index] = value;
                return newOpacity;
              });
            });
            
            Animated.timing(animatedValue, {
              toValue: 1,
              duration: 300,
              delay: index * 30,
              useNativeDriver: false,
            }).start(() => {
              resolve();
            });
          });
        });
        
        Promise.all([...lineAnimations, ...dotAnimations]);
      });
    } else {
      setRecentChartBarHeights([]);
      setRecentChartLineOpacity([]);
      setRecentChartDotOpacity([]);
    }
  }, [gamesLoading, recentGames]);

  useEffect(() => {
    if (!pitcherGamesLoading && recentPitcherGames.length > 0) {
      const parseIP = (ipStr: string): number => {
        if (!ipStr || ipStr === '') return 0;
        try {
          if (ipStr.includes(' ')) {
            const parts = ipStr.split(' ');
            const whole = parseFloat(parts[0]) || 0;
            if (parts[1] && parts[1].includes('/')) {
              const [num, den] = parts[1].split('/').map(Number);
              return whole + (num / den);
            }
            return whole;
          }
          return parseFloat(ipStr) || 0;
        } catch {
          return 0;
        }
      };
      
      const chartHeight = 200;
      const padding = 40;
      const chartInnerHeight = chartHeight - padding * 2;
      const maxIP = Math.max(...recentPitcherGames.map(game => parseIP(game.IP || '0')), 1);
      
      const targetHeights = recentPitcherGames.map(game => {
        const ip = parseIP(game.IP || '0');
        return (ip / maxIP) * chartInnerHeight;
      });
      
      setPitcherChartBarHeights(new Array(recentPitcherGames.length).fill(0));
      setPitcherChartLineOpacity(new Array(Math.max(0, recentPitcherGames.length - 1)).fill(0));
      setPitcherChartDotOpacity(new Array(recentPitcherGames.length).fill(0));
      
      const barAnimations = targetHeights.map((targetHeight, index) => {
        const animatedValue = new Animated.Value(0);
        
        return new Promise<void>((resolve) => {
          animatedValue.addListener(({ value }) => {
            setPitcherChartBarHeights(prev => {
              const newHeights = [...prev];
              newHeights[index] = value;
              return newHeights;
            });
          });
          
          Animated.timing(animatedValue, {
            toValue: targetHeight,
            duration: 600,
            delay: index * 50,
            useNativeDriver: false,
          }).start(() => {
            resolve();
          });
        });
      });
      
      Promise.all(barAnimations).then(() => {
        const lineAnimations = Array.from({ length: Math.max(0, recentPitcherGames.length - 1) }, (_, index) => {
          const animatedValue = new Animated.Value(0);
          
          return new Promise<void>((resolve) => {
            animatedValue.addListener(({ value }) => {
              setPitcherChartLineOpacity(prev => {
                const newOpacity = [...prev];
                newOpacity[index] = value;
                return newOpacity;
              });
            });
            
            Animated.timing(animatedValue, {
              toValue: 1,
              duration: 400,
              delay: index * 30,
              useNativeDriver: false,
            }).start(() => {
              resolve();
            });
          });
        });
        
        const dotAnimations = recentPitcherGames.map((_, index) => {
          const animatedValue = new Animated.Value(0);
          
          return new Promise<void>((resolve) => {
            animatedValue.addListener(({ value }) => {
              setPitcherChartDotOpacity(prev => {
                const newOpacity = [...prev];
                newOpacity[index] = value;
                return newOpacity;
              });
            });
            
            Animated.timing(animatedValue, {
              toValue: 1,
              duration: 300,
              delay: index * 30,
              useNativeDriver: false,
            }).start(() => {
              resolve();
            });
          });
        });
        
        Promise.all([...lineAnimations, ...dotAnimations]);
      });
    } else {
      setPitcherChartBarHeights([]);
      setPitcherChartLineOpacity([]);
      setPitcherChartDotOpacity([]);
    }
  }, [pitcherGamesLoading, recentPitcherGames]);

  const playerAbilities = useMemo((): PlayerAbilities => {
    if (!player) {
      return { stat1: 0, stat2: 0, stat3: 0, stat4: 0, stat5: 0, isPitcher: false };
    }

    if (player.batting_average !== undefined || player.home_runs !== undefined || player.rbis !== undefined) {
      const tbMinusH = (player.total_bases || 0) - (player.hits || 0);
      const power = (player.at_bats && player.at_bats > 0)
        ? Math.min(100, ((tbMinusH / player.at_bats) / 0.350) * 100)
        : Math.min(100, ((player.home_runs || 0) / 50) * 100);

      const accuracy = Math.min(100, ((player.batting_average || 0) / 0.400) * 100);
      const scoring = Math.min(100, ((player.stolen_bases || 0) / 100) * 100);

      let defense: number;
      if (player.fielding_percentage !== undefined && player.fielding_percentage !== null && player.fielding_percentage > 0) {
        defense = Math.max(0, Math.min(100, ((player.fielding_percentage - 0.850) / 0.150) * 100));
      } else {
        defense = (accuracy * 0.6 + power * 0.4);
      }

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

    if (player.era !== undefined) {
      const bbPer9 = (player.innings_pitched && player.innings_pitched > 0 && player.walks !== undefined)
        ? (player.walks * 9) / player.innings_pitched
        : 3.0;
      const normalized = Math.max(0, Math.min(1, (12.0 - bbPer9) / 12.0));
      const control = Math.max(0, Math.min(100, Math.pow(normalized, 0.7) * 100));

      const strikeoutAbility = Math.min(100, ((player.strikeouts || 0) / 200) * 100);
      const hitSuppression = (control * 0.6 + strikeoutAbility * 0.4);

      const inverseNormalize = (value: number, min: number, max: number): number => {
        if (value <= min) return 100;
        if (value >= max) return 0;
        return ((max - value) / (max - min)) * 100;
      };
      
      const whipEraSum = (player.whip || 0) + (player.era || 0);
      const clutch = inverseNormalize(whipEraSum, 0.5, 10);
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

    return { stat1: 50, stat2: 50, stat3: 50, stat4: 50, stat5: 50, isPitcher: false };
  }, [player]);

  const PentagonChart = ({ abilities, size = 200 }: { abilities: PlayerAbilities; size?: number }) => {
    const padding = 50;
    const svgSize = size + padding * 2;
    const center = svgSize / 2;
    const radius = size / 2 - 30;
    const angles = [90, 18, -54, -126, -198];

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

    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

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

    const labels = abilities.isPitcher
      ? ['제구', '탈삼진 능력', '피안타 억제력', '위기관리', '체력']
      : ['파워', '정확도', '득점력', '수비', '체력'];

    if (pentagonChartLoading) {
      return (
        <View style={styles.chartContainer}>
          <View style={styles.chartLoadingContainer}>
            <ActivityIndicator size="small" color="#7896AA" />
          </View>
        </View>
      );
    }

    return (
      <Animated.View
        style={[
          styles.chartContainer,
          {
            opacity: pentagonChartOpacity,
            transform: [{ scale: pentagonChartScale }],
          },
        ]}
      >
        <Svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
          {gridLines.map((path, i) => (
            <Path key={i} d={path} fill="none" stroke="#E0E0E0" strokeWidth="1" opacity={0.5} />
          ))}
          <Path
            d={pathData}
            fill="#7896AA"
            fillOpacity={0.4}
            stroke="#7896AA"
            strokeWidth="2"
          />
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
      </Animated.View>
    );
  };

  const RecentPerformanceChart = () => {
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

    const maxHits = Math.max(...processedData.map(d => d.hits), 1);
    const maxAvg = Math.max(...processedData.map(d => d.avg), 0.1);

    let performanceMessage = '';
    
    if (processedData.length >= 3) {
      const totalGames = processedData.length;
      const recent3 = processedData.slice(-3);
      const recent5 = processedData.slice(-5);
      const middle3 = totalGames >= 6 ? processedData.slice(-6, -3) : [];
      const previous5 = totalGames >= 10 ? processedData.slice(-10, -5) : processedData.slice(0, Math.max(0, totalGames - 5));
      
      const calcAvg = (data: typeof processedData, startIndex: number = 0) => {
        if (data.length === 0) return { hits: 0, avg: 0, ab: 0 };
        return {
          hits: data.reduce((sum, d) => sum + d.hits, 0) / data.length,
          avg: data.reduce((sum, d) => sum + d.avg, 0) / data.length,
          ab: data.reduce((sum, d, idx) => {
            const gameIndex = startIndex + idx;
            const ab = parseInt(recentGames[gameIndex]?.AB || '0', 10);
            return sum + ab;
          }, 0) / data.length,
        };
      };
      
      const recent3StartIdx = totalGames - 3;
      const recent5StartIdx = totalGames - 5;
      
      const recent3Avg = calcAvg(recent3, recent3StartIdx);
      const recent5Avg = calcAvg(recent5, recent5StartIdx);
      const middle3StartIdx = totalGames >= 6 ? totalGames - 6 : 0;
      const previous5StartIdx = totalGames >= 10 ? totalGames - 10 : 0;
      const middle3Avg = calcAvg(middle3, middle3StartIdx);
      const previous5Avg = calcAvg(previous5, previous5StartIdx);
      const overallAvg = calcAvg(processedData, 0);
      
      const hitsChange5 = recent5Avg.hits - previous5Avg.hits;
      const avgChange5 = recent5Avg.avg - previous5Avg.avg;
      const hitsChange3 = recent3Avg.hits - (middle3Avg.hits || recent3Avg.hits);
      const avgChange3 = recent3Avg.avg - (middle3Avg.avg || recent3Avg.avg);
      
      const recent3ZeroHits = recent3.filter(d => d.hits === 0).length;
      const recent3MultiHits = recent3.filter(d => d.hits >= 2).length;
      const recent5MultiHits = recent5.filter(d => d.hits >= 2).length;
      
      const recent3HR = recent3.reduce((sum, d, idx) => {
        const gameIndex = recent3StartIdx + idx;
        const hr = parseInt(recentGames[gameIndex]?.HR || '0', 10);
        return sum + hr;
      }, 0);
      
      const calcStdDev = (data: typeof processedData, type: 'hits' | 'avg', startIdx: number = 0) => {
        if (data.length < 2) return 0;
        const avg = calcAvg(data, startIdx)[type];
        const variance = data.reduce((sum, d) => sum + Math.pow(d[type] - avg, 2), 0) / data.length;
        return Math.sqrt(variance);
      };
      
      const hitsStable = Math.abs(hitsChange5) < 0.5 && calcStdDev(recent5, 'hits', recent5StartIdx) < 1.0;
      const avgStable = Math.abs(avgChange5) < 0.1 && calcStdDev(recent5, 'avg', recent5StartIdx) < 0.15;
      
      const avgIncreasing = avgChange5 > 0.1;
      const avgIncreasing3 = avgChange3 > 0.1;
      const avgDecreasing = avgChange5 < -0.1;
      const hitsIncreasing = hitsChange5 > 0.5;
      const hitsIncreasing3 = hitsChange3 > 0.5;
      const hitsDecreasing = hitsChange5 < -0.5;
      
      const avgExcellent = recent5Avg.avg >= 0.350;
      const avgGood = recent5Avg.avg >= 0.300;
      const avgFair = recent5Avg.avg >= 0.250;
      const avgPoor = recent5Avg.avg < 0.200;
      const hitsStrong = recent5Avg.hits >= 1.5;
      const hitsVeryStrong = recent5Avg.hits >= 2.0;
      
      if (recent3MultiHits === 3 && recent3HR >= 2) {
        const messages = [
          '🔥 최근 3경기 모두 멀티히트에 홈런까지! 완전 타격왕 모드예요!',
          '⚡ 3경기 연속 멀티히트에 홈런 2개 이상! 이거 완전 슬러거 아니에요?',
          '💎 최근 3경기 모두 멀티히트! 홈런까지 터뜨렸어요!',
        ];
        performanceMessage = messages[Math.floor(Math.random() * messages.length)];
      } else if (recent3MultiHits === 3) {
        const messages = [
          '🔥 최근 3경기 모두 멀티히트! 완전 타격감 폭발이에요!',
          '⚡ 3경기 연속 멀티히트! 타자들이 포기할 만해요!',
          '💎 최근 3경기 모두 멀티히트! 완전 타격왕 모드예요!',
        ];
        performanceMessage = messages[Math.floor(Math.random() * messages.length)];
      } else if (recent5MultiHits >= 4) {
        const messages = [
          '🛡️ 최근 5경기 중 4경기 멀티히트! 완전 타격감 폭발이에요!',
          '🔥 최근 5경기 중 4경기 멀티히트! 이거 완전 슬러거 아니에요?',
        ];
        performanceMessage = messages[Math.floor(Math.random() * messages.length)];
      }
      else if (hitsVeryStrong && avgExcellent && hitsStable) {
        const messages = [
          '💎 완벽한 타격! 안타도 많고 타율도 높아요!',
          '⭐ 이거 완전 타격왕 아니에요? 안타도 많고 타율도 높네요!',
          '🏆 타격의 교과서 같은 모습이에요!',
        ];
        performanceMessage = messages[Math.floor(Math.random() * messages.length)];
      } else if (hitsStrong && avgExcellent && recent3MultiHits >= 2) {
        performanceMessage = '⭐ 최근 3경기 중 2경기 멀티히트! 완전 타격왕 모드예요!';
      }
      else if (avgIncreasing3 && recent3Avg.avg >= 0.350 && middle3Avg.avg < 0.250) {
        const messages = [
          '📈 타율이 크게 올라갔어요! 완전히 각성한 모드예요!',
          '🚀 타율이 반토막 올라갔어요! 이거 완전 부활 아니에요?',
          '✨ 완전히 달라졌어요! 타격감이 완벽해졌네요!',
        ];
        performanceMessage = messages[Math.floor(Math.random() * messages.length)];
      } else if (avgIncreasing && avgGood && hitsStable) {
        const messages = [
          '🚀 타율이 계속 올라가고 있어요! 상승세가 눈에 띄네요!',
          '📈 타격감이 좋아지고 있어요! 좋은 흐름이 이어지고 있어요!',
          '✨ 점점 나아지고 있어요! 타격감이 좋아지고 있네요!',
        ];
        performanceMessage = messages[Math.floor(Math.random() * messages.length)];
      } else if (avgIncreasing3 && recent3Avg.avg >= 0.300) {
        performanceMessage = '✨ 최근 타율이 크게 올라갔어요! 좋은 흐름이 이어지고 있어요!';
      }
      else if (hitsIncreasing3 && avgGood && recent3Avg.hits >= 2.0) {
        const messages = [
          '💪 안타 수가 폭발했어요! 타격감이 최고조예요!',
          '🏋️ 안타를 많이 치고 있어요! 타격감이 완전 좋아졌어요!',
          '🔥 안타 수가 늘어났어요! 타격왕다운 모습이에요!',
        ];
        performanceMessage = messages[Math.floor(Math.random() * messages.length)];
      } else if (hitsIncreasing && avgFair && hitsStrong) {
        performanceMessage = '🏋️ 안타 수가 늘어나며 타격감이 좋아지고 있어요!';
      }
      else if (hitsStable && avgStable && avgExcellent) {
        const messages = [
          '🎯 기복 없는 편안함, 최근 내내 "타격왕 모드"를 유지 중입니다!',
          '🛡️ 완전 안정적이에요! 매 경기 똑같이 좋은 타격을 보여주고 있어요!',
          '💎 기복이 전혀 없어요! 이거 완전 타격왕 아니에요?',
        ];
        performanceMessage = messages[Math.floor(Math.random() * messages.length)];
      } else if (hitsStable && avgStable && avgGood) {
        performanceMessage = '🛡️ 매우 안정적인 타격! 매 경기 일정한 모습을 보여주고 있어요!';
      } else if (hitsStable && avgStable && avgFair) {
        performanceMessage = '📊 안정적인 타격을 보여주고 있어요. 기복이 없네요!';
      }
      else if (avgExcellent && hitsStrong) {
        const messages = [
          '🔥 타율이 3할 5푼 이상이에요! 완전 타격왕 수준이에요!',
          '⚡ 타율이 높은데 안타도 많아요! 이거 완전 슬러거 아니에요?',
          '💎 타격감이 완벽해요! 타자들이 힘들어 보여요!',
        ];
        performanceMessage = messages[Math.floor(Math.random() * messages.length)];
      } else if (avgGood && hitsStable) {
        performanceMessage = '✅ 타율 관리가 훌륭해요! 안정감이 느껴져요!';
      }
      else if (recent3ZeroHits >= 2) {
        const messages = [
          '⚠️ 최근 무안타 경기가 많아요. 조금만 더 집중해봐요!',
          '📉 안타가 나오지 않고 있어요. 타격 폼을 점검해봐요!',
          '😰 최근 안타가 적어요. 조금만 더 힘내봐요!',
        ];
        performanceMessage = messages[Math.floor(Math.random() * messages.length)];
      } else if (avgDecreasing && avgPoor) {
        performanceMessage = '📉 타율이 내려가고 있어요. 타격 폼을 점검해봐요!';
      } else if (hitsDecreasing && avgDecreasing) {
        performanceMessage = '💔 안타와 타율이 모두 내려가고 있어요. 조금만 더 집중해봐요!';
      }
      else if (overallAvg.avg >= 0.350 && overallAvg.hits >= 1.5) {
        performanceMessage = '🌟 전반적으로 완벽한 타격을 보여주고 있어요!';
      } else if (overallAvg.avg >= 0.300) {
        performanceMessage = '👍 전반적으로 좋은 타격을 보여주고 있어요!';
      } else if (recent5Avg.avg >= 0.250) {
        performanceMessage = '💼 최근 5경기 평균 타율이 2할 5푼이에요. 나쁘지 않아요!';
      } else {
        // 기본 메시지: 모든 경우를 커버
        if (overallAvg.avg >= 0.300) {
          performanceMessage = '👍 전반적으로 좋은 타격을 보여주고 있어요!';
        } else if (overallAvg.avg >= 0.250) {
          performanceMessage = '💼 꾸준한 타격을 보여주고 있어요!';
        } else {
          performanceMessage = '📊 최근 경기 데이터를 분석 중이에요!';
        }
      }
    } else if (processedData.length > 0) {
      // 3경기 미만인 경우 기본 메시지
      const calcAvg = (data: typeof processedData, startIndex: number = 0) => {
        if (data.length === 0) return { hits: 0, avg: 0, ab: 0 };
        return {
          hits: data.reduce((sum, d) => sum + d.hits, 0) / data.length,
          avg: data.reduce((sum, d) => sum + d.avg, 0) / data.length,
          ab: data.reduce((sum, d, idx) => {
            const gameIndex = startIndex + idx;
            const ab = parseInt(recentGames[gameIndex]?.AB || '0', 10);
            return sum + ab;
          }, 0) / data.length,
        };
      };
      const overallAvg = calcAvg(processedData, 0);
      if (overallAvg.avg >= 0.300) {
        performanceMessage = '👍 좋은 타격을 보여주고 있어요!';
      } else if (overallAvg.avg >= 0.250) {
        performanceMessage = '💼 꾸준한 타격을 보여주고 있어요!';
      } else {
        performanceMessage = '📊 최근 경기 데이터를 분석 중이에요!';
      }
    }
    
    const teamColors = getTeamColors(player?.team);
    const barColor = addOpacity(teamColors.primary, 0.6);
    const lineColor = teamColors.secondary;

    const getX = (index: number) => padding + (index / (processedData.length - 1 || 1)) * chartInnerWidth;
    const getYForHits = (hits: number) => padding + chartInnerHeight - (hits / maxHits) * chartInnerHeight;
    const getYForAvg = (avg: number) => padding + chartInnerHeight - (avg / maxAvg) * chartInnerHeight;

    return (
      <View style={styles.recentChartContainer}>
        <Text style={styles.recentChartTitle}>최근 성적 변화 추이</Text>
        <View style={styles.chartWrapper}>
          <Svg width={chartWidth} height={chartHeight}>
            <G>
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

            {processedData.map((data, index) => {
              const x = getX(index);
              const barWidth = chartInnerWidth / processedData.length * 0.6;
              const barX = x - barWidth / 2;
              const animatedBarHeight = recentChartBarHeights[index] || 0;
              const barY = padding + chartInnerHeight - animatedBarHeight;
              
              return (
                <Rect
                  key={`bar-${index}`}
                  x={barX}
                  y={barY}
                  width={barWidth}
                  height={animatedBarHeight}
                  fill={barColor}
                  rx={4}
                />
              );
            })}

            {processedData.length > 1 && processedData.map((data, index) => {
              if (index === 0) return null;
              
              const x1 = getX(index - 1);
              const y1 = getYForAvg(processedData[index - 1].avg);
              const x2 = getX(index);
              const y2 = getYForAvg(data.avg);
              const lineOpacity = recentChartLineOpacity[index - 1] || 0;
              
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
                  opacity={lineOpacity}
                />
              );
            })}

            {processedData.map((data, index) => {
              const x = getX(index);
              const y = getYForAvg(data.avg);
              const dotOpacity = recentChartDotOpacity[index] || 0;
              
              return (
                <Circle
                  key={`dot-${index}`}
                  cx={x}
                  cy={y}
                  r={4}
                  fill={lineColor}
                  opacity={dotOpacity}
                />
              );
            })}

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
        
        {performanceMessage && (
          <Text style={styles.avgIncreaseMessage}>{performanceMessage}</Text>
        )}
      </View>
    );
  };

  const RecentPitcherPerformanceChart = () => {
    if (pitcherGamesLoading) {
      return (
        <View style={styles.chartLoadingContainer}>
          <ActivityIndicator size="small" color="#7896AA" />
        </View>
      );
    }

    if (recentPitcherGames.length === 0) {
      return null;
    }

    const chartWidth = width * 0.8;
    const chartHeight = 200;
    const padding = 40;
    const chartInnerWidth = chartWidth - padding * 2;
    const chartInnerHeight = chartHeight - padding * 2;

    const parseIP = (ipStr: string): number => {
      if (!ipStr || ipStr === '') return 0;
      try {
        if (ipStr.includes(' ')) {
          const parts = ipStr.split(' ');
          const whole = parseFloat(parts[0]) || 0;
          if (parts[1] && parts[1].includes('/')) {
            const [num, den] = parts[1].split('/').map(Number);
            return whole + (num / den);
          }
          return whole;
        }
        return parseFloat(ipStr) || 0;
      } catch {
        return 0;
      }
    };

    const processedData = recentPitcherGames.map(game => {
      const ip = parseIP(game.IP || '0');
      const er = parseFloat(game.ER || '0') || 0;
      return {
        date: game.일자,
        ip: ip,
        er: er,
      };
    });

    const maxIP = Math.max(...processedData.map(d => d.ip), 1);
    const maxER = Math.max(...processedData.map(d => d.er), 1);

    let performanceMessage = '';
    
    if (processedData.length >= 3) {
      const totalGames = processedData.length;
      
      const recent3 = processedData.slice(-3);
      const recent5 = processedData.slice(-5);
      const middle3 = totalGames >= 6 ? processedData.slice(-6, -3) : [];
      const previous5 = totalGames >= 10 ? processedData.slice(-10, -5) : processedData.slice(0, Math.max(0, totalGames - 5));
      
      const calcAvg = (data: typeof processedData) => {
        if (data.length === 0) return { ip: 0, er: 0 };
        return {
          ip: data.reduce((sum, d) => sum + d.ip, 0) / data.length,
          er: data.reduce((sum, d) => sum + d.er, 0) / data.length,
        };
      };
      
      const recent3Avg = calcAvg(recent3);
      const recent5Avg = calcAvg(recent5);
      const middle3Avg = calcAvg(middle3);
      const previous5Avg = calcAvg(previous5);
      const overallAvg = calcAvg(processedData);
      
      const ipChange5 = recent5Avg.ip - previous5Avg.ip;
      const erChange5 = recent5Avg.er - previous5Avg.er;
      const ipChange3 = recent3Avg.ip - (middle3Avg.ip || recent3Avg.ip);
      const erChange3 = recent3Avg.er - (middle3Avg.er || recent3Avg.er);
      
      const recent3ZeroER = recent3.filter(d => d.er === 0).length;
      const recent5ZeroER = recent5.filter(d => d.er === 0).length;
      const recent3Quality = recent3.filter(d => d.ip >= 6 && d.er <= 2).length;
      
      const calcStdDev = (data: typeof processedData, type: 'ip' | 'er') => {
        if (data.length < 2) return 0;
        const avg = calcAvg(data)[type];
        const variance = data.reduce((sum, d) => sum + Math.pow(d[type] - avg, 2), 0) / data.length;
        return Math.sqrt(variance);
      };
      
      const ipStdDev = calcStdDev(recent5, 'ip');
      const erStdDev = calcStdDev(recent5, 'er');
      
      const ipStable = Math.abs(ipChange5) < 0.5 && ipStdDev < 1.0;
      const erStable = Math.abs(erChange5) < 0.5 && erStdDev < 1.0;
      const erExcellent = recent5Avg.er < 1.0;
      const erGood = recent5Avg.er < 2.0;
      const erFair = recent5Avg.er < 3.0;
      const erPoor = recent5Avg.er >= 4.0;
      const ipStrong = recent5Avg.ip >= 6.0;
      const ipVeryStrong = recent5Avg.ip >= 7.0;
      
      const erDecreasing = erChange5 < -0.5;
      const erDecreasing3 = erChange3 < -0.5;
      const erIncreasing = erChange5 > 0.8;
      const ipIncreasing = ipChange5 > 0.8;
      const ipIncreasing3 = ipChange3 > 0.8;
      
      if (recent3ZeroER === 3) {
        const messages = [
          '🔥 3경기 연속 무실점! 타자들이 포기할 만해요!',
          '⚡ 완벽한 "벽"이 되었어요! 누가 이 투수를 넘어설 수 있나요?',
          '🛡️ 3연속 무실점! 이거 완전 철벽 수비 아니에요?',
          '💎 3연속 무실점! 타자들이 포기할 만해요!',
          '🏆 3경기 연속 무실점! 완전 에이스 모드예요!',
        ];
        performanceMessage = messages[Math.floor(Math.random() * messages.length)];
      } else if (recent3ZeroER === 2 && recent3Avg.er < 0.5) {
        const messages = [
          '⚡ 거의 무실점 수준! 타자들이 포기할 만해요!',
          '🔥 2경기 무실점! 완전 벽이 되었어요!',
        ];
        performanceMessage = messages[Math.floor(Math.random() * messages.length)];
      } else if (recent5ZeroER >= 3) {
        const messages = [
          '🛡️ 최근 5경기 중 3경기 무실점! 이거 완전 철벽 아니에요?',
          '💎 최근 5경기 중 3경기 무실점! 타자들이 힘들어 보여요!',
        ];
        performanceMessage = messages[Math.floor(Math.random() * messages.length)];
      }
      else if (ipVeryStrong && erExcellent && ipStable) {
        const messages = [
          '💎 완벽한 선발투수! 이닝도 많이 던지고 자책점도 거의 없어요!',
          '⭐ 이거 완전 에이스 아니에요? 이닝도 길고 자책점도 없네요!',
          '🏆 선발투수의 교과서 같은 모습이에요!',
          '🔥 7이닝 이상 던지는데 자책점 1점대? 이거 완전 에이스예요!',
          '⚡ 이닝도 길고 자책점도 없어요! 완전 선발투수 모범이에요!',
        ];
        performanceMessage = messages[Math.floor(Math.random() * messages.length)];
      } else if (ipStrong && erExcellent && recent3Quality === 3) {
        const messages = [
          '⭐ 최근 3경기 모두 고품질 스타트! 이거 완전 에이스 모드예요!',
          '🔥 최근 3경기 모두 완벽해요! 선발투수다운 모습이에요!',
        ];
        performanceMessage = messages[Math.floor(Math.random() * messages.length)];
      }
      else if (erDecreasing3 && recent3Avg.er < 1.0 && middle3Avg.er > 2.0) {
        const messages = [
          '📈 자책점이 반으로 줄었어요! 완전히 각성한 모드예요!',
          '🚀 자책점이 반토막났어요! 이거 완전 부활 아니에요?',
          '✨ 완전히 달라졌어요! 자책점 관리가 완벽해졌네요!',
          '🔥 자책점이 반으로 줄었어요! 완전히 달라진 모습이에요!',
          '⚡ 자책점이 크게 줄었어요! 이거 완전 각성 모드예요!',
        ];
        performanceMessage = messages[Math.floor(Math.random() * messages.length)];
      } else if (erDecreasing && erGood && ipStable) {
        const messages = [
          '🚀 자책점이 계속 줄어들고 있어요! 상승세가 눈에 띄네요!',
          '📈 자책점이 내려가고 있어요! 좋은 흐름이 이어지고 있어요!',
          '✨ 점점 나아지고 있어요! 자책점 관리가 좋아지고 있네요!',
          '🔥 자책점이 줄어들고 있어요! 좋은 추세예요!',
        ];
        performanceMessage = messages[Math.floor(Math.random() * messages.length)];
      } else if (erDecreasing3 && recent3Avg.er < 1.5) {
        const messages = [
          '✨ 최근 자책점이 크게 줄었어요! 좋은 흐름이 이어지고 있어요!',
          '📈 최근 자책점이 내려가고 있어요! 좋은 추세예요!',
        ];
        performanceMessage = messages[Math.floor(Math.random() * messages.length)];
      }
      else if (ipIncreasing3 && erGood && recent3Avg.ip >= 7) {
        const messages = [
          '💪 이닝 소화력이 폭발했어요! 체력이 최고조예요!',
          '🏋️ 이닝을 많이 던지네요! 체력이 완전 좋아졌어요!',
          '🔥 이닝 소화력이 늘어났어요! 선발투수다운 모습이에요!',
          '⚡ 7이닝 이상 던지는데 자책점도 적어요! 완전 에이스예요!',
          '💎 이닝 소화력이 늘어났어요! 체력 관리가 완벽해요!',
        ];
        performanceMessage = messages[Math.floor(Math.random() * messages.length)];
      } else if (ipIncreasing && erFair && ipStrong) {
        const messages = [
          '🏋️ 이닝 소화력이 늘어나며 체력이 좋아지고 있어요!',
          '💪 이닝을 더 많이 던지고 있어요! 체력이 좋아졌네요!',
        ];
        performanceMessage = messages[Math.floor(Math.random() * messages.length)];
      }
      else if (ipStable && erStable && erExcellent) {
        const messages = [
          '🎯 기복 없는 편안함, 최근 내내 "철벽 모드"를 유지 중입니다!',
          '🛡️ 완전 안정적이에요! 매 경기 똑같이 좋은 모습을 보여주고 있어요!',
          '💎 기복이 전혀 없어요! 이거 완전 에이스 아니에요?',
          '🔥 매 경기 똑같이 좋아요! 완전 안정적인 피칭이에요!',
          '⚡ 기복이 전혀 없어요! 완전 신뢰할 수 있는 투수예요!',
        ];
        performanceMessage = messages[Math.floor(Math.random() * messages.length)];
      } else if (ipStable && erStable && erGood) {
        const messages = [
          '🛡️ 매우 안정적인 피칭! 매 경기 일정한 모습을 보여주고 있어요!',
          '📊 안정적인 피칭이에요! 기복이 없네요!',
        ];
        performanceMessage = messages[Math.floor(Math.random() * messages.length)];
      } else if (ipStable && erStable && erFair) {
        const messages = [
          '📊 안정적인 피칭을 보여주고 있어요. 기복이 없네요!',
          '🛡️ 기복 없는 피칭이에요! 안정적이네요!',
        ];
        performanceMessage = messages[Math.floor(Math.random() * messages.length)];
      }
      else if (erExcellent && ipStrong) {
        const messages = [
          '🔥 자책점이 거의 없어요! 타자들이 포기할 만한 수준이에요!',
          '⚡ 자책점이 1점대예요! 이거 완전 에이스 아니에요?',
          '💎 자책점 관리가 완벽해요! 타자들이 힘들어 보여요!',
          '🏆 자책점이 거의 없는데 이닝도 길어요! 완전 에이스예요!',
          '⭐ 자책점 1점대에 이닝도 길어요! 완전 선발투수 모범이에요!',
        ];
        performanceMessage = messages[Math.floor(Math.random() * messages.length)];
      } else if (erGood && ipStable) {
        const messages = [
          '✅ 자책점 관리가 훌륭해요! 안정감이 느껴져요!',
          '🛡️ 자책점이 2점대예요! 안정적인 피칭이에요!',
        ];
        performanceMessage = messages[Math.floor(Math.random() * messages.length)];
      }
      else if (erIncreasing && erPoor) {
        const messages = [
          '⚠️ 최근 자책점이 늘어나고 있어요. 조금만 더 집중해봐요!',
          '📉 자책점이 올라가고 있어요. 컨트롤에 신경 써봐요!',
          '😰 자책점이 늘어나고 있어요. 조금만 더 힘내봐요!',
          '💔 자책점이 올라가고 있어요. 컨트롤에 집중해봐요!',
        ];
        performanceMessage = messages[Math.floor(Math.random() * messages.length)];
      } else if (erIncreasing && erFair) {
        const messages = [
          '📉 자책점이 조금씩 늘어나고 있어요. 컨트롤에 신경 써봐요!',
          '⚠️ 자책점이 올라가고 있어요. 조금만 더 집중해봐요!',
        ];
        performanceMessage = messages[Math.floor(Math.random() * messages.length)];
      }
      else if (overallAvg.er < 1.5 && overallAvg.ip >= 6) {
        performanceMessage = '🌟 전반적으로 완벽한 피칭을 보여주고 있어요!';
      } else if (overallAvg.er < 2.5) {
        performanceMessage = '👍 전반적으로 좋은 피칭을 보여주고 있어요!';
      } else if (recent5Avg.er < 3.0) {
        performanceMessage = '💼 최근 5경기 평균 자책점이 3점대예요. 나쁘지 않아요!';
      } else {
        // 기본 메시지: 모든 경우를 커버
        if (overallAvg.er < 2.0) {
          performanceMessage = '👍 전반적으로 좋은 피칭을 보여주고 있어요!';
        } else if (overallAvg.er < 3.0) {
          performanceMessage = '💼 꾸준한 피칭을 보여주고 있어요!';
        } else {
          performanceMessage = '📊 최근 경기 데이터를 분석 중이에요!';
        }
      }
    } else if (processedData.length > 0) {
      // 3경기 미만인 경우 기본 메시지
      const calcAvg = (data: typeof processedData) => {
        if (data.length === 0) return { ip: 0, er: 0 };
        return {
          ip: data.reduce((sum, d) => sum + d.ip, 0) / data.length,
          er: data.reduce((sum, d) => sum + d.er, 0) / data.length,
        };
      };
      const overallAvg = calcAvg(processedData);
      if (overallAvg.er < 2.0) {
        performanceMessage = '👍 좋은 피칭을 보여주고 있어요!';
      } else if (overallAvg.er < 3.0) {
        performanceMessage = '💼 꾸준한 피칭을 보여주고 있어요!';
      } else {
        performanceMessage = '📊 최근 경기 데이터를 분석 중이에요!';
      }
    }

    const teamColors = getTeamColors(player?.team);
    const barColor = addOpacity(teamColors.primary, 0.6);
    const lineColor = teamColors.secondary;

    const getX = (index: number) => padding + (index / (processedData.length - 1 || 1)) * chartInnerWidth;
    const getYForIP = (ip: number) => padding + chartInnerHeight - (ip / maxIP) * chartInnerHeight;
    const getYForER = (er: number) => padding + chartInnerHeight - (er / maxER) * chartInnerHeight;

    return (
      <View style={styles.recentChartContainer}>
        <Text style={styles.recentChartTitle}>최근 성적 변화 추이</Text>
        <View style={styles.chartWrapper}>
          <Svg width={chartWidth} height={chartHeight}>
            <G>
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
                투구 이닝(IP)
              </SvgText>
              
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
                자책점(ER)
              </SvgText>
            </G>
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

            {processedData.map((data, index) => {
              const x = getX(index);
              const barWidth = chartInnerWidth / processedData.length * 0.6;
              const barX = x - barWidth / 2;
              const animatedBarHeight = pitcherChartBarHeights[index] || 0;
              const barY = padding + chartInnerHeight - animatedBarHeight;
              
              return (
                <Rect
                  key={`bar-${index}`}
                  x={barX}
                  y={barY}
                  width={barWidth}
                  height={animatedBarHeight}
                  fill={barColor}
                  rx={4}
                />
              );
            })}

            {processedData.length > 1 && processedData.map((data, index) => {
              if (index === 0) return null;
              
              const x1 = getX(index - 1);
              const y1 = getYForER(processedData[index - 1].er);
              const x2 = getX(index);
              const y2 = getYForER(data.er);
              const lineOpacity = pitcherChartLineOpacity[index - 1] || 0;
              
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
                  opacity={lineOpacity}
                />
              );
            })}

            {processedData.map((data, index) => {
              const x = getX(index);
              const y = getYForER(data.er);
              const dotOpacity = pitcherChartDotOpacity[index] || 0;
              
              return (
                <Circle
                  key={`dot-${index}`}
                  cx={x}
                  cy={y}
                  r={4}
                  fill={lineColor}
                  opacity={dotOpacity}
                />
              );
            })}

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
        
        {performanceMessage && (
          <Text style={styles.avgIncreaseMessage}>{performanceMessage}</Text>
        )}
      </View>
    );
  };

  if (!player) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <BlurView
          intensity={80}
          tint="light"
          style={styles.profileCard}
        >
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            bounces={true}
            nestedScrollEnabled={true}
          >
            <View style={styles.profileImageContainer}>
              {profileImageUrl ? (
                <Image
                  source={{ uri: profileImageUrl }}
                  style={styles.profileImage}
                  resizeMode="cover"
                  onError={() => {
                    console.error('Profile image load failed:', profileImageUrl);
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

            <View style={styles.playerInfo}>
              <Text style={styles.playerName}>{player.name}</Text>
              {!getTeamLogo(player.team) && (
                <Text style={styles.playerTeam}>{player.team}</Text>
              )}
            </View>

            {player.batting_average !== undefined && (
              <RecentPerformanceChart />
            )}

            {player.era !== undefined && (
              <RecentPitcherPerformanceChart />
            )}

            <View style={styles.statsSection}>
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

            <View style={styles.chartSection}>
              <PentagonChart abilities={playerAbilities} size={220} />
            </View>
          </ScrollView>
        </BlurView>
      </View>
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
    width: width * 0.95,
    maxWidth: 450,
    maxHeight: height * 0.9,
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
  scrollView: {
    width: '100%',
    maxHeight: height * 0.85,
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 20,
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
    color: '#3D5566',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
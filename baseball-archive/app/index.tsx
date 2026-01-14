import { BlurView } from 'expo-blur';
import React, { useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    ImageBackground,
    PanResponder,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Album from '../components/album';
import NavBar from '../components/NavBar';
import PlayerSelector from '../components/player-selector';
import Profile from '../components/profile';
import Stats from '../components/stats';
import { Player, PlayerPosition } from '../types/player';

const { width, height } = Dimensions.get('window');

// Configuration
const AUDIENCE_COLOR = 'rgba(100, 130, 150, 0.85)'; // Stadium gray-blue for the "stands" area

// Height of the sliding panel
const PANEL_HEIGHT = height * 0.85;

export default function BaseballField() {
    const slideAnim = useRef(new Animated.Value(PANEL_HEIGHT)).current;
    const [activeTab, setActiveTab] = useState<string | null>(null);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [selectedPlayers, setSelectedPlayers] = useState<Partial<Record<PlayerPosition, Player>>>({});
    const [startingPitcher, setStartingPitcher] = useState<Player | null>(null);
    const [reliefPitchers, setReliefPitchers] = useState<Player[]>([]);
    const [profilePlayer, setProfilePlayer] = useState<Player | null>(null);
    const [isProfileVisible, setIsProfileVisible] = useState(false);
    const [initialExpandedPosition, setInitialExpandedPosition] = useState<PlayerPosition | 'starting' | 'relief' | null>(null);
    const [filteredPosition, setFilteredPosition] = useState<PlayerPosition | 'starting' | 'relief' | null>(null);

    // --- PanResponder Logic ---
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    slideAnim.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 150 || gestureState.vy > 0.5) {
                    closePanel();
                } else {
                    Animated.spring(slideAnim, {
                        toValue: 0,
                        useNativeDriver: true,
                        friction: 8
                    }).start();
                }
            }
        })
    ).current;

    const handleTabSelect = (tabName: string) => {
        if (isPanelOpen && activeTab === tabName) {
            closePanel();
            // 패널이 닫힐 때 필터 초기화
            setInitialExpandedPosition(null);
            setFilteredPosition(null);
        } else {
            setActiveTab(tabName);
            // 사용자가 직접 탭을 열었을 때는 항상 필터 초기화
            // (아이콘 클릭 시에는 handlePlayerIconPress에서 필터를 설정함)
            setInitialExpandedPosition(null);
            setFilteredPosition(null);
            openPanel();
        }
    };

    const openPanel = () => {
        setIsPanelOpen(true);
        slideAnim.setValue(PANEL_HEIGHT);
        Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
            tension: 40
        }).start();
    };

    const closePanel = () => {
        setIsPanelOpen(false);
        setActiveTab(null);
        setInitialExpandedPosition(null);
        setFilteredPosition(null);
        Animated.timing(slideAnim, {
            toValue: PANEL_HEIGHT,
            duration: 300,
            useNativeDriver: true,
        }).start();
    };

    const handlePlayerSelect = (position: PlayerPosition, player: Player | null) => {
        if (player === null) {
            // 선택 해제: 해당 포지션 제거
            setSelectedPlayers(prev => {
                const updated = { ...prev };
                delete updated[position];
                return updated;
            });
        } else {
            // 선수 선택
            setSelectedPlayers(prev => ({ ...prev, [position]: player }));
        }
    };


    const handleStartingPitcherSelect = (player: Player | null) => {
        setStartingPitcher(player);
    };

    const handleReliefPitcherSelect = (player: Player | null) => {
        if (player === null) {
            // 선택 해제는 player-selector에서 처리
            return;
        } else {
            // 선택 추가/제거 (최대 4명)
            setReliefPitchers(prev => {
                if (prev.some(p => p.id === player.id)) {
                    // 이미 선택된 경우 제거
                    return prev.filter(p => p.id !== player.id);
                } else if (prev.length < 4) {
                    // 4명 미만이면 추가
                    return [...prev, player];
                }
                return prev;
            });
        }
    };

    const getPlayerIcon = (position: PlayerPosition) => {
        return selectedPlayers[position] 
            ? require('../assets/images/player.png')
            : require('../assets/images/player-black.png');
    };

    const handlePlayerIconPress = (player: Player | null, position?: PlayerPosition | 'starting' | 'relief') => {
        if (player) {
            // 선수가 선택되어 있으면 프로필 표시
            setProfilePlayer(player);
            setIsProfileVisible(true);
        } else if (position) {
            // 선수가 선택되지 않았고 포지션이 제공되면 선수 선택 탭 열기
            // 필터를 먼저 설정한 후 탭 열기
            setFilteredPosition(position);
            setInitialExpandedPosition(position);
            // handleTabSelect를 직접 호출하지 않고 상태만 변경
            if (!isPanelOpen || activeTab !== 'roster') {
                setActiveTab('roster');
                openPanel();
            }
        }
    };

    const handleCloseProfile = () => {
        setIsProfileVisible(false);
        setProfilePlayer(null);
    };

    const renderPanelContent = () => {
        switch (activeTab) {
            case 'album': return <Album selectedPlayers={selectedPlayers} startingPitcher={startingPitcher} reliefPitchers={reliefPitchers} />;
            case 'roster': return (
                <PlayerSelector 
                    selectedPlayers={selectedPlayers} 
                    onPlayerSelect={handlePlayerSelect}
                    startingPitcher={startingPitcher}
                    reliefPitchers={reliefPitchers}
                    onStartingPitcherSelect={handleStartingPitcherSelect}
                    onReliefPitcherSelect={handleReliefPitcherSelect}
                    initialExpandedPosition={initialExpandedPosition}
                    onExpandedPositionSet={() => {
                        setInitialExpandedPosition(null);
                        setFilteredPosition(null);
                    }}
                    filteredPosition={filteredPosition}
                />
            );
            case 'stats': return <Stats selectedPlayers={selectedPlayers} startingPitcher={startingPitcher} reliefPitchers={reliefPitchers} />;
            default: return null;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* --- 1. Game Area (Background) --- */}
            <View style={styles.gameArea}>
                {/* Background Image - Under all other layers */}
                <ImageBackground 
                    source={require('../assets/images/background.png')} 
                    style={styles.backgroundImage}
                    resizeMode="cover"
                />

                {/* Lineup Maker Logo */}
                <View style={styles.logoContainer}>
                    <Image 
                        source={require('../assets/images/Logo.png')} 
                        style={styles.logoImage}
                        resizeMode="contain"
                    />
                </View>

                {/* Player Icons Layer */}
                <View style={styles.playersLayer}>
                    {/* 선발 투수 */}
                    <TouchableOpacity 
                        style={[styles.playerContainer, styles.pitcher]}
                        onPress={() => handlePlayerIconPress(startingPitcher || null, 'starting')}
                        activeOpacity={0.7}
                    >
                        {startingPitcher && <View style={styles.nameTag}><Text style={styles.nameText}>{startingPitcher.name}</Text></View>}
                        <Image 
                            source={startingPitcher ? require('../assets/images/player.png') : require('../assets/images/player-black.png')} 
                            style={[styles.playerIcon, !startingPitcher && styles.playerIconSilhouette]} 
                            tintColor={!startingPitcher ? '#333333' : undefined}
                        />
                    </TouchableOpacity>
                    {/* 불펜 투수 1 */}
                    <TouchableOpacity 
                        style={[styles.playerContainer, styles.relief1]}
                        onPress={() => handlePlayerIconPress(reliefPitchers[0] || null, 'relief')}
                        activeOpacity={0.7}
                    >
                        {reliefPitchers[0] && <View style={styles.nameTag}><Text style={styles.nameText}>{reliefPitchers[0].name}</Text></View>}
                        <Image 
                            source={reliefPitchers[0] ? require('../assets/images/player.png') : require('../assets/images/player-black.png')} 
                            style={[styles.playerIcon, !reliefPitchers[0] && styles.playerIconSilhouette]} 
                            tintColor={!reliefPitchers[0] ? '#333333' : undefined}
                        />
                    </TouchableOpacity>
                    {/* 불펜 투수 2 */}
                    <TouchableOpacity 
                        style={[styles.playerContainer, styles.relief2]}
                        onPress={() => handlePlayerIconPress(reliefPitchers[1] || null, 'relief')}
                        activeOpacity={0.7}
                    >
                        {reliefPitchers[1] && <View style={styles.nameTag}><Text style={styles.nameText}>{reliefPitchers[1].name}</Text></View>}
                        <Image 
                            source={reliefPitchers[1] ? require('../assets/images/player.png') : require('../assets/images/player-black.png')} 
                            style={[styles.playerIcon, !reliefPitchers[1] && styles.playerIconSilhouette]} 
                            tintColor={!reliefPitchers[1] ? '#333333' : undefined}
                        />
                    </TouchableOpacity>
                    {/* 불펜 투수 3 */}
                    <TouchableOpacity 
                        style={[styles.playerContainer, styles.relief3]}
                        onPress={() => handlePlayerIconPress(reliefPitchers[2] || null, 'relief')}
                        activeOpacity={0.7}
                    >
                        {reliefPitchers[2] && <View style={styles.nameTag}><Text style={styles.nameText}>{reliefPitchers[2].name}</Text></View>}
                        <Image 
                            source={reliefPitchers[2] ? require('../assets/images/player.png') : require('../assets/images/player-black.png')} 
                            style={[styles.playerIcon, !reliefPitchers[2] && styles.playerIconSilhouette]} 
                            tintColor={!reliefPitchers[2] ? '#333333' : undefined}
                        />
                    </TouchableOpacity>
                    {/* 불펜 투수 4 */}
                    <TouchableOpacity 
                        style={[styles.playerContainer, styles.relief4]}
                        onPress={() => handlePlayerIconPress(reliefPitchers[3] || null, 'relief')}
                        activeOpacity={0.7}
                    >
                        {reliefPitchers[3] && <View style={styles.nameTag}><Text style={styles.nameText}>{reliefPitchers[3].name}</Text></View>}
                        <Image 
                            source={reliefPitchers[3] ? require('../assets/images/player.png') : require('../assets/images/player-black.png')} 
                            style={[styles.playerIcon, !reliefPitchers[3] && styles.playerIconSilhouette]} 
                            tintColor={!reliefPitchers[3] ? '#333333' : undefined}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.playerContainer, styles.catcher]}
                        onPress={() => handlePlayerIconPress(selectedPlayers['catcher'] || null, 'catcher')}
                        activeOpacity={0.7}
                    >
                        {selectedPlayers['catcher'] && <View style={styles.nameTag}><Text style={styles.nameText}>{selectedPlayers['catcher'].name}</Text></View>}
                        <Image 
                            source={getPlayerIcon('catcher')} 
                            style={[styles.playerIcon, !selectedPlayers['catcher'] && styles.playerIconSilhouette]} 
                            tintColor={!selectedPlayers['catcher'] ? '#333333' : undefined}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.playerContainer, styles.firstBaseman]}
                        onPress={() => handlePlayerIconPress(selectedPlayers['first'] || null, 'first')}
                        activeOpacity={0.7}
                    >
                        {selectedPlayers['first'] && <View style={styles.nameTag}><Text style={styles.nameText}>{selectedPlayers['first'].name}</Text></View>}
                        <Image 
                            source={getPlayerIcon('first')} 
                            style={[styles.playerIcon, !selectedPlayers['first'] && styles.playerIconSilhouette]} 
                            tintColor={!selectedPlayers['first'] ? '#333333' : undefined}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.playerContainer, styles.secondBaseman]}
                        onPress={() => handlePlayerIconPress(selectedPlayers['second'] || null, 'second')}
                        activeOpacity={0.7}
                    >
                        {selectedPlayers['second'] && <View style={styles.nameTag}><Text style={styles.nameText}>{selectedPlayers['second'].name}</Text></View>}
                        <Image 
                            source={getPlayerIcon('second')} 
                            style={[styles.playerIcon, !selectedPlayers['second'] && styles.playerIconSilhouette]} 
                            tintColor={!selectedPlayers['second'] ? '#333333' : undefined}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.playerContainer, styles.shortstop]}
                        onPress={() => handlePlayerIconPress(selectedPlayers['shortstop'] || null, 'shortstop')}
                        activeOpacity={0.7}
                    >
                        {selectedPlayers['shortstop'] && <View style={styles.nameTag}><Text style={styles.nameText}>{selectedPlayers['shortstop'].name}</Text></View>}
                        <Image 
                            source={getPlayerIcon('shortstop')} 
                            style={[styles.playerIcon, !selectedPlayers['shortstop'] && styles.playerIconSilhouette]} 
                            tintColor={!selectedPlayers['shortstop'] ? '#333333' : undefined}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.playerContainer, styles.thirdBaseman]}
                        onPress={() => handlePlayerIconPress(selectedPlayers['third'] || null, 'third')}
                        activeOpacity={0.7}
                    >
                        {selectedPlayers['third'] && <View style={styles.nameTag}><Text style={styles.nameText}>{selectedPlayers['third'].name}</Text></View>}
                        <Image 
                            source={getPlayerIcon('third')} 
                            style={[styles.playerIcon, !selectedPlayers['third'] && styles.playerIconSilhouette]} 
                            tintColor={!selectedPlayers['third'] ? '#333333' : undefined}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.playerContainer, styles.leftFielder]}
                        onPress={() => handlePlayerIconPress(selectedPlayers['left'] || null, 'left')}
                        activeOpacity={0.7}
                    >
                        {selectedPlayers['left'] && <View style={styles.nameTag}><Text style={styles.nameText}>{selectedPlayers['left'].name}</Text></View>}
                        <Image 
                            source={getPlayerIcon('left')} 
                            style={[styles.playerIcon, !selectedPlayers['left'] && styles.playerIconSilhouette]} 
                            tintColor={!selectedPlayers['left'] ? '#333333' : undefined}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.playerContainer, styles.centerFielder]}
                        onPress={() => handlePlayerIconPress(selectedPlayers['center'] || null, 'center')}
                        activeOpacity={0.7}
                    >
                        {selectedPlayers['center'] && <View style={styles.nameTag}><Text style={styles.nameText}>{selectedPlayers['center'].name}</Text></View>}
                        <Image 
                            source={getPlayerIcon('center')} 
                            style={[styles.playerIcon, !selectedPlayers['center'] && styles.playerIconSilhouette]} 
                            tintColor={!selectedPlayers['center'] ? '#333333' : undefined}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.playerContainer, styles.rightFielder]}
                        onPress={() => handlePlayerIconPress(selectedPlayers['right'] || null, 'right')}
                        activeOpacity={0.7}
                    >
                        {selectedPlayers['right'] && <View style={styles.nameTag}><Text style={styles.nameText}>{selectedPlayers['right'].name}</Text></View>}
                        <Image 
                            source={getPlayerIcon('right')} 
                            style={[styles.playerIcon, !selectedPlayers['right'] && styles.playerIconSilhouette]} 
                            tintColor={!selectedPlayers['right'] ? '#333333' : undefined}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            {/* --- 2. Sliding Panel --- */}
            <Animated.View 
                style={[
                    styles.slidingPanel, 
                    { 
                        transform: [{ translateY: slideAnim }],
                        opacity: slideAnim.interpolate({
                            inputRange: [0, PANEL_HEIGHT],
                            outputRange: [1, 0],
                            extrapolate: 'clamp',
                        }),
                    }
                ]}
                pointerEvents={isPanelOpen ? 'auto' : 'none'}
            >
                <BlurView intensity={80} tint="light" style={styles.panelBlurContainer}>
                    <View style={styles.panelHeader} {...panResponder.panHandlers}>
                        <View style={styles.panelHandle} />
                    </View>
                    <View style={styles.panelBody}>
                        <View style={styles.panelTitleContainer}>
                            <Text style={styles.panelTitle}>
                                {activeTab === 'album' ? '앨범' : 
                                 activeTab === 'roster' ? '선수 선택' : 
                                 activeTab === 'stats' ? '통계' : ''}
                            </Text>
                            {activeTab === 'album' && (Object.keys(selectedPlayers).length > 0 || startingPitcher || reliefPitchers.length > 0) && (
                                <View style={styles.countBadge}>
                                    <Text style={styles.countText}>
                                        {Object.keys(selectedPlayers).length + (startingPitcher ? 1 : 0) + reliefPitchers.length}
                                    </Text>
                                </View>
                            )}
                        </View>
                        {renderPanelContent()}
                    </View>
                </BlurView>
            </Animated.View>

            {/* --- 3. Navigation Bar --- */}
            <View style={styles.navBarWrapper}>
                <NavBar onTabSelect={handleTabSelect} activeTab={activeTab} isPanelOpen={isPanelOpen} />
            </View>

            {/* --- 4. Player Profile Modal --- */}
            <Profile 
                player={profilePlayer}
                visible={isProfileVisible}
                onClose={handleCloseProfile}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: AUDIENCE_COLOR },
    gameArea: { flex: 1, position: 'relative', overflow: 'hidden' },
    
    // --- Background Image Style ---
    backgroundImage: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
    },
    
    // --- Logo Styles ---
    logoContainer: {
        position: 'absolute',
        top: height * 0.05,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 5,
    },
    logoImage: {
        width: 300,
        height: 120,
    },

    // --- Panel Styles ---
    slidingPanel: {
        position: 'absolute', bottom: 90, width: width, height: PANEL_HEIGHT,
        borderTopLeftRadius: 30, borderTopRightRadius: 30,
        zIndex: 10, shadowColor: "#000", shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.2, shadowRadius: 10, elevation: 15, paddingBottom: 0,
        overflow: 'hidden',
    },
    panelBlurContainer: {
        flex: 1,
        backgroundColor: 'rgba(240, 244, 247, 0.5)',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        borderTopWidth: 1,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    panelHeader: { width: '100%', height: 50, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(100, 130, 150, 0.3)' },
    panelHandle: { width: 50, height: 6, borderRadius: 3, backgroundColor: '#7896AA' },
    panelBody: { flex: 1, paddingTop: 20 },
    panelTitleContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingHorizontal: 20 },
    panelTitle: { fontSize: 22, fontWeight: 'bold', color: '#3D5566', marginRight: 10 },
    countBadge: { backgroundColor: '#7896AA', borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
    countText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
    panelText: { fontSize: 16, color: '#424242' },
    navBarWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'transparent', zIndex: 20 },
    
    playersLayer: { width: '100%', height: '100%', position: 'absolute', zIndex: 20 },
    playerContainer: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
    playerIcon: { width: 150, height: 150, resizeMode: 'contain', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 8 },
    playerIconSilhouette: { 
        opacity: 0.8,
        tintColor: '#333333',
    },
    nameTag: { position: 'absolute', top: 90, backgroundColor: '#ffffff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 2, borderColor: '#5d4037', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 5, zIndex: 25 },
    nameText: { fontSize: 12, fontWeight: 'bold', color: '#5d4037', textAlign: 'center' },
    
    pitcher: { top: '65%', left: '47%', marginTop: -65, marginLeft: -65 },
    relief1: { top: '83%', left: '10%', marginTop: -65, marginLeft: -65 },
    relief2: { top: '83%', right: '10%', marginTop: -65, marginRight: -65 },
    relief3: { top: '83%', left: '25%', marginTop: -65, marginLeft: -65 },
    relief4: { top: '83%', right: '25%', marginTop: -65, marginRight: -65 },
    catcher: { bottom: '11%', left: '48%', marginLeft: -68 },
    firstBaseman: { top: '65%', right: '-3%', marginTop: -65 },
    secondBaseman: { top: '53%', right: '14%', marginTop: -65 },
    shortstop: { top: '53%', left: '13%', marginTop: -65 },
    thirdBaseman: { top: '65%', left: '-4%', marginTop: -65 },
    leftFielder: { top: '40%', left: '1%', marginTop: -65 },
    centerFielder: { top: '30%', left: '47%', marginLeft: -65, marginTop: -65 },
    rightFielder: { top: '40%', right: '1%', marginTop: -65 },
});
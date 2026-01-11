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
    View
} from 'react-native';
import Album from '../components/album';
import NavBar from '../components/NavBar';
import PlayerSelector from '../components/player-selector';
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
        } else {
            setActiveTab(tabName);
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

    const getPlayerIcon = (position: PlayerPosition) => {
        return selectedPlayers[position] 
            ? require('../assets/images/player.png')
            : require('../assets/images/player-black.png');
    };

    const renderPanelContent = () => {
        switch (activeTab) {
            case 'album': return <Album selectedPlayers={selectedPlayers} />;
            case 'roster': return <PlayerSelector selectedPlayers={selectedPlayers} onPlayerSelect={handlePlayerSelect} />;
            case 'stats': return <Text style={styles.panelText}>📊 통계 (Stats Placeholder)</Text>;
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
                        source={require('../assets/images/Logo_transparent.png')} 
                        style={styles.logoImage}
                        resizeMode="contain"
                    />
                </View>

                {/* Player Icons Layer */}
                <View style={styles.playersLayer}>
                    <View style={[styles.playerContainer, styles.pitcher]}>
                        {selectedPlayers['pitcher'] && <View style={styles.nameTag}><Text style={styles.nameText}>{selectedPlayers['pitcher'].name} #{selectedPlayers['pitcher'].back_number}</Text></View>}
                        <Image source={getPlayerIcon('pitcher')} style={styles.playerIcon} />
                    </View>
                    <View style={[styles.playerContainer, styles.catcher]}>
                        {selectedPlayers['catcher'] && <View style={styles.nameTag}><Text style={styles.nameText}>{selectedPlayers['catcher'].name}</Text></View>}
                        <Image source={getPlayerIcon('catcher')} style={styles.playerIcon} />
                    </View>
                    <View style={[styles.playerContainer, styles.firstBaseman]}>
                        {selectedPlayers['first'] && <View style={styles.nameTag}><Text style={styles.nameText}>{selectedPlayers['first'].name}</Text></View>}
                        <Image source={getPlayerIcon('first')} style={styles.playerIcon} />
                    </View>
                    <View style={[styles.playerContainer, styles.secondBaseman]}>
                        {selectedPlayers['second'] && <View style={styles.nameTag}><Text style={styles.nameText}>{selectedPlayers['second'].name}</Text></View>}
                        <Image source={getPlayerIcon('second')} style={styles.playerIcon} />
                    </View>
                    <View style={[styles.playerContainer, styles.shortstop]}>
                        {selectedPlayers['shortstop'] && <View style={styles.nameTag}><Text style={styles.nameText}>{selectedPlayers['shortstop'].name}</Text></View>}
                        <Image source={getPlayerIcon('shortstop')} style={styles.playerIcon} />
                    </View>
                    <View style={[styles.playerContainer, styles.thirdBaseman]}>
                        {selectedPlayers['third'] && <View style={styles.nameTag}><Text style={styles.nameText}>{selectedPlayers['third'].name}</Text></View>}
                        <Image source={getPlayerIcon('third')} style={styles.playerIcon} />
                    </View>
                    <View style={[styles.playerContainer, styles.leftFielder]}>
                        {selectedPlayers['left'] && <View style={styles.nameTag}><Text style={styles.nameText}>{selectedPlayers['left'].name}</Text></View>}
                        <Image source={getPlayerIcon('left')} style={styles.playerIcon} />
                    </View>
                    <View style={[styles.playerContainer, styles.centerFielder]}>
                        {selectedPlayers['center'] && <View style={styles.nameTag}><Text style={styles.nameText}>{selectedPlayers['center'].name}</Text></View>}
                        <Image source={getPlayerIcon('center')} style={styles.playerIcon} />
                    </View>
                    <View style={[styles.playerContainer, styles.rightFielder]}>
                        {selectedPlayers['right'] && <View style={styles.nameTag}><Text style={styles.nameText}>{selectedPlayers['right'].name}</Text></View>}
                        <Image source={getPlayerIcon('right')} style={styles.playerIcon} />
                    </View>
                </View>
            </View>

            {/* --- 2. Sliding Panel --- */}
            <Animated.View style={[styles.slidingPanel, { transform: [{ translateY: slideAnim }] }]}>
                <View style={styles.panelHeader} {...panResponder.panHandlers}>
                    <View style={styles.panelHandle} />
                </View>
                <View style={styles.panelBody}>
                    <Text style={styles.panelTitle}>
                        {activeTab === 'album' ? '앨범' : 
                         activeTab === 'roster' ? '선수 선택' : 
                         activeTab === 'stats' ? '통계' : ''}
                    </Text>
                    {renderPanelContent()}
                </View>
            </Animated.View>

            {/* --- 3. Navigation Bar --- */}
            <NavBar onTabSelect={handleTabSelect} activeTab={activeTab} />
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
        position: 'absolute', bottom: 80, width: width, height: PANEL_HEIGHT,
        backgroundColor: '#F0F4F7', borderTopLeftRadius: 30, borderTopRightRadius: 30,
        zIndex: 10, shadowColor: "#000", shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1, shadowRadius: 5, elevation: 15, paddingBottom: 0,
    },
    panelHeader: { width: '100%', height: 50, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(100, 130, 150, 0.3)' },
    panelHandle: { width: 50, height: 6, borderRadius: 3, backgroundColor: '#7896AA' },
    panelBody: { flex: 1, paddingTop: 20 },
    panelTitle: { fontSize: 22, fontWeight: 'bold', color: '#3D5566', marginBottom: 20, paddingHorizontal: 20 },
    panelText: { fontSize: 16, color: '#424242' },
    
    playersLayer: { width: '100%', height: '100%', position: 'absolute', zIndex: 20 },
    playerContainer: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
    playerIcon: { width: 130, height: 130, resizeMode: 'contain', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 8 },
    nameTag: { position: 'absolute', top: 70, backgroundColor: '#ffffff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 2, borderColor: '#5d4037', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 5, zIndex: 25 },
    nameText: { fontSize: 12, fontWeight: 'bold', color: '#5d4037', textAlign: 'center' },
    
    pitcher: { top: '68%', left: '50%', marginTop: -65, marginLeft: -65 },
    catcher: { bottom: '10%', left: '50%', marginLeft: -68 },
    firstBaseman: { top: '68%', right: '-3%', marginTop: -65 },
    secondBaseman: { top: '55%', right: '15%', marginTop: -65 },
    shortstop: { top: '55%', left: '15%', marginTop: -65 },
    thirdBaseman: { top: '68%', left: '-4%', marginTop: -65 },
    leftFielder: { top: '35%', left: '10%', marginTop: -65 },
    centerFielder: { top: '27%', left: '50%', marginLeft: -65, marginTop: -65 },
    rightFielder: { top: '35%', right: '10%', marginTop: -65 },
});
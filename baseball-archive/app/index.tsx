import React, { useRef, useState } from 'react';
import {
    StyleSheet,
    View,
    Dimensions,
    SafeAreaView,
    StatusBar,
    ImageBackground,
    Animated,
    Text,
    Image,
    PanResponder // 1. Import PanResponder
} from 'react-native';
import NavBar from '../components/NavBar';
import PlayerSelector from '../components/player-selector';

const { width, height } = Dimensions.get('window');

// Configuration
const DIAMOND_SIZE = width * 0.65;
const DIAMOND_OFFSET_BOTTOM = height * 0.22;
const GRASS_TEXTURE_URL = 'https://www.transparenttextures.com/patterns/grass.png';

// Height of the sliding panel
const PANEL_HEIGHT = height * 0.85;

export default function BaseballField() {
    const slideAnim = useRef(new Animated.Value(PANEL_HEIGHT)).current;
    const [activeTab, setActiveTab] = useState<string | null>(null);
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    // --- 2. PanResponder Logic (Drag to Dismiss) ---
    const panResponder = useRef(
        PanResponder.create({
            // Ask: Should this responder claim the touch?
            onMoveShouldSetPanResponder: (_, gestureState) => {
                // Only activate if dragging vertically (dy) significantly
                return Math.abs(gestureState.dy) > 5;
            },
            // On Dragging...
            onPanResponderMove: (_, gestureState) => {
                // Only allow dragging downwards (positive dy)
                if (gestureState.dy > 0) {
                    slideAnim.setValue(gestureState.dy);
                }
            },
            // On Release...
            onPanResponderRelease: (_, gestureState) => {
                // If dragged down more than 150px or flicked fast -> Close it
                if (gestureState.dy > 150 || gestureState.vy > 0.5) {
                    closePanel();
                } else {
                    // Otherwise -> Snap back to top (Open)
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
        // Reset value to 0 just in case
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

    const renderPanelContent = () => {
        switch (activeTab) {
            case 'album':
                return <Text style={styles.panelText}>📸 앨범 (Gallery Placeholder)</Text>;
            case 'roster':
                return <PlayerSelector />;
            case 'stats':
                return <Text style={styles.panelText}>📊 통계 (Stats Placeholder)</Text>;
            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* --- 1. Game Area (Background) --- */}
            <View style={styles.gameArea}>
                <View style={StyleSheet.absoluteFill}>
                    <ImageBackground
                        source={{ uri: GRASS_TEXTURE_URL }}
                        style={{ width: '100%', height: '100%', backgroundColor: '#3a7c33' }}
                        resizeMode="repeat"
                        imageStyle={{ opacity: 0.4 }}
                    >
                        <View style={styles.mowerStripesContainer}>
                            {Array.from({ length: Math.ceil(width / 30) }).map((_, i) => (
                                <View key={i} style={[styles.mowerStripe, { left: i * 30, backgroundColor: i % 2 === 0 ? 'rgba(0,0,0,0.05)' : 'transparent' }]} />
                            ))}
                        </View>
                    </ImageBackground>
                </View>

                {/* Baseball Field Graphics */}
                <View style={styles.fieldLayout}>
                    <View style={styles.diamondContainer}>
                        <View style={styles.infieldDirt} />
                        <View style={styles.infieldGrass}>
                            <ImageBackground source={{ uri: GRASS_TEXTURE_URL }} style={{ flex: 1, opacity: 0.6 }} resizeMode="repeat" />
                        </View>
                        <View style={styles.basesLayer}>
                            <View style={styles.battersBoxLeft} />
                            <View style={styles.battersBoxRight} />
                            <View style={[styles.base, styles.homePlate]} />
                            <View style={[styles.base, styles.firstBase]} />
                            <View style={[styles.base, styles.secondBase]} />
                            <View style={[styles.base, styles.thirdBase]} />
                            <View style={styles.pitchersMound}><View style={styles.pitchersRubber} /></View>
                        </View>

                        {/* Player Icons Layer */}
                        <View style={styles.playersLayer}>
                            {/* 투수 (Pitcher) */}
                            <Image source={require('../assets/images/player.png')} style={[styles.playerIcon, styles.pitcher]} />
                            {/* 포수 (Catcher) */}
                            <Image source={require('../assets/images/player-black.png')} style={[styles.playerIcon, styles.catcher]} />
                            {/* 1루수 (First Baseman) */}
                            <Image source={require('../assets/images/player-black.png')} style={[styles.playerIcon, styles.firstBaseman]} />
                            {/* 2루수 (Second Baseman) */}
                            <Image source={require('../assets/images/player-black.png')} style={[styles.playerIcon, styles.secondBaseman]} />
                            {/* 유격수 (Shortstop) */}
                            <Image source={require('../assets/images/player-black.png')} style={[styles.playerIcon, styles.shortstop]} />
                            {/* 3루수 (Third Baseman) */}
                            <Image source={require('../assets/images/player-black.png')} style={[styles.playerIcon, styles.thirdBaseman]} />
                            {/* 좌익수 (Left Fielder) */}
                            <Image source={require('../assets/images/player-black.png')} style={[styles.playerIcon, styles.leftFielder]} />
                            {/* 중견수 (Center Fielder) */}
                            <Image source={require('../assets/images/player-black.png')} style={[styles.playerIcon, styles.centerFielder]} />
                            {/* 우익수 (Right Fielder) */}
                            <Image source={require('../assets/images/player-black.png')} style={[styles.playerIcon, styles.rightFielder]} />
                        </View>
                    </View>
                </View>
            </View>

            {/* --- 2. Sliding Panel --- */}
            <Animated.View
                style={[
                    styles.slidingPanel,
                    { transform: [{ translateY: slideAnim }] }
                ]}
            >
                {/* 3. Panel Header: Attach PanHandlers here so only the top bar is draggable */}
                <View style={styles.panelHeader} {...panResponder.panHandlers}>
                    <View style={styles.panelHandle} />
                    {/* Close button removed */}
                </View>

                {/* Panel Content */}
                <View style={styles.panelBody}>
                    <Text style={styles.panelTitle}>
                        {activeTab === 'album' ? '앨범' : activeTab === 'roster' ? '선수 선택' : '통계'}
                    </Text>
                    {renderPanelContent()}
                </View>
            </Animated.View>

            {/* --- 3. Navigation Bar --- */}
            <NavBar onTabSelect={handleTabSelect} />

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#3a7c33',
    },
    gameArea: {
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
    },
    // --- Sliding Panel Styles ---
    slidingPanel: {
        position: 'absolute',
        bottom: 80,
        width: width,
        height: PANEL_HEIGHT,
        backgroundColor: '#5d4037', // Dark Mud
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        zIndex: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.4,
        shadowRadius: 5,
        elevation: 15,
        paddingBottom: 100,
    },
    panelHeader: {
        width: '100%',
        height: 50, // Increased height for easier gripping
        alignItems: 'center',
        justifyContent: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#6d4c41',
    },
    panelHandle: {
        width: 50,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#a1887f', // Slightly lighter handle to see it better
    },
    panelBody: {
        flex: 1,
        paddingTop: 20,
        paddingHorizontal: 0,
    },
    panelTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 20,
        paddingHorizontal: 20,
    },
    panelText: {
        fontSize: 16,
        color: '#efebe9',
    },

    // --- Existing Field Styles ---
    mowerStripesContainer: { ...StyleSheet.absoluteFillObject, flexDirection: 'row' },
    mowerStripe: { width: 30, height: '100%', position: 'absolute', top: 0, bottom: 0 },
    fieldLayout: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
    diamondContainer: { width: DIAMOND_SIZE, height: DIAMOND_SIZE, marginBottom: DIAMOND_OFFSET_BOTTOM, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
    infieldDirt: { width: '100%', height: '100%', backgroundColor: '#c29668', position: 'absolute', transform: [{ rotate: '45deg' }], borderRadius: 8, borderWidth: 2, borderColor: 'rgba(0,0,0,0.15)' },
    infieldGrass: { width: '70%', height: '70%', backgroundColor: '#4a9c40', position: 'absolute', transform: [{ rotate: '45deg' }], borderRadius: 4, overflow: 'hidden' },
    basesLayer: { width: '100%', height: '100%', position: 'absolute' },
    base: { width: 16, height: 16, backgroundColor: '#ffffff', position: 'absolute', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 1.5, elevation: 3, zIndex: 10 },
    homePlate: { bottom: -6, alignSelf: 'center', width: 18, height: 18, transform: [{ rotate: '45deg' }], borderRadius: 1 },
    firstBase: { right: -8, top: '50%', marginTop: -8, borderRadius: 1 },
    secondBase: { top: -8, alignSelf: 'center', borderRadius: 1 },
    thirdBase: { left: -8, top: '50%', marginTop: -8, borderRadius: 1 },
    battersBoxLeft: { position: 'absolute', bottom: -15, left: '50%', marginLeft: -48, width: 26, height: 48, borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)' },
    battersBoxRight: { position: 'absolute', bottom: -15, left: '50%', marginLeft: 22, width: 26, height: 48, borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)' },
    pitchersMound: { width: DIAMOND_SIZE * 0.18, height: DIAMOND_SIZE * 0.18, backgroundColor: '#b38a5d', borderRadius: 50, alignSelf: 'center', top: '50%', marginTop: -(DIAMOND_SIZE * 0.09), alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)', zIndex: 5 },
    pitchersRubber: { width: 14, height: 4, backgroundColor: '#ffffff', borderRadius: 1 },
    
    // Player Icons
    playersLayer: { 
        width: '100%', 
        height: '100%', 
        position: 'absolute',
        zIndex: 20,
    },
    playerIcon: {
        width: 100,
        height: 100,
        position: 'absolute',
        resizeMode: 'contain',
        zIndex: 20,
    },
    pitcher: {
        top: '50%',
        left: '50%',
        marginTop: -70,
        marginLeft: -50,
    },
    catcher: {
        bottom: -65,
        left: '50%',
        marginLeft: -50,
    },
    firstBaseman: {
        right: '-25%',
        top: '50%',
        marginTop: -50,
    },
    secondBaseman: {
        right: '5%',
        top: '-5%',
        marginTop: 0,
    },
    shortstop: {
        left: '5%',
        top: '-5%',
        marginTop: 0,
    },
    thirdBaseman: {
        left: '-25%',
        top: '50%',
        marginTop: -50,
    },
    leftFielder: {
        left: '0%',
        top: '-65%',
        marginLeft: -20,
    },
    centerFielder: {
        left: '50%',
        top: '-100%',
        marginLeft:-50,
    },
    rightFielder: {
        right: '0%',
        top: '-65%',
        marginRight: -20,
    },
});
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

interface NavBarProps {
    onTabSelect: (tabName: string) => void;
    activeTab?: string | null;
    isPanelOpen?: boolean;
}

export default function NavBar({ onTabSelect, activeTab = null, isPanelOpen = false }: NavBarProps) {
    const handleTabPress = (tabName: string) => {
        onTabSelect(tabName);
    };

    return (
        <BlurView 
            intensity={80} 
            tint="light"
            style={[
                styles.container,
                isPanelOpen && styles.containerFlat
            ]}
        >
            {/* 1. Album Button */}
            <TouchableOpacity
                style={styles.iconContainer}
                onPress={() => handleTabPress('album')}
                activeOpacity={0.7}
            >
                <View style={[
                    styles.iconCircle,
                    activeTab === 'album' && styles.activeIconCircle
                ]}>
                    <Ionicons 
                        name="images-outline" 
                        size={28} // 아이콘 크기를 조금 키워 가시성을 높였습니다
                        color={activeTab === 'album' ? '#000000' : '#333333'} 
                    />
                </View>
            </TouchableOpacity>

            {/* 2. Roster Button */}
            <TouchableOpacity
                style={styles.iconContainer}
                onPress={() => handleTabPress('roster')}
                activeOpacity={0.7}
            >
                <View style={[
                    styles.iconCircle,
                    activeTab === 'roster' && styles.activeIconCircle
                ]}>
                    <Ionicons 
                        name="people-outline" 
                        size={28} 
                        color={activeTab === 'roster' ? '#000000' : '#333333'} 
                    />
                </View>
            </TouchableOpacity>

            {/* 3. Stats Button */}
            <TouchableOpacity
                style={styles.iconContainer}
                onPress={() => handleTabPress('stats')}
                activeOpacity={0.7}
            >
                <View style={[
                    styles.iconCircle,
                    activeTab === 'stats' && styles.activeIconCircle
                ]}>
                    <Ionicons 
                        name="stats-chart-outline" 
                        size={28} 
                        color={activeTab === 'stats' ? '#000000' : '#333333'} 
                    />
                </View>
            </TouchableOpacity>
        </BlurView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        height: 90,
        backgroundColor: 'rgba(240, 244, 247, 0.5)', // Semi-transparent glassmorphism background
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderTopWidth: 1,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)', // Subtle white border for glass effect
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingBottom: 24,
        paddingTop: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 10,
        zIndex: 20,
        overflow: 'hidden', 
    },
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        // 안드로이드에서 아이콘이 BlurView 위로 올라오도록 zIndex와 elevation 설정
        zIndex: 10,
        elevation: 10,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        // [중요] overflow: 'hidden' 제거! (안드로이드에서 아이콘 사라짐의 주원인)
        // overflow: 'hidden', 
    },
    activeIconCircle: {
        backgroundColor: 'rgba(120, 150, 170, 0.8)', // Semi-transparent glassmorphism for active icon
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        shadowColor: '#7896AA',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    containerFlat: {
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
    },
});
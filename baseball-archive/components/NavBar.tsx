import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface NavBarProps {
    onTabSelect: (tabName: string) => void;
}

export default function NavBar({ onTabSelect }: NavBarProps) {
    return (
        <View style={styles.container}>

            {/* 1. Album Button */}
            <TouchableOpacity
                style={styles.button}
                onPress={() => onTabSelect('album')}
                activeOpacity={0.7}
            >
                <Ionicons name="images" size={26} color="#ffffff" />
                <Text style={styles.label}>앨범</Text>
            </TouchableOpacity>

            {/* 2. Player List Button */}
            <TouchableOpacity
                style={styles.button}
                onPress={() => onTabSelect('roster')}
                activeOpacity={0.7}
            >
                <Ionicons name="people" size={26} color="#ffffff" />
                <Text style={styles.label}>선수 목록</Text>
            </TouchableOpacity>

            {/* 3. Stats Button */}
            <TouchableOpacity
                style={styles.button}
                onPress={() => onTabSelect('stats')}
                activeOpacity={0.7}
            >
                <Ionicons name="stats-chart" size={26} color="#ffffff" />
                <Text style={styles.label}>통계</Text>
            </TouchableOpacity>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        height: 90,
        backgroundColor: '#5d4037', // Darker Mud Color

        // Rounded top corners
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,

        justifyContent: 'space-around',
        alignItems: 'center',
        paddingBottom: 25,
        paddingTop: 10,

        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 10,
        zIndex: 20,

        // Subtle top border
        borderTopWidth: 1,
        borderTopColor: '#6d4c41',
    },
    button: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    label: {
        color: '#ffffff', // White text
        fontSize: 12,
        marginTop: 4,
        fontWeight: '600',
    },
});
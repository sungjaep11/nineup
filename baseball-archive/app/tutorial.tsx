import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    Image,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

// 튜토리얼 대화 내용
const tutorialDialogues = [
    {
        text: '안녕하세요! 야구 라인업 메이커에 오신 것을 환영합니다!',
    },
    {
        text: '이 앱에서는 KBO 리그 선수들을 선택해서 나만의 최적의 라인업을 만들 수 있어요.',
    },
    {
        text: '하단의 "선수 선택" 탭에서 포지션별로 선수를 선택할 수 있습니다. 타자와 투수를 모두 선택해보세요!',
    },
    {
        text: '선택한 선수 아이콘을 클릭하면 상세 프로필을 확인할 수 있어요. 능력치 오각형 그래프도 볼 수 있습니다.',
    },
    {
        text: '"통계" 탭에서는 팀 전체 능력치와 예상 승률, 순위를 확인할 수 있습니다.',
    },
    {
        text: '"앨범" 탭에서는 선택한 선수들의 사진을 모아볼 수 있어요.',
    },
    {
        text: '이제 나만의 최고의 라인업을 만들어보세요! 🎉',
    },
];

export default function Tutorial() {
    const router = useRouter();
    const [currentDialogueIndex, setCurrentDialogueIndex] = useState(0);
    const [displayedText, setDisplayedText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const isLastDialogue = currentDialogueIndex === tutorialDialogues.length - 1;
    const currentText = tutorialDialogues[currentDialogueIndex].text;

    // 타이핑 애니메이션
    useEffect(() => {
        setDisplayedText('');
        setIsTyping(true);
        let currentIndex = 0;
        
        const typingInterval = setInterval(() => {
            if (currentIndex < currentText.length) {
                setDisplayedText(currentText.substring(0, currentIndex + 1));
                currentIndex++;
            } else {
                setIsTyping(false);
                clearInterval(typingInterval);
            }
        }, 30); // 30ms마다 한 글자씩 (타이핑 속도 조절 가능)

        return () => clearInterval(typingInterval);
    }, [currentDialogueIndex, currentText]);

    const handleScreenPress = () => {
        // 타이핑 중이면 전체 텍스트 표시
        if (isTyping) {
            setDisplayedText(currentText);
            setIsTyping(false);
            return;
        }
        
        if (isLastDialogue) {
            // 마지막 대화에서는 시작 버튼만 표시
            return;
        }
        // 다음 대화로 이동
        setCurrentDialogueIndex((prev) => Math.min(prev + 1, tutorialDialogues.length - 1));
    };

    const handleStart = () => {
        // 메인 화면(야구장)으로 이동
        // expo-router에서 app/index.tsx는 루트 경로 '/'에 매핑됨
        router.push('/');
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.backgroundImage}>
                <TouchableOpacity
                    style={styles.touchableArea}
                    activeOpacity={1}
                    onPress={handleScreenPress}
                >
                    <View style={styles.content}>
                        {/* 플레이어 이미지 - 중앙 */}
                        <View style={styles.playerIconContainer}>
                            <View style={styles.playerIcon}>
                                <Image
                                    source={require('../assets/images/player.png')}
                                    style={styles.playerImage}
                                    resizeMode="contain"
                                />
                            </View>
                        </View>

                        {/* 대화 말풍선 - 중앙 */}
                        <View style={styles.dialogueContainer}>
                            <BlurView
                                intensity={Platform.OS === 'android' ? 30 : 20}
                                tint="light"
                                style={styles.dialogueBubble}
                            >
                                <Text style={styles.dialogueText}>
                                    {displayedText}
                                    {isTyping && <Text style={styles.cursor}>|</Text>}
                                </Text>
                                
                                {/* 대화 진행 표시 */}
                                {!isLastDialogue && !isTyping && (
                                    <View style={styles.dotsContainer}>
                                        {tutorialDialogues.map((_, index) => (
                                            <View
                                                key={index}
                                                style={[
                                                    styles.dot,
                                                    index === currentDialogueIndex && styles.dotActive,
                                                ]}
                                            />
                                        ))}
                                    </View>
                                )}
                            </BlurView>
                            
                            {/* 말풍선 꼬리 - 중앙 */}
                            <View style={styles.dialogueTail} />
                        </View>

                        {/* 시작 버튼 (마지막 대화에서만 표시) */}
                        {isLastDialogue && (
                            <TouchableOpacity
                                style={styles.startButton}
                                onPress={handleStart}
                                activeOpacity={0.8}
                            >
                                <BlurView
                                    intensity={Platform.OS === 'android' ? 30 : 20}
                                    tint="light"
                                    style={styles.startButtonBlur}
                                >
                                    <Text style={styles.startButtonText}>시작</Text>
                                </BlurView>
                            </TouchableOpacity>
                        )}
                    </View>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(173, 216, 230, 0.3)', // 연한 남색 (Light Blue)
    },
    touchableArea: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 100,
    },
    playerIconContainer: {
        position: 'absolute',
        top: (height - 550) / 2,
        left: (width - 550) / 2,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    playerIcon: {
        width: 550,
        height: 550,
        borderRadius: 125,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 0,
        borderColor: 'transparent',
        overflow: 'hidden',
    },
    playerImage: {
        width: '100%',
        height: '100%',
    },
    dialogueContainer: {
        width: width * 0.85,
        maxWidth: 400,
        position: 'absolute',
        top: 80,
        left: width * 0.075,
        alignItems: 'center',
        zIndex: 2,
    },
    dialogueBubble: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 20,
        padding: 24,
        borderWidth: 0,
        borderColor: 'transparent',
    },
    dialogueText: {
        fontSize: 18,
        lineHeight: 28,
        color: '#333333',
        fontWeight: '500',
        textAlign: 'center',
        marginBottom: 16,
    },
    cursor: {
        color: '#7896AA',
        fontWeight: 'bold',
    },
    dialogueTail: {
        position: 'absolute',
        bottom: -15,
        left: '50%',
        marginLeft: -15,
        width: 0,
        height: 0,
        borderLeftWidth: 15,
        borderRightWidth: 15,
        borderTopWidth: 15,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: 'rgba(255, 255, 255, 0.15)',
    },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
    },
    dotActive: {
        backgroundColor: '#7896AA',
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    startButton: {
        position: 'absolute',
        bottom: 40,
        right: 20,
        borderRadius: 25,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    startButtonBlur: {
        backgroundColor: 'rgba(25, 25, 112, 1)', // 짙은 남색 (Navy Blue)
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    startButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
    },
});

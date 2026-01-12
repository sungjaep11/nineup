import { BlurView } from 'expo-blur';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { API_URL } from '../config/api';
import { Player, PlayerPosition, POSITION_NAMES } from '../types/player';

const { width, height } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const IMAGE_SIZE = width / COLUMN_COUNT;

interface PlayerImage {
    id: string;
    playerName: string;
    fileName: string;
    imageUrl: string;
    position?: string;
    playerId?: number;
}

interface AlbumProps {
    selectedPlayers: Partial<Record<PlayerPosition, Player>>;
}

export default function Album({ selectedPlayers }: AlbumProps) {
    const [allImages, setAllImages] = useState<PlayerImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState<PlayerImage | null>(null);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [filteredPlayerName, setFilteredPlayerName] = useState<string | null>(null);

    // 이미지 목록 가져오기
    useEffect(() => {
        fetchPlayerImages();
    }, []);

    const fetchPlayerImages = async () => {
        try {
            const response = await fetch(`${API_URL}/api/player-images/`);
            const data = await response.json();
            setAllImages(data);
        } catch (error) {
            console.error('이미지 로드 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    // 선택된 선수의 이미지만 필터링
    const filteredImages = allImages.filter(img => {
        // 선택된 선수 목록 확인
        const selectedPlayerNames = Object.values(selectedPlayers)
            .filter(player => player !== undefined)
            .map(player => player!.name);
        
        return selectedPlayerNames.includes(img.playerName);
    });

    // 선수 카드 클릭 핸들러
    const handlePlayerChipClick = (playerName: string) => {
        if (filteredPlayerName === playerName) {
            // 같은 선수를 다시 클릭하면 필터 해제
            setFilteredPlayerName(null);
        } else {
            // 다른 선수를 클릭하면 해당 선수로 필터링
            setFilteredPlayerName(playerName);
        }
    };

    // 표시할 이미지: 선택된 선수가 있을 때만 필터링, 없으면 빈 배열
    // 같은 선수의 이미지가 같은 행에 나타나도록 정렬
    const displayImages = useMemo(() => {
        if (Object.keys(selectedPlayers).length === 0) {
            return [];
        }
        
        // 필터링된 선수가 있으면 해당 선수의 이미지만 사용
        const imagesToUse = filteredPlayerName 
            ? filteredImages.filter(img => img.playerName === filteredPlayerName)
            : filteredImages;
        
        // 선수별로 이미지 그룹화
        const imagesByPlayer: Record<string, PlayerImage[]> = {};
        imagesToUse.forEach(img => {
            if (!imagesByPlayer[img.playerName]) {
                imagesByPlayer[img.playerName] = [];
            }
            imagesByPlayer[img.playerName].push(img);
        });
        
        // 선수 이름으로 정렬하여 일관된 순서 유지
        const sortedPlayerNames = Object.keys(imagesByPlayer).sort();
        
        // 각 선수의 이미지를 행 단위로 정렬 (COLUMN_COUNT개씩)
        const sortedImages: PlayerImage[] = [];
        sortedPlayerNames.forEach(playerName => {
            const playerImages = imagesByPlayer[playerName];
            // 선수의 이미지들을 그대로 추가 (같은 선수는 연속으로 배치)
            sortedImages.push(...playerImages);
        });
        
        return sortedImages;
    }, [filteredImages, selectedPlayers, filteredPlayerName]);

    const renderItem = ({ item }: { item: PlayerImage }) => {
        const isHovered = hoveredId === item.id;

        return (
            <TouchableOpacity
                activeOpacity={1}
                style={styles.imageContainer}
                onPress={() => setSelectedImage(item)}
                onPressIn={() => setHoveredId(item.id)}
                onPressOut={() => setHoveredId(null)}
            >
                <Image
                    source={{ uri: item.imageUrl }}
                    style={[
                        styles.image,
                        isHovered && styles.imageHovered  // 호버 시 반투명
                    ]}
                    resizeMode="cover"
                />
                {/* 호버 시 이름 표시 (인스타그램 스타일) */}
                {isHovered && (
                    <View style={styles.overlay}>
                        <Text style={styles.overlayText}>#{item.playerName}</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const closeModal = () => {
        setSelectedImage(null);
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <ActivityIndicator size="large" color="#7896AA" />
                <Text style={styles.loadingText}>이미지 로딩 중...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* 선택된 선수 리스트 */}
            {Object.keys(selectedPlayers).length > 0 && (
                <View style={styles.selectedPlayersHeader}>
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        style={styles.playerChipsContainer}
                        contentContainerStyle={styles.playerChipsContent}
                    >
                        {Object.entries(selectedPlayers).map(([position, player]) => {
                            if (!player) return null;
                            const isSelected = filteredPlayerName === player.name;
                            const blurIntensity = Platform.OS === 'android' ? 30 : 20;
                            return (
                                <TouchableOpacity
                                    key={position}
                                    style={styles.playerChipContainer}
                                    onPress={() => handlePlayerChipClick(player.name)}
                                    activeOpacity={0.8}
                                >
                                    <BlurView
                                        intensity={blurIntensity}
                                        tint="light"
                                        style={[
                                            styles.playerChip,
                                            isSelected && styles.playerChipSelected
                                        ]}
                                    >
                                        <View style={styles.chipContent}>
                                            <Text style={[
                                                styles.chipPosition,
                                                isSelected && styles.chipPositionSelected
                                            ]}>
                                                {POSITION_NAMES[position as PlayerPosition]}
                                            </Text>
                                            <Text style={[
                                                styles.chipName,
                                                isSelected && styles.chipNameSelected
                                            ]}>
                                                {player.name}
                                            </Text>
                                        </View>
                                    </BlurView>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {/* 선수가 선택되지 않았거나 이미지가 없을 때 안내 메시지 */}
            {displayImages.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                    <View style={styles.emptyStateCard}>
                        <Text style={styles.emptyStateIcon}>⚾</Text>
                        {Object.keys(selectedPlayers).length === 0 ? (
                            // 선수를 선택하지 않은 경우
                            <>
                                <Text style={styles.emptyStateTitle}>나만의 라인업 선수를 골라주세요!</Text>
                                <Text style={styles.emptyStateSubtitle}>
                                    '선수 선택' 탭에서{'\n'}포지션별 선수를 선택해보세요
                                </Text>
                                <View style={styles.emptyStateIconRow}>
                                    <Text style={styles.emptyStateSmallIcon}>👉</Text>
                                    <Text style={styles.emptyStateHint}>오른쪽 탭 클릭</Text>
                                </View>
                            </>
                        ) : (
                            // 선수는 선택했지만 이미지가 없는 경우
                            <>
                                <Text style={styles.emptyStateTitle}>선택된 선수의 이미지가 없습니다</Text>
                                <Text style={styles.emptyStateSubtitle}>
                                    다른 선수를 선택해주세요
                                </Text>
                            </>
                        )}
                    </View>
                </View>
            ) : (
                /* 이미지 그리드 */
                <FlatList
                    data={displayImages}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    numColumns={COLUMN_COUNT}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* --- Image Popup Modal --- */}
            <Modal
                visible={selectedImage !== null}
                transparent={true}
                animationType="fade"
                onRequestClose={closeModal}
            >
                <TouchableOpacity
                    style={styles.modalBackground}
                    activeOpacity={1}
                    onPress={closeModal}
                >
                    <TouchableWithoutFeedback>
                        <View style={styles.fullImageContainer}>
                            {selectedImage && (
                                <>
                                    <Image
                                        source={{ uri: selectedImage.imageUrl }}
                                        style={styles.fullImage}
                                        resizeMode="contain"
                                    />
                                    <View style={styles.modalNameTag}>
                                        <Text style={styles.modalNameText}>
                                            #{selectedImage.playerName}
                                        </Text>
                                    </View>
                                </>
                            )}
                        </View>
                    </TouchableWithoutFeedback>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        backgroundColor: 'transparent',
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 14,
        color: '#757575',
    },
    emptyText: {
        fontSize: 16,
        color: '#757575',
        textAlign: 'center',
    },
    listContent: {
        paddingBottom: 5,
        paddingTop: 5,
    },
    imageContainer: {
        width: IMAGE_SIZE,
        height: IMAGE_SIZE,
        padding: 1,
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
        backgroundColor: '#E0E0E0',
    },
    imageHovered: {
        opacity: 0.3,  // 이미지 반투명하게
    },
    // 호버 오버레이 (인스타그램 스타일)
    overlay: {
        position: 'absolute',
        top: 1,
        left: 1,
        right: 1,
        bottom: 1,
        justifyContent: 'center',
        alignItems: 'center',
        pointerEvents: 'none',  // 터치 이벤트 무시
    },
    overlayText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10,
    },
    // --- Modal Styles ---
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullImageContainer: {
        width: '90%',
        height: '80%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullImage: {
        width: '100%',
        height: '100%',
    },
    modalNameTag: {
        position: 'absolute',
        bottom: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    modalNameText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    // 선택된 선수 헤더 스타일 - Glassmorphism 적용
    selectedPlayersHeader: {
        backgroundColor: 'transparent',
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    playerChipsContainer: {
        flexGrow: 0,
    },
    playerChipsContent: {
        paddingVertical: 4,
    },
    playerChipContainer: {
        marginRight: 12,
        borderRadius: 12,
    },
    playerChip: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
        overflow: 'hidden',
    },
    playerChipSelected: {
        backgroundColor: 'rgba(120, 150, 170, 0.8)',
    },
    chipContent: {
        alignItems: 'center',
    },
    chipPosition: {
        fontSize: 12,
        fontWeight: '600',
        color: '#333333',
        marginBottom: 4,
    },
    chipPositionSelected: {
        color: '#FFFFFF',
    },
    chipName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000000',
        marginBottom: 2,
    },
    chipNameSelected: {
        color: '#FFFFFF',
    },
    chipNumber: {
        fontSize: 12,
        color: '#757575',
    },
    // 빈 상태 안내 메시지 스타일
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        backgroundColor: 'transparent',
    },
    emptyStateCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 40,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        maxWidth: 400,
    },
    emptyStateIcon: {
        fontSize: 80,
        marginBottom: 20,
    },
    emptyStateTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#3D5566',
        textAlign: 'center',
        marginBottom: 12,
    },
    emptyStateSubtitle: {
        fontSize: 16,
        color: '#757575',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 24,
    },
    emptyStateIconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F4F7',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    emptyStateSmallIcon: {
        fontSize: 24,
        marginRight: 8,
    },
    emptyStateHint: {
        fontSize: 16,
        fontWeight: '600',
        color: '#7896AA',
    },
});
import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    FlatList,
    Image,
    Dimensions,
    TouchableOpacity,
    Modal,
    TouchableWithoutFeedback,
    Text,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { Player, PlayerPosition, POSITION_NAMES } from '../types/player';
import { API_URL } from '../config/api';

const { width, height } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const IMAGE_SIZE = width / COLUMN_COUNT;

interface PlayerImage {
    id: string;
    playerName: string;
    fileName: string;
    imageUrl: string;
}

interface AlbumProps {
    selectedPlayers: Partial<Record<PlayerPosition, Player>>;
}

export default function Album({ selectedPlayers }: AlbumProps) {
    const [allImages, setAllImages] = useState<PlayerImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState<PlayerImage | null>(null);
    const [hoveredId, setHoveredId] = useState<string | null>(null);

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

    // 표시할 이미지: 선택된 선수가 있을 때만 필터링, 없으면 빈 배열
    const displayImages = Object.keys(selectedPlayers).length > 0 
        ? filteredImages 
        : [];

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
                <ActivityIndicator size="large" color="#5d4037" />
                <Text style={styles.loadingText}>이미지 로딩 중...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* 선택된 선수 리스트 헤더 */}
            {Object.keys(selectedPlayers).length > 0 && (
                <View style={styles.selectedPlayersHeader}>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>⚾ 선택된 선수</Text>
                        <View style={styles.countBadge}>
                            <Text style={styles.countText}>
                                {Object.keys(selectedPlayers).length}
                            </Text>
                        </View>
                    </View>
                    
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        style={styles.playerChipsContainer}
                        contentContainerStyle={styles.playerChipsContent}
                    >
                        {Object.entries(selectedPlayers).map(([position, player]) => {
                            if (!player) return null;
                            return (
                                <View key={position} style={styles.playerChip}>
                                    <View style={styles.chipContent}>
                                        <Text style={styles.chipPosition}>
                                            {POSITION_NAMES[position as PlayerPosition]}
                                        </Text>
                                        <Text style={styles.chipName}>{player.name}</Text>
                                        <Text style={styles.chipNumber}>#{player.back_number}</Text>
                                    </View>
                                </View>
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
        color: '#666',
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
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
        backgroundColor: '#e0e0e0',
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
    // 선택된 선수 헤더 스타일
    selectedPlayersHeader: {
        backgroundColor: '#4e342e',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 2,
        borderBottomColor: '#3e2723',
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ffffff',
        marginRight: 10,
    },
    countBadge: {
        backgroundColor: '#ff6f00',
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    countText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    playerChipsContainer: {
        flexGrow: 0,
    },
    playerChipsContent: {
        paddingVertical: 4,
    },
    playerChip: {
        backgroundColor: '#6d4c41',
        borderRadius: 12,
        marginRight: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        borderWidth: 2,
        borderColor: '#8d6e63',
    },
    chipContent: {
        alignItems: 'center',
    },
    chipPosition: {
        fontSize: 12,
        fontWeight: '600',
        color: '#ffcc80',
        marginBottom: 4,
    },
    chipName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 2,
    },
    chipNumber: {
        fontSize: 12,
        color: '#e0e0e0',
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
        backgroundColor: '#6d4c41',
        borderRadius: 20,
        padding: 40,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
        borderWidth: 3,
        borderColor: '#8d6e63',
        maxWidth: 400,
    },
    emptyStateIcon: {
        fontSize: 80,
        marginBottom: 20,
    },
    emptyStateTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center',
        marginBottom: 12,
    },
    emptyStateSubtitle: {
        fontSize: 16,
        color: '#e0e0e0',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 24,
    },
    emptyStateIconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#5d4037',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 25,
    },
    emptyStateSmallIcon: {
        fontSize: 24,
        marginRight: 8,
    },
    emptyStateHint: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffcc80',
    },
});
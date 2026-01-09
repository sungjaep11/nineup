import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    FlatList,
    Image,
    Dimensions,
    TouchableOpacity,
    ImageSourcePropType,
    Modal,
    TouchableWithoutFeedback
} from 'react-native';

const { width, height } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const IMAGE_SIZE = width / COLUMN_COUNT;

// Define the shape of our image data
interface PlayerImage {
    id: string;
    source: ImageSourcePropType;
}

// =====================================================================
// IMPORTANT: Add your local images here.
// =====================================================================
const images: PlayerImage[] = [
    { id: '1', source: require('../assets/images/players/133098786.1.webp') },
    { id: '2', source: require('../assets/images/players/29676a5b-0570-44e1-9557-2d15a338be02.jpg') },
    { id: '3', source: require('../assets/images/players/koo.jpeg') },
    { id: '4', source: require('../assets/images/players/l_2022031501001766600161351.jpg') },
    { id: '5', source: require('../assets/images/players/choo.jpeg') },
];

export default function Album() {
    const [selectedImage, setSelectedImage] = useState<PlayerImage | null>(null);

    const renderItem = ({ item }: { item: PlayerImage }) => {
        return (
            <TouchableOpacity
                activeOpacity={0.8}
                style={styles.imageContainer}
                onPress={() => setSelectedImage(item)}
            >
                <Image
                    source={item.source}
                    style={styles.image}
                    resizeMode="cover"
                />
            </TouchableOpacity>
        );
    };

    const closeModal = () => {
        setSelectedImage(null);
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={images}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                numColumns={COLUMN_COUNT}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />

            {/* --- Image Popup Modal --- */}
            <Modal
                visible={selectedImage !== null}
                transparent={true}
                animationType="fade"
                onRequestClose={closeModal} // Android hardware back button support
            >
                {/* Outer TouchableOpacity covers the whole screen.
                   Pressing it calls closeModal.
                */}
                <TouchableOpacity
                    style={styles.modalBackground}
                    activeOpacity={1}
                    onPress={closeModal}
                >
                    {/* TouchableWithoutFeedback wraps the image.
                       It intercepts the press so the outer onPress (closeModal) isn't triggered
                       when you click the image itself.
                    */}
                    <TouchableWithoutFeedback>
                        <View style={styles.fullImageContainer}>
                            {selectedImage && (
                                <Image
                                    source={selectedImage.source}
                                    style={styles.fullImage}
                                    resizeMode="contain"
                                />
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
    listContent: {
        paddingBottom: 20,
        paddingTop: 10,
    },
    imageContainer: {
        width: IMAGE_SIZE,
        height: IMAGE_SIZE,
        padding: 1,
    },
    image: {
        width: '100%',
        height: '100%',
        backgroundColor: '#8d6e63',
    },
    // --- Modal Styles ---
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)', // Dark semi-transparent background
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullImageContainer: {
        width: '90%',
        height: '80%',
        justifyContent: 'center',
        alignItems: 'center',
        // Optional: Add shadow or border to the popup frame
    },
    fullImage: {
        width: '100%',
        height: '100%',
    },
});
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';

interface ProofSubmissionModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (photoUri: string, caption: string) => Promise<void>;
  gameId: string;
  splitType: string;
}

export default function ProofSubmissionModal({
  visible,
  onClose,
  onSubmit,
  gameId,
  splitType,
}: ProofSubmissionModalProps) {
  const [facing, setFacing] = useState<CameraType>('front');
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const handleClose = () => {
    setPhotoUri(null);
    setCaption('');
    onClose();
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
        });
        setPhotoUri(photo?.uri || null);
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Error', 'Failed to take picture');
      }
    }
  };

  const handleSubmit = async () => {
    console.log('=== handleSubmit ===');
    console.log('Photo URI:', photoUri);
    console.log('Caption:', caption);

    if (!photoUri) {
      Alert.alert('Error', 'Please take a photo first');
      return;
    }

    if (!caption.trim()) {
      Alert.alert('Error', 'Please add a caption');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(photoUri, caption);
      handleClose();
    } catch (error) {
      console.error('Error submitting proof:', error);
      Alert.alert('Error', 'Failed to submit proof');
    } finally {
      setSubmitting(false);
    }
  };

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.permissionContainer}>
            <Text style={styles.permissionText}>
              We need camera access to take your workout proof
            </Text>
            <TouchableOpacity style={styles.button} onPress={requestPermission}>
              <Text style={styles.buttonText}>GRANT PERMISSION</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.buttonSecondary} onPress={handleClose}>
              <Text style={styles.buttonSecondaryText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent={false} animationType="fade">
      <View style={styles.container}>
        {!photoUri ? (
          <>
            {/* Camera View */}
            <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
              <View style={styles.cameraOverlay}>
                <View style={styles.topBar}>
                  <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                  <Text style={styles.title}>TAKE WORKOUT PROOF</Text>
                  <View style={styles.placeholder} />
                </View>

                <View style={styles.bottomBar}>
                  <TouchableOpacity
                    style={styles.flipButton}
                    onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
                  >
                    <Text style={styles.flipButtonText}>FLIP</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                    <View style={styles.captureButtonInner} />
                  </TouchableOpacity>

                  <View style={styles.placeholder} />
                </View>
              </View>
            </CameraView>
          </>
        ) : (
          <>
            {/* Photo Preview */}
            <KeyboardAvoidingView
              style={styles.previewContainer}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              <View style={styles.topBar}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setPhotoUri(null)}
                >
                  <Text style={styles.closeButtonText}>← RETAKE</Text>
                </TouchableOpacity>
                <Text style={styles.title}>ADD CAPTION</Text>
                <View style={styles.placeholder} />
              </View>

              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.imageContainer}>
                  <Image source={{ uri: photoUri }} style={styles.preview} />
                </View>
              </TouchableWithoutFeedback>

              <View style={styles.captionContainer}>
                <TextInput
                  style={styles.captionInput}
                  placeholder="Add a caption (e.g., 'Leg day complete!')"
                  placeholderTextColor="#999"
                  value={caption}
                  onChangeText={setCaption}
                  multiline
                  maxLength={200}
                  returnKeyType="done"
                  blurOnSubmit={true}
                />

                <TouchableOpacity
                  style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>SUBMIT PROOF</Text>
                  )}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionContainer: {
    backgroundColor: '#FFF',
    borderWidth: 4,
    borderColor: '#000',
    padding: 24,
    margin: 20,
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  permissionText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  closeButton: {
    padding: 10,
  },
  closeButtonText: {
    color: '#FFF',
    fontSize: 24,
    fontFamily: 'Inter_800ExtraBold',
  },
  title: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 1,
  },
  placeholder: {
    width: 50,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 40,
  },
  flipButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 2,
    borderColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  flipButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 1,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 4,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  imageContainer: {
    flex: 1,
  },
  preview: {
    flex: 1,
    resizeMode: 'contain',
  },
  captionContainer: {
    backgroundColor: '#FFF',
    padding: 20,
  },
  captionInput: {
    borderWidth: 3,
    borderColor: '#000',
    backgroundColor: '#FFF',
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    minHeight: 80,
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#000',
    borderWidth: 3,
    borderColor: '#000',
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  buttonText: {
    color: '#FFF',
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  buttonSecondary: {
    backgroundColor: '#FFF',
    borderWidth: 3,
    borderColor: '#000',
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  buttonSecondaryText: {
    color: '#000',
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  submitButton: {
    backgroundColor: '#000',
    borderWidth: 4,
    borderColor: '#000',
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#CCC',
    borderColor: '#999',
  },
  submitButtonText: {
    color: '#FFF',
    textAlign: 'center',
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 14,
    letterSpacing: 1,
  },
});

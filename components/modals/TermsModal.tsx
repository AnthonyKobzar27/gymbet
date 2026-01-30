import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { triggerHaptic } from '@/lib/haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.8;

interface TermsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function TermsModal({ visible, onClose }: TermsModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.modal, { height: MODAL_HEIGHT }]}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>TERMS OF SERVICE</Text>
            <TouchableOpacity
              onPress={() => {
                triggerHaptic?.('light');
                onClose();
              }}
            >
              <Text style={styles.close}>X</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator
          >
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>1. ACCEPTANCE OF TERMS</Text>
              <Text style={styles.sectionText}>
                By creating an account and using this app, you agree to be bound by these Terms of Service and our Community Guidelines. If you do not agree to these terms, you may not use the app.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2. ZERO TOLERANCE POLICY</Text>
              <Text style={styles.sectionText}>
                We have ZERO TOLERANCE for objectionable content or abusive users. Any violation of our Community Guidelines will result in immediate removal of content and permanent ejection of the offending user from the platform.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>3. USER-GENERATED CONTENT</Text>
              <Text style={styles.sectionText}>
                You are solely responsible for all content you post, including workout proofs, images, and captions. You agree not to post any content that is illegal, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, or otherwise objectionable.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>4. CONTENT MODERATION</Text>
              <Text style={styles.sectionText}>
                We reserve the right to review, remove, or modify any user-generated content at any time without notice. Reports of objectionable content will be reviewed within 24 hours, and appropriate action will be taken, including content removal and user account termination.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>5. USER CONDUCT</Text>
              <Text style={styles.sectionText}>
                You agree to use the app in a lawful manner and in accordance with these Terms. You will not engage in any activity that interferes with or disrupts the app or servers, or violates any applicable laws or regulations.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>6. ACCOUNT TERMINATION</Text>
              <Text style={styles.sectionText}>
                We reserve the right to suspend or terminate your account immediately, without prior notice, if you violate these Terms or our Community Guidelines. Upon termination, you will lose access to your account and all associated data.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>7. REPORTING VIOLATIONS</Text>
              <Text style={styles.sectionText}>
                Users can report objectionable content or abusive behavior using the flag feature. All reports will be reviewed within 24 hours, and appropriate action will be taken.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>8. CHANGES TO TERMS</Text>
              <Text style={styles.sectionText}>
                We reserve the right to modify these Terms at any time. Continued use of the app after changes constitutes acceptance of the modified Terms.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.79)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: 320,
    backgroundColor: '#fff',
    padding: 24,
    borderWidth: 4,
    borderColor: '#000',
    borderRadius: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  close: {
    fontSize: 18,
    fontWeight: '800',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 13,
    lineHeight: 20,
  },
});





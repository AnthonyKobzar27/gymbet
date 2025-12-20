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

interface CommunityGuidelinesModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function CommunityGuidelinesModal({ visible, onClose }: CommunityGuidelinesModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.modal, { height: MODAL_HEIGHT }]}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>COMMUNITY GUIDELINES</Text>
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
              <Text style={styles.sectionTitle}>ZERO TOLERANCE POLICY</Text>
              <Text style={styles.sectionText}>
                We have ZERO TOLERANCE for objectionable content or abusive users. Violations will result in immediate content removal and permanent account termination.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>PROHIBITED CONTENT</Text>
              <Text style={styles.sectionText}>
                • Inappropriate Content: No nudity, sexual content, or explicit material{'\n'}
                • Spam: No repetitive, unwanted, or promotional content{'\n'}
                • Harassment: No bullying, threats, or targeted abuse{'\n'}
                • Violence: No violent, graphic, or disturbing content{'\n'}
                • Illegal Activity: No content promoting illegal activities
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>RESPECTFUL BEHAVIOR</Text>
              <Text style={styles.sectionText}>
                Treat all community members with respect. Disagreements are fine, but personal attacks, hate speech, or discriminatory content will not be tolerated.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>WORKOUT PROOFS</Text>
              <Text style={styles.sectionText}>
                All workout proof images must be appropriate and related to fitness activities. Do not post images that are unrelated to workouts or contain objectionable content.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>REPORTING VIOLATIONS</Text>
              <Text style={styles.sectionText}>
                If you see content that violates these guidelines, use the flag feature (three dots icon) to report it. All reports are reviewed within 24 hours.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>BLOCKING USERS</Text>
              <Text style={styles.sectionText}>
                You can block users whose content you don't want to see. Blocked users' content will be automatically filtered from your feed.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>ENFORCEMENT</Text>
              <Text style={styles.sectionText}>
                Violations of these guidelines will result in immediate action, including but not limited to: content removal, account suspension, or permanent ban. We review all flagged content within 24 hours and take appropriate action.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>APPEALS</Text>
              <Text style={styles.sectionText}>
                If you believe your content was removed in error, you may contact support. However, decisions regarding violations are final.
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
    shadowColor: '#000',
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    borderRadius: 0,
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





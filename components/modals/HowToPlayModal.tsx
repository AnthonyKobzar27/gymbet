import React from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { triggerHaptic } from "@/lib/haptics";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.8; // fixed 80% of screen

interface HowToPlayModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function HowToPlayModal({ visible, onClose }: HowToPlayModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.modal, { height: MODAL_HEIGHT }]}>
          {/* HEADER */}
          <View style={styles.headerRow}>
            <Text style={styles.title}>HOW TO PLAY</Text>
            <TouchableOpacity
              onPress={() => {
                triggerHaptic?.("light");
                onClose();
              }}
            >
              <Text style={styles.close}>X</Text>
            </TouchableOpacity>
          </View>

          {/* SCROLLABLE CONTENT */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator
          >
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>1. CREATE A GAME</Text>
              <Text style={styles.sectionText}>
                Set up your weekly workout schedule. Define which muscle groups
                or exercises you'll do on each day of the week.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2. INVITE FRIENDS</Text>
              <Text style={styles.sectionText}>
                Challenge your friends to join your game. They'll commit to the
                same workout schedule and hold each other accountable.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>3. LOG YOUR WORKOUTS</Text>
              <Text style={styles.sectionText}>
                Each day, log your completed workout. Make sure to follow your
                scheduled split for that day.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>4. SUBMIT PROOF</Text>
              <Text style={styles.sectionText}>
                When required, submit proof of your workout completion. This helps
                ensure everyone stays accountable.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>5. STAY DISCIPLINED</Text>
              <Text style={styles.sectionText}>
                Consistency is key! Complete your workouts on schedule to
                maintain your streak and achieve your fitness goals.
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
    backgroundColor: "rgba(0,0,0,0.79)",
    justifyContent: "center",
    alignItems: "center",
  },

  modal: {
    width: 320,
    backgroundColor: "#fff",
    padding: 24,
    borderWidth: 4,
    borderColor: "#000",
    shadowColor: "#000",
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    borderRadius: 0,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  title: {
    fontSize: 16,
    fontWeight: "800",
  },

  close: {
    fontSize: 18,
    fontWeight: "800",
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
    fontWeight: "800",
    marginBottom: 8,
  },

  sectionText: {
    fontSize: 13,
    lineHeight: 20,
  },
});

import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { createGame, WeeklySchedule } from '@/lib/game_utils';

interface CreateGameModalProps {
  visible: boolean;
  onClose: () => void;
  onGameCreated: () => void;
}

export default function CreateGameModal({ visible, onClose, onGameCreated }: CreateGameModalProps) {
  const [newGameSchedule, setNewGameSchedule] = useState<WeeklySchedule>({
    monday: 'Push',
    tuesday: 'Pull',
    wednesday: 'Legs',
    thursday: 'Push',
    friday: 'Pull',
    saturday: 'Legs',
    sunday: 'Rest',
  });
  const [newGameStake, setNewGameStake] = useState('10');

  const handleCreateGame = async () => {
    if (!newGameStake) {
      Alert.alert('Error', 'Please enter a stake amount');
      return;
    }

    const stake = parseFloat(newGameStake);
    if (isNaN(stake) || stake <= 0) {
      Alert.alert('Error', 'Please enter a valid stake amount');
      return;
    }

    const result = await createGame(newGameSchedule, stake);

    if (result.ok && result.game) {
      Alert.alert('Success', 'Game created! You can now join it.');
      onClose();
      setNewGameSchedule({
        monday: 'Push',
        tuesday: 'Pull',
        wednesday: 'Legs',
        thursday: 'Push',
        friday: 'Pull',
        saturday: 'Legs',
        sunday: 'Rest',
      });
      setNewGameStake('10');
      onGameCreated();
    } else {
      console.error('Failed to create game:', result.error);
      Alert.alert('Error', `Failed to create game: ${result.error?.message || 'Unknown error'}`);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>CREATE NEW GAME</Text>
          <Text style={styles.modalSubtitle}>Set your weekly workout split</Text>

          {/* Two Column Layout for Days */}
          <View style={styles.daysGrid}>
            {/* Left Column */}
            <View style={styles.daysColumn}>
              <View style={styles.dayInputGroup}>
                <Text style={styles.dayInputLabel}>MON</Text>
                <TextInput
                  style={styles.dayInput}
                  value={newGameSchedule.monday}
                  onChangeText={(text) => setNewGameSchedule({...newGameSchedule, monday: text})}
                  placeholder="Push"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={styles.dayInputGroup}>
                <Text style={styles.dayInputLabel}>TUE</Text>
                <TextInput
                  style={styles.dayInput}
                  value={newGameSchedule.tuesday}
                  onChangeText={(text) => setNewGameSchedule({...newGameSchedule, tuesday: text})}
                  placeholder="Pull"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={styles.dayInputGroup}>
                <Text style={styles.dayInputLabel}>WED</Text>
                <TextInput
                  style={styles.dayInput}
                  value={newGameSchedule.wednesday}
                  onChangeText={(text) => setNewGameSchedule({...newGameSchedule, wednesday: text})}
                  placeholder="Legs"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={styles.dayInputGroup}>
                <Text style={styles.dayInputLabel}>THU</Text>
                <TextInput
                  style={styles.dayInput}
                  value={newGameSchedule.thursday}
                  onChangeText={(text) => setNewGameSchedule({...newGameSchedule, thursday: text})}
                  placeholder="Push"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            {/* Right Column */}
            <View style={styles.daysColumn}>
              <View style={styles.dayInputGroup}>
                <Text style={styles.dayInputLabel}>FRI</Text>
                <TextInput
                  style={styles.dayInput}
                  value={newGameSchedule.friday}
                  onChangeText={(text) => setNewGameSchedule({...newGameSchedule, friday: text})}
                  placeholder="Pull"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={styles.dayInputGroup}>
                <Text style={styles.dayInputLabel}>SAT</Text>
                <TextInput
                  style={styles.dayInput}
                  value={newGameSchedule.saturday}
                  onChangeText={(text) => setNewGameSchedule({...newGameSchedule, saturday: text})}
                  placeholder="Legs"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={styles.dayInputGroup}>
                <Text style={styles.dayInputLabel}>SUN</Text>
                <TextInput
                  style={styles.dayInput}
                  value={newGameSchedule.sunday}
                  onChangeText={(text) => setNewGameSchedule({...newGameSchedule, sunday: text})}
                  placeholder="Rest"
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          </View>

          {/* Stake Amount */}
          <Text style={styles.inputLabel}>STAKE AMOUNT ($)</Text>
          <TextInput
            style={styles.input}
            value={newGameStake}
            onChangeText={setNewGameStake}
            placeholder="10"
            keyboardType="numeric"
            placeholderTextColor="#999"
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalButtonSecondary}
              onPress={onClose}
            >
              <Text style={styles.modalButtonSecondaryText}>CANCEL</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalButtonPrimary}
              onPress={handleCreateGame}
            >
              <Text style={styles.modalButtonPrimaryText}>CREATE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
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
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  daysColumn: {
    flex: 1,
  },
  dayInputGroup: {
    marginBottom: 10,
  },
  dayInputLabel: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
    color: '#666',
    marginBottom: 4,
  },
  dayInput: {
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#FFF',
    padding: 10,
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  inputLabel: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
    color: '#666',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 3,
    borderColor: '#000',
    backgroundColor: '#FFF',
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButtonPrimary: {
    flex: 1,
    backgroundColor: '#000',
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
  modalButtonPrimaryText: {
    color: '#FFF',
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  modalButtonSecondary: {
    flex: 1,
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
  modalButtonSecondaryText: {
    color: '#000',
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
});

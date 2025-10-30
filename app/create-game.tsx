import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useGame } from '@/contexts/GameContext';

const CATEGORIES = [
  'Wake Up Early',
  'Exercise',
  'Study',
  'Work',
  'Diet',
  'Meditation',
  'Reading',
  'Other'
];

const QUICK_STAKES = [5, 10, 25, 50, 100];

export default function CreateGameScreen() {
  const { user } = useAuth();
  const { createGame } = useGame();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Wake Up Early');
  const [stakeAmount, setStakeAmount] = useState('10');
  const [maxParticipants, setMaxParticipants] = useState('10');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('06:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('07:00');
  const [requiresPhoto, setRequiresPhoto] = useState(true);
  const [requiresLocation, setRequiresLocation] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreateGame = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a game');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for your challenge');
      return;
    }

    if (!startDate || !endDate) {
      Alert.alert('Error', 'Please set start and end dates');
      return;
    }

    const stake = parseFloat(stakeAmount);
    if (isNaN(stake) || stake < 1) {
      Alert.alert('Error', 'Please enter a valid stake amount (minimum $1)');
      return;
    }

    const maxParts = parseInt(maxParticipants);
    if (isNaN(maxParts) || maxParts < 2) {
      Alert.alert('Error', 'Please enter a valid number of participants (minimum 2)');
      return;
    }

    try {
      // Parse dates
      const startDateTime = new Date(`${startDate}T${startTime}:00`);
      const endDateTime = new Date(`${endDate}T${endTime}:00`);

      if (startDateTime <= new Date()) {
        Alert.alert('Error', 'Start time must be in the future');
        return;
      }

      if (endDateTime <= startDateTime) {
        Alert.alert('Error', 'End time must be after start time');
        return;
      }

      setLoading(true);

      const { error, data } = await createGame({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        startTime: startDateTime,
        endTime: endDateTime,
        stakeAmount: stake,
        maxParticipants: maxParts,
        requiresPhoto,
        requiresLocation,
      });

      if (error) {
        Alert.alert('Error', error.message || 'Failed to create challenge');
      } else {
        Alert.alert(
          'Success!',
          'Your challenge has been created successfully!',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getDefaultEndDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    return tomorrow.toISOString().split('T')[0];
  };

  // Set default dates on mount
  React.useEffect(() => {
    if (!startDate) setStartDate(getTomorrowDate());
    if (!endDate) setEndDate(getDefaultEndDate());
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView}>
          <View style={styles.content}>
            <Text style={styles.title}>Create New Challenge</Text>
            <Text style={styles.subtitle}>
              Set up a discipline challenge and invite others to join!
            </Text>

            {/* Title */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Challenge Title *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., Wake up at 6 AM for a week"
                placeholderTextColor="#666"
                editable={!loading}
              />
            </View>

            {/* Description */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Add more details about your challenge..."
                placeholderTextColor="#666"
                multiline
                numberOfLines={3}
                editable={!loading}
              />
            </View>

            {/* Category */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.categoryContainer}>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryButton,
                        category === cat && styles.categoryButtonActive
                      ]}
                      onPress={() => setCategory(cat)}
                      disabled={loading}
                    >
                      <Text style={[
                        styles.categoryButtonText,
                        category === cat && styles.categoryButtonTextActive
                      ]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Stake Amount */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Stake Amount *</Text>
              <View style={styles.stakeContainer}>
                <View style={styles.stakeInputContainer}>
                  <Text style={styles.dollarSign}>$</Text>
                  <TextInput
                    style={styles.stakeInput}
                    value={stakeAmount}
                    onChangeText={setStakeAmount}
                    placeholder="10"
                    placeholderTextColor="#666"
                    keyboardType="decimal-pad"
                    editable={!loading}
                  />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.quickStakeContainer}>
                    {QUICK_STAKES.map((amount) => (
                      <TouchableOpacity
                        key={amount}
                        style={styles.quickStakeButton}
                        onPress={() => setStakeAmount(amount.toString())}
                        disabled={loading}
                      >
                        <Text style={styles.quickStakeText}>${amount}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>

            {/* Max Participants */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Max Participants</Text>
              <TextInput
                style={styles.input}
                value={maxParticipants}
                onChangeText={setMaxParticipants}
                placeholder="10"
                placeholderTextColor="#666"
                keyboardType="number-pad"
                editable={!loading}
              />
            </View>

            {/* Start Date & Time */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Start Date & Time *</Text>
              <View style={styles.dateTimeContainer}>
                <TextInput
                  style={[styles.input, styles.dateInput]}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#666"
                  editable={!loading}
                />
                <TextInput
                  style={[styles.input, styles.timeInput]}
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="HH:MM"
                  placeholderTextColor="#666"
                  editable={!loading}
                />
              </View>
            </View>

            {/* End Date & Time */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>End Date & Time *</Text>
              <View style={styles.dateTimeContainer}>
                <TextInput
                  style={[styles.input, styles.dateInput]}
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#666"
                  editable={!loading}
                />
                <TextInput
                  style={[styles.input, styles.timeInput]}
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="HH:MM"
                  placeholderTextColor="#666"
                  editable={!loading}
                />
              </View>
            </View>

            {/* Requirements */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Verification Requirements</Text>
              
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setRequiresPhoto(!requiresPhoto)}
                disabled={loading}
              >
                <View style={[styles.checkbox, requiresPhoto && styles.checkboxActive]}>
                  {requiresPhoto && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Require photo proof</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setRequiresLocation(!requiresLocation)}
                disabled={loading}
              >
                <View style={[styles.checkbox, requiresLocation && styles.checkboxActive]}>
                  {requiresLocation && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Require location proof</Text>
              </TouchableOpacity>
            </View>

            {/* Create Button */}
            <TouchableOpacity
              style={[styles.createButton, loading && styles.disabledButton]}
              onPress={handleCreateGame}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.createButtonText}>CREATE CHALLENGE</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdcff3',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter_800ExtraBold',
    color: '#000000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#666666',
    marginBottom: 32,
    lineHeight: 24,
  },

  // Input Containers
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    borderWidth: 3,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#000000',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },

  // Categories
  categoryContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  categoryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  categoryButtonActive: {
    backgroundColor: '#000000',
  },
  categoryButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#000000',
  },
  categoryButtonTextActive: {
    color: '#FFFFFF',
  },

  // Stake
  stakeContainer: {
    gap: 12,
  },
  stakeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
  },
  dollarSign: {
    fontSize: 18,
    fontFamily: 'Inter_800ExtraBold',
    color: '#000000',
    paddingLeft: 16,
  },
  stakeInput: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#000000',
  },
  quickStakeContainer: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  quickStakeButton: {
    backgroundColor: '#E0E0E0',
    borderWidth: 2,
    borderColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  quickStakeText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#000000',
  },

  // Date & Time
  dateTimeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInput: {
    flex: 2,
  },
  timeInput: {
    flex: 1,
  },

  // Checkboxes
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#000000',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_800ExtraBold',
  },
  checkboxLabel: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#000000',
  },

  // Create Button
  createButton: {
    backgroundColor: '#000000',
    borderWidth: 4,
    borderColor: '#000000',
    paddingVertical: 16,
    marginTop: 16,
    marginBottom: 32,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_800ExtraBold',
    textAlign: 'center',
    letterSpacing: 1,
  },
});



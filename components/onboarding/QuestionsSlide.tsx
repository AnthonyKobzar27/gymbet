import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { triggerHaptic } from '@/lib/haptics';

interface QuestionsSlideProps {
  onComplete: (age: number, gender: string | null) => void;
  onBack?: () => void;
}

const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'system-ui',
});

const AGE_OPTIONS = [
  'Under 18',
  '18 - 24',
  '24+',
  'Prefer not to say',
];

const GENDER_OPTIONS = [
  'Male',
  'Female',
  'Non-Binary',
  'Prefer not to say',
];

export default function QuestionsSlide({ onComplete, onBack }: QuestionsSlideProps) {
  const [selectedAge, setSelectedAge] = useState<string | null>(null);
  const [selectedGender, setSelectedGender] = useState<string | null>(null);

  const handleAgeSelect = (age: string) => {
    triggerHaptic('light');
    setSelectedAge(age);
  };

  const handleGenderSelect = (gender: string) => {
    triggerHaptic('light');
    setSelectedGender(gender);
  };

  const handleContinue = () => {
    if (selectedAge && selectedGender) {
      triggerHaptic('medium');
      // Map age to numeric: Under 18 = 1, 18-24 = 2, 24+ = 3, Prefer not to say = 4
      const ageMap: { [key: string]: number } = {
        'Under 18': 1,
        '18 - 24': 2,
        '24+': 3,
        'Prefer not to say': 4,
      };
      const ageValue = ageMap[selectedAge] || 4;
      
      // Map gender: use the string value, or NULL for "Prefer not to say"
      const genderValue = selectedGender === 'Prefer not to say' ? null : selectedGender;
      
      onComplete(ageValue, genderValue);
    } else {
      triggerHaptic('error');
    }
  };

  return (
    <View style={styles.container}>
      {onBack && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Text style={[styles.backArrow, { fontFamily }]}>←</Text>
        </TouchableOpacity>
      )}
      
      <Text style={[styles.title, { fontFamily }]}>First, a few questions....</Text>

      <View style={styles.questionContainer}>
        <Text style={[styles.question, { fontFamily }]}>How old are you?</Text>
        <View style={styles.optionsContainer}>
          {AGE_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.option,
                selectedAge === option && styles.optionSelected,
              ]}
              onPress={() => handleAgeSelect(option)}
            >
              <Text
                style={[
                  styles.optionText,
                  { fontFamily },
                  selectedAge === option && styles.optionTextSelected,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.questionContainer}>
        <Text style={[styles.question, { fontFamily }]}>
          How do you describe your gender?
        </Text>
        <View style={styles.optionsContainer}>
          {GENDER_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.option,
                selectedGender === option && styles.optionSelected,
              ]}
              onPress={() => handleGenderSelect(option)}
            >
              <Text
                style={[
                  styles.optionText,
                  { fontFamily },
                  selectedGender === option && styles.optionTextSelected,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.continueButton,
          (!selectedAge || !selectedGender) && styles.continueButtonDisabled,
        ]}
        onPress={handleContinue}
        disabled={!selectedAge || !selectedGender}
      >
        <Text style={[styles.continueButtonText, { fontFamily }]}>
          CREATE MY ACCOUNT
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 40,
    paddingTop: 100,
    paddingBottom: 50,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 100,
    padding: 8,
  },
  backArrow: {
    fontSize: 24,
    fontWeight: '400',
    color: '#999',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 40,
    letterSpacing: 0.3,
  },
  questionContainer: {
    marginBottom: 32,
  },
  question: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  optionsContainer: {
    gap: 12,
  },
  option: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
  },
  optionSelected: {
    borderColor: '#000',
    borderWidth: 2,
    backgroundColor: '#000',
  },
  optionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
  },
  optionTextSelected: {
    color: '#FFF',
  },
  continueButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  continueButtonDisabled: {
    opacity: 0.4,
  },
  continueButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
});


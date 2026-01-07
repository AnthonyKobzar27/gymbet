import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';
import { SPLIT_TYPES, SPLIT_TYPE_LABELS, SplitType } from '@/types/splitTypes';
import { triggerHaptic } from '@/lib/haptics';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'system-ui',
});

interface SplitTypeSelectorProps {
  selectedType: string;
  onSelectType: (type: string) => void;
  customValue?: string;
  onCustomValueChange?: (value: string) => void;
}

export default function SplitTypeSelector({
  selectedType,
  onSelectType,
  customValue = '',
  onCustomValueChange,
}: SplitTypeSelectorProps) {
  const isOther = selectedType === 'other';

  return (
    <View style={styles.container}>
      <View style={styles.optionsGrid}>
        {SPLIT_TYPES.map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.optionButton,
              selectedType === type && styles.optionButtonActive,
            ]}
            onPress={() => {
              triggerHaptic('light');
              onSelectType(type);
            }}
          >
            <Text
              style={[
                styles.optionText,
                selectedType === type && styles.optionTextActive,
              ]}
            >
              {SPLIT_TYPE_LABELS[type]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {isOther && (
        <TextInput
          style={styles.customInput}
          value={customValue}
          onChangeText={onCustomValueChange}
          placeholder="Enter custom workout type..."
          placeholderTextColor="#999"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    minWidth: '30%',
    alignItems: 'center',
  },
  optionButtonActive: {
    backgroundColor: '#000',
  },
  optionText: {
    fontSize: 14,
    fontFamily: fontFamily,
    fontWeight: '700',
    color: '#000',
  },
  optionTextActive: {
    color: '#FFF',
  },
  customInput: {
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#FFF',
    padding: 12,
    fontSize: 14,
    fontFamily: fontFamily,
    fontWeight: '600',
    borderRadius: 8,
  },
});


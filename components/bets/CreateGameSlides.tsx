import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  Dimensions,
  Image,
} from 'react-native';
import { createGame, joinGame } from '@/lib/game';
import { WeeklySchedule } from '@/types/game';
import { DAYS_OF_WEEK, DAY_LABELS, DayOfWeek, MIN_STAKE } from '@/types/splitTypes';
import { triggerHaptic } from '@/lib/haptics';
import { useAuth } from '@/contexts/AuthContext';
import { useDataCache } from '@/contexts/DataCacheContext';
import SplitTypeSelector from './SplitTypeSelector';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'system-ui',
});

interface CreateGameSlidesProps {
  visible: boolean;
  onClose: () => void;
  onGameCreated: () => void;
}

type SlideType = 'day' | 'stake' | 'review';

interface SlideConfig {
  type: SlideType;
  day?: DayOfWeek;
}

const SLIDES: SlideConfig[] = [
  ...DAYS_OF_WEEK.map((day) => ({ type: 'day' as SlideType, day })),
  { type: 'stake' },
  { type: 'review' },
];

export default function CreateGameSlides({
  visible,
  onClose,
  onGameCreated,
}: CreateGameSlidesProps) {
  const { getUserProfile } = useAuth();
  const { refreshBalance, refreshGames } = useDataCache();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [schedule, setSchedule] = useState<WeeklySchedule>({
    monday: 'upper',
    tuesday: 'lower',
    wednesday: 'chest',
    thursday: 'back',
    friday: 'arms',
    saturday: 'cardio',
    sunday: 'rest',
  });
  const [customValues, setCustomValues] = useState<Record<DayOfWeek, string>>({
    monday: '',
    tuesday: '',
    wednesday: '',
    thursday: '',
    friday: '',
    saturday: '',
    sunday: '',
  });
  const [stake, setStake] = useState('0.5');
  const [creating, setCreating] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const currentConfig = SLIDES[currentSlide];
  const isFirstSlide = currentSlide === 0;
  const isLastSlide = currentSlide === SLIDES.length - 1;

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      triggerHaptic('light');
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handleBack = () => {
    if (currentSlide > 0) {
      triggerHaptic('light');
      setCurrentSlide(currentSlide - 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    setCurrentSlide(0);
    setSchedule({
      monday: 'upper',
      tuesday: 'lower',
      wednesday: 'chest',
      thursday: 'back',
      friday: 'arms',
      saturday: 'cardio',
      sunday: 'rest',
    });
    setStake('0.5');
    onClose();
  };

  const handleSelectSplit = (day: DayOfWeek, type: string) => {
    setSchedule({ ...schedule, [day]: type });
  };

  const handleCustomValueChange = (day: DayOfWeek, value: string) => {
    setCustomValues({ ...customValues, [day]: value });
    if (schedule[day] === 'other') {
      setSchedule({ ...schedule, [day]: value || 'other' });
    }
  };

  const getFinalSchedule = (): WeeklySchedule => {
    const finalSchedule = { ...schedule };
    DAYS_OF_WEEK.forEach((day) => {
      if (schedule[day] === 'other' && customValues[day]) {
        finalSchedule[day] = customValues[day];
      }
    });
    return finalSchedule;
  };

  const handlePublishAndJoin = async () => {
    const stakeValue = parseFloat(stake);
    if (isNaN(stakeValue) || stakeValue < MIN_STAKE) {
      Alert.alert('Invalid Stake', `Minimum stake is ${MIN_STAKE} GYMBET tokens`);
      return;
    }

    setCreating(true);
    triggerHaptic('medium');

    try {
      const finalSchedule = getFinalSchedule();
      console.log('Creating game with schedule:', finalSchedule, 'stake:', stakeValue);
      
      const result = await createGame(finalSchedule, stakeValue);
      console.log('Create game result:', result);

      if (result.ok && result.game) {
        // Auto-join the created game
        const profile = await getUserProfile();
        console.log('Got profile:', profile?.hash);
        
        if (profile?.hash) {
          const joinResult = await joinGame(result.game.id, profile.hash);
          console.log('Join game result:', joinResult);
          
          if (joinResult.ok) {
            await Promise.all([refreshBalance(), refreshGames()]);
            Alert.alert('Success', 'Game created and joined!');
          } else {
            Alert.alert('Game Created', joinResult.error?.message || 'Game created! You can join it from the list.');
          }
        } else {
          Alert.alert('Success', 'Game created! You can join it from the list.');
        }
        handleClose();
        onGameCreated();
      } else {
        Alert.alert('Error', result.error?.message || 'Failed to create game');
      }
    } catch (error: any) {
      console.error('Create game error:', error);
      Alert.alert('Error', error.message || 'Failed to create game');
    } finally {
      setCreating(false);
    }
  };

  const renderDaySlide = (day: DayOfWeek) => (
    <View style={styles.slideContent}>
      <Text style={styles.slideTitle}>{DAY_LABELS[day]} is...</Text>
      <Text style={[styles.slideSubtitle, styles.slideSubtitleMargin]}>What workout will you do on {DAY_LABELS[day]}?</Text>
      
      <SplitTypeSelector
        selectedType={schedule[day]}
        onSelectType={(type) => handleSelectSplit(day, type)}
        customValue={customValues[day]}
        onCustomValueChange={(value) => handleCustomValueChange(day, value)}
      />
    </View>
  );

  const renderStakeSlide = () => (
    <View style={styles.slideContent}>
      <Text style={styles.slideTitle}>Set Your Stake</Text>
      <View style={styles.subtitleRow}>
        <Text style={styles.slideSubtitle}>Minimum stake is {MIN_STAKE}</Text>
        <Image
          source={require('@/assets/images/token.png')}
          style={styles.inlineTokenImage}
        />
        <Text style={styles.slideSubtitle}>Higher stakes = higher rewards!</Text>
      </View>
      
      <View style={styles.stakeInputContainer}>
        <TextInput
          style={styles.stakeInput}
          value={stake}
          onChangeText={setStake}
          keyboardType="decimal-pad"
          placeholder="0.5"
          placeholderTextColor="#999"
        />
        <Image
          source={require('@/assets/images/token.png')}
          style={styles.tokenImage}
        />
      </View>
      
      <View style={styles.quickStakeButtons}>
        {[0.5, 1, 2, 5].map((amount) => (
          <TouchableOpacity
            key={amount}
            style={[
              styles.quickStakeButton,
              parseFloat(stake) === amount && styles.quickStakeButtonActive,
            ]}
            onPress={() => {
              triggerHaptic('light');
              setStake(amount.toString());
            }}
          >
            <Text
              style={[
                styles.quickStakeText,
                parseFloat(stake) === amount && styles.quickStakeTextActive,
              ]}
            >
              {amount}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderReviewSlide = () => {
    const finalSchedule = getFinalSchedule();
    return (
      <View style={styles.slideContent}>
        <Text style={styles.slideTitle}>Review Your Game</Text>
        <Text style={[styles.slideSubtitle, styles.slideSubtitleMargin]}>Make sure everything looks good!</Text>
        
        <View style={styles.reviewContainer}>
          <View style={styles.reviewSection}>
            <Text style={styles.reviewSectionTitle}>Weekly Split</Text>
            {DAYS_OF_WEEK.map((day) => (
              <View key={day} style={styles.reviewRow}>
                <Text style={styles.reviewDay}>{DAY_LABELS[day].slice(0, 3).toUpperCase()}</Text>
                <Text style={styles.reviewValue}>{finalSchedule[day]}</Text>
              </View>
            ))}
          </View>
          
          <View style={styles.reviewSection}>
            <Text style={styles.reviewSectionTitle}>Stake</Text>
            <View style={styles.reviewStakeRow}>
              <Text style={styles.reviewStake}>{stake}</Text>
              <Image
                source={require('@/assets/images/token.png')}
                style={styles.reviewTokenImage}
              />
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderCurrentSlide = () => {
    if (currentConfig.type === 'day' && currentConfig.day) {
      return renderDaySlide(currentConfig.day);
    } else if (currentConfig.type === 'stake') {
      return renderStakeSlide();
    } else if (currentConfig.type === 'review') {
      return renderReviewSlide();
    }
    return null;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${((currentSlide + 1) / SLIDES.length) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {currentSlide + 1} / {SLIDES.length}
            </Text>
          </View>

          {/* Slide Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {renderCurrentSlide()}
          </ScrollView>

          {/* Navigation Buttons */}
          <View style={styles.navigationButtons}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
            >
              <Text style={styles.backButtonText}>
                {isFirstSlide ? 'CANCEL' : 'BACK'}
              </Text>
            </TouchableOpacity>

            {isLastSlide ? (
              <TouchableOpacity
                style={[styles.nextButton, creating && styles.buttonDisabled]}
                onPress={handlePublishAndJoin}
                disabled={creating}
              >
                <Text style={styles.nextButtonText}>
                  {creating ? 'CREATING...' : 'PUBLISH & JOIN'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.nextButton}
                onPress={handleNext}
              >
                <Text style={styles.nextButtonText}>NEXT</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#f7f7f7',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: '85%',
    maxHeight: '95%',
    paddingBottom: 40,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#000',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontFamily: fontFamily,
    fontWeight: '700',
    color: '#666',
  },
  scrollView: {
    flexGrow: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 8,
    flexGrow: 1,
  },
  slideContent: {
    flex: 1,
  },
  slideTitle: {
    fontSize: 28,
    fontFamily: fontFamily,
    fontWeight: '800',
    color: '#000',
    marginBottom: 8,
  },
  slideSubtitle: {
    fontSize: 14,
    fontFamily: fontFamily,
    fontWeight: '500',
    color: '#666',
  },
  slideSubtitleMargin: {
    marginBottom: 24,
  },
  stakeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  stakeInput: {
    flex: 1,
    borderWidth: 3,
    borderColor: '#000',
    backgroundColor: '#FFF',
    padding: 16,
    fontSize: 24,
    fontFamily: fontFamily,
    fontWeight: '700',
    textAlign: 'center',
    borderRadius: 12,
  },
  tokenImage: {
    width: 40,
    height: 40,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  inlineTokenImage: {
    width: 18,
    height: 18,
    marginHorizontal: 4,
  },
  quickStakeButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  quickStakeButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 8,
    alignItems: 'center',
  },
  quickStakeButtonActive: {
    backgroundColor: '#000',
  },
  quickStakeText: {
    fontSize: 16,
    fontFamily: fontFamily,
    fontWeight: '700',
    color: '#000',
  },
  quickStakeTextActive: {
    color: '#FFF',
  },
  reviewContainer: {
    gap: 20,
  },
  reviewSection: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    padding: 16,
  },
  reviewSectionTitle: {
    fontSize: 12,
    fontFamily: fontFamily,
    fontWeight: '800',
    color: '#666',
    marginBottom: 12,
    letterSpacing: 1,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  reviewDay: {
    fontSize: 12,
    fontFamily: fontFamily,
    fontWeight: '700',
    color: '#666',
  },
  reviewValue: {
    fontSize: 14,
    fontFamily: fontFamily,
    fontWeight: '700',
    color: '#000',
    textTransform: 'capitalize',
  },
  reviewStake: {
    fontSize: 24,
    fontFamily: fontFamily,
    fontWeight: '800',
    color: '#000',
  },
  reviewStakeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewTokenImage: {
    width: 24,
    height: 24,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  backButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderWidth: 3,
    borderColor: '#000',
    borderRadius: 12,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 14,
    fontFamily: fontFamily,
    fontWeight: '800',
    color: '#000',
  },
  nextButton: {
    flex: 2,
    paddingVertical: 16,
    backgroundColor: '#000',
    borderWidth: 3,
    borderColor: '#000',
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 14,
    fontFamily: fontFamily,
    fontWeight: '800',
    color: '#FFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});


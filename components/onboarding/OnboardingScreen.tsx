import React, { useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { triggerHaptic } from '@/lib/haptics';
import LoginModal from '@/components/modals/LoginModal';
import OnboardingSlide from './OnboardingSlide';
import OnboardingFooter from './OnboardingFooter';
import QuestionsSlide from './QuestionsSlide';
import { ONBOARDING_SLIDES } from './onboardingData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showQuestionsSlide, setShowQuestionsSlide] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [userAge, setUserAge] = useState<number | null>(null);
  const [userGender, setUserGender] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleNext = () => {
    triggerHaptic('light');
    
    if (currentSlide < ONBOARDING_SLIDES.length - 1) {
      const nextSlide = currentSlide + 1;
      setCurrentSlide(nextSlide);
      scrollViewRef.current?.scrollTo({
        x: nextSlide * SCREEN_WIDTH,
        animated: true,
      });
    } else {
      // Show questions slide instead of login modal
      setShowQuestionsSlide(true);
    }
  };

  const handleQuestionsComplete = (age: number, gender: string | null) => {
    setUserAge(age);
    setUserGender(gender);
    setShowQuestionsSlide(false);
    setShowLoginModal(true);
  };

  const handleQuestionsBack = () => {
    setShowQuestionsSlide(false);
    // Go back to last onboarding slide
    setCurrentSlide(ONBOARDING_SLIDES.length - 1);
  };

  const handleBack = () => {
    triggerHaptic('light');
    
    if (currentSlide > 0) {
      const prevSlide = currentSlide - 1;
      setCurrentSlide(prevSlide);
      scrollViewRef.current?.scrollTo({
        x: prevSlide * SCREEN_WIDTH,
        animated: true,
      });
    }
  };

  const handleLoginModalClose = () => {
    setShowLoginModal(false);
    // Don't mark onboarding as complete - only complete when user actually signs up
  };

  const handleSignUpSuccess = () => {
    setShowLoginModal(false);
    // Mark onboarding as complete only after successful sign up
    onComplete();
  };

  if (showQuestionsSlide) {
    return (
      <View style={styles.container}>
        <QuestionsSlide 
          onComplete={handleQuestionsComplete}
          onBack={handleQuestionsBack}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!showLoginModal && (
        <View style={styles.content}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEnabled={false}
            style={styles.scrollView}
          >
            {ONBOARDING_SLIDES.map((slide, index) => (
              <View key={index} style={styles.slideContainer}>
                <OnboardingSlide 
                  slide={slide} 
                  isActive={index === currentSlide}
                  slideIndex={index}
                  currentSlide={currentSlide}
                  onBack={handleBack}
                />
              </View>
            ))}
          </ScrollView>

          <OnboardingFooter
            currentSlide={currentSlide}
            onNext={handleNext}
          />
        </View>
      )}

      <LoginModal
        visible={showLoginModal}
        onClose={handleLoginModalClose}
        onSignUpSuccess={handleSignUpSuccess}
        defaultMode="signup"
        userAge={userAge}
        userGender={userGender}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  slideContainer: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
});


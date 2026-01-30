import React, { useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { triggerHaptic } from '@/lib/haptics';
import { router } from 'expo-router';
import OnboardingFooter from './OnboardingFooter';
import QuestionsSlide from './QuestionsSlide';
import PhoneInputSlide from './PhoneInputSlide';
import PhoneVerifySlide from './PhoneVerifySlide';
import WelcomeSlide from './slides/WelcomeSlide';
import HowItWorksSlide from './slides/HowItWorksSlide';
import ProofsSlide from './slides/ProofsSlide';
import WinRewardsSlide from './slides/WinRewardsSlide';
import BlocksSlide from './slides/BlocksSlide';
import LetsGetStartedSlide from './slides/LetsGetStartedSlide';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOTAL_SLIDES = 6;

// Onboarding step flow: slides -> questions -> phone input -> phone verify -> signup
type OnboardingStep = 'slides' | 'questions' | 'phone-input' | 'phone-verify';

interface OnboardingScreenProps {
  onComplete: () => void;
  initialShowQuestions?: boolean;
}

export default function OnboardingScreen({ onComplete, initialShowQuestions = false }: OnboardingScreenProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(initialShowQuestions ? 'questions' : 'slides');
  const [showQuestionsSlide, setShowQuestionsSlide] = useState(initialShowQuestions);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // User data collected during onboarding
  const [userData, setUserData] = useState({
    age: 0,
    gender: null as string | null,
    phoneNumber: '',
  });

  // If coming back from signup, ensure we're on the last slide
  React.useEffect(() => {
    if (initialShowQuestions) {
      setCurrentSlide(TOTAL_SLIDES - 1);
      scrollViewRef.current?.scrollTo({
        x: (TOTAL_SLIDES - 1) * SCREEN_WIDTH,
        animated: false,
      });
    }
  }, [initialShowQuestions]);

  const handleNext = () => {
    triggerHaptic('light');
    
    if (currentSlide < TOTAL_SLIDES - 1) {
      const nextSlide = currentSlide + 1;
      setCurrentSlide(nextSlide);
      scrollViewRef.current?.scrollTo({
        x: nextSlide * SCREEN_WIDTH,
        animated: true,
      });
    } else {
      // Show questions slide instead of login modal
      setCurrentStep('questions');
      setShowQuestionsSlide(true);
    }
  };

  const handleQuestionsComplete = (age: number, gender: string | null) => {
    // Save age/gender and proceed to phone input
    setUserData(prev => ({ ...prev, age, gender }));
    setShowQuestionsSlide(false);
    setCurrentStep('phone-input');
  };

  const handleQuestionsBack = () => {
    setShowQuestionsSlide(false);
    setCurrentStep('slides');
    // Go back to last onboarding slide
    setCurrentSlide(TOTAL_SLIDES - 1);
  };

  const handlePhoneInputComplete = (phoneNumber: string) => {
    // Save phone number and proceed to verification
    setUserData(prev => ({ ...prev, phoneNumber }));
    setCurrentStep('phone-verify');
  };

  const handlePhoneInputBack = () => {
    setCurrentStep('questions');
    setShowQuestionsSlide(true);
  };

  const handlePhoneVerifyComplete = () => {
    // All data collected, proceed to signup
    router.replace({
      pathname: '/signup',
      params: {
        age: userData.age.toString(),
        gender: userData.gender || '',
        phoneNumber: userData.phoneNumber,
      },
    });
  };

  const handlePhoneVerifyBack = () => {
    setCurrentStep('phone-input');
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


  // Show phone verification slide
  if (currentStep === 'phone-verify') {
    return (
      <View style={styles.container}>
        <PhoneVerifySlide
          phoneNumber={userData.phoneNumber}
          onComplete={handlePhoneVerifyComplete}
          onBack={handlePhoneVerifyBack}
        />
      </View>
    );
  }

  // Show phone input slide
  if (currentStep === 'phone-input') {
    return (
      <View style={styles.container}>
        <PhoneInputSlide
          onComplete={handlePhoneInputComplete}
          onBack={handlePhoneInputBack}
        />
      </View>
    );
  }

  // Show questions slide
  if (showQuestionsSlide || currentStep === 'questions') {
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
      <View style={styles.content}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          style={styles.scrollView}
        >
          <View style={styles.slideContainer}>
            <WelcomeSlide 
              isActive={0 === currentSlide}
              currentSlide={currentSlide}
              onBack={handleBack}
            />
          </View>
          <View style={styles.slideContainer}>
            <HowItWorksSlide 
              isActive={1 === currentSlide}
              currentSlide={currentSlide}
              onBack={handleBack}
            />
          </View>
          <View style={styles.slideContainer}>
            <ProofsSlide 
              isActive={2 === currentSlide}
              currentSlide={currentSlide}
              onBack={handleBack}
            />
          </View>
          <View style={styles.slideContainer}>
            <WinRewardsSlide 
              isActive={3 === currentSlide}
              currentSlide={currentSlide}
              onBack={handleBack}
            />
          </View>
          <View style={styles.slideContainer}>
            <BlocksSlide 
              isActive={4 === currentSlide}
              currentSlide={currentSlide}
              onBack={handleBack}
            />
          </View>
          <View style={styles.slideContainer}>
            <LetsGetStartedSlide 
              isActive={5 === currentSlide}
              currentSlide={currentSlide}
              onBack={handleBack}
            />
          </View>
        </ScrollView>

        <OnboardingFooter
          currentSlide={currentSlide}
          onNext={handleNext}
        />
      </View>
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


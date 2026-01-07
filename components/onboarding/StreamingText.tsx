import React, { useState, useEffect } from 'react';
import { Text, StyleSheet, Platform } from 'react-native';
import { triggerHaptic } from '@/lib/haptics';

interface StreamingTextProps {
  text: string;
  style?: any;
  onComplete?: () => void;
  delay?: number;
}

export default function StreamingText({ 
  text, 
  style, 
  onComplete,
  delay = 30 
}: StreamingTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  // Start streaming after a short delay
  useEffect(() => {
    const startTimer = setTimeout(() => {
      setHasStarted(true);
    }, 300);

    return () => clearTimeout(startTimer);
  }, []);

  useEffect(() => {
    if (!hasStarted) return;
    
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        const nextChar = text[currentIndex];
        setDisplayedText(prev => prev + nextChar);
        setCurrentIndex(prev => prev + 1);
        
        // Trigger haptic for each letter (except spaces)
        if (nextChar !== ' ') {
          triggerHaptic('light');
        }
      }, delay);

      return () => clearTimeout(timer);
    } else if (currentIndex === text.length && onComplete) {
      onComplete();
    }
  }, [currentIndex, text, delay, onComplete, hasStarted]);

  // Reset when text changes
  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
    setHasStarted(false);
  }, [text]);

  const fontFamily = Platform.select({
    ios: 'System', // iOS will use SF Pro Rounded when fontWeight is set
    android: 'sans-serif',
    default: 'system-ui',
  });

  return (
    <Text style={[styles.text, { fontFamily }, style]}>
      {displayedText}
      {currentIndex < text.length && <Text style={styles.cursor}>|</Text>}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    textAlign: 'center',
    // SF Pro Rounded on iOS, fallback on others
  },
  cursor: {
    opacity: 0.5,
  },
});


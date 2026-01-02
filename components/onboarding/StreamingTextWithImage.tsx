import React, { useState, useEffect, useMemo } from 'react';
import { Text, View, StyleSheet, Image, Platform } from 'react-native';
import { triggerHaptic } from '@/lib/haptics';

interface StreamingTextWithImageProps {
  text: string;
  imagePlaceholder: string;
  imageSource: any;
  imageStyle?: any;
  style?: any;
  onComplete?: () => void;
  delay?: number;
}

type Segment =
  | { type: 'word'; value: string }
  | { type: 'space'; value: string }
  | { type: 'token'; key: string };

const TOKEN_WIDTH = 24; // image + margins
const CHAR_WIDTH = 7.5; // safe average for 15px font
const MAX_LINE_WIDTH = 320;

export default function StreamingTextWithImage({
  text,
  imagePlaceholder,
  imageSource,
  imageStyle,
  style,
  onComplete,
  delay = 30,
}: StreamingTextWithImageProps) {
  const [displayedLength, setDisplayedLength] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  const fontFamily = Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'system-ui',
  });

  /* ---------------------------------- */
  /* Streaming logic                    */
  /* ---------------------------------- */

  useEffect(() => {
    const t = setTimeout(() => setHasStarted(true), 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!hasStarted) return;

    if (displayedLength < text.length) {
      const remaining = text.slice(displayedLength);

      if (remaining.startsWith(imagePlaceholder)) {
        setDisplayedLength(d => d + imagePlaceholder.length);
        return;
      }

      const timer = setTimeout(() => {
        const char = text[displayedLength];
        setDisplayedLength(d => d + 1);
        if (char !== ' ') triggerHaptic('light');
      }, delay);

      return () => clearTimeout(timer);
    } else {
      onComplete?.();
    }
  }, [displayedLength, hasStarted, text, delay, imagePlaceholder, onComplete]);

  useEffect(() => {
    setDisplayedLength(0);
    setHasStarted(false);
  }, [text]);

  /* ---------------------------------- */
  /* Build atomic segments (IMPORTANT)  */
  /* ---------------------------------- */

  const segments: Segment[] = useMemo(() => {
    const result: Segment[] = [];
    let i = 0;
    let tokenIndex = 0;

    while (i < displayedLength) {
      if (text.startsWith(imagePlaceholder, i)) {
        result.push({ type: 'token', key: `token-${tokenIndex++}` });
        i += imagePlaceholder.length;
        continue;
      }

      const char = text[i];

      if (char === ' ') {
        result.push({ type: 'space', value: ' ' });
        i++;
      } else {
        let word = '';
        while (i < displayedLength && text[i] !== ' ' && !text.startsWith(imagePlaceholder, i)) {
          word += text[i];
          i++;
        }
        result.push({ type: 'word', value: word });
      }
    }

    return result;
  }, [displayedLength, text, imagePlaceholder]);

  /* ---------------------------------- */
  /* Manual line building (THE FIX)     */
  /* ---------------------------------- */

  const lines: Segment[][] = useMemo(() => {
    const result: Segment[][] = [];
    let line: Segment[] = [];
    let width = 0;

    segments.forEach(seg => {
      const segWidth =
        seg.type === 'token'
          ? TOKEN_WIDTH
          : seg.value.length * CHAR_WIDTH;

      if (width + segWidth > MAX_LINE_WIDTH && line.length > 0) {
        result.push(line);
        line = [];
        width = 0;
      }

      line.push(seg);
      width += segWidth;
    });

    if (line.length) result.push(line);
    return result;
  }, [segments]);

  const showCursor = displayedLength < text.length;

  /* ---------------------------------- */
  /* Render                            */
  /* ---------------------------------- */

  return (
    <View style={[styles.container, style]}>
      {lines.map((line, lineIndex) => (
        <View key={lineIndex} style={styles.line}>
          {line.map((seg, i) => {
            if (seg.type === 'token') {
              return (
                <Image
                  key={seg.key}
                  source={imageSource}
                  style={[styles.token, imageStyle]}
                />
              );
            }

            const isLastLine = lineIndex === lines.length - 1;
            const isLastSeg = i === line.length - 1;

            return (
              <Text key={i} style={[styles.text, { fontFamily }]}>
                {seg.value}
                {isLastLine && isLastSeg && showCursor && (
                  <Text style={styles.cursor}>|</Text>
                )}
              </Text>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/* ---------------------------------- */
/* Styles                              */
/* ---------------------------------- */

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'nowrap',
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    color: '#666',
  },
  token: {
    width: 18,
    height: 18,
    marginHorizontal: 3,
  },
  cursor: {
    opacity: 0.5,
  },
});

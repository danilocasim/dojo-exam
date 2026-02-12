// T044: Timer component with countdown display
import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatRemainingTime } from '../services';

export interface TimerProps {
  remainingTimeMs: number;
  onTick: (remainingMs: number) => void;
  onTimeUp: () => void;
  isPaused?: boolean;
  persistInterval?: number; // How often to persist time (default 30s)
  onPersist?: () => void;
}

// Color constants
const colors = {
  slate800: '#1e293b',
  slate700: '#334155',
  slate500: '#64748b',
  slate400: '#94a3b8',
  white: '#ffffff',
  orange400: '#fb923c',
  orange800: '#9a3412',
  orange950: '#431407',
  red400: '#f87171',
  red500: '#ef4444',
  red800: '#991b1b',
  red950: '#450a0a',
};

/**
 * Timer - countdown timer for exam mode
 * Updates every second, persists periodically
 */
export const Timer: React.FC<TimerProps> = ({
  remainingTimeMs,
  onTick,
  onTimeUp,
  isPaused = false,
  persistInterval = 30000,
  onPersist,
}) => {
  const lastPersistRef = useRef<number>(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Get color based on remaining time
  const getTimeColor = () => {
    const minutes = remainingTimeMs / 60000;
    if (minutes <= 5) return colors.red400;
    if (minutes <= 15) return colors.orange400;
    return colors.white;
  };

  // Get background/border colors based on remaining time
  const getBgStyle = () => {
    const minutes = remainingTimeMs / 60000;
    if (minutes <= 5) return { backgroundColor: colors.red950, borderColor: colors.red800 };
    if (minutes <= 15) return { backgroundColor: colors.orange950, borderColor: colors.orange800 };
    return { backgroundColor: colors.slate800, borderColor: colors.slate700 };
  };

  const tick = useCallback(() => {
    if (isPaused) return;

    const newTime = remainingTimeMs - 1000;

    if (newTime <= 0) {
      onTick(0);
      onTimeUp();
      return;
    }

    onTick(newTime);

    // Check if we should persist
    const now = Date.now();
    if (onPersist && now - lastPersistRef.current >= persistInterval) {
      lastPersistRef.current = now;
      onPersist();
    }
  }, [remainingTimeMs, isPaused, onTick, onTimeUp, onPersist, persistInterval]);

  useEffect(() => {
    if (isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [tick, isPaused]);

  // Format display
  const displayTime = formatRemainingTime(remainingTimeMs);
  const minutes = Math.floor(remainingTimeMs / 60000);
  const isLowTime = minutes <= 5;

  return (
    <View style={[styles.container, getBgStyle()]}>
      <Text style={styles.icon}>⏱</Text>
      <Text style={[styles.time, { color: getTimeColor() }]}>{displayTime}</Text>
      {isLowTime && <View style={styles.lowTimeIndicator} />}
    </View>
  );
};

/**
 * Compact timer for header display
 */
export const CompactTimer: React.FC<{
  remainingTimeMs: number;
}> = ({ remainingTimeMs }) => {
  const displayTime = formatRemainingTime(remainingTimeMs);
  const minutes = remainingTimeMs / 60000;

  const getColor = () => {
    if (minutes <= 5) return colors.red400;
    if (minutes <= 15) return colors.orange400;
    return colors.white;
  };

  return (
    <View style={styles.compactContainer}>
      <Text style={styles.compactIcon}>⏱</Text>
      <Text style={[styles.compactTime, { color: getColor() }]}>{displayTime}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  icon: {
    color: colors.slate400,
    marginRight: 8,
    fontSize: 14,
  },
  time: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  lowTimeIndicator: {
    marginLeft: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.red500,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate800,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate700,
  },
  compactIcon: {
    color: colors.slate500,
    marginRight: 8,
    fontSize: 14,
  },
  compactTime: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default Timer;

import { useState, useEffect } from 'react';

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number; // milliseconds
}

/**
 * Hook untuk menghitung countdown timer sampai deadline
 * @param deadline - Timestamp deadline dalam milliseconds
 * @returns Object dengan waktu tersisa dan status
 */
export function useCountdown(deadline: number | null | undefined) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!deadline || deadline <= 0) {
      setTimeRemaining(null);
      setIsExpired(true);
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const diff = deadline - now;

      if (diff <= 0) {
        setTimeRemaining({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          total: 0,
        });
        setIsExpired(true);
        return;
      }

      setIsExpired(false);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining({
        days,
        hours,
        minutes,
        seconds,
        total: diff,
      });
    };

    // Update immediately
    updateCountdown();

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

  return { timeRemaining, isExpired };
}

/**
 * Format waktu tersisa menjadi string yang readable
 */
export function formatCountdown(timeRemaining: TimeRemaining | null, isExpired: boolean): string {
  if (!timeRemaining || isExpired) {
    return 'Expired';
  }

  const { days, hours, minutes, seconds } = timeRemaining;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Format waktu tersisa menjadi format detail dengan label
 */
export function formatCountdownDetailed(timeRemaining: TimeRemaining | null, isExpired: boolean): {
  primary: string;
  secondary: string;
} {
  if (!timeRemaining || isExpired) {
    return {
      primary: 'Expired',
      secondary: 'Deadline passed',
    };
  }

  const { days, hours, minutes, seconds } = timeRemaining;

  if (days > 0) {
    return {
      primary: `${days}d ${hours}h`,
      secondary: `${minutes}m ${seconds}s`,
    };
  } else if (hours > 0) {
    return {
      primary: `${hours}h ${minutes}m`,
      secondary: `${seconds}s`,
    };
  } else if (minutes > 0) {
    return {
      primary: `${minutes}m ${seconds}s`,
      secondary: '',
    };
  } else {
    return {
      primary: `${seconds}s`,
      secondary: 'Almost expired',
    };
  }
}


import { useCallback, useEffect, useState } from "react";
import { getNutrition, listRecords } from "../lib/api-client";
import { addDays } from "../lib/date";
import { calculateHealthScore } from "../lib/health-score";

interface UseHealthScoreStreakResult {
  streak: number;
  isLoading: boolean;
}

const DEFAULT_THRESHOLD = 80;
const MAX_LOOKBACK_DAYS = 90;

export function useHealthScoreStreak(
  userId: string | null,
  date: string,
  threshold: number = DEFAULT_THRESHOLD
): UseHealthScoreStreakResult {
  const [streak, setStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStreak = useCallback(async () => {
    if (!userId) {
      setStreak(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      let nextStreak = 0;

      for (let offset = 0; offset < MAX_LOOKBACK_DAYS; offset += 1) {
        const targetDate = addDays(date, -offset);
        const records = await listRecords(userId, targetDate);

        if (records.length === 0) break;

        const summary = await getNutrition(userId, targetDate);
        const score = calculateHealthScore(summary).total;

        if (score < threshold) break;

        nextStreak += 1;
      }

      setStreak(nextStreak);
    } catch {
      setStreak(0);
    } finally {
      setIsLoading(false);
    }
  }, [date, threshold, userId]);

  useEffect(() => {
    void fetchStreak();
  }, [fetchStreak]);

  return { streak, isLoading };
}

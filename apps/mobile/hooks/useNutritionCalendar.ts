import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getNutrition, listRecords } from "../lib/api-client";
import { NutritionSummary } from "../lib/types";
import { getMonthDates, getToday } from "../lib/date";

export type CalendarHealthTone =
  | "good"
  | "warning"
  | "bad"
  | "empty"
  | "unknown";

export interface NutritionCalendarDay {
  date: string;
  tone: CalendarHealthTone;
  summary?: NutritionSummary;
  hasRecord: boolean;
  isFuture: boolean;
}

interface NutritionCalendarCache {
  month: string;
  updatedAt: string;
  days: Record<
    string,
    {
      tone: CalendarHealthTone;
      hasRecord: boolean;
      summary?: NutritionSummary;
    }
  >;
}

interface UseNutritionCalendarResult {
  month: string;
  days: NutritionCalendarDay[];
  isLoading: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
  getDay: (date: string) => NutritionCalendarDay | undefined;
}

const getCacheKey = (userId: string, month: string): string =>
  `@nutrition_calendar:${userId}:${month}`;

const createDefaultDays = (month: string): NutritionCalendarDay[] => {
  const today = getToday();
  return getMonthDates(month).map((date) => ({
    date,
    tone: date > today ? "unknown" : "empty",
    hasRecord: false,
    isFuture: date > today,
  }));
};

const getCalendarTone = (
  summary: NutritionSummary | undefined,
  hasRecord: boolean
): CalendarHealthTone => {
  if (!hasRecord) return "empty";
  if (!summary) return "unknown";

  const statuses = [
    summary.calories.status,
    summary.protein.status,
    summary.fat.status,
    summary.carbs.status,
  ];
  const deficientCount = statuses.filter((status) => status === "deficient").length;
  const excessiveCount = statuses.filter((status) => status === "excessive").length;

  if (excessiveCount >= 2 || deficientCount >= 3) return "bad";
  if (excessiveCount >= 1 || deficientCount >= 2) return "warning";
  return "good";
};

const mergeCacheDays = (
  baseDays: NutritionCalendarDay[],
  cache: NutritionCalendarCache | null
): NutritionCalendarDay[] =>
  baseDays.map((day) => {
    const cached = cache?.days[day.date];
    if (!cached) return day;
    return {
      ...day,
      tone: cached.tone,
      hasRecord: cached.hasRecord,
      summary: cached.summary,
    };
  });

export const useNutritionCalendar = (
  userId: string | null,
  month: string
): UseNutritionCalendarResult => {
  const [days, setDays] = useState<NutritionCalendarDay[]>(() =>
    createDefaultDays(month)
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setDays(createDefaultDays(month));
  }, [month]);

  const refresh = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    setIsRefreshing(true);
    try {
      const dates = getMonthDates(month).filter((date) => date <= getToday());
      const fetchedDays = await Promise.all(
        dates.map(async (date) => {
          try {
            const records = await listRecords(userId, date);
            const hasRecord = records.length > 0;
            if (!hasRecord) {
              return {
                date,
                tone: "empty" as const,
                hasRecord,
                isFuture: false,
              };
            }

            const summary = await getNutrition(userId, date);
            return {
              date,
              tone: getCalendarTone(summary, true),
              hasRecord: true,
              summary,
              isFuture: false,
            };
          } catch {
            return {
              date,
              tone: "unknown" as const,
              hasRecord: false,
              isFuture: false,
            };
          }
        })
      );

      const nextDays = createDefaultDays(month).map((day) => {
        const fetched = fetchedDays.find((item) => item.date === day.date);
        return fetched ? { ...day, ...fetched } : day;
      });

      setDays(nextDays);

      const cache: NutritionCalendarCache = {
        month,
        updatedAt: new Date().toISOString(),
        days: Object.fromEntries(
          nextDays
            .filter((day) => !day.isFuture)
            .map((day) => [
              day.date,
              {
                tone: day.tone,
                hasRecord: day.hasRecord,
                summary: day.summary,
              },
            ])
        ),
      };

      await AsyncStorage.setItem(getCacheKey(userId, month), JSON.stringify(cache));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [month, userId]);

  useEffect(() => {
    const load = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const cached = await AsyncStorage.getItem(getCacheKey(userId, month));
        const parsed = cached ? (JSON.parse(cached) as NutritionCalendarCache) : null;
        setDays(mergeCacheDays(createDefaultDays(month), parsed));
      } finally {
        setIsLoading(false);
      }

      await refresh();
    };

    void load();
  }, [month, refresh, userId]);

  return {
    month,
    days,
    isLoading,
    isRefreshing,
    refresh,
    getDay: (date: string) => days.find((day) => day.date === date),
  };
};

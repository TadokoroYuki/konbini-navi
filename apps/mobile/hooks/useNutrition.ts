import { useState, useEffect, useCallback } from "react";
import { NutritionSummary } from "../lib/types";
import { getNutrition } from "../lib/api-client";

interface UseNutritionResult {
  nutrition: NutritionSummary | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useNutrition = (
  userId: string | null,
  date: string
): UseNutritionResult => {
  const [nutrition, setNutrition] = useState<NutritionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNutrition = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getNutrition(userId, date);
      setNutrition(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "栄養データの取得に失敗しました"
      );
    } finally {
      setIsLoading(false);
    }
  }, [userId, date]);

  useEffect(() => {
    fetchNutrition();
  }, [fetchNutrition]);

  return { nutrition, isLoading, error, refetch: fetchNutrition };
};

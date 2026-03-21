import { NutritionSummary, NutrientStatus } from "./types";

export interface HealthScoreBreakdown {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface HealthScoreResult {
  total: number;
  breakdown: HealthScoreBreakdown;
}

const MAX_NUTRIENT_SCORE = 25;
const OVERAGE_PENALTIES = {
  calories: 10,
  protein: 0,
  fat: 10,
  carbs: 7,
} as const;

function getBaseScore(data: NutrientStatus): number {
  if (data.target <= 0) return 0;
  const ratio = data.ratio ?? data.actual / data.target;
  return Math.floor(MAX_NUTRIENT_SCORE * Math.min(ratio, 1));
}

function getOveragePenalty(
  nutrient: keyof HealthScoreBreakdown,
  data: NutrientStatus
): number {
  if (data.target <= 0 || data.actual <= data.target) return 0;
  const overageRatio = (data.actual - data.target) / data.target;
  return Math.floor(overageRatio * OVERAGE_PENALTIES[nutrient]);
}

function getNutrientScore(
  nutrient: keyof HealthScoreBreakdown,
  data: NutrientStatus
): number {
  const base = getBaseScore(data);
  const penalty = getOveragePenalty(nutrient, data);
  return Math.max(0, base - penalty);
}

export function calculateHealthScore(
  summary: NutritionSummary
): HealthScoreResult {
  const breakdown: HealthScoreBreakdown = {
    calories: getNutrientScore("calories", summary.calories),
    protein: getNutrientScore("protein", summary.protein),
    fat: getNutrientScore("fat", summary.fat),
    carbs: getNutrientScore("carbs", summary.carbs),
  };

  return {
    total:
      breakdown.calories +
      breakdown.protein +
      breakdown.fat +
      breakdown.carbs,
    breakdown,
  };
}

export function getHealthScoreTone(score: number): {
  label: string;
  color: string;
  backgroundColor: string;
} {
  if (score >= 80) {
    return {
      label: "かなり良い状態",
      color: "#1B5E20",
      backgroundColor: "#E8F5E9",
    };
  }

  if (score >= 60) {
    return {
      label: "あと少しで安定",
      color: "#E65100",
      backgroundColor: "#FFF3E0",
    };
  }

  return {
    label: "見直し余地あり",
    color: "#B71C1C",
    backgroundColor: "#FFEBEE",
  };
}

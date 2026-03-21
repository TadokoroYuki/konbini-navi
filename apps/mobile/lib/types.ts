// Types aligned with OpenAPI schema (packages/api-schema/openapi.yaml)

export type Brand = "seven_eleven" | "family_mart" | "lawson";
export type Category =
  | "onigiri"
  | "bento"
  | "sandwich"
  | "salad"
  | "soup"
  | "noodle"
  | "bread"
  | "sweets"
  | "drink"
  | "side_dish";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type NutritionStatus = "deficient" | "adequate" | "excessive";

export interface Nutrition {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber?: number;
  salt?: number;
}

export interface Product {
  productId: string;
  name: string;
  brand: Brand;
  category: Category;
  price: number;
  nutrition: Nutrition;
  imageUrl: string;
  description?: string;
}

export interface MealRecord {
  recordId: string;
  userId: string;
  productId: string;
  product: Product;
  date: string;
  mealType: MealType;
  createdAt: string;
}

export interface CreateRecordRequest {
  productId: string;
  date: string;
  mealType: MealType;
}

export interface NutrientStatus {
  actual: number;
  target: number;
  ratio?: number;
  status: NutritionStatus;
}

export interface NutritionSummary {
  date: string;
  calories: NutrientStatus;
  protein: NutrientStatus;
  fat: NutrientStatus;
  carbs: NutrientStatus;
}

export interface Recommendation {
  product?: Product;
  productId?: string;
  product_id?: string;
  date?: string;
  score?: number;
  reason?: string;
  deficientNutrients?: string[];
}

export interface ApiError {
  code: string;
  message: string;
}

// Display helpers
export const BRAND_LABELS: Record<Brand, string> = {
  seven_eleven: "セブンイレブン",
  family_mart: "ファミリーマート",
  lawson: "ローソン",
};

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "朝食",
  lunch: "昼食",
  dinner: "夕食",
  snack: "間食",
};

export const STATUS_LABELS: Record<NutritionStatus, string> = {
  deficient: "不足",
  adequate: "適量",
  excessive: "多い",
};

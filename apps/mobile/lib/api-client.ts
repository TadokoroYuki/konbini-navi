import Constants from "expo-constants";
import {
  Product,
  MealRecord,
  CreateRecordRequest,
  NutritionSummary,
  Recommendation,
  Brand,
  Category,
} from "./types";
import {
  mockProducts,
  mockRecords,
  mockNutritionSummary,
  mockRecommendations,
} from "./mock-data";

// --- Simple memory cache for product data ---
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const cache = new Map<string, { data: unknown; timestamp: number }>();

function getCached<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return undefined;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

const BASE_URL: string =
  Constants.expoConfig?.extra?.apiUrl ?? "http://localhost:8080/v1";

let authToken: string | null = null;

export const setAuthToken = (token: string | null): void => {
  authToken = token;
};

const request = async <T>(
  path: string,
  options: RequestInit = {}
): Promise<T> => {
  const url = `${BASE_URL}${path}`;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      code: "UNKNOWN",
      message: `HTTP ${response.status}`,
    }));
    throw new Error(error.message || `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
};

// --- Products ---

export interface SearchProductsParams {
  q?: string;
  brand?: Brand;
  category?: Category;
  limit?: number;
}

export const searchProducts = async (
  params: SearchProductsParams = {}
): Promise<Product[]> => {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.brand) query.set("brand", params.brand);
  if (params.category) query.set("category", params.category);
  if (params.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  const cacheKey = `searchProducts:${qs}`;

  const cached = getCached<Product[]>(cacheKey);
  if (cached) return cached;

  try {
    const result = await request<{ products: Product[] }>(
      `/products${qs ? `?${qs}` : ""}`
    );
    setCache(cacheKey, result.products);
    return result.products;
  } catch {
    console.warn("[FALLBACK] searchProducts - using mock data");
    let filtered = [...mockProducts];
    if (params.q) {
      const q = params.q.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
      );
    }
    if (params.brand) {
      filtered = filtered.filter((p) => p.brand === params.brand);
    }
    if (params.category) {
      filtered = filtered.filter((p) => p.category === params.category);
    }
    return filtered.slice(0, params.limit ?? 20);
  }
};

export const getProduct = async (productId: string): Promise<Product> => {
  const cacheKey = `getProduct:${productId}`;
  const cached = getCached<Product>(cacheKey);
  if (cached) return cached;

  try {
    const product = await request<Product>(`/products/${productId}`);
    setCache(cacheKey, product);
    return product;
  } catch {
    console.warn("[FALLBACK] getProduct - using mock data");
    const product = mockProducts.find((p) => p.productId === productId);
    if (!product) throw new Error("商品が見つかりません");
    return product;
  }
};

// --- Records ---

export const listRecords = async (
  userId: string,
  date: string
): Promise<MealRecord[]> => {
  try {
    const result = await request<{ records: MealRecord[] }>(
      `/users/${userId}/records?date=${date}`
    );
    return result.records;
  } catch {
    console.warn("[FALLBACK] listRecords - using mock data");
    return mockRecords.filter((r) => r.date === date);
  }
};

export const createRecord = async (
  userId: string,
  data: CreateRecordRequest
): Promise<MealRecord> => {
  return await request<MealRecord>(`/users/${userId}/records`, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const deleteRecord = async (
  userId: string,
  recordId: string
): Promise<void> => {
  try {
    await request<void>(`/users/${userId}/records/${recordId}`, {
      method: "DELETE",
    });
  } catch {
    // Mock: no-op
  }
};

// --- Nutrition ---

export const getNutrition = async (
  userId: string,
  date: string
): Promise<NutritionSummary> => {
  try {
    return await request<NutritionSummary>(
      `/users/${userId}/nutrition?date=${date}`
    );
  } catch {
    return { ...mockNutritionSummary, date };
  }
};

// --- Recommendations ---

export const getRecommendations = async (
  userId: string,
  date: string
): Promise<Recommendation[]> => {
  try {
    const result = await request<{
      recommendation?: Recommendation | null;
    }>(
      `/users/${userId}/recommendations?date=${date}`
    );
    const normalizeRecommendation = async (
      recommendation: Recommendation
    ): Promise<Recommendation> => {
      if (recommendation.product) {
        return recommendation;
      }

      const productId = recommendation.productId ?? recommendation.product_id;

      if (productId) {
        try {
          const product = await getProduct(productId);
          return { ...recommendation, product };
        } catch {
          return recommendation;
        }
      }

      return recommendation;
    };

    if (!result.recommendation) {
      return [];
    }

    const normalized = await normalizeRecommendation(result.recommendation);
    return normalized.product ? [normalized] : [];
  } catch {
    return mockRecommendations;
  }
};

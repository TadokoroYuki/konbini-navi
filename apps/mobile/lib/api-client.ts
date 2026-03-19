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

const BASE_URL: string =
  Constants.expoConfig?.extra?.apiUrl ?? "http://localhost:8080/v1";

let deviceId: string | null = null;

export function setDeviceId(id: string): void {
  deviceId = id;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(deviceId ? { "X-Device-Id": deviceId } : {}),
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
}

// --- Products ---

export interface SearchProductsParams {
  q?: string;
  brand?: Brand;
  category?: Category;
  limit?: number;
}

export async function searchProducts(
  params: SearchProductsParams = {}
): Promise<Product[]> {
  try {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (params.brand) query.set("brand", params.brand);
    if (params.category) query.set("category", params.category);
    if (params.limit) query.set("limit", String(params.limit));

    const qs = query.toString();
    const result = await request<{ products: Product[] }>(
      `/products${qs ? `?${qs}` : ""}`
    );
    return result.products;
  } catch {
    // Fallback to mock data
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
}

export async function getProduct(productId: string): Promise<Product> {
  try {
    return await request<Product>(`/products/${productId}`);
  } catch {
    const product = mockProducts.find((p) => p.productId === productId);
    if (!product) throw new Error("商品が見つかりません");
    return product;
  }
}

// --- Records ---

export async function listRecords(
  userId: string,
  date: string
): Promise<MealRecord[]> {
  try {
    const result = await request<{ records: MealRecord[] }>(
      `/users/${userId}/records?date=${date}`
    );
    return result.records;
  } catch {
    return mockRecords.filter((r) => r.date === date);
  }
}

export async function createRecord(
  userId: string,
  data: CreateRecordRequest
): Promise<MealRecord> {
  try {
    return await request<MealRecord>(`/users/${userId}/records`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  } catch {
    // Mock: create a local record
    const product = mockProducts.find((p) => p.productId === data.productId);
    if (!product) throw new Error("商品が見つかりません");
    const record: MealRecord = {
      recordId: `r${Date.now()}`,
      userId,
      productId: data.productId,
      product,
      date: data.date,
      mealType: data.mealType,
      createdAt: new Date().toISOString(),
    };
    return record;
  }
}

export async function deleteRecord(
  userId: string,
  recordId: string
): Promise<void> {
  try {
    await request<void>(`/users/${userId}/records/${recordId}`, {
      method: "DELETE",
    });
  } catch {
    // Mock: no-op
  }
}

// --- Nutrition ---

export async function getNutrition(
  userId: string,
  date: string
): Promise<NutritionSummary> {
  try {
    return await request<NutritionSummary>(
      `/users/${userId}/nutrition?date=${date}`
    );
  } catch {
    return { ...mockNutritionSummary, date };
  }
}

// --- Recommendations ---

export async function getRecommendations(
  userId: string,
  date: string
): Promise<Recommendation[]> {
  try {
    const result = await request<{ recommendations: Recommendation[] }>(
      `/users/${userId}/recommendations?date=${date}`
    );
    return result.recommendations;
  } catch {
    return mockRecommendations;
  }
}

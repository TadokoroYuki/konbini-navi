import type { Page } from "@playwright/test";

const API_BASE = "http://localhost:8080/v1";
export const TEST_USER_ID = "dev-device-001";

export const getToday = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const apiRequest = async <T>(
  path: string,
  options: RequestInit = {}
): Promise<T> => {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
};

export const cleanRecords = async (
  userId: string,
  date: string
): Promise<void> => {
  const res = await apiRequest<{ records: { recordId: string }[] }>(
    `/users/${userId}/records?date=${date}`
  );
  for (const record of res.records ?? []) {
    await apiRequest(`/users/${userId}/records/${record.recordId}`, {
      method: "DELETE",
    });
  }
};

export const waitForApi = async (
  maxRetries = 30,
  intervalMs = 2000
): Promise<void> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch("http://localhost:8080/health");
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("API gateway did not become healthy");
};

/** Wait for Expo web app to fully render */
export const waitForApp = async (page: Page): Promise<void> => {
  await page.waitForFunction(
    () => {
      const root = document.getElementById("root");
      return root && root.children.length > 0;
    },
    { timeout: 30000 }
  );
};

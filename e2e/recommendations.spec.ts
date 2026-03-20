import { test, expect } from "@playwright/test";
import { TEST_USER_ID, getToday, cleanRecords, apiRequest, waitForApp } from "./helpers";

test.describe("Recommendations", () => {
  const today = getToday();

  test.beforeEach(async () => {
    await cleanRecords(TEST_USER_ID, today);
  });

  test("GET /v1/users/{id}/recommendations returns products", async ({
    request,
  }) => {
    // Record one small item so nutrition is deficient
    await apiRequest(`/users/${TEST_USER_ID}/records`, {
      method: "POST",
      body: JSON.stringify({
        productId: "prod_013",
        date: today,
        mealType: "breakfast",
      }),
    });

    const res = await request.get(
      `http://localhost:8080/v1/users/${TEST_USER_ID}/recommendations?date=${today}`
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.recommendations).toBeDefined();
    expect(body.recommendations.length).toBeGreaterThan(0);

    // Each recommendation should have product and reason
    for (const rec of body.recommendations) {
      expect(rec.product).toBeDefined();
      expect(rec.product.name).toBeDefined();
      expect(rec.reason).toBeDefined();
    }
  });

  test("recommend page shows product cards", async ({ page }) => {
    // Record a small item so we get recommendations
    await apiRequest(`/users/${TEST_USER_ID}/records`, {
      method: "POST",
      body: JSON.stringify({
        productId: "prod_013",
        date: today,
        mealType: "breakfast",
      }),
    });

    await page.goto("/recommend", { waitUntil: "networkidle" });
    await waitForApp(page);
    await page.waitForTimeout(3000);

    await expect(page.getByRole("heading", { name: "おすすめ商品" })).toBeVisible({ timeout: 10000 });
  });
});

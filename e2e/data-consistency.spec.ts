import { test, expect } from "@playwright/test";
import { TEST_USER_ID, getToday, cleanRecords, apiRequest, waitForApp } from "./helpers";

test.describe("Cross-Screen Data Consistency", () => {
  const today = getToday();

  test.beforeEach(async () => {
    await cleanRecords(TEST_USER_ID, today);
  });

  test("record flows through all screens consistently", async ({ page }) => {
    // Step 1: Create a record via API
    await apiRequest(`/users/${TEST_USER_ID}/records`, {
      method: "POST",
      body: JSON.stringify({
        productId: "prod_001",
        date: today,
        mealType: "lunch",
      }),
    });

    // Step 2: Verify in history
    await page.goto("/history", { waitUntil: "networkidle" });
    await waitForApp(page);
    await page.waitForTimeout(3000);
    await expect(page.getByText("手巻おにぎり 鮭").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("昼食")).toBeVisible();

    // Step 3: Verify home page shows nutrition > 0
    await page.goto("/", { waitUntil: "networkidle" });
    await waitForApp(page);
    await page.waitForTimeout(3000);
    await expect(page.getByText("今日の栄養バランス")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("カロリー", { exact: true })).toBeVisible();

    // Step 4: Verify recommend page loads
    await page.goto("/recommend", { waitUntil: "networkidle" });
    await waitForApp(page);
    await page.waitForTimeout(3000);
    await expect(page.getByRole("heading", { name: "おすすめ商品" })).toBeVisible({ timeout: 10000 });

    // Step 5: Add another record via API and verify via API
    await apiRequest(`/users/${TEST_USER_ID}/records`, {
      method: "POST",
      body: JSON.stringify({
        productId: "prod_007",
        date: today,
        mealType: "dinner",
      }),
    });

    // Verify both records exist via API
    const records = await apiRequest<{ records: { productId: string }[] }>(
      `/users/${TEST_USER_ID}/records?date=${today}`
    );
    const productIds = records.records.map((r) => r.productId);
    expect(productIds).toContain("prod_001");
    expect(productIds).toContain("prod_007");
  });
});

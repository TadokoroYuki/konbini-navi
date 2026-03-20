import { test, expect } from "@playwright/test";
import { TEST_USER_ID, getToday, cleanRecords, apiRequest, waitForApp } from "./helpers";

test.describe("Nutrition Calculation", () => {
  const today = getToday();

  test.beforeEach(async () => {
    await cleanRecords(TEST_USER_ID, today);
  });

  test("nutrition summary reflects recorded meals via API", async ({
    request,
  }) => {
    // Record a known product (手巻おにぎり 鮭: 183 cal, 5.2g protein)
    await apiRequest(`/users/${TEST_USER_ID}/records`, {
      method: "POST",
      body: JSON.stringify({
        productId: "prod_001",
        date: today,
        mealType: "breakfast",
      }),
    });

    const res = await request.get(
      `http://localhost:8080/v1/users/${TEST_USER_ID}/nutrition?date=${today}`
    );
    expect(res.ok()).toBeTruthy();
    const nutrition = await res.json();

    expect(nutrition.calories.actual).toBeGreaterThanOrEqual(183);
    expect(nutrition.protein.actual).toBeGreaterThanOrEqual(5.2);
  });

  test("nutrition updates after adding more records", async ({ request }) => {
    // Record first product
    await apiRequest(`/users/${TEST_USER_ID}/records`, {
      method: "POST",
      body: JSON.stringify({
        productId: "prod_001",
        date: today,
        mealType: "breakfast",
      }),
    });

    const res1 = await request.get(
      `http://localhost:8080/v1/users/${TEST_USER_ID}/nutrition?date=${today}`
    );
    const nutrition1 = await res1.json();
    const cal1 = nutrition1.calories.actual;

    // Record second product (幕の内弁当: 712 cal)
    await apiRequest(`/users/${TEST_USER_ID}/records`, {
      method: "POST",
      body: JSON.stringify({
        productId: "prod_003",
        date: today,
        mealType: "lunch",
      }),
    });

    const res2 = await request.get(
      `http://localhost:8080/v1/users/${TEST_USER_ID}/nutrition?date=${today}`
    );
    const nutrition2 = await res2.json();

    expect(nutrition2.calories.actual).toBeGreaterThan(cal1);
  });

  test("home page shows nutrition data from API", async ({ page }) => {
    // Create a record
    await apiRequest(`/users/${TEST_USER_ID}/records`, {
      method: "POST",
      body: JSON.stringify({
        productId: "prod_003",
        date: today,
        mealType: "lunch",
      }),
    });

    await page.goto("/", { waitUntil: "networkidle" });
    await waitForApp(page);
    await page.waitForTimeout(3000);

    // Home page should show "今日の栄養バランス"
    await expect(page.getByText("今日の栄養バランス")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("カロリー", { exact: true })).toBeVisible();
  });
});

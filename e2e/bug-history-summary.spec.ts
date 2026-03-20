import { test, expect } from "@playwright/test";
import { TEST_USER_ID, getToday, cleanRecords, apiRequest, waitForApp } from "./helpers";

test.describe("Bug: History page nutrition summary update", () => {
  const today = getToday();

  test.beforeEach(async () => {
    await cleanRecords(TEST_USER_ID, today);
  });

  test("nutrition summary updates when navigating back to history", async ({ page, request }) => {
    // Step 1: Create first record (手巻おにぎり 鮭: 183 cal)
    await apiRequest(`/users/${TEST_USER_ID}/records`, {
      method: "POST",
      body: JSON.stringify({
        productId: "prod_001",
        date: today,
        mealType: "breakfast",
      }),
    });

    // Step 2: Navigate to history and read initial nutrition
    await page.goto("/history", { waitUntil: "networkidle" });
    await waitForApp(page);
    await page.waitForTimeout(3000);

    // Get the initial calorie text from the nutrition mini section
    const calValue = page.locator("text=/\\d+kcal/").first();
    await expect(calValue).toBeVisible({ timeout: 10000 });
    const initialCalText = await calValue.textContent();

    // Step 3: Add another record via API (幕の内弁当: 712 cal)
    await apiRequest(`/users/${TEST_USER_ID}/records`, {
      method: "POST",
      body: JSON.stringify({
        productId: "prod_003",
        date: today,
        mealType: "lunch",
      }),
    });

    // Step 4: Navigate away (home) and back (history)
    await page.goto("/", { waitUntil: "networkidle" });
    await waitForApp(page);
    await page.waitForTimeout(1000);
    await page.goto("/history", { waitUntil: "networkidle" });
    await waitForApp(page);
    await page.waitForTimeout(3000);

    // Step 5: Read updated nutrition
    const updatedCalValue = page.locator("text=/\\d+kcal/").first();
    await expect(updatedCalValue).toBeVisible({ timeout: 10000 });
    const updatedCalText = await updatedCalValue.textContent();

    // The calorie value should have increased (183 → 895)
    const initialCal = parseInt(initialCalText?.replace(/[^\d]/g, "") ?? "0");
    const updatedCal = parseInt(updatedCalText?.replace(/[^\d]/g, "") ?? "0");
    expect(updatedCal).toBeGreaterThan(initialCal);
  });

  test("nutrition summary updates after deleting a record", async ({ page, request }) => {
    // Create two records
    await apiRequest(`/users/${TEST_USER_ID}/records`, {
      method: "POST",
      body: JSON.stringify({
        productId: "prod_001",
        date: today,
        mealType: "breakfast",
      }),
    });
    const rec2 = await apiRequest<{ recordId: string }>(`/users/${TEST_USER_ID}/records`, {
      method: "POST",
      body: JSON.stringify({
        productId: "prod_003",
        date: today,
        mealType: "lunch",
      }),
    });

    // Navigate to history
    await page.goto("/history", { waitUntil: "networkidle" });
    await waitForApp(page);
    await page.waitForTimeout(3000);

    // Get initial calorie value
    const calValue = page.locator("text=/\\d+kcal/").first();
    await expect(calValue).toBeVisible({ timeout: 10000 });
    const beforeDeleteText = await calValue.textContent();
    const beforeDeleteCal = parseInt(beforeDeleteText?.replace(/[^\d]/g, "") ?? "0");

    // Delete the second record via API
    await apiRequest(`/users/${TEST_USER_ID}/records/${rec2.recordId}`, {
      method: "DELETE",
    });

    // Navigate away and back to trigger refetch
    await page.goto("/", { waitUntil: "networkidle" });
    await waitForApp(page);
    await page.waitForTimeout(1000);
    await page.goto("/history", { waitUntil: "networkidle" });
    await waitForApp(page);
    await page.waitForTimeout(3000);

    // Calorie value should have decreased
    const afterDeleteValue = page.locator("text=/\\d+kcal/").first();
    const afterDeleteText = await afterDeleteValue.textContent();
    const afterDeleteCal = parseInt(afterDeleteText?.replace(/[^\d]/g, "") ?? "0");
    expect(afterDeleteCal).toBeLessThan(beforeDeleteCal);
  });
});

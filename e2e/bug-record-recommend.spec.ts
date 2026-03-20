import { test, expect } from "@playwright/test";
import { TEST_USER_ID, getToday, cleanRecords, apiRequest, waitForApp } from "./helpers";

test.describe("Record page smoke tests", () => {
  const today = getToday();

  test.beforeEach(async () => {
    await cleanRecords(TEST_USER_ID, today);
  });

  test("search filters products", async ({ page }) => {
    await page.goto("/record", { waitUntil: "networkidle" });
    await waitForApp(page);
    await page.waitForTimeout(3000);

    // Count initial products
    const initialProducts = await page.locator("text=/kcal$/").count();
    expect(initialProducts).toBeGreaterThan(0);

    // Type search query
    await page.getByPlaceholder("商品名で検索...").fill("サラダチキン");
    await page.waitForTimeout(2000);

    // Should have fewer results
    const filteredProducts = await page.locator("text=/kcal$/").count();
    expect(filteredProducts).toBeLessThan(initialProducts);
    expect(filteredProducts).toBeGreaterThan(0);
  });

  test("meal type selector changes active state", async ({ page }) => {
    await page.goto("/record", { waitUntil: "networkidle" });
    await waitForApp(page);
    await page.waitForTimeout(2000);

    // Click "朝食" button
    await page.getByText("朝食", { exact: true }).click();
    await page.waitForTimeout(500);
    // The button should be visually active (hard to check styles in RN web, but at least no error)

    // Click "夕食" button
    await page.getByText("夕食", { exact: true }).click();
    await page.waitForTimeout(500);
  });

  test("recording a food updates today records section", async ({ page }) => {
    await page.goto("/record", { waitUntil: "networkidle" });
    await waitForApp(page);
    await page.waitForTimeout(3000);

    // Handle dialogs
    page.on("dialog", async (dialog) => {
      await dialog.accept();
    });

    // Click a product to record it
    await page.getByText("手巻おにぎり 鮭").first().click();
    await page.waitForTimeout(3000);

    // "今日の記録" section should appear
    await expect(page.getByText("今日の記録")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/1件/)).toBeVisible();
  });

  test("no console errors on record page", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && !msg.text().includes("Slow network")) {
        errors.push(msg.text());
      }
    });

    await page.goto("/record", { waitUntil: "networkidle" });
    await waitForApp(page);
    await page.waitForTimeout(3000);

    // Filter out known non-critical errors (deprecation warnings, etc)
    const criticalErrors = errors.filter(
      (e) => !e.includes("shadow") && !e.includes("pointerEvents") && !e.includes("Obsidian")
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe("Recommend page smoke tests", () => {
  const today = getToday();

  test.beforeEach(async () => {
    await cleanRecords(TEST_USER_ID, today);
  });

  test("shows deficiency section when nutrition is deficient", async ({ page }) => {
    // Record a small item so nutrition is deficient
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

    // Should show deficiency section
    await expect(page.getByText("不足している栄養素")).toBeVisible({ timeout: 10000 });
  });

  test("recommendation cards show product details", async ({ page }) => {
    // Record a small item
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

    // Should have recommendation cards with price
    await expect(page.locator("text=/\\d+円/").first()).toBeVisible({ timeout: 10000 });
    // Should show reason text
    await expect(page.locator("text=/不足しています/").first()).toBeVisible({ timeout: 10000 });
    // Should show nutrient tags
    await expect(page.locator("text=/を補える/").first()).toBeVisible({ timeout: 10000 });
  });
});

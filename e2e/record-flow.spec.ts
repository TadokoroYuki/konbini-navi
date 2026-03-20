import { test, expect } from "@playwright/test";
import { TEST_USER_ID, getToday, cleanRecords, apiRequest, waitForApp } from "./helpers";

test.describe("Record Flow", () => {
  const today = getToday();

  test.beforeEach(async () => {
    await cleanRecords(TEST_USER_ID, today);
  });

  test("food record persists to database via API", async ({ request }) => {
    // Create a record directly via API (most reliable persistence test)
    const createRes = await request.post(
      `http://localhost:8080/v1/users/${TEST_USER_ID}/records`,
      {
        data: {
          productId: "prod_001",
          date: today,
          mealType: "lunch",
        },
      }
    );
    expect(createRes.ok()).toBeTruthy();
    const created = await createRes.json();
    expect(created.recordId).toBeDefined();
    expect(created.product.name).toBe("手巻おにぎり 鮭");

    // Verify via separate GET that the record persisted
    const listRes = await request.get(
      `http://localhost:8080/v1/users/${TEST_USER_ID}/records?date=${today}`
    );
    expect(listRes.ok()).toBeTruthy();
    const body = await listRes.json();
    expect(body.records.length).toBeGreaterThan(0);

    const found = body.records.find(
      (r: { recordId: string }) => r.recordId === created.recordId
    );
    expect(found).toBeDefined();
    expect(found.productId).toBe("prod_001");
  });

  test("record appears in history after creation", async ({ page }) => {
    // Create a record via API first
    await apiRequest(`/users/${TEST_USER_ID}/records`, {
      method: "POST",
      body: JSON.stringify({
        productId: "prod_001",
        date: today,
        mealType: "lunch",
      }),
    });

    await page.goto("/", { waitUntil: "networkidle" });
    await waitForApp(page);

    // Navigate to history tab
    await page.getByRole("tab", { name: "履歴" }).click();
    await page.waitForTimeout(3000);

    // Verify the record shows in history
    await expect(page.getByText("手巻おにぎり 鮭")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("昼食")).toBeVisible();
  });

  test("record persists after re-fetch from API", async ({ request }) => {
    // Create a record via API
    await apiRequest(`/users/${TEST_USER_ID}/records`, {
      method: "POST",
      body: JSON.stringify({
        productId: "prod_007",
        date: today,
        mealType: "dinner",
      }),
    });

    // Verify the record exists in the API
    const res1 = await request.get(
      `http://localhost:8080/v1/users/${TEST_USER_ID}/records?date=${today}`
    );
    expect(res1.ok()).toBeTruthy();
    const body1 = await res1.json();
    const found1 = body1.records.find(
      (r: { productId: string }) => r.productId === "prod_007"
    );
    expect(found1).toBeDefined();

    // Fetch again to confirm persistence
    const res2 = await request.get(
      `http://localhost:8080/v1/users/${TEST_USER_ID}/records?date=${today}`
    );
    const body2 = await res2.json();
    const found2 = body2.records.find(
      (r: { productId: string }) => r.productId === "prod_007"
    );
    expect(found2).toBeDefined();
    expect(found2.product.name).toContain("サラダチキン");
  });
});

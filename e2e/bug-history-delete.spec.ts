import { test, expect } from "@playwright/test";
import {
  TEST_USER_ID,
  getToday,
  cleanRecords,
  apiRequest,
  waitForApp,
} from "./helpers";

/**
 * Bug investigation: Delete button on history page does not work on web.
 *
 * Root cause: history.tsx used Alert.alert() from react-native, which is a
 * no-op on web. The fix uses Platform.OS === "web" to call window.confirm()
 * on web, falling back to Alert.alert() on native platforms.
 *
 * Additional note: React Native Web renders TouchableOpacity as a generic
 * <div> without role="button". We added testID="delete-record-button" to
 * reliably locate the delete button via data-testid.
 */
test.describe("Bug: History page delete button", () => {
  const today = getToday();

  test.beforeEach(async () => {
    await cleanRecords(TEST_USER_ID, today);
  });

  test("delete button click triggers confirmation and removes record", async ({
    page,
  }) => {
    // 1. Create a test record via API
    const created = await apiRequest<{
      recordId: string;
      product: { name: string };
    }>(`/users/${TEST_USER_ID}/records`, {
      method: "POST",
      body: JSON.stringify({
        productId: "prod_001",
        date: today,
        mealType: "lunch",
      }),
    });
    expect(created.recordId).toBeDefined();

    // 2. Navigate to app and go to history tab
    await page.goto("/", { waitUntil: "networkidle" });
    await waitForApp(page);

    await page.getByRole("tab", { name: "履歴" }).click();
    await page.waitForTimeout(3000);

    // Verify the record is visible
    const recordName = "手巻おにぎり 鮭";
    await expect(page.getByText(recordName)).toBeVisible({ timeout: 10000 });

    // 3. Monitor network for DELETE calls
    const deleteApiCalls: string[] = [];
    page.on("request", (req) => {
      if (req.method() === "DELETE") {
        deleteApiCalls.push(req.url());
      }
    });

    // 4. Set up dialog handler to accept the confirmation
    let dialogAppeared = false;
    let dialogMessage = "";
    page.on("dialog", async (dialog) => {
      dialogAppeared = true;
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    // 5. Click the delete button via testID
    const deleteBtn = page.getByTestId("delete-record-button").first();
    await deleteBtn.click({ timeout: 5000 });

    // 6. Wait for dialog and deletion to complete
    await page.waitForTimeout(2000);

    // 7. Verify the fix works
    expect(dialogAppeared, "Confirmation dialog should appear on web").toBe(
      true
    );
    expect(dialogMessage).toContain(recordName);
    expect(deleteApiCalls.length).toBeGreaterThan(0);

    // Record should no longer be visible
    await expect(page.getByText(recordName)).not.toBeVisible({
      timeout: 5000,
    });

    // Verify via API that the record is actually gone
    const listRes = await apiRequest<{ records: { recordId: string }[] }>(
      `/users/${TEST_USER_ID}/records?date=${today}`
    );
    const found = listRes.records.find(
      (r) => r.recordId === created.recordId
    );
    expect(found).toBeUndefined();
  });

  test("cancel dialog does not delete record", async ({ page }) => {
    // Create a test record
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

    await page.getByRole("tab", { name: "履歴" }).click();
    await page.waitForTimeout(3000);

    const recordName = "手巻おにぎり 鮭";
    await expect(page.getByText(recordName)).toBeVisible({ timeout: 10000 });

    // Dismiss (cancel) the dialog
    page.on("dialog", async (dialog) => {
      await dialog.dismiss();
    });

    const deleteApiCalls: string[] = [];
    page.on("request", (req) => {
      if (req.method() === "DELETE") deleteApiCalls.push(req.url());
    });

    // Click delete button
    const deleteBtn = page.getByTestId("delete-record-button").first();
    await deleteBtn.click({ timeout: 5000 });

    await page.waitForTimeout(2000);

    // Record should still be visible (cancel = no delete)
    await expect(page.getByText(recordName)).toBeVisible();
    expect(deleteApiCalls.length).toBe(0);
  });

  test("delete API works correctly (backend is not the problem)", async ({
    request,
  }) => {
    // Create a record
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

    // Delete via API directly
    const deleteRes = await request.delete(
      `http://localhost:8080/v1/users/${TEST_USER_ID}/records/${created.recordId}`
    );
    expect(deleteRes.status()).toBe(204);

    // Verify deleted
    const listRes = await request.get(
      `http://localhost:8080/v1/users/${TEST_USER_ID}/records?date=${today}`
    );
    const body = await listRes.json();
    const found = body.records.find(
      (r: { recordId: string }) => r.recordId === created.recordId
    );
    expect(found).toBeUndefined();
  });
});

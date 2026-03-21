import { test, expect } from "@playwright/test";

test.describe("Product Search - API", () => {
  test("GET /v1/products returns seeded products", async ({ request }) => {
    const res = await request.get(
      "http://localhost:8080/v1/products?limit=50"
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.products).toBeDefined();
    expect(body.products.length).toBeGreaterThan(10);
    // Verify it's real seed data, not mock (mock uses "p001", seed uses "prod_001")
    const ids = body.products.map((p: { productId: string }) => p.productId);
    expect(ids).toContain("prod_001");
  });

  test("GET /v1/products?q=サラダチキン filters results", async ({
    request,
  }) => {
    const res = await request.get(
      "http://localhost:8080/v1/products?q=サラダチキン"
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.products.length).toBeGreaterThan(0);
    for (const p of body.products) {
      expect(p.name).toContain("サラダチキン");
    }
  });

  test("GET /v1/products/{id} returns single product", async ({ request }) => {
    const res = await request.get(
      "http://localhost:8080/v1/products/prod_001"
    );
    expect(res.ok()).toBeTruthy();
    const product = await res.json();
    expect(product.productId).toBe("prod_001");
    expect(product.name).toBe("手巻おにぎり 鮭");
  });
});

test.describe("Product Search - UI", () => {
  test("record page shows real product list", async ({ page }) => {
    await page.goto("/record", { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.getElementById("root")?.children.length! > 0, { timeout: 30000 });
    // Wait for product list to load
    await page.waitForTimeout(3000);
    // Check a known seed product name
    await expect(page.getByText("手巻おにぎり 鮭").first()).toBeVisible({ timeout: 10000 });
  });
});

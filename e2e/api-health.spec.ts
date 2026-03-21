import { test, expect } from "@playwright/test";

test.describe("API Health Checks", () => {
  test("API gateway is healthy", async ({ request }) => {
    const res = await request.get("http://localhost:8080/health");
    expect(res.ok()).toBeTruthy();
  });

  test("Products service is healthy", async ({ request }) => {
    const res = await request.get("http://localhost:7111/health");
    expect(res.ok()).toBeTruthy();
  });

  test("Records service is healthy", async ({ request }) => {
    const res = await request.get("http://localhost:8810/health");
    expect(res.ok()).toBeTruthy();
  });

  test("Nutrition service is healthy", async ({ request }) => {
    const res = await request.get("http://localhost:1056/health");
    expect(res.ok()).toBeTruthy();
  });

  test("Recommendations service is healthy", async ({ request }) => {
    const res = await request.get("http://localhost:2525/health");
    expect(res.ok()).toBeTruthy();
  });
});

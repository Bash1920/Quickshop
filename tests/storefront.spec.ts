import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext } from "@playwright/test";
import type { ShopState } from "../src/lib/catalog";

async function readState(request: APIRequestContext): Promise<ShopState> {
  const response = await request.get("/api/store");
  expect(response.ok()).toBeTruthy();
  return (await response.json()).state;
}

async function action(request: APIRequestContext, data: Record<string, unknown>) {
  const response = await request.post("/api/store", { data });
  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json();
}

test("storefront, product images, and mobile layouts load correctly", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveTitle(/^QuickShop/);
  await expect(page.getByRole("button", { name: "QuickShop home", exact: true })).toHaveCount(2);
  await expect(page.locator(".product-card")).toHaveCount(12);
  expect(await page.evaluate(() => Array.from(document.images).filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.src))).toEqual([]);

  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const geometry = await page.evaluate(() => {
      const logo = document.querySelector(".site-header .brand-name")!.getBoundingClientRect();
      const controls = document.querySelector(window.innerWidth <= 700 ? ".header-actions" : ".search-form")!.getBoundingClientRect();
      return { contentWidth: document.documentElement.scrollWidth, screenWidth: window.innerWidth, logoRight: logo.right, controlsLeft: controls.left };
    });
    expect(geometry.contentWidth).toBe(geometry.screenWidth);
    expect(geometry.logoRight).toBeLessThanOrEqual(geometry.controlsLeft);
  }
  expect(errors).toEqual([]);
});

test("categories, search, sorting, and dialog keyboard controls work", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.locator(".category-navigation").getByRole("button", { name: "Electronics", exact: true }).click();
  await expect(page.locator(".catalog-heading h1")).toHaveText("Electronics");
  await page.getByLabel("Sort products").selectOption("price-low");
  await expect(page.locator(".product-name").first()).toHaveText("Amazon Echo Plus");

  const search = page.getByRole("textbox", { name: "Search for products, brands and more" });
  await search.fill("Puma");
  await search.press("Enter");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page.getByRole("button", { name: "View Puma Future Rider Trainers", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Close dialog", exact: true })).toBeFocused();
  await dialog.getByRole("button", { name: "Increase quantity", exact: true }).click();
  await expect(dialog.locator(".quantity-control > span")).toHaveText("2");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: "View Puma Future Rider Trainers", exact: true })).toBeFocused();

  await search.fill("no-such-quickshop-product");
  await search.press("Enter");
  await expect(page.getByRole("heading", { name: "No finds just yet" })).toBeVisible();
  await page.getByRole("button", { name: "Clear all filters", exact: true }).click();
  await expect(page.locator(".product-card")).toHaveCount(30);
});

test("cart quantities and wishlist survive a reload", async ({ page, context }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Save Apple iPhone 13 Pro to wishlist", exact: true }).click();
  await expect(page.getByRole("button", { name: "Remove Apple iPhone 13 Pro from wishlist", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Add Apple iPhone 13 Pro to cart", exact: true }).click();
  await expect(page.locator(".cart-icon b")).toHaveText("1");
  await page.locator(".cart-action").click();
  await page.getByRole("button", { name: "Increase Apple iPhone 13 Pro quantity", exact: true }).click();
  await expect(page.locator(".cart-icon b")).toHaveText("2");
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator(".cart-icon b")).toHaveText("2");
  const state = await readState(context.request);
  expect(state.cart).toContainEqual({ productId: 123, quantity: 2 });
  expect(state.wishlist).toContain(123);
  const invalid = await context.request.post("/api/store", { data: { action: "setQuantity", productId: 123, quantity: -1 } });
  expect(invalid.status()).toBe(400);
  await page.locator(".cart-action").click();
  await page.getByRole("button", { name: "Remove Apple iPhone 13 Pro", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your cart is waiting for a little joy" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Remove Apple iPhone 13 Pro from wishlist", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save Apple iPhone 13 Pro to wishlist", exact: true })).toHaveAttribute("aria-pressed", "false");
});

test("account persistence and demo checkout work end to end", async ({ page, context, browser, baseURL }) => {
  test.skip(process.env.QUICKSHOP_E2E_WRITES !== "1", "Enable only against a disposable demo database; this creates an account and order.");
  const email = `quickshop-test-${randomUUID()}@example.com`;
  const password = randomUUID();
  await page.goto("/", { waitUntil: "networkidle" });
  const before = await readState(context.request);
  const product = before.products.find((item) => item.id === 123)!;
  expect(product.stock).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Add Apple iPhone 13 Pro to cart", exact: true }).click();
  await expect(page.locator(".cart-icon b")).toHaveText("1");
  await page.getByRole("button", { name: "Save Apple iPhone 13 Pro to wishlist", exact: true }).click();
  await expect(page.getByRole("button", { name: "Remove Apple iPhone 13 Pro from wishlist", exact: true })).toHaveAttribute("aria-pressed", "true");

  await page.locator(".login-action").click();
  await page.getByRole("button", { name: "Create an account", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Full name", { exact: true }).fill("Demo Tester");
  await page.getByRole("dialog").getByLabel("Email address", { exact: true }).fill(email);
  await page.getByRole("dialog").getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create my account", exact: true }).click();
  await expect(page.locator(".login-action")).toContainText("Demo");
  expect((await readState(context.request)).cart).toContainEqual({ productId: product.id, quantity: 1 });

  await page.locator(".login-action").click();
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page.locator(".login-action")).toContainText("Login");
  const guest = await readState(context.request);
  expect(guest.user).toBeNull();
  expect(guest.cart).toHaveLength(0);
  expect(guest.orders).toHaveLength(0);
  await page.locator(".login-action").click();
  await page.getByRole("dialog").getByLabel("Email address", { exact: true }).fill(email);
  await page.getByRole("dialog").getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.locator(".cart-icon b")).toHaveText("1");
  expect((await readState(context.request)).wishlist).toContain(product.id);

  await page.locator(".cart-action").click();
  await page.getByRole("button", { name: "Proceed to checkout", exact: true }).click();
  const checkout = page.getByRole("dialog");
  await checkout.getByLabel("Mobile number", { exact: true }).fill("9876543210");
  await checkout.getByLabel("PIN code", { exact: true }).fill("560038");
  await checkout.getByLabel("Delivery address", { exact: true }).fill("42 Demo Avenue, Indiranagar");
  await checkout.getByLabel("Town / City", { exact: true }).fill("Bengaluru");
  await checkout.getByRole("button", { name: /^Place order/ }).click();
  await expect(page.getByRole("heading", { name: "Great choice, Demo!", exact: true })).toBeVisible();
  const after = await readState(context.request);
  expect(after.cart).toHaveLength(0);
  expect(after.orders).toHaveLength(1);
  expect(after.orders[0].total).toBe(product.price);
  expect(after.products.find((item) => item.id === product.id)!.stock).toBe(product.stock - 1);
  await page.getByRole("button", { name: "View my orders", exact: true }).click();
  await expect(page.locator(".order-status")).toContainText("Confirmed");
  await expect(page.locator(".order-card-heading strong")).toHaveText(/^QS-/);

  const second = await browser.newContext({ baseURL });
  try {
    expect((await readState(second.request)).orders).toHaveLength(0);
    const loggedIn = await action(second.request, { action: "login", email, password });
    expect(loggedIn.state.orders).toHaveLength(1);
    expect(loggedIn.state.wishlist).toContain(product.id);
    await action(second.request, { action: "addToCart", productId: 6, quantity: 1 });
    expect((await readState(context.request)).cart).toContainEqual({ productId: 6, quantity: 1 });
    await action(second.request, { action: "setQuantity", productId: 6, quantity: 0 });
  } finally {
    await second.close();
  }
});

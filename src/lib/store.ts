import { db } from "@/db";
import { cartItems, customers, orders, products, shopSessions, wishlistItems } from "@/db/schema";
import { and, desc, eq, gt, isNull, or, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { randomUUID, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { seedProducts } from "@/lib/catalog";

let catalogReady: Promise<void> | undefined;
export function ensureCatalog() {
  if (!catalogReady) {
    catalogReady = db.insert(products).values(seedProducts).onConflictDoNothing().then(() => undefined).catch((error) => {
      catalogReady = undefined;
      throw error;
    });
  }
  return catalogReady;
}

export async function getProducts() {
  await ensureCatalog();
  const rows = await db.select().from(products);
  const positions = new Map(seedProducts.map((product, index) => [product.id, index]));
  return rows.sort((a, b) => (positions.get(a.id) ?? 100) - (positions.get(b.id) ?? 100));
}

export async function getSession(forceNew = false) {
  const cookieStore = await cookies();
  const token = cookieStore.get("flipkart_session")?.value;
  if (!forceNew && token && /^[a-f0-9-]{36}$/.test(token)) {
    const [session] = await db.select().from(shopSessions).where(and(eq(shopSessions.id, token), gt(shopSessions.expiresAt, new Date()))).limit(1);
    if (session) return session.id;
  }
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(shopSessions).values({ id, expiresAt });
  cookieStore.set("flipkart_session", id, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt });
  return id;
}

export async function getCustomer(sessionId: string) {
  const [row] = await db.select({ id: customers.id, name: customers.name, email: customers.email })
    .from(shopSessions).innerJoin(customers, eq(shopSessions.customerId, customers.id))
    .where(eq(shopSessions.id, sessionId)).limit(1);
  return row ?? null;
}

export async function connectCustomer(sessionId: string, customerId: string) {
  const ownerId = `customer:${customerId}`;
  await db.transaction(async (tx) => {
    const guestCart = await tx.select().from(cartItems).where(eq(cartItems.sessionId, sessionId));
    for (const item of guestCart) {
      await tx.insert(cartItems).values({ sessionId: ownerId, productId: item.productId, quantity: item.quantity })
        .onConflictDoUpdate({ target: [cartItems.sessionId, cartItems.productId], set: { quantity: sql`least(${cartItems.quantity} + ${item.quantity}, 10)` } });
    }
    const guestWishlist = await tx.select().from(wishlistItems).where(eq(wishlistItems.sessionId, sessionId));
    if (guestWishlist.length) {
      await tx.insert(wishlistItems).values(guestWishlist.map((item) => ({ sessionId: ownerId, productId: item.productId }))).onConflictDoNothing();
    }
    await tx.delete(cartItems).where(eq(cartItems.sessionId, sessionId));
    await tx.delete(wishlistItems).where(eq(wishlistItems.sessionId, sessionId));
    await tx.update(shopSessions).set({ customerId }).where(eq(shopSessions.id, sessionId));
    await tx.update(orders).set({ customerId }).where(and(eq(orders.sessionId, sessionId), isNull(orders.customerId)));
  });
}

export async function getShopState(sessionId: string) {
  const user = await getCustomer(sessionId);
  const ownerId = user ? `customer:${user.id}` : sessionId;
  const [catalog, cart, wishlist, orderRows] = await Promise.all([
    getProducts(),
    db.select({ productId: cartItems.productId, quantity: cartItems.quantity }).from(cartItems).where(eq(cartItems.sessionId, ownerId)),
    db.select({ productId: wishlistItems.productId }).from(wishlistItems).where(eq(wishlistItems.sessionId, ownerId)),
    db.select().from(orders).where(user ? or(and(eq(orders.sessionId, sessionId), isNull(orders.customerId)), eq(orders.customerId, user.id)) : and(eq(orders.sessionId, sessionId), isNull(orders.customerId))).orderBy(desc(orders.createdAt)).limit(50),
  ]);
  return { products: catalog, cart, wishlist: wishlist.map((item) => item.productId), user, orders: orderRows };
}

export class StoreError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function text(value: unknown, label: string, minimum = 1, maximum = 200) {
  if (typeof value !== "string" || value.trim().length < minimum || value.trim().length > maximum) {
    throw new StoreError(`Please enter a valid ${label}.`);
  }
  return value.trim();
}
export function emailAddress(value: unknown) {
  const email = text(value, "email address", 5, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new StoreError("Please enter a valid email address.");
  return email;
}

async function deriveKey(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, (error, key) => error ? reject(error) : resolve(key));
  });
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await deriveKey(password, salt);
  return `${salt}:${key.toString("hex")}`;
}
export async function checkPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const actual = await deriveKey(password, salt);
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

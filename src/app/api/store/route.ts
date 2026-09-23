import { db } from "@/db";
import { cartItems, customers, orders, products, sellerApplications, shopSessions, subscribers, wishlistItems } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { checkPassword, connectCustomer, emailAddress, ensureCatalog, getCustomer, getSession, getShopState, hashPassword, StoreError, text } from "@/lib/store";
import { shippingFee } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function errorResponse(error: unknown) {
  if (error instanceof StoreError) return Response.json({ error: error.message }, { status: error.status });
  console.error("Store API:", error);
  return Response.json({ error: "Something went wrong. Please try again in a moment." }, { status: 500 });
}

export async function GET() {
  try {
    await ensureCatalog();
    const sessionId = await getSession();
    return Response.json({ state: await getShopState(sessionId) });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    await ensureCatalog();
    let sessionId = await getSession();
    let body: Record<string, unknown>;
    try { body = await request.json(); } catch { throw new StoreError("Invalid request."); }
    if (!body || typeof body !== "object") throw new StoreError("Invalid request.");
    const currentUser = await getCustomer(sessionId);
    const ownerId = currentUser ? `customer:${currentUser.id}` : sessionId;
    let result: Record<string, unknown> = {};

    switch (body.action) {
      case "addToCart":
      case "setQuantity": {
        const productId = Number(body.productId);
        const quantity = body.quantity === undefined ? 1 : Number(body.quantity);
        if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 0 || quantity > 10) throw new StoreError("Choose a quantity between 1 and 10.");
        const condition = and(eq(cartItems.sessionId, ownerId), eq(cartItems.productId, productId));
        if (quantity === 0 && body.action === "setQuantity") {
          await db.delete(cartItems).where(condition);
          break;
        }
        if (quantity === 0) throw new StoreError("Please choose at least one item.");
        const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
        if (!product) throw new StoreError("This product is no longer available.", 404);
        if (quantity > product.stock) throw new StoreError("Sorry, there are not enough items in stock.");
        if (body.action === "addToCart") {
          await db.insert(cartItems).values({ sessionId: ownerId, productId, quantity }).onConflictDoUpdate({
            target: [cartItems.sessionId, cartItems.productId],
            set: { quantity: sql`least(${cartItems.quantity} + ${quantity}, 10, ${product.stock})` },
          });
        } else {
          await db.update(cartItems).set({ quantity }).where(condition);
        }
        break;
      }
      case "toggleWishlist": {
        const productId = Number(body.productId);
        if (!Number.isInteger(productId)) throw new StoreError("Invalid product.");
        const [product] = await db.select({ id: products.id }).from(products).where(eq(products.id, productId));
        if (!product) throw new StoreError("Product not found.", 404);
        const condition = and(eq(wishlistItems.sessionId, ownerId), eq(wishlistItems.productId, productId));
        const [saved] = await db.select().from(wishlistItems).where(condition);
        if (saved) await db.delete(wishlistItems).where(condition);
        else await db.insert(wishlistItems).values({ sessionId: ownerId, productId }).onConflictDoNothing();
        break;
      }
      case "register": {
        const name = text(body.name, "name", 2, 80);
        const email = emailAddress(body.email);
        const password = text(body.password, "password of at least 8 characters", 8, 128);
        const [existing] = await db.select({ id: customers.id }).from(customers).where(eq(customers.email, email));
        if (existing) throw new StoreError("An account with this email already exists. Please log in.");
        const [customer] = await db.insert(customers).values({ name, email, passwordHash: await hashPassword(password) }).returning({ id: customers.id });
        await connectCustomer(sessionId, customer.id);
        break;
      }
      case "login": {
        const email = emailAddress(body.email);
        const password = text(body.password, "password", 1, 128);
        const [customer] = await db.select().from(customers).where(eq(customers.email, email));
        if (!customer || !(await checkPassword(password, customer.passwordHash))) throw new StoreError("Your email or password is incorrect.", 401);
        await connectCustomer(sessionId, customer.id);
        break;
      }
      case "logout": {
        await db.update(shopSessions).set({ customerId: null, expiresAt: new Date() }).where(eq(shopSessions.id, sessionId));
        sessionId = await getSession(true);
        break;
      }
      case "checkout": {
        const customerName = text(body.name, "full name", 2, 80);
        const email = emailAddress(body.email);
        const phone = text(body.phone, "10-digit phone number", 10, 10);
        if (!/^[6-9]\d{9}$/.test(phone)) throw new StoreError("Please enter a valid 10-digit Indian mobile number.");
        const address = text(body.address, "delivery address", 8, 300);
        const city = text(body.city, "city", 2, 80);
        const pincode = text(body.pincode, "6-digit PIN code", 6, 6);
        if (!/^[1-9]\d{5}$/.test(pincode)) throw new StoreError("Please enter a valid 6-digit PIN code.");
        const order = await db.transaction(async (tx) => {
          const lines = await tx.select({ product: products, quantity: cartItems.quantity }).from(cartItems)
            .innerJoin(products, eq(cartItems.productId, products.id)).where(eq(cartItems.sessionId, ownerId)).for("update");
          if (!lines.length) throw new StoreError("Your cart is empty. Add something you love first.");
          for (const line of lines) {
            if (line.quantity > line.product.stock) throw new StoreError(`${line.product.name} does not have enough stock. Please update your cart.`);
          }
          const items = lines.map(({ product, quantity }) => ({ productId: product.id, name: product.name, image: product.image, price: product.price, quantity }));
          const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
          const deliveryFee = shippingFee(subtotal);
          const [created] = await tx.insert(orders).values({ sessionId, customerId: currentUser?.id ?? null, customerName, email, phone, address, city, pincode, total: subtotal + deliveryFee, deliveryFee, items }).returning();
          for (const { product, quantity } of lines) {
            await tx.update(products).set({ stock: sql`${products.stock} - ${quantity}` }).where(eq(products.id, product.id));
          }
          await tx.delete(cartItems).where(eq(cartItems.sessionId, ownerId));
          return created;
        });
        result = { order };
        break;
      }
      case "seller": {
        const businessName = text(body.businessName, "business name", 2, 100);
        const email = emailAddress(body.email);
        const phone = text(body.phone, "10-digit phone number", 10, 10);
        if (!/^[6-9]\d{9}$/.test(phone)) throw new StoreError("Please enter a valid 10-digit Indian mobile number.");
        const category = text(body.category, "product category", 2, 60);
        await db.insert(sellerApplications).values({ businessName, email, phone, category });
        result = { message: "Your seller application has been saved. Thank you for your interest!" };
        break;
      }
      case "subscribe": {
        await db.insert(subscribers).values({ email: emailAddress(body.email) }).onConflictDoNothing();
        result = { message: "You’re on the list! Your email preferences have been saved." };
        break;
      }
      default: throw new StoreError("Unknown shopping action.");
    }
    return Response.json({ ...result, state: await getShopState(sessionId) });
  } catch (error) { return errorResponse(error); }
}

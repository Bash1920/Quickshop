import { pgTable, integer, text, timestamp, uuid, boolean, doublePrecision, jsonb, primaryKey } from "drizzle-orm/pg-core";

export const products = pgTable("products", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  brand: text("brand").notNull(),
  category: text("category").notNull(),
  price: integer("price").notNull(),
  originalPrice: integer("original_price").notNull(),
  rating: doublePrecision("rating").notNull(),
  reviews: integer("reviews").notNull(),
  image: text("image").notNull(),
  images: jsonb("images").$type<string[]>().notNull(),
  description: text("description").notNull(),
  details: jsonb("details").$type<string[]>().notNull(),
  badge: text("badge").notNull().default(""),
  featured: boolean("featured").notNull().default(false),
  stock: integer("stock").notNull().default(50),
});

export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const shopSessions = pgTable("shop_sessions", {
  id: text("id").primaryKey(),
  customerId: uuid("customer_id").references(() => customers.id),
  expiresAt: timestamp("expires_at").notNull(),
});

export const cartItems = pgTable("cart_items", {
  sessionId: text("session_id").notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull().default(1),
}, (table) => [primaryKey({ columns: [table.sessionId, table.productId] })]);

export const wishlistItems = pgTable("wishlist_items", {
  sessionId: text("session_id").notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
}, (table) => [primaryKey({ columns: [table.sessionId, table.productId] })]);

export type OrderLine = { productId: number; name: string; image: string; price: number; quantity: number };

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: text("session_id").notNull(),
  customerId: uuid("customer_id").references(() => customers.id),
  customerName: text("customer_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  pincode: text("pincode").notNull(),
  total: integer("total").notNull(),
  deliveryFee: integer("delivery_fee").notNull().default(0),
  paymentMethod: text("payment_method").notNull().default("Cash on delivery"),
  status: text("status").notNull().default("Confirmed"),
  items: jsonb("items").$type<OrderLine[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sellerApplications = pgTable("seller_applications", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessName: text("business_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  category: text("category").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const subscribers = pgTable("subscribers", {
  email: text("email").primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

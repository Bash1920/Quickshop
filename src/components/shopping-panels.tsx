"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, BadgeCheck, Check, CheckCircle2, ChevronDown, CreditCard, Eye, EyeOff, Heart, HelpCircle, LoaderCircle, LockKeyhole, MapPin, Minus, Package, Plus, RotateCcw, ShieldCheck, ShoppingBag, ShoppingCart, Star, Store, Tag, Trash2, Truck, UserRound, X } from "lucide-react";
import { categories, discount, money, shippingFee, type Order, type Product } from "@/lib/catalog";
import { useShop } from "@/components/shop-provider";
import { Assured } from "@/components/product-card";

export function Modal({ title, children, onClose, drawer = false, wide = false }: { title: string; children: ReactNode; onClose: () => void; drawer?: boolean; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  const id = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const scroll = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") closeRef.current();
      if (event.key === "Tab") {
        const items = ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select, textarea, [tabindex="0"]');
        if (!items?.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { event.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => { document.body.style.overflow = scroll; document.removeEventListener("keydown", handleKey); previous?.focus(); };
  }, []);
  return <div className={`overlay ${drawer ? "drawer-overlay" : ""}`} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={ref} className={`dialog ${drawer ? "drawer" : ""} ${wide ? "dialog-wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1}>
      <div className="dialog-header"><h2 id={id}>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={22} /></button></div>
      {children}
    </div>
  </div>;
}

function LoadingButton({ busy, children }: { busy: boolean; children: ReactNode }) {
  return <>{busy && <LoaderCircle className="spin" size={17} />}{children}</>;
}

export function ProductPanel({ product, onClose, onCart }: { product: Product; onClose: () => void; onCart: () => void }) {
  const { request, busy, wishlist, notify } = useShop();
  const [quantity, setQuantity] = useState(1);
  const [pincode, setPincode] = useState("");
  const [delivery, setDelivery] = useState(false);
  const saved = wishlist.includes(product.id);
  async function add(buyNow = false) {
    const result = await request("addToCart", { productId: product.id, quantity }, buyNow ? undefined : "Added to your cart");
    if (result && buyNow) onCart();
  }
  return <Modal title="A closer look" onClose={onClose} wide>
    <div className="product-detail">
      <div className="detail-visual">
        <div className="detail-image"><img src={product.image} alt={product.name} width={480} height={480} /><button className={`wishlist-button ${saved ? "is-saved" : ""}`} disabled={busy} aria-label={saved ? "Remove from wishlist" : "Save to wishlist"} onClick={() => request("toggleWishlist", { productId: product.id }, saved ? "Removed from your wishlist" : "Saved to your wishlist")}><Heart size={21} fill={saved ? "currentColor" : "none"} /></button></div>
        <div className="detail-guarantees"><span><ShieldCheck size={23} />100% authentic</span><span><RotateCcw size={23} />Easy returns</span><span><Truck size={23} />Fast delivery</span></div>
      </div>
      <div className="detail-info"><span className="eyebrow blue-text">{product.brand}</span><h2>{product.name}</h2>
        <div className="rating-row"><span className="rating">{product.rating.toFixed(1)}<Star size={10} fill="currentColor" /></span><span className="review-count">{product.reviews.toLocaleString("en-IN")} ratings</span><Assured /></div>
        <p className="detail-description">{product.description}</p>
        <span className="special-price">Special price</span><div className="detail-price"><strong>{money(product.price)}</strong><del>{money(product.originalPrice)}</del><span>{discount(product)}% off</span></div><p className="tax-note">Inclusive of all taxes</p>
        <div className="detail-offers"><h3>Good things included</h3><p><Tag size={16} /><span><strong>Extra savings</strong> You save {money(product.originalPrice - product.price)} on this product.</span></p><p><Truck size={16} /><span><strong>Free delivery</strong> On all orders of {money(499)} or more.</span></p><p><CreditCard size={16} /><span><strong>Pay your way</strong> Cash on delivery available.</span></p></div>
        <div className="detail-stock"><span className={product.stock ? "stock-dot" : "stock-dot sold-out"} />{product.stock ? "In stock & ready for your cart" : "Currently out of stock"}</div>
        <div className="detail-actions"><div className="quantity-control"><button onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1} aria-label="Decrease quantity"><Minus size={15} /></button><span>{quantity}</span><button onClick={() => setQuantity(Math.min(10, product.stock, quantity + 1))} disabled={quantity >= Math.min(10, product.stock)} aria-label="Increase quantity"><Plus size={15} /></button></div><button className="button button-yellow" disabled={busy || !product.stock} onClick={() => add()}><ShoppingCart size={18} />Add to cart</button><button className="button button-blue" disabled={busy || !product.stock} onClick={() => add(true)}>Buy now<ArrowRight size={17} /></button></div>
        <div className="delivery-check"><MapPin size={19} /><input aria-label="Delivery PIN code" placeholder="Enter delivery PIN code" inputMode="numeric" maxLength={6} value={pincode} onChange={(event) => { setPincode(event.target.value.replace(/\D/g, "")); setDelivery(false); }} /><button onClick={() => { if (/^[1-9]\d{5}$/.test(pincode)) setDelivery(true); else notify("Please enter a valid 6-digit PIN code.", true); }}>Check</button></div>{delivery && <p className="delivery-result"><Check size={15} />Estimated delivery in 3–5 business days. Confirm your address at checkout.</p>}
        <details className="product-highlights"><summary>Product highlights<ChevronDown size={16} /></summary><ul>{product.details.map((item) => <li key={item}>{item}</li>)}</ul></details>
      </div>
    </div>
  </Modal>;
}

export function CartPanel({ onClose, onOrders }: { onClose: () => void; onOrders: () => void }) {
  const { cart, products, request, busy, user } = useShop();
  const [step, setStep] = useState<"cart" | "checkout" | "success">("cart");
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const lines = cart.map((line) => ({ ...line, product: products.find((product) => product.id === line.productId)! })).filter((line) => line.product);
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.product.price, 0);
  const mrp = lines.reduce((sum, line) => sum + line.quantity * line.product.originalPrice, 0);
  const shipping = shippingFee(subtotal);
  async function checkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const result = await request("checkout", fields);
    if (result?.order) { setPlacedOrder(result.order); setStep("success"); }
  }
  const summary = <div className="price-summary"><h3>Price details</h3><div><span>Price ({count} {count === 1 ? "item" : "items"})</span><span>{money(mrp)}</span></div><div><span>Discount</span><span className="green-text">− {money(mrp - subtotal)}</span></div><div><span>Delivery</span><span className={shipping === 0 ? "green-text" : ""}>{shipping === 0 ? "FREE" : money(shipping)}</span></div><div className="summary-total"><strong>Total amount</strong><strong>{money(subtotal + shipping)}</strong></div><p className="savings-note"><Tag size={15} />You’re saving {money(mrp - subtotal)} on this order!</p></div>;
  return <Modal title={step === "success" ? "A little joy is on its way" : step === "checkout" ? "Secure checkout" : `My cart${count ? ` (${count})` : ""}`} onClose={onClose} drawer>
    {step === "success" && placedOrder ? <div className="order-success"><div className="success-icon"><Check size={40} /></div><span className="eyebrow green-text">THANK YOU FOR SHOPPING WITH US</span><h2>Great choice, {placedOrder.customerName.split(" ")[0]}!</h2><p>Your order has been placed and saved.</p><div className="confirmation-card"><span>Order number</span><strong>QS-{placedOrder.id.slice(0, 8).toUpperCase()}</strong><div><span>Order total</span><strong>{money(placedOrder.total)}</strong></div><div><span>Payment</span><strong>Cash on delivery</strong></div><p><MapPin size={16} />{placedOrder.address}, {placedOrder.city} – {placedOrder.pincode}</p></div><p className="demo-note">This is a demo store. No payment will be collected and no items will be shipped.</p><button className="button button-blue full-width" onClick={onOrders}>View my orders<ArrowRight size={17} /></button><button className="text-button" onClick={onClose}>Keep exploring</button></div>
      : step === "checkout" ? <form className="checkout-form panel-body" onSubmit={checkout}><button type="button" className="back-link" onClick={() => setStep("cart")}><ArrowLeft size={16} />Back to cart</button><div className="form-section-heading"><span>1</span><h3>Where should we deliver?</h3></div><div className="form-grid"><label>Full name<input name="name" autoComplete="name" defaultValue={user?.name} placeholder="Your full name" required minLength={2} maxLength={80} /></label><label>Email address<input type="email" name="email" autoComplete="email" defaultValue={user?.email} placeholder="you@example.com" required maxLength={254} /></label><label>Mobile number<input name="phone" autoComplete="tel-national" placeholder="10-digit mobile number" inputMode="tel" pattern="[6-9][0-9]{9}" maxLength={10} required /></label><label>PIN code<input name="pincode" autoComplete="postal-code" placeholder="6-digit PIN code" inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} required /></label><label className="field-full">Delivery address<textarea name="address" autoComplete="street-address" placeholder="House number, building, street and area" required minLength={8} maxLength={300} rows={2} /></label><label className="field-full">Town / City<input name="city" autoComplete="address-level2" placeholder="Your city" required minLength={2} maxLength={80} /></label></div><div className="form-section-heading"><span>2</span><h3>Choose how to pay</h3></div><div className="payment-choice"><span className="radio-selected" /><div><strong>Cash on delivery</strong><span>Pay when your order arrives</span></div><CreditCard size={23} /></div>{summary}<p className="demo-note"><ShieldCheck size={16} />Demo checkout · No payment will be collected.</p><button className="button button-blue full-width" type="submit" disabled={busy}><LoadingButton busy={busy}>{busy ? "Placing your order…" : `Place order · ${money(subtotal + shipping)}`}</LoadingButton><ArrowRight size={18} /></button></form>
        : lines.length ? <><div className="cart-delivery-note"><Truck size={20} /><span>{shipping === 0 ? "Good news! Your order qualifies for free delivery." : `Add ${money(499 - subtotal)} more for free delivery.`}</span></div><div className="cart-items">{lines.map(({ product, quantity }) => <div className="cart-line" key={product.id}><img src={product.image} alt={product.name} width={100} height={110} /><div className="cart-line-info"><span className="cart-brand">{product.brand}</span><h3>{product.name}</h3><div className="cart-line-price"><strong>{money(product.price)}</strong><del>{money(product.originalPrice)}</del></div><div className="cart-line-controls"><div className="quantity-control"><button disabled={busy} onClick={() => request("setQuantity", { productId: product.id, quantity: quantity - 1 })} aria-label={`Decrease ${product.name} quantity`}><Minus size={13} /></button><span>{quantity}</span><button disabled={busy || quantity >= 10 || quantity >= product.stock} onClick={() => request("setQuantity", { productId: product.id, quantity: quantity + 1 })} aria-label={`Increase ${product.name} quantity`}><Plus size={13} /></button></div><button className="remove-button" disabled={busy} onClick={() => request("setQuantity", { productId: product.id, quantity: 0 }, "Item removed from your cart")} aria-label={`Remove ${product.name}`}><Trash2 size={15} /></button></div></div></div>)}</div><div className="cart-summary-wrap">{summary}<button className="button button-blue full-width" onClick={() => setStep("checkout")}>Proceed to checkout<ArrowRight size={18} /></button><div className="secure-caption"><LockKeyhole size={13} />Safe, secure & hassle-free shopping</div></div></>
          : <EmptyState icon={<ShoppingBag size={44} />} title="Your cart is waiting for a little joy" description="Found something you love? Add it here and make it yours." action="Start exploring" onAction={onClose} />}
  </Modal>;
}

export function EmptyState({ icon, title, description, action, onAction }: { icon: ReactNode; title: string; description: string; action: string; onAction: () => void }) {
  return <div className="empty-state"><div className="empty-icon">{icon}</div><h2>{title}</h2><p>{description}</p><button className="button button-blue" onClick={onAction}>{action}<ArrowRight size={17} /></button></div>;
}

export function AccountPanel({ onClose, onOrders, onWishlist }: { onClose: () => void; onOrders: () => void; onWishlist: () => void }) {
  const { request, busy, user, orders, wishlist } = useShop();
  const [register, setRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await request(register ? "register" : "login", Object.fromEntries(new FormData(event.currentTarget)), register ? "Your account is ready. Welcome to QuickShop!" : "Welcome back! You’re logged in.");
    if (result) onClose();
  }
  return <Modal title={user ? "My account" : register ? "Join the happy side of shopping" : "A little more joy starts here"} onClose={onClose}>
    {user ? <div className="account-body"><div className="account-avatar">{user.name.charAt(0).toUpperCase()}</div><h2>Hello, {user.name.split(" ")[0]}!</h2><p>{user.email}</p><div className="account-links"><button onClick={onOrders}><Package size={21} /><span>My orders<small>{orders.length} orders</small></span><ArrowRight size={18} /></button><button onClick={onWishlist}><Heart size={21} /><span>My wishlist<small>{wishlist.length} saved favourites</small></span><ArrowRight size={18} /></button></div><button className="button button-outline full-width" disabled={busy} onClick={async () => { if (await request("logout", {}, "You’ve been logged out.")) onClose(); }}>Log out</button></div>
      : <div className="auth-body"><div className="auth-intro"><div className="auth-icon"><ShoppingBag size={31} /></div><h2>{register ? "Meet your next favourite." : "Welcome back!"}</h2><p>{register ? "Create an account for wishlists, saved orders, and more reasons to smile." : "Log in to discover your saved favourites and keep track of your orders."}</p></div><form onSubmit={submit} className="auth-form">{register && <label>Full name<input name="name" placeholder="What should we call you?" required minLength={2} maxLength={80} autoComplete="name" /></label>}<label>Email address<input type="email" name="email" placeholder="you@example.com" required maxLength={254} autoComplete="email" /></label><label>Password<div className="password-input"><input name="password" type={showPassword ? "text" : "password"} placeholder={register ? "Create a password (8+ characters)" : "Enter your password"} required minLength={register ? 8 : 1} maxLength={128} autoComplete={register ? "new-password" : "current-password"} /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label><button className="button button-blue full-width" disabled={busy} type="submit"><LoadingButton busy={busy}>{register ? "Create my account" : "Log in"}</LoadingButton><ArrowRight size={17} /></button></form><p className="auth-switch">{register ? "Already one of us?" : "New to QuickShop?"}<button onClick={() => setRegister(!register)}>{register ? "Log in" : "Create an account"}</button></p><div className="secure-caption"><ShieldCheck size={14} />Your details are safe and secure.</div></div>}
  </Modal>;
}

export function OrdersPanel({ onClose }: { onClose: () => void }) {
  const { orders } = useShop();
  return <Modal title="My orders" onClose={onClose} drawer>{orders.length ? <div className="orders-body"><p className="section-subtitle">All your good choices, in one place.</p>{orders.map((order) => <article className="order-card" key={order.id}><div className="order-card-heading"><div><strong>QS-{order.id.slice(0, 8).toUpperCase()}</strong><span>{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span></div><span className="order-status"><CheckCircle2 size={13} />{order.status}</span></div>{order.items.map((item) => <div className="order-product" key={item.productId}><img src={item.image} alt={item.name} width={65} height={65} /><div><h3>{item.name}</h3><span>Qty: {item.quantity}</span></div><strong>{money(item.price * item.quantity)}</strong></div>)}<div className="order-card-total"><span>Order total</span><strong>{money(order.total)}</strong></div><details className="order-details"><summary>Delivery & payment details<ChevronDown size={16} /></summary><p><strong>{order.customerName}</strong><br />{order.address}<br />{order.city} – {order.pincode}<br />{order.phone}</p><p>{order.paymentMethod} · {order.deliveryFee ? money(order.deliveryFee) + " delivery" : "Free delivery"}</p></details></article>)}<p className="demo-note">Demo orders are saved to your account or this browser. No payment is collected and no items are shipped.</p></div> : <EmptyState icon={<Package size={44} />} title="Your next great find is out there" description="Once you place an order, you’ll find all the details right here." action="Explore the store" onAction={onClose} />}</Modal>;
}

export function SellerPanel({ onClose }: { onClose: () => void }) {
  const { request, busy } = useShop();
  const [sent, setSent] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await request("seller", Object.fromEntries(new FormData(event.currentTarget)));
    if (result) setSent(true);
  }
  return <Modal title="Grow your business with QuickShop" onClose={onClose}>{sent ? <EmptyState icon={<CheckCircle2 size={44} />} title="You’re one step closer!" description="Your seller interest has been registered. Your application is safely saved in our system." action="Back to shopping" onAction={onClose} /> : <div className="auth-body"><div className="auth-intro"><div className="auth-icon"><Store size={30} /></div><h2>Big dreams. Bigger possibilities.</h2><p>Tell us a little about your business to register your interest in becoming a seller.</p></div><form className="auth-form" onSubmit={submit}><label>Business name<input name="businessName" placeholder="Your store or brand name" required minLength={2} maxLength={100} /></label><label>Business email<input type="email" name="email" placeholder="hello@yourbrand.com" required /></label><label>Mobile number<input name="phone" placeholder="10-digit mobile number" required pattern="[6-9][0-9]{9}" maxLength={10} /></label><label>What would you like to sell?<select name="category" required><option value="">Select a category</option>{categories.filter((item) => item.id !== "offers").map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><button className="button button-blue full-width" disabled={busy}><LoadingButton busy={busy}>Register your interest</LoadingButton><ArrowRight size={17} /></button></form></div>}</Modal>;
}

const infoContent: Record<string, { title: string; icon: ReactNode; sections: { title: string; text: string }[] }> = {
  help: { title: "How can we help?", icon: <HelpCircle size={32} />, sections: [{ title: "Find your favourites", text: "Search by product, brand, or category using the search bar. You can sort products by price or rating and save the ones you love to your wishlist." }, { title: "Your cart & checkout", text: "Add products to your cart, adjust quantities, and continue to checkout. Enter an Indian delivery address and choose cash on delivery. Your order will be saved instantly." }, { title: "Manage your orders", text: "Open My orders from the menu to see your order details. Create an account to access your orders when you log in from another browser." }, { title: "A note about this store", text: "QuickShop is a fully interactive demonstration storefront. No real payments are processed and no real shipments are created." }] },
  shipping: { title: "Delivery, made simple", icon: <Truck size={32} />, sections: [{ title: "Free delivery over ₹499", text: "Orders of ₹499 or more receive free standard delivery. Orders below ₹499 have a flat ₹40 delivery fee, shown before you place an order." }, { title: "Delivery estimates", text: "Our sample estimated delivery time is 3–5 business days. Enter a valid 6-digit Indian PIN code at checkout. This is a demonstration, so no physical products will be dispatched." }] },
  returns: { title: "A little extra peace of mind", icon: <RotateCcw size={32} />, sections: [{ title: "Shop with confidence", text: "Product highlights show the applicable sample warranty or exchange information. In a live store, eligible unused items would be returnable within 7 days in their original packaging." }, { title: "Demo store policy", text: "Since orders on this storefront are demonstrations and no payment or shipment takes place, no refund or physical return is needed." }] },
  privacy: { title: "Your privacy matters", icon: <ShieldCheck size={32} />, sections: [{ title: "What we save", text: "We save your cart, wishlist, account profile, and order details to make the store work. Passwords are securely hashed and never stored in plain text." }, { title: "Your shopping session", text: "An essential, HTTP-only cookie keeps your shopping session active for up to 30 days. We do not use third-party advertising cookies." }, { title: "Keep it comfortable", text: "This is a demonstration storefront. Please avoid entering sensitive information or reusing a password from another service. No payment card information is requested." }] },
};

export function InfoPanel({ topic, onClose }: { topic: string; onClose: () => void }) {
  const content = infoContent[topic] ?? infoContent.help;
  return <Modal title={content.title} onClose={onClose}><div className="info-body"><div className="auth-icon">{content.icon}</div>{content.sections.map((section) => <section key={section.title}><h3>{section.title}</h3><p>{section.text}</p></section>)}<button className="button button-blue full-width" onClick={onClose}>Got it, let’s shop<ArrowRight size={17} /></button></div></Modal>;
}

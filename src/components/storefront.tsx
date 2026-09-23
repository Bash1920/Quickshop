"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowRight, BadgeCheck, BellRing, ChevronDown, ChevronLeft, ChevronRight, Clock3, Gift, Headphones, Heart, HelpCircle, Mail, MoreVertical, Package, RotateCcw, Search, SearchX, ShieldCheck, ShoppingBag, ShoppingCart, SlidersHorizontal, Sparkles, Star, Store, Sun, Truck, UserRound, X, Zap } from "lucide-react";
import { categories, discount, money, type Product } from "@/lib/catalog";
import { ShopProvider, useShop } from "@/components/shop-provider";
import ProductCard from "@/components/product-card";
import { AccountPanel, CartPanel, EmptyState, InfoPanel, OrdersPanel, ProductPanel, SellerPanel } from "@/components/shopping-panels";

type Panel = "cart" | "account" | "orders" | "seller" | null;
type View = "home" | "catalog" | "wishlist";

function Brand({ footer = false, onClick }: { footer?: boolean; onClick: () => void }) {
  return <button className={`brand ${footer ? "footer-brand" : ""}`} onClick={onClick} aria-label="QuickShop home"><span className="brand-name">QuickShop<svg width="30" height="32" viewBox="0 0 38 42" fill="none" aria-hidden="true"><path d="M6 12h28l-3 28H8L6 12Z" fill="#FFDA37" /><path d="M12 14V9a7 7 0 0 1 14 0v5" stroke="#FFDA37" strokeWidth="3" strokeLinecap="round" /><circle cx="19" cy="25" r="7" stroke="#2364E8" strokeWidth="3" /><path d="m22 28 5 6" stroke="#2364E8" strokeWidth="3" strokeLinecap="round" /></svg></span><span className="brand-tagline">Explore <b>Plus</b><Sparkles size={10} fill="currentColor" /></span></button>;
}

function Countdown() {
  const [remaining, setRemaining] = useState(8 * 3600 + 42 * 60 + 16);
  useEffect(() => {
    const interval = setInterval(() => setRemaining((value) => value > 0 ? value - 1 : 24 * 3600 - 1), 1000);
    return () => clearInterval(interval);
  }, []);
  const hours = Math.floor(remaining / 3600).toString().padStart(2, "0");
  const minutes = Math.floor((remaining % 3600) / 60).toString().padStart(2, "0");
  const seconds = (remaining % 60).toString().padStart(2, "0");
  return <div className="deal-countdown"><Clock3 size={15} /><span>Ends in</span><b>{hours}</b><em>:</em><b>{minutes}</b><em>:</em><b>{seconds}</b></div>;
}

const slides = [
  { eyebrow: "THE BIG SUMMER SALE", title: <>Big brands.<br />Bigger savings.</>, description: "A little upgrade. A lot more possibilities.", cta: "Shop the sale", category: "offers" },
  { eyebrow: "YOUR EVERYDAY, UPGRADED", title: <>Great sound.<br />Even better deals.</>, description: "Turn up the joy with your next tech favourite.", cta: "Explore electronics", category: "electronics" },
  { eyebrow: "IT’S TIME FOR AN UPGRADE", title: <>New phone.<br />New possibilities.</>, description: "The phones you love. Prices you’ll love more.", cta: "Shop smartphones", category: "mobiles" },
];

function StoreContent() {
  const { products, cart, wishlist, user, request, busy } = useShop();
  const [view, setView] = useState<View>("home");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [sort, setSort] = useState("recommended");
  const [priceFilter, setPriceFilter] = useState("all");
  const [highRating, setHighRating] = useState(false);
  const [stockOnly, setStockOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [slide, setSlide] = useState(0);
  const [dealOffset, setDealOffset] = useState(0);
  const [recommendationTab, setRecommendationTab] = useState("picked");
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const selectedProduct = products.find((product) => product.id === selectedId);

  useEffect(() => {
    function closeMenu(event: MouseEvent) { if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false); }
    function onKey(event: KeyboardEvent) { if (event.key === "Escape") { setMenuOpen(false); setSearchFocused(false); } }
    document.addEventListener("click", closeMenu);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("click", closeMenu); document.removeEventListener("keydown", onKey); };
  }, []);

  function browse(nextCategory = "all", query = "") {
    setView("catalog"); setCategory(nextCategory); setActiveSearch(query.trim()); setSearch(query.trim());
    setPriceFilter("all"); setHighRating(false); setStockOnly(false); setSort("recommended");
    setMenuOpen(false); setSearchFocused(false); setFiltersOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function home() {
    setView("home"); setCategory("all"); setSearch(""); setActiveSearch(""); setSearchFocused(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function showWishlist() {
    setView("wishlist"); setCategory("all"); setSearch(""); setActiveSearch(""); setPriceFilter("all"); setHighRating(false); setStockOnly(false);
    setPanel(null); setMenuOpen(false); window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function searchSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); browse("all", search); }
  const filtered = useMemo(() => {
    let result = products.filter((product) => {
      const queryMatch = `${product.name} ${product.brand} ${product.category}`.toLowerCase().includes(activeSearch.toLowerCase());
      const categoryMatch = category === "all" || category === "offers" || product.category === category;
      const priceMatch = priceFilter === "all" || (priceFilter === "under1000" && product.price < 1000) || (priceFilter === "under10000" && product.price >= 1000 && product.price <= 10000) || (priceFilter === "above10000" && product.price > 10000);
      return queryMatch && categoryMatch && priceMatch && (!highRating || product.rating >= 4.5) && (!stockOnly || product.stock > 0) && (view !== "wishlist" || wishlist.includes(product.id));
    });
    if (sort === "price-low") result = [...result].sort((a, b) => a.price - b.price);
    if (sort === "price-high") result = [...result].sort((a, b) => b.price - a.price);
    if (sort === "rating") result = [...result].sort((a, b) => b.rating - a.rating);
    if (sort === "discount") result = [...result].sort((a, b) => discount(b) - discount(a));
    return result;
  }, [products, category, activeSearch, priceFilter, highRating, stockOnly, sort, wishlist, view]);
  const searchSuggestions = search.trim() ? products.filter((product) => `${product.name} ${product.brand} ${product.category}`.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 4) : [];
  const recommendationProducts = recommendationTab === "under999" ? products.filter((product) => product.price < 999).slice(0, 6) : recommendationTab === "trending" ? products.filter((product) => product.badge).slice(6, 12).concat(products.filter((product) => product.badge).slice(0, 6)).slice(0, 6) : products.slice(6, 12);
  const heading = view === "wishlist" ? "Your little list of favourites" : activeSearch ? `Results for “${activeSearch}”` : category === "offers" ? "Deals you can’t miss" : categories.find((item) => item.id === category)?.name ?? "Find your next favourite";

  return <>
    <header className="site-header"><div className="header-inner content-width"><Brand onClick={home} />
      <form className="search-form" onSubmit={searchSubmit}><button type="submit" aria-label="Search products"><Search size={21} strokeWidth={1.8} /></button><input value={search} onChange={(event) => setSearch(event.target.value)} onFocus={() => setSearchFocused(true)} onBlur={() => setTimeout(() => setSearchFocused(false), 160)} placeholder="Search for products, brands and more" aria-label="Search for products, brands and more" maxLength={100} />{search && <button type="button" onClick={() => { setSearch(""); setSearchFocused(false); }} aria-label="Clear search"><X size={16} /></button>}
        {searchFocused && search.trim() && <div className="search-suggestions"><span className="suggestion-label">FIND YOUR NEXT FAVOURITE</span>{searchSuggestions.length ? searchSuggestions.map((product) => <button type="button" className="suggestion-item" key={product.id} onMouseDown={(event) => event.preventDefault()} onClick={() => { setSelectedId(product.id); setSearchFocused(false); }}><img src={product.image} alt="" width={42} height={42} /><span>{product.name}<small>{product.brand}</small></span><ArrowRight size={15} /></button>) : <p className="suggestion-empty">No exact matches. Try a brand or category.</p>}<button className="suggestion-all" type="submit" onMouseDown={(event) => event.preventDefault()}>See all results for “{search}”<ArrowRight size={16} /></button></div>}
      </form>
      <nav className="header-actions" aria-label="Account and shopping"><button className="header-action login-action" onClick={() => setPanel("account")}><UserRound size={21} strokeWidth={1.6} /><span>{user ? user.name.split(" ")[0] : "Login"}</span><ChevronDown size={13} /></button><button className="header-action cart-action" onClick={() => setPanel("cart")}><span className="cart-icon"><ShoppingCart size={22} strokeWidth={1.6} />{cartCount > 0 && <b>{cartCount}</b>}</span><span>Cart</span></button><span className="header-divider" /><button className="header-action seller-action" onClick={() => setPanel("seller")}><Store size={20} strokeWidth={1.6} /><span>Become a Seller</span></button><div className="header-more" ref={menuRef}><button className="icon-button more-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="More options" aria-expanded={menuOpen}><MoreVertical size={21} /></button>{menuOpen && <div className="header-menu"><button onClick={showWishlist}><Heart size={18} />My wishlist<span>{wishlist.length}</span></button><button onClick={() => { setPanel("orders"); setMenuOpen(false); }}><Package size={18} />My orders</button><button onClick={() => { setInfo("help"); setMenuOpen(false); }}><HelpCircle size={18} />Help centre</button><button className="mobile-seller" onClick={() => { setPanel("seller"); setMenuOpen(false); }}><Store size={18} />Become a seller</button></div>}</div></nav>
    </div></header>

    <nav className="category-navigation" aria-label="Shop by category"><div className="category-inner content-width">{categories.map((item) => <button className={`category-item ${(view === "home" && item.id === "offers") || (view === "catalog" && category === item.id) ? "category-active" : ""}`} key={item.id} onClick={() => browse(item.id)}><span className={`category-picture ${item.images.length > 1 ? "category-pair" : ""}`} style={{ "--category-color": item.color } as React.CSSProperties}>{item.id === "offers" ? <span className="offer-illustration"><span className="offer-gift gift-back"><ShoppingBag size={37} strokeWidth={1.3} /></span><span className="offer-gift gift-front"><Gift size={35} strokeWidth={1.7} /></span><Sparkles className="gift-sparkle" size={17} /></span> : item.images.map((image, index) => <img key={image} src={`/images/products/${image}.webp`} alt="" width={75} height={75} className={`category-image-${index}`} />)}</span><span className="category-name">{item.name}{["fashion", "electronics", "home", "beauty"].includes(item.id) && <ChevronDown size={12} />}</span></button>)}</div></nav>

    <main className="main-content content-width">
      {view === "home" ? <>
        <section className="hero-grid" aria-label="This season’s best offers"><div className="main-hero"><img className="hero-visual" src="/images/tech-hero.png" alt="Premium headphones, a smartphone, and wireless earbuds on blue display stands" fetchPriority="high" /><div className="hero-image-blend" /><div className="hero-copy" key={slide}><span className="hero-eyebrow"><Sun size={13} />{slides[slide].eyebrow}</span><h1>{slides[slide].title}</h1><p>{slides[slide].description}</p><button className="button button-yellow hero-cta" onClick={() => browse(slides[slide].category)}>{slides[slide].cta}<ArrowRight size={17} /></button><div className="hero-trust"><BadgeCheck size={13} />Top brands. Best prices. Only here.</div></div><div className="hero-sticker"><span>UP TO</span><strong>70<small>%</small></strong><span>OFF</span></div><div className="slider-controls"><button aria-label="Previous promotion" onClick={() => setSlide((slide + 2) % 3)}><ChevronLeft size={15} /></button><div className="slider-dots">{slides.map((_, index) => <button key={index} className={slide === index ? "active" : ""} onClick={() => setSlide(index)} aria-label={`Show promotion ${index + 1}`} aria-pressed={slide === index} />)}</div><button aria-label="Next promotion" onClick={() => setSlide((slide + 1) % 3)}><ChevronRight size={15} /></button></div><span className="hero-fineprint">*T&C apply</span></div>
          <button className="home-promo" onClick={() => browse("home")}><img src="/images/home-banner.png" alt="A cream accent chair in a warm, sunny living room" fetchPriority="high" /><div className="home-promo-copy"><span className="eyebrow">NEW SEASON, NEW SPACE</span><h2>Home, sweet<br /> upgrade.</h2><p>Up to <strong>60% off</strong></p><span className="home-promo-link">Refresh your space<ArrowRight size={14} /></span></div><span className="home-promo-arrow"><ArrowRight size={20} /></span></button>
        </section>

        <section className="benefits" aria-label="The QuickShop promise"><button onClick={() => setInfo("shipping")}><span className="benefit-icon"><Truck size={22} strokeWidth={1.6} /></span><span><strong>Free delivery</strong><small>On orders above ₹499</small></span></button><button onClick={() => setInfo("help")}><span className="benefit-icon"><ShieldCheck size={22} strokeWidth={1.6} /></span><span><strong>100% genuine</strong><small>Products you can trust</small></span></button><button onClick={() => setInfo("returns")}><span className="benefit-icon"><RotateCcw size={21} strokeWidth={1.6} /></span><span><strong>Easy returns</strong><small>Shop with peace of mind</small></span></button><button onClick={() => setInfo("help")}><span className="benefit-icon"><Headphones size={22} strokeWidth={1.6} /></span><span><strong>Always here for you</strong><small>Help, whenever you need it</small></span></button></section>

        <section className="deals-section"><div className="section-heading"><div className="heading-with-timer"><div><h2>Deals you can’t miss<Zap size={20} fill="#ffbc38" stroke="#ffbc38" /></h2><p>Big savings on your everyday favourites.</p></div><Countdown /></div><button className="view-all" onClick={() => browse("offers")}>View all deals<ArrowRight size={17} /></button></div><div className="deals-carousel"><div className="product-grid">{products.slice(dealOffset, dealOffset + 6).map((product) => <ProductCard key={product.id} product={product} onSelect={(product) => setSelectedId(product.id)} />)}</div>{dealOffset > 0 && <button className="carousel-arrow carousel-prev" aria-label="Previous deals" onClick={() => setDealOffset(Math.max(0, dealOffset - 6))}><ChevronLeft size={23} /></button>}<button className="carousel-arrow" aria-label="More deals" onClick={() => setDealOffset(dealOffset + 6 >= products.length ? 0 : dealOffset + 6)}><ChevronRight size={23} /></button></div></section>

        <section className="discovery-section"><div className="section-heading"><div><h2>A little something for every you</h2><p>Fresh finds. New favourites. More reasons to smile.</p></div><span className="curated-label"><Sparkles size={14} />CURATED FOR YOU</span></div><div className="discovery-grid"><button className="discovery-card discovery-fashion" onClick={() => browse("fashion")}><div><span className="eyebrow">THE STYLE EDIT</span><h3>Good style.<br />Great prices.</h3><p>50–80% off</p><span className="discovery-link">Find your fit<ArrowRight size={16} /></span></div><img src="/images/products/88.webp" alt="Red and black Nike Air Jordan sneakers" width={255} height={240} /><span className="discovery-circle" /></button><button className="discovery-card discovery-home" onClick={() => browse("home")}><div><span className="eyebrow">LOVE YOUR SPACE</span><h3>Little touches.<br />Big difference.</h3><p>From ₹499</p><span className="discovery-link">Make it home<ArrowRight size={16} /></span></div><img src="/images/products/14.webp" alt="A warm designer accent chair" width={240} height={250} /><span className="discovery-circle" /></button><button className="discovery-card discovery-beauty" onClick={() => browse("beauty")}><div><span className="eyebrow">YOUR DAILY GLOW-UP</span><h3>A little care.<br />A lot of glow.</h3><p>Up to 60% off</p><span className="discovery-link">Treat yourself<ArrowRight size={16} /></span></div><img src="/images/products/6.webp" alt="Calvin Klein CK One perfume" width={230} height={250} /><span className="discovery-circle" /></button></div></section>

        <section className="recommendations-section"><div className="section-heading"><div><h2>You might just love these</h2><p>A few good finds, picked with you in mind.</p></div><div className="section-tabs">{[{ id: "picked", label: "Picked for you" }, { id: "trending", label: "Trending now" }, { id: "under999", label: "Under ₹999" }].map((tab) => <button key={tab.id} className={recommendationTab === tab.id ? "active" : ""} onClick={() => setRecommendationTab(tab.id)}>{tab.label}</button>)}</div></div><div className="product-grid">{recommendationProducts.map((product) => <ProductCard key={product.id} product={product} onSelect={(product) => setSelectedId(product.id)} />)}</div></section>
      </> : <section className="catalog-section"><div className="breadcrumbs"><button onClick={home}>Home</button><ChevronRight size={13} /><span>{view === "wishlist" ? "My wishlist" : activeSearch ? "Search results" : category === "all" ? "All products" : categories.find((item) => item.id === category)?.name}</span></div><div className="catalog-heading"><div><h1>{heading}{view === "wishlist" && <Heart size={28} />}</h1><p>{filtered.length} {filtered.length === 1 ? "find" : "finds"}{view === "wishlist" ? " saved for a little later." : " to make your day a little better."}</p></div><div className="catalog-tools"><button className="filter-toggle button button-outline" onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={16} />Filters</button><label className="sort-label">Sort by<select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort products"><option value="recommended">Recommended</option><option value="price-low">Price: Low to high</option><option value="price-high">Price: High to low</option><option value="rating">Top rated</option><option value="discount">Biggest discount</option></select></label></div></div><div className={`catalog-layout ${view === "wishlist" ? "wishlist-layout" : ""}`}>
        {view !== "wishlist" && <aside className={`filter-sidebar ${filtersOpen ? "filters-open" : ""}`}><div className="filter-heading"><h2><SlidersHorizontal size={18} />Filters</h2><button onClick={() => browse("all")}>Reset all</button></div><fieldset><legend>Categories</legend><label className="category-filter"><input type="radio" name="category" checked={category === "all" || category === "offers"} onChange={() => setCategory("all")} />All products<span>{products.length}</span></label>{categories.filter((item) => item.id !== "offers").map((item) => <label className="category-filter" key={item.id}><input type="radio" name="category" checked={category === item.id} onChange={() => setCategory(item.id)} />{item.name}<span>{products.filter((product) => product.category === item.id).length}</span></label>)}</fieldset><fieldset><legend>Price range</legend>{[{ id: "all", label: "All prices" }, { id: "under1000", label: "Under ₹1,000" }, { id: "under10000", label: "₹1,000 – ₹10,000" }, { id: "above10000", label: "Above ₹10,000" }].map((range) => <label key={range.id}><input type="radio" name="price" checked={priceFilter === range.id} onChange={() => setPriceFilter(range.id)} />{range.label}</label>)}</fieldset><fieldset><legend>A little extra</legend><label><input type="checkbox" checked={highRating} onChange={(event) => setHighRating(event.target.checked)} />4.5<Star size={12} fill="currentColor" /> & above</label><label><input type="checkbox" checked={stockOnly} onChange={(event) => setStockOnly(event.target.checked)} />In stock only</label></fieldset><div className="filter-promise"><ShieldCheck size={26} /><strong>Good choices. Guaranteed.</strong><p>Authentic products, great prices, and a little peace of mind.</p></div></aside>}
        <div className="catalog-results">{activeSearch && <div className="active-filter">Search: {activeSearch}<button onClick={() => { setActiveSearch(""); setSearch(""); }} aria-label="Remove search filter"><X size={13} /></button></div>}{filtered.length ? <div className="catalog-product-grid">{filtered.map((product) => <ProductCard key={product.id} product={product} onSelect={(product) => setSelectedId(product.id)} />)}</div> : <EmptyState icon={view === "wishlist" ? <Heart size={44} /> : <SearchX size={44} />} title={view === "wishlist" ? "Save it now. Love it later." : "No finds just yet"} description={view === "wishlist" ? "Tap the little heart on any product to keep your favourites together." : "Try a different search or clear your filters. Your next favourite is out there."} action={view === "wishlist" ? "Find something to love" : "Clear all filters"} onAction={() => browse("all")} />}</div></div></section>}

      <section className="newsletter"><div className="newsletter-icon"><BellRing size={29} strokeWidth={1.6} /><span /></div><div className="newsletter-copy"><h2>Good deals. Straight to your inbox.</h2><p>Be the first to know about new drops, big offers, and little surprises.</p></div><form onSubmit={async (event) => { event.preventDefault(); const result = await request("subscribe", { email: newsletterEmail }); if (result) { setSubscribed(true); setNewsletterEmail(""); } }}><label className="sr-only" htmlFor="newsletter-email">Email for offers</label><Mail size={18} /><input id="newsletter-email" type="email" placeholder={subscribed ? "You’re on the list. Thank you!" : "Enter your email address"} value={newsletterEmail} onChange={(event) => setNewsletterEmail(event.target.value)} required aria-label="Email for offers" /><button type="submit" disabled={busy}>{subscribed ? "Subscribed" : "Count me in"}<ArrowRight size={16} /></button></form></section>
    </main>

    <footer className="site-footer"><div className="footer-main content-width"><div className="footer-intro"><Brand footer onClick={home} /><p>A little more choice.<br />A lot more happiness.</p><span>Made for the way you shop.</span></div><div className="footer-links"><h3>Get to know us</h3><button onClick={() => setInfo("help")}>About QuickShop</button><button onClick={() => setPanel("seller")}>Become a Seller</button><button onClick={() => setInfo("help")}>Help Centre</button></div><div className="footer-links"><h3>We’re here to help</h3><button onClick={() => setPanel("orders")}>Your orders</button><button onClick={() => setInfo("shipping")}>Shipping & delivery</button><button onClick={() => setInfo("returns")}>Returns & exchanges</button></div><div className="footer-links"><h3>Your happy place</h3><button onClick={showWishlist}>Your wishlist</button><button onClick={() => setPanel("account")}>Your account</button><button onClick={() => setInfo("privacy")}>Privacy & security</button></div><div className="footer-assurance"><ShieldCheck size={29} strokeWidth={1.6} /><div><strong>A safe place to shop</strong><p>Secure checkout.<br />Authentic products. Always.</p></div></div></div><div className="footer-bottom content-width"><p>© {new Date().getFullYear()} QuickShop demo. Made with a little extra care.</p><div><span><LockIcon />Secure shopping</span><span className="payment-wordmark">VISA</span><span className="mastercard"><i /><i /></span><span className="upi-mark">UPI<span>▸</span></span><span className="cod-mark">CASH ON DELIVERY</span></div></div></footer>

    {selectedProduct && <ProductPanel product={selectedProduct} onClose={() => setSelectedId(null)} onCart={() => { setSelectedId(null); setPanel("cart"); }} />}
    {panel === "cart" && <CartPanel onClose={() => setPanel(null)} onOrders={() => setPanel("orders")} />}
    {panel === "account" && <AccountPanel onClose={() => setPanel(null)} onOrders={() => setPanel("orders")} onWishlist={showWishlist} />}
    {panel === "orders" && <OrdersPanel onClose={() => setPanel(null)} />}
    {panel === "seller" && <SellerPanel onClose={() => setPanel(null)} />}
    {info && <InfoPanel topic={info} onClose={() => setInfo(null)} />}
  </>;
}

function LockIcon() { return <ShieldCheck size={13} />; }

export default function Storefront({ products }: { products: Product[] }) {
  return <ShopProvider products={products}><StoreContent /></ShopProvider>;
}

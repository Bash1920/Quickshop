"use client";

import { Check, Heart, Plus, Star } from "lucide-react";
import { discount, money, type Product } from "@/lib/catalog";
import { useShop } from "@/components/shop-provider";

export function Assured() {
  return <span className="assured"><span><Check size={9} strokeWidth={4} /></span><i>Assured</i></span>;
}

export default function ProductCard({ product, onSelect }: { product: Product; onSelect: (product: Product) => void }) {
  const { wishlist, cart, request, busy } = useShop();
  const saved = wishlist.includes(product.id);
  const inCart = cart.some((item) => item.productId === product.id);
  return <article className="product-card">
    <div className="product-media">
      <button className="product-image-button" onClick={() => onSelect(product)} aria-label={`View ${product.name}`}>
        <img src={product.image} alt={product.name} width={240} height={210} loading="lazy" />
      </button>
      {product.badge && <span className={`product-badge ${product.badge === "HOT DEAL" ? "badge-hot" : ""}`}>{product.badge}</span>}
      <button className={`wishlist-button ${saved ? "is-saved" : ""}`} aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`} aria-pressed={saved} disabled={busy}
        onClick={() => request("toggleWishlist", { productId: product.id }, saved ? "Removed from your wishlist" : "Saved to your wishlist")}>
        <Heart size={17} fill={saved ? "currentColor" : "none"} strokeWidth={1.7} />
      </button>
    </div>
    <div className="product-info">
      <button className="product-name" onClick={() => onSelect(product)}>{product.name}</button>
      <div className="rating-row"><span className="rating">{product.rating.toFixed(1)}<Star size={10} fill="currentColor" /></span><span className="review-count">({product.reviews.toLocaleString("en-IN")})</span><Assured /></div>
      <div className="price-row"><strong>{money(product.price)}</strong><del>{money(product.originalPrice)}</del></div>
      <div className="product-bottom"><span className="discount">{discount(product)}% off <span>· Free delivery</span></span>
        <button className={`quick-add ${inCart ? "in-cart" : ""}`} disabled={busy || product.stock < 1} onClick={() => request("addToCart", { productId: product.id }, "Added to your cart")} aria-label={`Add ${product.name} to cart`} title="Add to cart">
          {inCart ? <Check size={15} /> : <Plus size={17} />}
        </button>
      </div>
    </div>
  </article>;
}

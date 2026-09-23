export interface Product {
  id: number;
  name: string;
  brand: string;
  category: string;
  price: number;
  originalPrice: number;
  rating: number;
  reviews: number;
  image: string;
  images: string[];
  description: string;
  details: string[];
  badge: string;
  featured: boolean;
  stock: number;
}

export interface Customer { id: string; name: string; email: string }
export interface CartItem { productId: number; quantity: number }
export interface Order {
  id: string;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  pincode: string;
  total: number;
  deliveryFee: number;
  paymentMethod: string;
  status: string;
  items: { productId: number; name: string; image: string; price: number; quantity: number }[];
  createdAt: string;
}
export interface ShopState {
  products: Product[];
  cart: CartItem[];
  wishlist: number[];
  user: Customer | null;
  orders: Order[];
}

export const categories = [
  { id: "offers", name: "Top Offers", images: [], color: "#fff1dd" },
  { id: "mobiles", name: "Mobiles", images: [123], color: "#eaf1ff" },
  { id: "fashion", name: "Fashion", images: [163, 88], color: "#ffecef" },
  { id: "electronics", name: "Electronics", images: [101, 79], color: "#edf0ff" },
  { id: "home", name: "Home & Furniture", images: [12, 45], color: "#f6eee4" },
  { id: "appliances", name: "Appliances", images: [66, 61], color: "#e6f3f6" },
  { id: "beauty", name: "Beauty & More", images: [6, 4], color: "#fceaf1" },
  { id: "sports", name: "Sports & Fitness", images: [140, 143], color: "#eef2e4" },
  { id: "grocery", name: "Grocery", images: [20, 16], color: "#eaf4e8" },
];

const descriptions: Record<string, string> = {
  mobiles: "Make every day extraordinary with stunning visuals, smooth performance, and a camera that captures every detail. A smarter upgrade for everything you love to do.",
  electronics: "Meet your new everyday favourite. Thoughtfully designed technology brings impressive performance, effortless connectivity, and a premium experience to your day.",
  fashion: "A fresh take on everyday style. Made with comfortable, quality materials and considered details, this wardrobe essential is ready for wherever the day takes you.",
  home: "A little change makes a big difference. Bring warmth, character, and thoughtful design to your favourite space with this beautifully crafted home essential.",
  appliances: "Less effort, more living. Make everyday routines simpler with reliable performance and practical features designed for the modern Indian home.",
  beauty: "Make a little time for yourself. Discover an everyday beauty favourite with a premium finish, carefully selected to refresh your daily routine.",
  sports: "Find your next personal best. Dependable quality and thoughtful design help you make the most of every practice, workout, and weekend game.",
  grocery: "Stock up on everyday goodness. Quality essentials, carefully packed and delivered to your doorstep, so your kitchen is always ready for what is next.",
};

const highlights: Record<string, string[]> = {
  mobiles: ["Brilliant edge-to-edge display", "All-day battery performance", "Advanced high-resolution camera", "1 year brand warranty"],
  electronics: ["Premium design and build quality", "Seamless, reliable connectivity", "Made for your everyday", "1 year brand warranty"],
  fashion: ["Comfortable premium materials", "Versatile, everyday styling", "Easy-care construction", "7-day size exchange available"],
  home: ["Thoughtfully crafted details", "Premium quality materials", "Designed for modern homes", "Care instructions included"],
  appliances: ["Energy-efficient performance", "Easy to use and maintain", "Compact, modern design", "1 year manufacturer warranty"],
  beauty: ["100% authentic product", "Premium quality formulation", "Ideal for your daily routine", "Sealed packaging for freshness"],
  sports: ["Durable, quality construction", "Comfortable and easy to use", "Perfect for training and play", "Care guide included"],
  grocery: ["Quality checked essentials", "Fresh, securely sealed packaging", "Convenient doorstep delivery", "Store in a cool, dry place"],
};

type ProductInput = [number, string, string, string, number, number, string];
const items: ProductInput[] = [
  [123, "Apple iPhone 13 Pro", "Apple", "mobiles", 52999, 79900, "BESTSELLER"],
  [101, "Apple AirPods Max", "Apple", "electronics", 39990, 59900, "HOT DEAL"],
  [88, "Nike Air Jordan 1", "Nike", "fashion", 7495, 12995, ""],
  [106, "Apple Watch Series 4", "Apple", "electronics", 18999, 34900, "PRICE DROP"],
  [79, "ASUS Zenbook Pro Duo", "ASUS", "electronics", 89990, 129990, ""],
  [100, "Apple AirPods", "Apple", "electronics", 8999, 14900, "BESTSELLER"],
  [133, "Samsung Galaxy S10", "Samsung", "mobiles", 27999, 54999, "HOT DEAL"],
  [99, "Amazon Echo Plus", "Amazon", "electronics", 6499, 9999, ""],
  [6, "Calvin Klein CK One", "Calvin Klein", "beauty", 2499, 4500, "BESTSELLER"],
  [12, "Colombo 3-Seater Sofa", "Casa Living", "home", 28999, 45999, ""],
  [14, "Knoll Accent Chair", "Knoll", "home", 8999, 14999, "HOT DEAL"],
  [47, "Nordic Table Lamp", "Home Centre", "home", 1299, 2499, ""],
  [66, "Digital Microwave Oven", "Bajaj", "appliances", 5999, 9990, "BESTSELLER"],
  [61, "PowerBlend Hand Blender", "Wonderchef", "appliances", 1499, 2999, ""],
  [2, "Everyday Eyeshadow Palette", "Essence", "beauty", 699, 1299, ""],
  [163, "Floral Summer Dress", "Dressberry", "fashion", 899, 2199, "TRENDING"],
  [175, "Everyday Mini Backpack", "Lavie", "fashion", 1199, 2999, ""],
  [140, "Pro Grip Basketball", "Nivia", "sports", 799, 1499, ""],
  [143, "Classic Willow Cricket Bat", "SG", "sports", 1999, 3499, "BESTSELLER"],
  [16, "Fresh Red Apples, 1 kg", "Fresh Harvest", "grocery", 179, 249, ""],
  [32, "Fresh Whole Milk, 1 L", "Daily Fresh", "grocery", 68, 75, ""],
  [34, "Nescafé Classic Coffee", "Nescafé", "grocery", 349, 499, ""],
  [38, "Premium Basmati Rice, 1 kg", "India Gate", "grocery", 149, 229, ""],
  [20, "Refined Cooking Oil, 1 L", "Fortune", "grocery", 139, 185, ""],
  [78, "MacBook Pro 14-inch", "Apple", "electronics", 149990, 199900, ""],
  [103, "Apple HomePod Mini", "Apple", "electronics", 7990, 10900, ""],
  [90, "Puma Future Rider Trainers", "Puma", "fashion", 3499, 6999, "HOT DEAL"],
  [45, "Decorative Potted Plant", "Green Stories", "home", 499, 999, ""],
  [4, "Classic Matte Lipstick", "Maybelline", "beauty", 399, 699, ""],
  [93, "Classic Leather Strap Watch", "Fossil", "fashion", 4495, 8995, ""],
];

export const seedProducts: Product[] = items.map(([id, name, brand, category, price, originalPrice, badge], index) => ({
  id, name, brand, category, price, originalPrice, badge,
  rating: [4.7, 4.6, 4.4, 4.5, 4.3, 4.6][index % 6],
  reviews: [2846, 1532, 864, 2105, 742, 3629][index % 6],
  image: `/images/products/${id}.webp`,
  images: [`/images/products/${id}.webp`],
  description: descriptions[category],
  details: highlights[category],
  featured: index < 6,
  stock: 50,
}));

export const money = (amount: number) => "₹" + amount.toLocaleString("en-IN");
export const discount = (product: Product) => Math.round((1 - product.price / product.originalPrice) * 100);
export const shippingFee = (total: number) => total >= 499 || total === 0 ? 0 : 40;

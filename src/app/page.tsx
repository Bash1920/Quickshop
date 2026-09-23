import Storefront from "@/components/storefront";
import { seedProducts } from "@/lib/catalog";
import { getProducts } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let products = seedProducts;
  try { products = await getProducts(); } catch (error) { console.warn("Catalog is being prepared:", error instanceof Error ? error.message : error); }
  return <Storefront products={products} />;
}

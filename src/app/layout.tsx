import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "QuickShop — A little more joy. A lot more savings.",
  description: "Discover your next favourite. Shop incredible deals on mobiles, electronics, fashion, home essentials and more, all in one place.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en-IN"><body>{children}</body></html>;
}

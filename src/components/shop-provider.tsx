"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { type Order, type Product, type ShopState } from "@/lib/catalog";

type ApiResult = { state: ShopState; order?: Order; message?: string };
type ShopContextValue = ShopState & {
  busy: boolean;
  ready: boolean;
  request: (action: string, payload?: Record<string, unknown>, success?: string) => Promise<ApiResult | null>;
  notify: (message: string, error?: boolean) => void;
};
const ShopContext = createContext<ShopContextValue | null>(null);

export function ShopProvider({ products, children }: { products: Product[]; children: ReactNode }) {
  const [state, setState] = useState<ShopState>({ products, cart: [], wishlist: [], user: null, orders: [] });
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<{ message: string; error: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inFlight = useRef(false);
  const initialLoad = useRef<Promise<void> | null>(null);
  const notify = useCallback((message: string, error = false) => {
    clearTimeout(timer.current);
    setToast({ message, error });
    timer.current = setTimeout(() => setToast(null), 4200);
  }, []);

  useEffect(() => {
    let active = true;
    initialLoad.current = fetch("/api/store").then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (active) setState(data.state);
    }).catch(() => { if (active) notify("We couldn’t load your saved cart. Please refresh to try again.", true); })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; clearTimeout(timer.current); };
  }, [notify]);

  const request = useCallback(async (action: string, payload: Record<string, unknown> = {}, success?: string) => {
    if (inFlight.current) return null;
    inFlight.current = true;
    setBusy(true);
    try {
      await initialLoad.current;
      const response = await fetch("/api/store", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, action }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      setState(data.state);
      if (success || data.message) notify(success || data.message);
      return data as ApiResult;
    } catch (error) {
      notify(error instanceof Error ? error.message : "Please try again in a moment.", true);
      return null;
    } finally { setBusy(false); inFlight.current = false; }
  }, [notify]);

  return <ShopContext.Provider value={{ ...state, busy, ready, request, notify }}>
    {children}
    {toast && <div className={`toast ${toast.error ? "toast-error" : ""}`} role={toast.error ? "alert" : "status"}>
      {toast.error ? <AlertCircle size={21} /> : <CheckCircle2 size={21} />}<span>{toast.message}</span>
      <button aria-label="Dismiss notification" onClick={() => setToast(null)}><X size={16} /></button>
    </div>}
  </ShopContext.Provider>;
}

export function useShop() {
  const context = useContext(ShopContext);
  if (!context) throw new Error("Shopping components must be inside ShopProvider.");
  return context;
}

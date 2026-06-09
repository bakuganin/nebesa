import type { Metadata } from "next";

import { CartDrawer } from "@/components/cart/cart-drawer";
import { CartProvider } from "@/components/cart/cart-provider";
import { CheckoutForm } from "@/components/cart/checkout-form";
import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";

export const metadata: Metadata = {
  title: "Оформление заказа | NEBESA",
  description: "Оформление заказа на опубликованные товары NEBESA.",
};

export default function CheckoutPage() {
  return (
    <CartProvider>
      <Header />
      <main className="min-h-screen bg-mist px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <CheckoutForm />
        </div>
      </main>
      <Footer />
      <CartDrawer />
    </CartProvider>
  );
}

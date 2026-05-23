import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { StoreLayout } from "@/components/Layout";
import { HomePage } from "@/pages/Home";
import { ProductsPage } from "@/pages/Products";
import { ProductDetailPage } from "@/pages/ProductDetail";
import { CartPage } from "@/pages/Cart";
import { CheckoutPage } from "@/pages/Checkout";
import { ConfirmationPage } from "@/pages/Confirmation";
import { TrackPage } from "@/pages/Track";
import { MenuPage } from "@/pages/Menu";

// Horus Storefront — public, customer-facing SPA. Each tenant gets a
// route segment `/<slug>` and all storefront state hangs off that slug.
// The `/menu/<slug>` route is dedicated to restaurants (scanned via
// QR at the table) and has its own mobile-first layout.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/demo" replace />} />
        <Route path="/menu/:slug" element={<MenuPage />} />
        <Route path="/:slug" element={<StoreLayout />}>
          <Route index element={<HomePage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="p/:productId" element={<ProductDetailPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="order/:orderNumber" element={<ConfirmationPage />} />
          <Route path="track" element={<TrackPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

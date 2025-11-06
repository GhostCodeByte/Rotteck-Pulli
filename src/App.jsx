import { Navigate, Route, Routes } from "react-router-dom";

import Layout from "./components/Layout.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import CartPage from "./pages/CartPage.jsx";
import OrderHistoryPage from "./pages/OrderHistoryPage.jsx";
import OrderSuccessPage from "./pages/OrderSuccessPage.jsx";
import ProductPage from "./pages/ProductPage.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { AdminAuthProvider } from "./context/AdminAuthContext.jsx";

export default function App() {
  return (
    <AdminAuthProvider>
      <CartProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<ProductPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/orders" element={<OrderHistoryPage />} />
            <Route path="/order-success" element={<OrderSuccessPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </CartProvider>
    </AdminAuthProvider>
  );
}

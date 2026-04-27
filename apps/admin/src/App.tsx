import { Route, Routes } from "react-router-dom"
import { ProtectedRoute } from "@/components/protected-route"
import AuthLayout from "@/layouts/AuthLayout"
import DashboardLayout from "@/layouts/DashboardLayout"
import LoginPage from "@/pages/auth/LoginPage"
import SignupPage from "@/pages/auth/SignupPage"
import DashboardPage from "@/pages/dashboard/DashboardPage"
import ProductsPage from "@/pages/products/ProductsPage"
import ProductCreatePage from "@/pages/products/ProductCreatePage"
import ProductEditPage from "@/pages/products/ProductEditPage"
import CategoriesPage from "@/pages/categories/CategoriesPage"
import OrdersPage from "@/pages/orders/OrdersPage"
import CustomersPage from "@/pages/customers/CustomersPage"
import StockLocationsPage from "@/pages/stock-locations/StockLocationsPage"
import InventoryPage from "@/pages/inventory/InventoryPage"
import PromotionsPage from "@/pages/promotions/PromotionsPage"
import PriceListsPage from "@/pages/price-lists/PriceListsPage"
import ShipmentsPage from "@/pages/shipments/ShipmentsPage"
import ReturnsPage from "@/pages/returns/ReturnsPage"
import ShippingZonesPage from "@/pages/shipping-zones/ShippingZonesPage"
import ShippingOptionsPage from "@/pages/shipping-options/ShippingOptionsPage"
import LanguagesPage from "@/pages/languages/LanguagesPage"
import TaxClassesPage from "@/pages/tax-classes/TaxClassesPage"
import TaxClassCreatePage from "@/pages/tax-classes/TaxClassCreatePage"
import TaxClassEditPage from "@/pages/tax-classes/TaxClassEditPage"
import UsersPage from "@/pages/users/UsersPage"
import RolesPage from "@/pages/roles/RolesPage"

export default function App() {
  return (
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/new" element={<ProductCreatePage />} />
          <Route path="/products/:id" element={<ProductEditPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/stock-locations" element={<StockLocationsPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/promotions" element={<PromotionsPage />} />
          <Route path="/price-lists" element={<PriceListsPage />} />
          <Route path="/shipments" element={<ShipmentsPage />} />
          <Route path="/returns" element={<ReturnsPage />} />
          <Route path="/shipping-zones" element={<ShippingZonesPage />} />
          <Route path="/shipping-options" element={<ShippingOptionsPage />} />
          <Route path="/languages" element={<LanguagesPage />} />
          <Route path="/tax-classes" element={<TaxClassesPage />} />
          <Route path="/tax-classes/new" element={<TaxClassCreatePage />} />
          <Route path="/tax-classes/:id" element={<TaxClassEditPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/roles" element={<RolesPage />} />
        </Route>
      </Route>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>
    </Routes>
  )
}

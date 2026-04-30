import { Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/protected-route";
import AuthLayout from "@/layouts/AuthLayout";
import DashboardLayout from "@/layouts/DashboardLayout";
import LoginPage from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/SignupPage";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import ProductsPage from "@/pages/products/ProductsPage";
import ProductCreatePage from "@/pages/products/ProductCreatePage";
import ProductEditPage from "@/pages/products/ProductEditPage";
import CategoriesPage from "@/pages/categories/CategoriesPage";
import CategoryCreatePage from "@/pages/categories/CategoryCreatePage";
import CategoryEditPage from "@/pages/categories/CategoryEditPage";
import MediaLibraryPage from "@/pages/media/MediaLibraryPage";
import OrdersPage from "@/pages/orders/OrdersPage";
import CustomersPage from "@/pages/customers/CustomersPage";
import StockLocationsPage from "@/pages/stock-locations/StockLocationsPage";
import StockLocationCreatePage from "@/pages/stock-locations/StockLocationCreatePage";
import StockLocationEditPage from "@/pages/stock-locations/StockLocationEditPage";
import InventoryPage from "@/pages/inventory/InventoryPage";
import PromotionsPage from "@/pages/promotions/PromotionsPage";
import PromotionCreatePage from "@/pages/promotions/PromotionCreatePage";
import PromotionEditPage from "@/pages/promotions/PromotionEditPage";
import PriceListsPage from "@/pages/price-lists/PriceListsPage";
import PriceListCreatePage from "@/pages/price-lists/PriceListCreatePage";
import PriceListEditPage from "@/pages/price-lists/PriceListEditPage";
import ShipmentsPage from "@/pages/shipments/ShipmentsPage";
import ReturnsPage from "@/pages/returns/ReturnsPage";
import ShippingZonesPage from "@/pages/shipping-zones/ShippingZonesPage";
import ShippingZoneCreatePage from "@/pages/shipping-zones/ShippingZoneCreatePage";
import ShippingZoneEditPage from "@/pages/shipping-zones/ShippingZoneEditPage";
import ShippingOptionsPage from "@/pages/shipping-options/ShippingOptionsPage";
import ShippingOptionCreatePage from "@/pages/shipping-options/ShippingOptionCreatePage";
import ShippingOptionEditPage from "@/pages/shipping-options/ShippingOptionEditPage";
import LanguagesPage from "@/pages/languages/LanguagesPage";
import TaxClassesPage from "@/pages/tax-classes/TaxClassesPage";
import TaxClassCreatePage from "@/pages/tax-classes/TaxClassCreatePage";
import TaxClassEditPage from "@/pages/tax-classes/TaxClassEditPage";
import UsersPage from "@/pages/users/UsersPage";
import RolesPage from "@/pages/roles/RolesPage";

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
          <Route path="/categories/new" element={<CategoryCreatePage />} />
          <Route path="/categories/:id" element={<CategoryEditPage />} />
          <Route path="/media" element={<MediaLibraryPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/stock-locations" element={<StockLocationsPage />} />
          <Route
            path="/stock-locations/new"
            element={<StockLocationCreatePage />}
          />
          <Route
            path="/stock-locations/:id"
            element={<StockLocationEditPage />}
          />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/promotions" element={<PromotionsPage />} />
          <Route path="/promotions/new" element={<PromotionCreatePage />} />
          <Route path="/promotions/:id" element={<PromotionEditPage />} />
          <Route path="/price-lists" element={<PriceListsPage />} />
          <Route path="/price-lists/new" element={<PriceListCreatePage />} />
          <Route path="/price-lists/:id" element={<PriceListEditPage />} />
          <Route path="/shipments" element={<ShipmentsPage />} />
          <Route path="/returns" element={<ReturnsPage />} />
          <Route path="/shipping-zones" element={<ShippingZonesPage />} />
          <Route
            path="/shipping-zones/new"
            element={<ShippingZoneCreatePage />}
          />
          <Route
            path="/shipping-zones/:id"
            element={<ShippingZoneEditPage />}
          />
          <Route path="/shipping-options" element={<ShippingOptionsPage />} />
          <Route
            path="/shipping-options/new"
            element={<ShippingOptionCreatePage />}
          />
          <Route
            path="/shipping-options/:id"
            element={<ShippingOptionEditPage />}
          />
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
  );
}

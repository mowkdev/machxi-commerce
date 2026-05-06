import { Navigate, Route, Routes } from "react-router-dom";
import { PlaceholderPage } from "@/components/placeholder-page";
import { ProtectedRoute } from "@/components/protected-route";
import AuthLayout from "@/layouts/AuthLayout";
import DashboardLayout from "@/layouts/DashboardLayout";
import SettingsLayout from "@/layouts/SettingsLayout";
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
import CartsPage from "@/pages/carts/CartsPage";
import CartDetailPage from "@/pages/carts/CartDetailPage";
import OrdersPage from "@/pages/orders/OrdersPage";
import OrderCreatePage from "@/pages/orders/OrderCreatePage";
import OrderEditPage from "@/pages/orders/OrderEditPage";
import CustomersPage from "@/pages/customers/CustomersPage";
import CustomerCreatePage from "@/pages/customers/CustomerCreatePage";
import CustomerEditPage from "@/pages/customers/CustomerEditPage";
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
import FulfillmentsPage from "@/pages/fulfillments/FulfillmentsPage";
import FulfillmentCreatePage from "@/pages/fulfillments/FulfillmentCreatePage";
import FulfillmentEditPage from "@/pages/fulfillments/FulfillmentEditPage";
import ReturnsPage from "@/pages/returns/ReturnsPage";
import ReturnCreatePage from "@/pages/returns/ReturnCreatePage";
import ReturnEditPage from "@/pages/returns/ReturnEditPage";
import ShippingZonesPage from "@/pages/shipping-zones/ShippingZonesPage";
import ShippingZoneCreatePage from "@/pages/shipping-zones/ShippingZoneCreatePage";
import ShippingZoneEditPage from "@/pages/shipping-zones/ShippingZoneEditPage";
import ShippingOptionsPage from "@/pages/shipping-options/ShippingOptionsPage";
import ShippingOptionCreatePage from "@/pages/shipping-options/ShippingOptionCreatePage";
import ShippingOptionEditPage from "@/pages/shipping-options/ShippingOptionEditPage";
import LanguagesPage from "@/pages/languages/LanguagesPage";
import LanguageCreatePage from "@/pages/languages/LanguageCreatePage";
import LanguageEditPage from "@/pages/languages/LanguageEditPage";
import TaxClassesPage from "@/pages/tax-classes/TaxClassesPage";
import TaxClassCreatePage from "@/pages/tax-classes/TaxClassCreatePage";
import TaxClassEditPage from "@/pages/tax-classes/TaxClassEditPage";
import UsersPage from "@/pages/users/UsersPage";
import UserCreatePage from "@/pages/users/UserCreatePage";
import UserEditPage from "@/pages/users/UserEditPage";
import RolesPage from "@/pages/roles/RolesPage";
import RoleCreatePage from "@/pages/roles/RoleCreatePage";
import RoleEditPage from "@/pages/roles/RoleEditPage";

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
          <Route path="/carts" element={<CartsPage />} />
          <Route path="/carts/:id" element={<CartDetailPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/new" element={<OrderCreatePage />} />
          <Route path="/orders/:id" element={<OrderEditPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/new" element={<CustomerCreatePage />} />
          <Route path="/customers/:id" element={<CustomerEditPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/promotions" element={<PromotionsPage />} />
          <Route path="/promotions/new" element={<PromotionCreatePage />} />
          <Route path="/promotions/:id" element={<PromotionEditPage />} />
          <Route path="/price-lists" element={<PriceListsPage />} />
          <Route path="/price-lists/new" element={<PriceListCreatePage />} />
          <Route path="/price-lists/:id" element={<PriceListEditPage />} />
          <Route path="/fulfillments" element={<FulfillmentsPage />} />
          <Route path="/fulfillments/new" element={<FulfillmentCreatePage />} />
          <Route path="/fulfillments/:id" element={<FulfillmentEditPage />} />
          <Route path="/returns" element={<ReturnsPage />} />
          <Route path="/returns/new" element={<ReturnCreatePage />} />
          <Route path="/returns/:id" element={<ReturnEditPage />} />
          <Route path="/settings" element={<SettingsLayout />}>
            <Route
              index
              element={<Navigate to="/settings/store/general" replace />}
            />
            <Route
              path="store/general"
              element={<PlaceholderPage title="General" />}
            />
            <Route path="regions/languages" element={<LanguagesPage />} />
            <Route
              path="regions/languages/new"
              element={<LanguageCreatePage />}
            />
            <Route
              path="regions/languages/:code"
              element={<LanguageEditPage />}
            />
            <Route path="regions/tax-classes" element={<TaxClassesPage />} />
            <Route
              path="regions/tax-classes/new"
              element={<TaxClassCreatePage />}
            />
            <Route
              path="regions/tax-classes/:id"
              element={<TaxClassEditPage />}
            />
            <Route path="shipping/zones" element={<ShippingZonesPage />} />
            <Route
              path="shipping/zones/new"
              element={<ShippingZoneCreatePage />}
            />
            <Route
              path="shipping/zones/:id"
              element={<ShippingZoneEditPage />}
            />
            <Route path="shipping/options" element={<ShippingOptionsPage />} />
            <Route
              path="shipping/options/new"
              element={<ShippingOptionCreatePage />}
            />
            <Route
              path="shipping/options/:id"
              element={<ShippingOptionEditPage />}
            />
            <Route path="locations" element={<StockLocationsPage />} />
            <Route path="locations/new" element={<StockLocationCreatePage />} />
            <Route path="locations/:id" element={<StockLocationEditPage />} />
            <Route path="team/users" element={<UsersPage />} />
            <Route path="team/users/new" element={<UserCreatePage />} />
            <Route path="team/users/:id" element={<UserEditPage />} />
            <Route path="team/roles" element={<RolesPage />} />
            <Route path="team/roles/new" element={<RoleCreatePage />} />
            <Route path="team/roles/:id" element={<RoleEditPage />} />
          </Route>
        </Route>
      </Route>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>
    </Routes>
  );
}

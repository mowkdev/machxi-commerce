import * as React from "react"
import {
  IconArrowBackUp,
  IconBuildingWarehouse,
  IconCategory,
  IconCurrencyDollar,
  IconDashboard,
  IconDiscount,
  IconHelp,
  IconInnerShadowTop,
  IconLanguage,
  IconMap,
  IconPackage,
  IconReceiptTax,
  IconSettings,
  IconShieldLock,
  IconShoppingCart,
  IconStack2,
  IconTruck,
  IconTruckDelivery,
  IconUserShield,
  IconUsers,
} from "@tabler/icons-react"

import { NavGroup } from "@/layouts/DashboardLayout/components/nav-group"
import { NavSecondary } from "@/layouts/DashboardLayout/components/nav-secondary"
import { NavUser } from "@/layouts/DashboardLayout/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: IconDashboard,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: IconSettings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: IconHelp,
    },
  ],
  catalog: [
    { title: "Products", url: "/products", icon: IconPackage },
    { title: "Categories", url: "/categories", icon: IconCategory },
  ],
  sales: [
    { title: "Orders", url: "/orders", icon: IconShoppingCart },
    { title: "Customers", url: "/customers", icon: IconUsers },
  ],
  inventory: [
    {
      title: "Stock locations",
      url: "/stock-locations",
      icon: IconBuildingWarehouse,
    },
    { title: "Inventory", url: "/inventory", icon: IconStack2 },
  ],
  marketing: [
    { title: "Promotions", url: "/promotions", icon: IconDiscount },
    { title: "Price lists", url: "/price-lists", icon: IconCurrencyDollar },
  ],
  fulfillment: [
    { title: "Shipments", url: "/shipments", icon: IconTruckDelivery },
    { title: "Returns", url: "/returns", icon: IconArrowBackUp },
  ],
  shipping: [
    { title: "Shipping zones", url: "/shipping-zones", icon: IconMap },
    { title: "Shipping options", url: "/shipping-options", icon: IconTruck },
  ],
  configuration: [
    { title: "Languages", url: "/languages", icon: IconLanguage },
    { title: "Tax classes", url: "/tax-classes", icon: IconReceiptTax },
    { title: "Users", url: "/users", icon: IconUserShield },
    { title: "Roles", url: "/roles", icon: IconShieldLock },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a href="#">
                <IconInnerShadowTop className="size-5!" />
                <span className="text-base font-semibold">Acme Inc.</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavGroup items={data.navMain} />
        <NavGroup items={data.catalog} groupLabel="Catalog" />
        <NavGroup items={data.sales} groupLabel="Sales" />
        <NavGroup items={data.inventory} groupLabel="Inventory" />
        <NavGroup items={data.marketing} groupLabel="Marketing" />
        <NavGroup items={data.fulfillment} groupLabel="Fulfillment" />
        <NavGroup items={data.shipping} groupLabel="Shipping" />
        <NavGroup items={data.configuration} groupLabel="Configuration" />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}

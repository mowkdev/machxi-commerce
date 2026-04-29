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
  IconPhoto,
  IconReceiptTax,
  IconSettings,
  IconShieldLock,
  IconShoppingCart,
  IconStack2,
  IconTruck,
  IconTruckDelivery,
  IconUserShield,
  IconUsers,
  type Icon,
} from "@tabler/icons-react"
import type { ComponentProps } from "react"

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

type NavItem = {
  title: string
  url: string
  icon?: Icon
}

type NavGroupConfig = {
  id: string
  groupLabel: string
  collapseTitle?: boolean
  defaultOpen?: boolean
  items: NavItem[]
}

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
  navGroups: [
    {
      id: "catalog",
      groupLabel: "Catalog",
      collapseTitle: true,
      defaultOpen: true,
      items: [
        { title: "Products", url: "/products", icon: IconPackage },
        { title: "Categories", url: "/categories", icon: IconCategory },
      ],
    },
    {
      id: "content",
      groupLabel: "Content",
      collapseTitle: true,
      defaultOpen: true,
      items: [{ title: "Media", url: "/media", icon: IconPhoto }],
    },
    {
      id: "sales",
      groupLabel: "Sales",
      collapseTitle: true,
      defaultOpen: true,
      items: [
        { title: "Orders", url: "/orders", icon: IconShoppingCart },
        { title: "Customers", url: "/customers", icon: IconUsers },
      ],
    },
    {
      id: "inventory",
      groupLabel: "Inventory",
      collapseTitle: true,
      defaultOpen: true,
      items: [
        {
          title: "Stock locations",
          url: "/stock-locations",
          icon: IconBuildingWarehouse,
        },
        { title: "Inventory", url: "/inventory", icon: IconStack2 },
      ],
    },
    {
      id: "marketing",
      groupLabel: "Marketing",
      collapseTitle: true,
      items: [
        { title: "Promotions", url: "/promotions", icon: IconDiscount },
        { title: "Price lists", url: "/price-lists", icon: IconCurrencyDollar },
      ],
    },
    {
      id: "fulfillment",
      groupLabel: "Fulfillment",
      collapseTitle: true,
      items: [
        { title: "Shipments", url: "/shipments", icon: IconTruckDelivery },
        { title: "Returns", url: "/returns", icon: IconArrowBackUp },
      ],
    },
    {
      id: "shipping",
      groupLabel: "Shipping",
      collapseTitle: true,
      items: [
        { title: "Shipping zones", url: "/shipping-zones", icon: IconMap },
        { title: "Shipping options", url: "/shipping-options", icon: IconTruck },
      ],
    },
    {
      id: "configuration",
      groupLabel: "Configuration",
      collapseTitle: true,
      items: [
        { title: "Languages", url: "/languages", icon: IconLanguage },
        { title: "Tax classes", url: "/tax-classes", icon: IconReceiptTax },
        { title: "Users", url: "/users", icon: IconUserShield },
        { title: "Roles", url: "/roles", icon: IconShieldLock },
      ],
    },
  ] satisfies NavGroupConfig[],
}

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
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
        {data.navGroups.map((group) => (
          <NavGroup key={group.id} {...group} />
        ))}
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}

import { Link, Outlet, useLocation } from "react-router-dom"

import { cn } from "@/lib/utils"

type SettingsNavItem = {
  title: string
  url: string
}

type SettingsNavSection = {
  title: string
  items: SettingsNavItem[]
}

const sections: SettingsNavSection[] = [
  {
    title: "Store",
    items: [{ title: "General", url: "/settings/store/general" }],
  },
  {
    title: "Regions & taxes",
    items: [
      { title: "Languages", url: "/settings/regions/languages" },
      { title: "Tax classes", url: "/settings/regions/tax-classes" },
    ],
  },
  {
    title: "Shipping",
    items: [
      { title: "Shipping zones", url: "/settings/shipping/zones" },
      { title: "Shipping options", url: "/settings/shipping/options" },
    ],
  },
  {
    title: "Payments",
    items: [
      { title: "Payment providers", url: "/settings/payments/providers" },
    ],
  },
  {
    title: "Locations",
    items: [{ title: "Stock locations", url: "/settings/locations" }],
  },
  {
    title: "Team & access",
    items: [
      { title: "Users", url: "/settings/team/users" },
      { title: "Roles", url: "/settings/team/roles" },
    ],
  },
]

function isSettingsNavItemActive(pathname: string, url: string) {
  return pathname === url || pathname.startsWith(`${url}/`)
}

export default function SettingsLayout() {
  const { pathname } = useLocation()

  return (
    <div className="flex flex-1">
      <aside className="w-60 shrink-0 border-r p-4">
        <nav className="flex flex-col gap-6" aria-label="Settings">
          {sections.map((section) => (
            <div key={section.title} className="space-y-2">
              <h2 className="px-2 text-xs font-medium text-muted-foreground">
                {section.title}
              </h2>
              <div className="flex flex-col gap-1">
                {section.items.map((item) => {
                  const isActive = isSettingsNavItemActive(pathname, item.url)

                  return (
                    <Link
                      key={item.title}
                      to={item.url}
                      className={cn(
                        "rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                        isActive && "bg-muted text-foreground"
                      )}
                    >
                      {item.title}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  )
}

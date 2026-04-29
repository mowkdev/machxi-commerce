import { IconChevronDown, type Icon } from "@tabler/icons-react"
import { useId, useState } from "react"
import { Link } from "react-router-dom"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export type NavGroupProps = {
  items: {
    title: string
    url: string
    icon?: Icon
  }[]
  groupLabel?: string
  collapseTitle?: boolean
  defaultOpen?: boolean
}

export function NavGroup({
  items,
  groupLabel,
  collapseTitle,
  defaultOpen,
}: NavGroupProps) {
  const contentId = useId()
  const [open, setOpen] = useState(Boolean(defaultOpen))
  const isCollapsible = Boolean(groupLabel && collapseTitle)
  const isContentVisible = !isCollapsible || open

  return (
    <SidebarGroup>
      {groupLabel &&
        (isCollapsible ? (
          <SidebarGroupLabel asChild>
            <button
              type="button"
              aria-controls={contentId}
              aria-expanded={open}
              className="w-full cursor-pointer justify-between hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={() => setOpen((current) => !current)}
            >
              <span>{groupLabel}</span>
              <IconChevronDown
                className={`transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>
          </SidebarGroupLabel>
        ) : (
          <SidebarGroupLabel>{groupLabel}</SidebarGroupLabel>
        ))}
      {isContentVisible && (
        <SidebarGroupContent id={contentId} className="flex flex-col gap-2">
          <SidebarMenu>
            {items.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild tooltip={item.title}>
                  <Link to={item.url}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      )}
    </SidebarGroup>
  )
}

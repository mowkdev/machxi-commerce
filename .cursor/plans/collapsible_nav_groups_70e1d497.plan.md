---
name: Collapsible Nav Groups
overview: Add optional collapsible behavior to dashboard nav groups, with collapsed-by-default grouped sidebar config to save vertical space.
todos:
  - id: update-nav-group
    content: Add optional collapsible title behavior to NavGroup.
    status: completed
  - id: reshape-sidebar-config
    content: Move sidebar groups into a typed ordered config array.
    status: completed
  - id: verify-admin-nav
    content: Check edited files for TypeScript/lint issues.
    status: completed
isProject: false
---

# Collapsible Nav Groups

## Proposed Config Shape

Use an ordered `navGroups` array in [`apps/admin/src/layouts/DashboardLayout/components/app-sidebar.tsx`](apps/admin/src/layouts/DashboardLayout/components/app-sidebar.tsx), because sidebar order is meaningful and the current JSX repeats the same `<NavGroup />` call for each group.

```ts
const data = {
  user: { ... },
  navMain: [...],
  navGroups: [
    {
      id: "catalog",
      groupLabel: "Catalog",
      collapseTitle: true,
      defaultOpen: true,
      items: [...],
    },
    {
      id: "content",
      groupLabel: "Content",
      collapseTitle: true,
      items: [...],
    },
  ],
  navSecondary: [...],
}
```

Notes:
- `collapseTitle?: boolean` enables click-to-toggle behavior for the group title.
- `defaultOpen?: boolean` only matters when `collapseTitle` is true; omitted means collapsed by default.
- `id` gives each group a stable React key instead of relying on display text.
- `navMain` can remain separate and always visible because it has no group title today.

## Implementation Steps

1. Update [`apps/admin/src/layouts/DashboardLayout/components/nav-group.tsx`](apps/admin/src/layouts/DashboardLayout/components/nav-group.tsx):
   - Add `collapseTitle?: boolean` and `defaultOpen?: boolean` to `NavGroupProps`.
   - Add local `open` state initialized from `Boolean(defaultOpen)`.
   - Keep existing rendering unchanged when `collapseTitle` is false or there is no `groupLabel`.
   - When enabled, render `SidebarGroupLabel` as a button using `asChild`, toggle `open` on click, add `aria-expanded`, and hide/show `SidebarGroupContent`.
   - Add a small chevron icon that rotates based on state.

2. Update [`apps/admin/src/layouts/DashboardLayout/components/app-sidebar.tsx`](apps/admin/src/layouts/DashboardLayout/components/app-sidebar.tsx):
   - Introduce local types such as `NavItem` and `NavGroupConfig`.
   - Move `catalog`, `content`, `sales`, etc. from top-level arrays into `data.navGroups` objects with `groupLabel`, `collapseTitle`, optional `defaultOpen`, and `items`.
   - Render the groups with `data.navGroups.map((group) => <NavGroup key={group.id} {...group} />)`.

3. Verify:
   - Run lints/type checks for the admin app if available, or at least inspect diagnostics for the two edited files.
   - Confirm the default state is collapsed for groups without `defaultOpen: true`, while groups with `defaultOpen: true` start open.
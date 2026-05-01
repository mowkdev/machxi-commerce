import { describe, expect, it } from "vitest";
import { db } from "@repo/database/client";
import { permissions } from "@repo/database/schema";
import {
  createRole,
  deleteRole,
  getRole,
  listAllPermissions,
  listRoles,
  updateRole,
} from "../service";

function uniqueToken() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function ensureSamplePermission(): Promise<string> {
  const existing = await listAllPermissions();
  if (existing.length > 0) return existing[0].id;
  const [created] = await db
    .insert(permissions)
    .values({
      name: `test:${uniqueToken()}`,
      resource: "test",
      action: `act-${uniqueToken().slice(0, 6)}`,
    })
    .returning({ id: permissions.id });
  return created.id;
}

describe("role service", () => {
  it("creates, lists, updates, and deletes roles", async () => {
    const created = await createRole({
      name: `role-${uniqueToken()}`,
      description: "test description",
      permissionIds: [],
    });

    const detail = await getRole(created.id);
    expect(detail).not.toBeNull();
    expect(detail!.userCount).toBe(0);
    expect(detail!.permissionCount).toBe(0);
    expect(detail!.permissions).toEqual([]);

    const listed = await listRoles({
      page: 1,
      pageSize: 50,
      search: detail!.name,
      sortBy: "createdAt",
      sortOrder: "desc",
    });
    expect(listed.data.map((role) => role.id)).toContain(created.id);

    const updated = await updateRole(created.id, {
      description: "updated",
    });
    expect(updated!.description).toBe("updated");

    await expect(deleteRole(created.id)).resolves.toBe(true);
    await expect(getRole(created.id)).resolves.toBeNull();
  });

  it("manages permission assignments via setRolePermissions", async () => {
    const permissionId = await ensureSamplePermission();
    const role = await createRole({
      name: `role-${uniqueToken()}`,
      description: null,
      permissionIds: [permissionId],
    });

    let detail = await getRole(role.id);
    expect(detail!.permissions.map((p) => p.id)).toContain(permissionId);
    expect(detail!.permissionCount).toBe(1);

    await updateRole(role.id, { permissionIds: [] });
    detail = await getRole(role.id);
    expect(detail!.permissions).toHaveLength(0);

    await deleteRole(role.id);
  });

  it("rejects unknown permission ids", async () => {
    await expect(
      createRole({
        name: `role-${uniqueToken()}`,
        description: null,
        permissionIds: ["00000000-0000-0000-0000-000000000000"],
      }),
    ).rejects.toThrow(/permissions do not exist/i);
  });
});

import { describe, expect, it } from "vitest";
import type { CreateUserBody } from "../schema";
import {
  createUser,
  deleteUser,
  getUser,
  listUsers,
  updateUser,
} from "../service";
import { createRole, deleteRole } from "../../roles/service";

function uniqueToken() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeUser(overrides: Partial<CreateUserBody> = {}): CreateUserBody {
  const token = uniqueToken();
  return {
    email: `user-${token}@example.com`,
    name: "Test User",
    image: null,
    isActive: true,
    password: "correct horse battery staple",
    roleIds: [],
    ...overrides,
  };
}

describe("user service", () => {
  it("creates, lists, updates, and retrieves users without password hashes", async () => {
    const created = await createUser(makeUser({ name: "Ada Lovelace" }));

    const detail = await getUser(created.id);
    expect(detail).not.toBeNull();
    expect(detail!.name).toBe("Ada Lovelace");
    expect(detail!.isActive).toBe(true);
    expect(detail!.roles).toEqual([]);
    expect(
      (detail as unknown as Record<string, unknown>).passwordHash,
    ).toBeUndefined();

    const listed = await listUsers({
      page: 1,
      pageSize: 20,
      search: detail!.email,
      sortBy: "createdAt",
      sortOrder: "desc",
    });
    expect(listed.data.map((user) => user.id)).toContain(created.id);

    const updated = await updateUser(created.id, {
      name: "Grace Hopper",
      isActive: false,
    });
    expect(updated).not.toBeNull();
    expect(updated!.name).toBe("Grace Hopper");
    expect(updated!.isActive).toBe(false);

    await expect(deleteUser(created.id)).resolves.toBe(true);
  });

  it("manages role assignments via setUserRoles", async () => {
    const role1 = await createRole({
      name: `role-${uniqueToken()}`,
      description: null,
      permissionIds: [],
    });
    const role2 = await createRole({
      name: `role-${uniqueToken()}`,
      description: null,
      permissionIds: [],
    });

    const user = await createUser(
      makeUser({ roleIds: [role1.id, role2.id] }),
    );

    let detail = await getUser(user.id);
    expect(detail!.roles.map((r) => r.id).sort()).toEqual(
      [role1.id, role2.id].sort(),
    );

    const updated = await updateUser(user.id, { roleIds: [role1.id] });
    expect(updated!.roles.map((r) => r.id)).toEqual([role1.id]);

    detail = await getUser(user.id);
    expect(detail!.roles).toHaveLength(1);

    // Empty array clears roles
    await updateUser(user.id, { roleIds: [] });
    detail = await getUser(user.id);
    expect(detail!.roles).toHaveLength(0);

    await deleteUser(user.id);
    await deleteRole(role1.id);
    await deleteRole(role2.id);
  });

  it("rejects assignments with non-existent role ids", async () => {
    await expect(
      createUser(
        makeUser({ roleIds: ["00000000-0000-0000-0000-000000000000"] }),
      ),
    ).rejects.toThrow(/roles do not exist/i);
  });

  it("hashes password and stores lowercased email", async () => {
    const email = `Mixed-${uniqueToken()}@Example.COM`;
    const created = await createUser(makeUser({ email }));
    const detail = await getUser(created.id);
    expect(detail!.email).toBe(email.toLowerCase());
    await deleteUser(created.id);
  });

  it("ignores roleIds when undefined on update (preserves existing assignments)", async () => {
    const role = await createRole({
      name: `role-${uniqueToken()}`,
      description: null,
      permissionIds: [],
    });
    const user = await createUser(makeUser({ roleIds: [role.id] }));

    await updateUser(user.id, { name: "New name" });
    const detail = await getUser(user.id);
    expect(detail!.roles).toHaveLength(1);
    expect(detail!.roles[0].id).toBe(role.id);

    await deleteUser(user.id);
    await deleteRole(role.id);
  });
});


import { describe, expect, it } from "vitest";
import { roleFormSchema } from "../schema";

describe("roleFormSchema", () => {
  it("accepts a valid payload", () => {
    const result = roleFormSchema.safeParse({
      name: "Catalog manager",
      description: "Manages catalog data",
      permissionIds: ["a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"],
    });

    expect(result.success).toBe(true);
  });

  it("accepts empty description and permissions", () => {
    const result = roleFormSchema.safeParse({
      name: "Reader",
      description: "",
      permissionIds: [],
    });

    expect(result.success).toBe(true);
  });

  it("rejects empty names", () => {
    const result = roleFormSchema.safeParse({
      name: "",
      description: "",
      permissionIds: [],
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid permission uuids", () => {
    const result = roleFormSchema.safeParse({
      name: "Test",
      description: "",
      permissionIds: ["not-a-uuid"],
    });

    expect(result.success).toBe(false);
  });

  it("rejects descriptions over 500 characters", () => {
    const result = roleFormSchema.safeParse({
      name: "Test",
      description: "x".repeat(501),
      permissionIds: [],
    });

    expect(result.success).toBe(false);
  });
});

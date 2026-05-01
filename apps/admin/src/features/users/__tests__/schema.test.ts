import { describe, expect, it } from "vitest";
import { userFormSchema } from "../schema";

describe("userFormSchema", () => {
  it("accepts a valid create payload", () => {
    const result = userFormSchema.safeParse({
      email: "user@example.com",
      name: "Ada Lovelace",
      image: "",
      isActive: true,
      password: "correct horse battery staple",
      roleIds: [],
    });

    expect(result.success).toBe(true);
  });

  it("accepts an edit payload with empty password (kept unchanged)", () => {
    const result = userFormSchema.safeParse({
      email: "user@example.com",
      name: "",
      image: "",
      isActive: false,
      password: "",
      roleIds: ["a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"],
    });

    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = userFormSchema.safeParse({
      email: "not-an-email",
      isActive: true,
      password: "",
      roleIds: [],
    });

    expect(result.success).toBe(false);
  });

  it("rejects passwords shorter than 12 characters", () => {
    const result = userFormSchema.safeParse({
      email: "user@example.com",
      isActive: true,
      password: "short",
      roleIds: [],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) =>
        i.path.includes("password"),
      );
      expect(issue).toBeDefined();
    }
  });

  it("rejects malformed image URLs", () => {
    const result = userFormSchema.safeParse({
      email: "user@example.com",
      image: "not a url",
      isActive: true,
      password: "",
      roleIds: [],
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid role uuids", () => {
    const result = userFormSchema.safeParse({
      email: "user@example.com",
      isActive: true,
      password: "",
      roleIds: ["not-a-uuid"],
    });

    expect(result.success).toBe(false);
  });
});

import { beforeAll, describe, expect, it } from "vitest";
import { db, schema } from "../../db/client";
import { createCaller } from "../helpers/utils";
import { eq } from "drizzle-orm";
import { trpcError } from "../../trpc/core";
import resetDb from "../helpers/resetDb";

describe("auth routes", async () => {
  beforeAll(async () => {
    await resetDb();
  });
  describe("register", async () => {
    const user = {
      email: "mail@mail.com",
      password: "P@ssw0rd",
      name: "test",
      timezone: "Asia/Riyadh",
      locale: "en",
    };
    it("should create user successfully", async () => {
      const user = {
        email: "mail@mail.com",
        password: "P@ssw0rd",
        name: "test",
        timezone: "Asia/Riyadh",
        locale: "en",
      };
      const registeredUserRes = await createCaller({}).auth.register(user);
      expect(registeredUserRes.success).toBe(true);
      const userIndb = await db.query.users.findFirst({
        where: eq(schema.users.email, user.email),
      });
      expect(userIndb).toBeDefined();
      expect(userIndb!.email).toBe(user.email);
      expect(userIndb!.name).toBe(user.name);
      expect(userIndb!.hashedPassword).not.toBe(user.password);
      expect(userIndb!.hashedPassword!.length).toBeGreaterThan(0);
      expect(userIndb!.id).toBeDefined();
      expect(userIndb!.createdAt).toBeDefined();
      expect(userIndb!.updatedAt).toBeDefined();
      expect(userIndb!.emailVerified).toBe(false);
    });
    it("should throw error on duplicate user", async () => {
      await expect(createCaller({}).auth.register(user)).rejects.toThrowError(
        new trpcError({
          message: "User already exists",
          code: "BAD_REQUEST",
        })
      );
    });
  });
  describe("login", async () => {
    const user = {
      email: "mail@mail.com",
      password: "P@ssw0rd",
      rememberMe: true,
    };
    it("should not login user if not verified", async () => {
      await expect(createCaller({}).auth.login(user)).rejects.toThrowError(
        new trpcError({
          code: "NOT_FOUND",
        })
      );
    });
    it("should login user if verified", async () => {
      await db
        .update(schema.users)
        .set({ emailVerified: true })
        .where(eq(schema.users.email, "mail@mail.com"));
      const loginResponse = await createCaller({
        res: { setCookie: () => {} },
      }).auth.login(user);
      expect(loginResponse.success).toBe(true);
    });
  });
});

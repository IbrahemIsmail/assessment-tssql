import { beforeAll, describe, expect, it } from "vitest";
import { db, schema } from "../../db/client";
import { createAuthenticatedCaller, createCaller } from "../helpers/utils";
import resetDb from "../helpers/resetDb";
import { eq } from "drizzle-orm";
import { trpcError } from "../../trpc/core";

describe("plans routes", async () => {
  let adminUser;
  let adminInDb;
  let basicPlanId: number;
  let premiumPlanId: number;

  beforeAll(async () => {
    await resetDb();

    // Create admin user
    adminUser = {
      email: "admin@mail.com",
      password: "AdminP@ssw0rd",
      name: "admin",
      timezone: "Asia/Riyadh",
      locale: "en",
      isAdmin: true,
    };
    await createCaller({}).auth.register(adminUser);
    adminInDb = await db.query.users.findFirst({
      where: eq(schema.users.email, adminUser.email),
    });

    // Create plans with admin user
    const basicPlan = { name: "Basic Plan", price: 10 };
    const premiumPlan = { name: "Premium Plan", price: 30 };

    const { planId: basicId } = await createAuthenticatedCaller({
      userId: adminInDb!.id,
    }).plans.create(basicPlan);
    basicPlanId = basicId;

    const { planId: premiumId } = await createAuthenticatedCaller({
      userId: adminInDb!.id,
    }).plans.create(premiumPlan);
    premiumPlanId = premiumId;
  });

  describe("create plan", async () => {
    it("should create a plan successfully", async () => {
      const planDetails = {
        name: "New Plan",
        price: 20,
      };
      const { planId } = await createAuthenticatedCaller({
        userId: adminInDb!.id,
      }).plans.create(planDetails);
      expect(planId).toBeDefined();
      const createdPlan = await db.query.plans.findFirst({
        where: eq(schema.plans.id, planId),
      });
      expect(createdPlan).toBeDefined();
      expect(createdPlan!.name).toBe(planDetails.name);
      expect(createdPlan!.price).toBe(planDetails.price);
    });
  });

  describe("update plan", async () => {
    it("should update a plan successfully", async () => {
      const updatedPlanDetails = {
        planId: basicPlanId, // Replace with the actual plan ID
        name: "Basic Plan",
        price: 15,
      };
      const updateResponse = await createAuthenticatedCaller({
        userId: adminInDb!.id,
      }).plans.update(updatedPlanDetails);
      expect(updateResponse.success).toBe(true);
      const updatedPlan = await db.query.plans.findFirst({
        where: eq(schema.plans.id, basicPlanId),
      });
      expect(updatedPlan).toBeDefined();
      expect(updatedPlan!.name).toBe(updatedPlanDetails.name);
      expect(updatedPlan!.price).toBe(updatedPlanDetails.price);
    });
  });

  describe("get plan", async () => {
    it("should retrieve a plan successfully as a regular user", async () => {
      // Register a regular user
      const regularUser = {
        email: "regularuser@mail.com",
        password: "RegularP@ssw0rd",
        name: "regular user",
        timezone: "Asia/Riyadh",
        locale: "en",
      };
      await createCaller({}).auth.register(regularUser);
      const regularUserInDb = await db.query.users.findFirst({
        where: eq(schema.users.email, regularUser.email),
      });
  
      // Retrieve the plan as the regular user
      const retrievedPlan = await createAuthenticatedCaller({
        userId: regularUserInDb!.id,
      }).plans.get(basicPlanId);
      
      expect(retrievedPlan).toBeDefined();
      expect(retrievedPlan.name).toBe("Basic Plan");
      expect(retrievedPlan.price).toBe(15);
    });
  });
  
  describe("calculate prorated upgrade price", async () => {
    it("should calculate prorated upgrade price correctly as a regular user", async () => {
      // Register a regular user
      const regularUser = {
        email: "regularuser2@mail.com",
        password: "RegularP@ssw0rd",
        name: "regular user",
        timezone: "Asia/Riyadh",
        locale: "en",
      };
      await createCaller({}).auth.register(regularUser);
      const regularUserInDb = await db.query.users.findFirst({
        where: eq(schema.users.email, regularUser.email),
      });
  
      const basicPlan = { name: "Basic Plan", price: 10 };
      const premiumPlan = { name: "Premium Plan", price: 30 };
  
      const { planId: basicPlanId } = await createAuthenticatedCaller({
        userId: adminInDb!.id,
      }).plans.create(basicPlan);
  
      const { planId: premiumPlanId } = await createAuthenticatedCaller({
        userId: adminInDb!.id,
      }).plans.create(premiumPlan);
  
      // Calculate prorated upgrade price as the regular user
      const remainingDays = 15; // Assume 15 days left in the current cycle
  
      const { proratedPrice } = await createAuthenticatedCaller({
        userId: regularUserInDb!.id,
      }).plans.calculateProratedUpgradePrice({
        currentPlanId: basicPlanId,
        newPlanId: premiumPlanId,
        remainingDays,
      });
  
      const expectedProratedPrice = ((premiumPlan.price - basicPlan.price) / 30) * remainingDays;
      expect(proratedPrice).toBe(expectedProratedPrice);
    });
  });
  

  describe("unauthorized access prevention", async () => {
    it("should prevent non-admin from creating a plan", async () => {
      const user = {
        email: "user2@mail.com",
        password: "UserP@ssw0rd",
        name: "user",
        timezone: "Asia/Riyadh",
        locale: "en",
      };
      await createCaller({}).auth.register(user);
      const userInDb = await db.query.users.findFirst({
        where: eq(schema.users.email, user.email),
      });
      const planDetails = {
        name: "Basic Plan",
        price: 10,
      };
      await expect(
        createAuthenticatedCaller({
          userId: userInDb!.id,
        }).plans.create(planDetails)
      ).rejects.toThrowError(
        new trpcError({
          code: "FORBIDDEN",
          message: "You do not have permission to create a plan",
        })
      );
    });
  });
});

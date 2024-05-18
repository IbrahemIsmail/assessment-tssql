import { db, schema } from "../../db/client";
import { trpcError } from "../../trpc/core";
import { eq } from "drizzle-orm";

// Create method for creating a plan
export const createPlan = async ({
  name,
  price,
}: {
  name: string;
  price: number;
}) => {
  const [plan] = await db
    .insert(schema.plans)
    .values({
      createdAt: new Date(),
      updatedAt: new Date(),
      name,
      price,
    })
    .returning();

  if (!plan) {
    throw new trpcError({
      code: "BAD_REQUEST",
      message: "Plan not created",
    });
  }

  return {
    planId: plan.id,
  };
};

// Update method for updating a plan
export const updatePlan = async ({
  planId,
  name,
  price,
}: {
  planId: number;
  name: string;
  price: number;
}) => {
  const updatedPlan = await db
    .update(schema.plans)
    .set({
      name,
      price,
      updatedAt: new Date(),
    })
    .where(eq(schema.plans.id, planId))
    .returning();

  if (!updatedPlan) {
    throw new trpcError({
      code: "NOT_FOUND",
      message: "Plan not found",
    });
  }

  return {
    success: true,
  };
};

// Read method for retrieving plan information
export const getPlan = async (planId: number) => {
  const plan = await db.query.plans.findFirst({
    where: eq(schema.plans.id, planId),
  });

  if (!plan) {
    throw new trpcError({
      code: "NOT_FOUND",
      message: "Plan not found",
    });
  }

  return plan;
};

// Method for calculating prorated upgrade price
export const calculateProratedUpgradePrice = async ({
  currentPlanId,
  newPlanId,
  remainingDays,
}: {
  currentPlanId: number;
  newPlanId: number;
  remainingDays: number;
}) => {
  const currentPlan = await getPlan(currentPlanId);
  const newPlan = await getPlan(newPlanId);

  const priceDifference = newPlan.price - currentPlan.price;
  const dailyPriceDifference = priceDifference / 30; // Assuming monthly cycles

  const proratedPrice = dailyPriceDifference * remainingDays;

  return proratedPrice;
};

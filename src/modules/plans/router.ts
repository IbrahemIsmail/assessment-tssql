import { router, trpcError, protectedProcedure } from "../../trpc/core";
import { z } from "zod";
import { db, schema } from "../../db/client";
import { eq } from "drizzle-orm";
import { createPlan, updatePlan, getPlan, calculateProratedUpgradePrice } from "./model";


export const plans = router({
  create: protectedProcedure
    .input(z.object({ name: z.string(), price: z.number() }))
    .mutation(async ({ ctx, input }) => {

      const { userId } = ctx.user; 
      const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
      const isAdmin = user?.isAdmin;

      if (!isAdmin) {
        throw new trpcError({
          code: "FORBIDDEN",
          message: "You do not have permission to create a plan",
        });
      }
      
      const { name, price } = input;
      const { planId } = await createPlan({ name, price });
      return { planId };
    }),
  update: protectedProcedure
    .input(z.object({ planId: z.number(), name: z.string(), price: z.number() }))
    .mutation(async ({ ctx, input }) => {

      const { userId } = ctx.user; 
      const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
      const isAdmin = user?.isAdmin;

      if (!isAdmin) {
        throw new trpcError({
          code: "FORBIDDEN",
          message: "You do not have permission to update a plan",
        });
      }
      
      const { planId, name, price } = input;
      await updatePlan({ planId, name, price });
      return { success: true };
    }),
  get: protectedProcedure
    .input(z.number())
    .query(async ({ input }) => {
      const planId = input;
      const plan = await getPlan(planId);
      return plan;
    }),
  calculateProratedUpgradePrice: protectedProcedure
    .input(z.object({ currentPlanId: z.number(), newPlanId: z.number(), remainingDays: z.number() }))
    .query(async ({ input }) => {
      const { currentPlanId, newPlanId, remainingDays } = input;
      const proratedPrice = await calculateProratedUpgradePrice({ currentPlanId, newPlanId, remainingDays });
      return { proratedPrice };
    }),
});

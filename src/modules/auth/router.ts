import bcryptjs from "bcryptjs";
import * as crypto from "crypto";
import { router, trpcError, publicProcedure } from "../../trpc/core";
import { z } from "zod";
import { db, schema } from "../../db/client";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import {
  verifyRefreshToken,
  setTokens,
  clearTokens,
  generateOtp,
} from "./model";
import { initPersonalTeam } from "../teams/model";

const salt = 10;

export const auth = router({
  refresh: publicProcedure.mutation(async ({ ctx: { req, res } }) => {
    try {
      const { userId } = verifyRefreshToken({ req });
      const user = await db.query.users.findFirst({
        where: eq(schema.users, userId),
      });
      if (!user) {
        throw new trpcError({
          code: "BAD_REQUEST",
        });
      }
      setTokens({
        res,
        payload: { userId: user.id },
      });
      return {
        success: true,
      };
    } catch (error) {
      clearTokens({ res });
      throw new trpcError({
        code: "UNAUTHORIZED",
      });
    }
  }),
  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string() }))
    .mutation(async ({ input, ctx: { res } }) => {
      const { email, password } = input;
      const emailNormalized = email.toLowerCase();
      const user = await db.query.users.findFirst({
        where: and(
          eq(schema.users.email, emailNormalized),
          eq(schema.users.emailVerified, true)
        ),
      });
      // check 404 and check if user has password set
      if (!user || !user.hashedPassword) {
        throw new trpcError({
          code: "NOT_FOUND",
        });
      }
      // validate password
      const valid = await bcryptjs.compare(password, user.hashedPassword);
      if (!valid) {
        throw new trpcError({
          code: "NOT_FOUND",
        });
      }
      setTokens({
        res,
        payload: { userId: user.id },
      });
      return {
        success: true,
      };
    }),
    register: publicProcedure
    .input(
      z.object({
        name: z.string(),
        email: z.string().email(),
        password: z.string(),
        timezone: z.string(),
        locale: z.string(),
        isAdmin: z.boolean().optional(), // Add isAdmin to the input schema
      })
    )
    .mutation(async ({ input }) => {
      const { name, email, password, timezone, locale, isAdmin = false } = input; // Default isAdmin to false if not provided
      const emailNormalized = email.toLowerCase();
      const user = await db.query.users.findFirst({
        where: eq(schema.users.email, emailNormalized),
      });
  
      // Check if the user already exists
      if (user) {
        throw new trpcError({
          code: "BAD_REQUEST",
          message: "User already exists",
        });
      }
  
      // Hash the password
      const hashedPassword = await bcryptjs.hash(password, salt);
  
      // Create the user in the database
      const [createdUser] = await db
        .insert(schema.users)
        .values({
          createdAt: new Date(),
          updatedAt: new Date(),
          name,
          email: emailNormalized,
          hashedPassword,
          locale,
          timezone,
          isAdmin, // Include isAdmin field
        })
        .returning();
        
      // create random otpCode
      const otpCode = generateOtp();
      // create verify request
      // const [verifyRequest] =
      await db
        .insert(schema.emailVerifications)
        .values({
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: createdUser!.id,
          email: emailNormalized,
          otpCode,
        })
        .returning();

      // notify({
      //   eventType: "register",
      //   channels: ["mail"],
      //   data: {
      //     otpCode: verifyRequest!.otpCode,
      //     userName: name,
      //   },
      //   user: {
      //     email: emailNormalized,
      //     locale: createdUser!.locale as Language,
      //   },
      // });
      return {
        success: true,
      };
    }),
  emailVerifySubmit: publicProcedure
    .input(z.object({ email: z.string().email(), otpCode: z.string() }))
    .mutation(async ({ ctx: { res }, input }) => {
      const { email, otpCode } = input;
      const emailNormalized = email.toLowerCase();
      // get requests for this email within the last 10 minutes
      const timeBefore10Minutes = new Date(Date.now() - 10 * 60 * 1000);
      const verifyRequest = await db.query.emailVerifications.findFirst({
        where: and(
          eq(schema.emailVerifications.email, emailNormalized),
          gte(schema.emailVerifications.createdAt, timeBefore10Minutes)
        ),
        orderBy: desc(schema.emailVerifications.createdAt),
        with: {
          user: true,
        },
      });
      // check 400
      if (!verifyRequest || verifyRequest.attempts >= 5) {
        throw new trpcError({
          code: "BAD_REQUEST",
        });
      }
      if (verifyRequest.otpCode !== otpCode) {
        // if invalid, increment attempts
        db.run(
          sql`UPDATE ${schema.emailVerifications} SET attempts = attempts + 1 WHERE id = ${verifyRequest.id}`
        );
        throw new trpcError({
          code: "BAD_REQUEST",
        });
      }
      // if valid, update user to verified
      db.update(schema.users)
        .set({
          emailVerified: true,
        })
        .where(eq(schema.users.id, verifyRequest.userId));

      // init user with personal team
      const { teamId } = await initPersonalTeam({
        userId: verifyRequest.userId,
      });
      // perform login for user
      setTokens({
        res,
        payload: { userId: verifyRequest.userId },
      });
      return {
        success: true,
        teamId,
      };
    }),
  emailVerifyRequest: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
      })
    )
    .mutation(async ({ input }) => {
      const { email } = input;
      const emailNormalized = email.toLowerCase();
      // get user
      const user = await db.query.users.findFirst({
        where: and(
          eq(schema.users.email, emailNormalized),
          eq(schema.users.emailVerified, false)
        ),
      });
      // check 404
      if (!user) {
        throw new trpcError({
          code: "NOT_FOUND",
        });
      }
      // create random otpCode
      const otpCode = generateOtp();
      // create verify request
      // const [verifyRequest] =
      await db
        .insert(schema.emailVerifications)
        .values({
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: user.id,
          email: emailNormalized,
          otpCode,
        })
        .returning();
      // notify user
      // notify({
      //   eventType: "register",
      //   channels: ["mail"],
      //   data: {
      //     otpCode: verifyRequest!.otpCode,
      //     userName: user.name,
      //   },
      //   user: {
      //     email: user.email,
      //     locale: user.locale as Language,
      //   },
      // });
      return {
        success: true,
      };
    }),
  passwordResetRequest: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const { email } = input;
      const emailNormalized = email.toLowerCase();
      // get user
      const user = await db.query.users.findFirst({
        where: and(
          eq(schema.users.email, emailNormalized),
          eq(schema.users.emailVerified, true)
        ),
      });
      // check 404
      if (!user) {
        throw new trpcError({
          code: "NOT_FOUND",
        });
      }
      // create random token
      const token = crypto.randomBytes(64).toString("hex");

      // create reset request
      // const [resetRequest] =
      await db
        .insert(schema.passwordResetRequests)
        .values({
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: user.id,
          token,
        })
        .returning();
      // notify user
      // notify(emailNormalized, "passwordResetRequest", "en", {
      //   userName: user.name,
      //   token: resetRequest.token,
      // });
      // await notify({
      //   eventType: "passwordResetRequest",
      //   channels: ["mail"],
      //   data: {
      //     token: resetRequest!.token,
      //     userName: user.name,
      //   },
      //   user: {
      //     email: user.email,
      //     locale: user.locale as Language,
      //   },
      // });
      return {
        success: true,
      };
    }),
  passwordResetSubmit: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        token: z.string(),
        newPassword: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { email, token, newPassword } = input;
      // get user
      const normalizedEmail = email.toLowerCase();
      const user = await db.query.users.findFirst({
        where: and(
          eq(schema.users.email, normalizedEmail),
          eq(schema.users.emailVerified, true)
        ),
      });
      // check 404
      if (!user) {
        throw new trpcError({
          code: "NOT_FOUND",
        });
      }
      // get request
      const resetRequest = await db.query.passwordResetRequests.findFirst({
        // where: { userId: user.id, token },
        where: and(
          eq(schema.passwordResetRequests.userId, user.id),
          eq(schema.passwordResetRequests.token, token)
        ),
      });
      // check 404
      if (!resetRequest) {
        throw new trpcError({
          code: "NOT_FOUND",
        });
      }
      // hash password
      const hashedPassword = await bcryptjs.hash(newPassword, salt);
      // update user
      await db
        .update(schema.users)
        .set({
          hashedPassword,
        })
        .where(eq(schema.users.id, user.id));
      // return
      return {
        success: true,
      };
    }),
});

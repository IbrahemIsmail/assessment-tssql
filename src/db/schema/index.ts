import { relations } from "drizzle-orm";
import {
  sqliteTable,
  text,
  uniqueIndex,
  integer,
} from "drizzle-orm/sqlite-core";
const boolean = (col: string) => integer(col, { mode: "boolean" });
const timestamp = (col: string) => integer(col, { mode: "timestamp" });

export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey().notNull(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    hashedPassword: text("hashedPassword"),
    emailVerified: boolean("emailVerified").default(false).notNull(),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
    locale: text("locale").notNull(),
    timezone: text("timezone"),
    isAdmin: boolean("isAdmin").default(false).notNull(),
  },
  (table) => {
    return {
      emailIdx: uniqueIndex("emailIdx").on(table.email),
    };
  }
);

export const userRelations = relations(users, ({ many }) => ({
  teams: many(teams),
  emailVerifications: many(emailVerifications),
}));

export const emailVerifications = sqliteTable("emailVerifications", {
  id: integer("id").primaryKey().notNull(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }),
  email: text("email").notNull(),
  otpCode: text("otpCode").notNull(),
  attempts: integer("attempts").default(0).notNull(),
});

export const emailVerificationRelations = relations(
  emailVerifications,
  ({ one }) => ({
    user: one(users, {
      fields: [emailVerifications.userId],
      references: [users.id],
    }),
  })
);
export const emailChangeRequests = sqliteTable("emailChangeRequests", {
  id: integer("id").primaryKey().notNull(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }),
  newEmail: text("newEmail").notNull(),
  otpCode: text("otpCode").notNull(),
});

export const passwordResetRequests = sqliteTable("passwordResetRequests", {
  id: integer("id").primaryKey().notNull(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }),
  token: text("token").notNull(),
});

export const teams = sqliteTable("teams", {
  id: integer("id").primaryKey().notNull(),
  name: text("name").notNull(),
  isPersonal: boolean("isPersonal").notNull(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }),
});

export const teamsRelations = relations(teams, ({ one }) => ({
  user: one(users, {
    fields: [teams.userId],
    references: [users.id],
  }),
}));

export const plans = sqliteTable("plans", {
  id: integer("id").primaryKey().notNull(),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  defaultUsers: integer("defaultUsers").notNull(),
  pricePerUser: integer("pricePerUser").notNull(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const subscriptions = sqliteTable("subscriptions", {
  id: integer("id").primaryKey().notNull(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }),
  teamId: integer("teamId").notNull().references(() => teams.id, { onDelete: "restrict", onUpdate: "restrict" }),
  planId: integer("planId").notNull().references(() => plans.id, { onDelete: "restrict", onUpdate: "restrict" }),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey().notNull(),
  subscriptionId: integer("subscriptionId").notNull().references(() => subscriptions.id, { onDelete: "restrict", onUpdate: "restrict" }),
  amount: integer("amount").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const subscriptionActivations = sqliteTable("subscriptionActivations", {
  id: integer("id").primaryKey().notNull(),
  orderId: integer("orderId").notNull().references(() => orders.id, { onDelete: "restrict", onUpdate: "restrict" }),
  activationDate: timestamp("activationDate").notNull(),
  cycleType: text("cycleType").notNull(),
  cycleNumber: integer("cycleNumber").notNull(),
  amountPaid: integer("amountPaid").notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});
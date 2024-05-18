import { router } from "./core";

import { auth } from "../modules/auth/router";
import { account } from "../modules/users/router";
import { teams } from "../modules/teams/router";
import { plans } from "../modules/plans/router";

export const appRouter = router({
  auth,
  // protected
  account,
  teams,
  plans
});

export type AppRouter = typeof appRouter;

# Assessment in Typescript & SQL

## Getting started

This repo runs using fastify, trpc, zod, drizzle, and sqlite.

It uses node 20 & pnpm.

To get started, run the following commands:
```
pnpm install
```

Initiate the Sqlite DB:
```
pnpm db:push
```

Then, you can run typechecking, linting, or testing via the following commands:
```
pnpm typecheck

pnpm lint

pnpm test:int
```

## Intro to the SaaS API design

This system has a few core modules that support a B2B SaaS setup.

The current API supports the following models:
- auth: login, register, email verify, password reset
- account: for user to manage his own account
- teams: for users to create teams

The next features to be added are related to billing, the subscriptions module would include four main tables:
- plans: this is the base definition for a plan, it includes plan name & price 
- subscriptions: this is the list of active subscriptions
- subscriptionActivations: this is the table where we track billing cycles for each paid "month" or "year"
- orders: an order when paid creates an "Activation" record

the lifecycle of a subscription is:
- user creates a team subscription, with a reference to a specific team they own and a plan choice from the system
- subscriptions, aslong as they are active, will always issue orders via background cron jobs (if an activation record doesn't exist for the current period)
- orders, when paid, create subscriptionActivations

more tables may exist in a more complete "realistic" scenario, but this is a simplified version of a subscriptions system.

## Problem Statement (required)

Define the plans module & write atleast 5 tests that verify the core functionality works in the plans module.

The module should support a number of method:
1. create & update methods, not publicly accessible, admin access only
2. read method, accessible publicly
3. a prorated upgrade price calculation method: the system should allow upgrading to a more expensive plan in the middle of a subscription, so, we need to create a method that can determine the price for an "upgrade", based on price difference between two plans and the number of days remaining in the currently paid cycle, you can assume all plans are monthly cycles only, no annual plans are to be considered here

The best way to test the endpoints/methods you are building is by running the integration tests and creating testing scenarios for the new plans module, in the integration testing directory, by following the conventions done by other tests.

Trpc won't work well with playground testing tools like postman.


## schema design implementation (bonus)

without defining all the other modules in the billing module, just define the shape of the tables to be defined for the following:
- subscriptions
- orders
- subscriptionActivations

And create some scaffolding for the tests, the tests would be failing initially, by simply defining the purpose of some of the core integration tests for these modules

## question (bonus)

If you were to introduce two more props to plans:

1. defaultUsers: number of users included in the plan by default
2. pricePerUser: price per additional user beyond the default

How would this affect the current plan upgrade calculation?

### answer here:
---

Adding both defaultUsers & pricePerUser would definitely make the calculation more complex. There are factors like the upgraded plan having a higher defaultUser amount than the current plan for the user. I am assuming that the user would get some sort of credit for having a number of users less than the defaultUsers. On the other hand, you would need to calculate the extra cost of having the users more than the defaultUsers. Overall, I like this approach because it is more clear to users how each person on their team will cost.

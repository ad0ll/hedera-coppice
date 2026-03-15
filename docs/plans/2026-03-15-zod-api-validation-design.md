# Zod API Validation Design

## Problem

The API routes (`/api/purchase`, `/api/allocate`) have a partial Zod migration from commit `5bbe77c` that introduced redundancy:
- Auth fields (`message`, `signature`) are `.nonempty().optional()` in the Zod schema
- A manual `if (!message || !signature)` check follows immediately after
- Unused `type PurchaseBody` and `type AllocateBody` aliases exist

## Decision

All request fields (including auth) are required in a single Zod schema per route. Missing anything returns 400. The `verifyAuth` catch returns 401 only when credentials are present but cryptographically invalid.

## Changes

### Purchase route (`/api/purchase`)

Schema:
```ts
const purchaseBodySchema = z.object({
  investorAddress: z.string().nonempty(),
  amount: z.number().positive(),
  message: z.string().nonempty(),
  signature: z.string().nonempty(),
});
```

- Remove `.optional()` from `message` and `signature`
- Remove manual `if (!message || !signature)` check
- Remove unused `type PurchaseBody`

### Allocate route (`/api/allocate`)

Schema:
```ts
const allocateBodySchema = z.object({
  project: z.string().nonempty(),
  category: z.string().nonempty(),
  amount: z.number().positive(),
  currency: z.string().optional().default("USD"),
  message: z.string().nonempty(),
  signature: z.string().nonempty(),
});
```

- Remove `.optional()` from `message` and `signature`
- Remove manual `if (!authMessage || !signature)` check
- Remove unused `type AllocateBody`

### Test updates

- Purchase "rejects missing auth signature": 401 -> 400, error message -> "Invalid request"
- Allocate "rejects missing auth signature": 401 -> 400, error message -> "Missing fields"

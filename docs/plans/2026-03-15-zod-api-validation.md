# Zod API Validation Cleanup — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove redundant manual auth checks from API routes by making all fields required in Zod schemas.

**Architecture:** Both API routes already use Zod `safeParse` but auth fields (`message`, `signature`) are `.optional()` with a redundant manual check afterward. Make them required in the schema, remove the manual checks, remove unused type aliases, and update tests.

**Tech Stack:** Zod 4, Next.js 16 API routes, vitest

**Design doc:** `docs/plans/2026-03-15-zod-api-validation-design.md`

---

### Task 1: Update purchase route schema and remove redundant checks

**Files:**
- Modify: `frontend/app/api/purchase/route.ts:19-26` (schema + unused type)
- Modify: `frontend/app/api/purchase/route.ts:76-79` (redundant auth check)

**Step 1: Edit the schema — make auth fields required, remove unused type**

In `frontend/app/api/purchase/route.ts`, change lines 19-26 from:

```ts
const purchaseBodySchema = z.object({
  investorAddress: z.string().nonempty(),
  amount: z.number().positive(),
  message: z.string().nonempty().optional(),
  signature: z.string().nonempty().optional(),
});

type PurchaseBody = z.infer<typeof purchaseBodySchema>;
```

To:

```ts
const purchaseBodySchema = z.object({
  investorAddress: z.string().nonempty(),
  amount: z.number().positive(),
  message: z.string().nonempty(),
  signature: z.string().nonempty(),
});
```

**Step 2: Remove the redundant manual auth check**

In the same file, remove lines 76-79:

```ts
  // Verify wallet signature — proves caller owns the investor wallet
  if (!message || !signature) {
    return NextResponse.json({ error: "Missing authentication signature" }, { status: 401 });
  }
```

Keep the comment but update it to sit above the `try` block:

```ts
  // Verify wallet signature — proves caller owns the investor wallet
  try {
```

**Step 3: Run tests to see the expected failure**

Run: `cd frontend && npx vitest run __tests__/api/purchase.test.ts`
Expected: The "rejects missing auth signature" test fails — it expects 401 but now gets 400.

### Task 2: Update purchase tests

**Files:**
- Modify: `frontend/__tests__/api/purchase.test.ts:146-155`

**Step 1: Update the "rejects missing auth signature" test**

Change lines 146-155 from:

```ts
  it("rejects missing auth signature", async () => {
    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(makeRequest({
      investorAddress: FAKE_ALICE_ADDR,
      amount: 10,
    }));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/authentication/i);
  });
```

To:

```ts
  it("rejects missing auth signature", async () => {
    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(makeRequest({
      investorAddress: FAKE_ALICE_ADDR,
      amount: 10,
    }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid request");
  });
```

**Step 2: Run tests to verify all pass**

Run: `cd frontend && npx vitest run __tests__/api/purchase.test.ts`
Expected: All 11 tests pass.

### Task 3: Update allocate route schema and remove redundant checks

**Files:**
- Modify: `frontend/app/api/allocate/route.ts:7-16` (schema + unused type)
- Modify: `frontend/app/api/allocate/route.ts:31-33` (redundant auth check)

**Step 1: Edit the schema — make auth fields required, remove unused type**

In `frontend/app/api/allocate/route.ts`, change lines 7-16 from:

```ts
const allocateBodySchema = z.object({
  project: z.string().nonempty(),
  category: z.string().nonempty(),
  amount: z.number().positive(),
  currency: z.string().optional().default("USD"),
  message: z.string().nonempty().optional(),
  signature: z.string().nonempty().optional(),
});

type AllocateBody = z.infer<typeof allocateBodySchema>;
```

To:

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

**Step 2: Remove the redundant manual auth check**

Remove lines 31-33:

```ts
  if (!authMessage || !signature) {
    return NextResponse.json({ error: "Missing authentication signature" }, { status: 401 });
  }
```

**Step 3: Run tests to see the expected failure**

Run: `cd frontend && npx vitest run __tests__/api/allocate.test.ts`
Expected: The "rejects missing auth signature" test fails — it expects 401 but now gets 400.

### Task 4: Update allocate tests

**Files:**
- Modify: `frontend/__tests__/api/allocate.test.ts:118-128`

**Step 1: Update the "rejects missing auth signature" test**

Change lines 118-128 from:

```ts
  it("rejects missing auth signature", async () => {
    const { POST } = await import("@/app/api/allocate/route");
    const res = await POST(makeRequest({
      project: "Solar Farm",
      category: "Renewable Energy",
      amount: 1000,
    }));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/authentication/i);
  });
```

To:

```ts
  it("rejects missing auth fields", async () => {
    const { POST } = await import("@/app/api/allocate/route");
    const res = await POST(makeRequest({
      project: "Solar Farm",
      category: "Renewable Energy",
      amount: 1000,
    }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Missing fields");
  });
```

**Step 2: Run tests to verify all pass**

Run: `cd frontend && npx vitest run __tests__/api/allocate.test.ts`
Expected: All 10 tests pass.

### Task 5: Full verification

**Step 1: Run all unit tests**

Run: `npm run test:unit`
Expected: All 40 tests pass.

**Step 2: Run lint**

Run: `npm run lint`
Expected: Clean.

**Step 3: Run build**

Run: `npm run build`
Expected: Clean build.

**Step 4: Commit**

```
git add frontend/app/api/purchase/route.ts frontend/app/api/allocate/route.ts frontend/__tests__/api/purchase.test.ts frontend/__tests__/api/allocate.test.ts
git commit -m "fix: make Zod auth fields required, remove redundant manual checks"
```

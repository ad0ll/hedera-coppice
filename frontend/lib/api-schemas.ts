import { z } from "zod";

/** Response schema for POST /api/purchase */
export const purchaseResponseSchema = z.object({
  success: z.literal(true),
  transferTxHash: z.string(),
  mintTxHash: z.string(),
});
export type PurchaseResponse = z.infer<typeof purchaseResponseSchema>;

/** Response schema for POST /api/faucet */
export const faucetResponseSchema = z.object({
  success: z.literal(true),
  amount: z.number(),
});
export type FaucetResponse = z.infer<typeof faucetResponseSchema>;

/** Response schema for POST /api/issuer/create-coupon */
export const createCouponResponseSchema = z.object({
  success: z.literal(true),
  txHash: z.string(),
  couponId: z.number(),
});
export type CreateCouponResponse = z.infer<typeof createCouponResponseSchema>;

/** Response schema for POST /api/issuer/allocate */
export const allocateResponseSchema = z.object({
  success: z.literal(true),
  status: z.string(),
});
export type AllocateResponse = z.infer<typeof allocateResponseSchema>;

/** Response schema for POST /api/issuer/distribute-coupon */
export const distributeResponseSchema = z.object({
  success: z.literal(true),
  txHash: z.string(),
  status: z.string(),
});
export type DistributeResponse = z.infer<typeof distributeResponseSchema>;

/** Response schema for POST /api/demo/grant-agent-role */
export const grantAgentRoleResponseSchema = z.object({
  success: z.literal(true),
  txHash: z.string(),
});
export type GrantAgentRoleResponse = z.infer<typeof grantAgentRoleResponseSchema>;

/** Response schema for POST /api/issuer/register-project */
export const registerProjectResponseSchema = z.object({
  success: z.literal(true),
  projectName: z.string(),
});
export type RegisterProjectResponse = z.infer<typeof registerProjectResponseSchema>;

/** SSE event schema for POST /api/onboard */
export const onboardEventSchema = z.object({
  type: z.enum(["step", "complete", "error"]),
  step: z.string().optional(),
  label: z.string().optional(),
  txHash: z.string().optional(),
  identityAddress: z.string().optional(),
  transactions: z.record(z.string(), z.string()).optional(),
  error: z.string().optional(),
});
export type OnboardEvent = z.infer<typeof onboardEventSchema>;

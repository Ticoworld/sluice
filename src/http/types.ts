import { z } from "zod";

export const amountRequestSchema = z
  .object({
    amountCkb: z.string().min(1).optional(),
    amountShannons: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const hasCkb = value.amountCkb !== undefined;
    const hasShannons = value.amountShannons !== undefined;

    if (hasCkb === hasShannons) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide exactly one of amountCkb or amountShannons.",
      });
    }
  });

const rpcUrlSchema = z.string().url();
const receiverPubkeySchema = z.string().min(1);
const timeoutMsSchema = z.number().int().positive();
const pollIntervalMsSchema = z.number().int().positive();

export const quoteRequestSchema = amountRequestSchema;

export const readinessRequestSchema = z
  .object({
    serviceRpcUrl: rpcUrlSchema,
    receiverRpcUrl: rpcUrlSchema,
    receiverPubkey: receiverPubkeySchema.optional(),
  })
  .and(amountRequestSchema);

export const prepareRequestSchema = z
  .object({
    serviceRpcUrl: rpcUrlSchema,
    receiverRpcUrl: rpcUrlSchema,
    receiverPubkey: receiverPubkeySchema.optional(),
    acceptMode: z.enum(["detect", "manual", "auto"]).optional(),
    execute: z.boolean().optional(),
    yes: z.boolean().optional(),
    timeoutMs: timeoutMsSchema.optional(),
    pollIntervalMs: pollIntervalMsSchema.optional(),
  })
  .and(amountRequestSchema);

export const provePaymentRequestSchema = z
  .object({
    serviceRpcUrl: rpcUrlSchema,
    receiverRpcUrl: rpcUrlSchema,
    receiverPubkey: receiverPubkeySchema.optional(),
    acceptMode: z.enum(["detect", "manual", "auto"]).optional(),
    execute: z.boolean().optional(),
    yes: z.boolean().optional(),
    timeoutMs: timeoutMsSchema.optional(),
    pollIntervalMs: pollIntervalMsSchema.optional(),
  })
  .and(amountRequestSchema);

export type QuoteRequest = z.infer<typeof quoteRequestSchema>;
export type ReadinessRequest = z.infer<typeof readinessRequestSchema>;
export type PrepareRequest = z.infer<typeof prepareRequestSchema>;
export type ProvePaymentRequest = z.infer<typeof provePaymentRequestSchema>;

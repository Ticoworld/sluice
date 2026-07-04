import { z } from "zod";

/**
 * Fiber RPC does not document whether u32/u64/u128 fields are serialized as
 * JSON numbers or as strings, so schemas accept either and preserve the raw
 * value rather than guessing a conversion.
 */
const numericLike = z.union([z.string(), z.number()]);
const fundingLike = z.union([numericLike, z.bigint()]);

export const nodeInfoSchema = z
  .object({
    version: z.string(),
    commit_hash: z.string(),
    pubkey: z.string(),
    features: z.array(z.string()),
    node_name: z.string().nullable().optional(),
    addresses: z.array(z.string()),
    chain_hash: z.string(),
    open_channel_auto_accept_min_ckb_funding_amount: numericLike,
    auto_accept_channel_ckb_funding_amount: numericLike,
    default_funding_lock_script: z.unknown(),
    tlc_expiry_delta: numericLike,
    tlc_min_value: numericLike,
    tlc_fee_proportional_millionths: numericLike,
    channel_count: numericLike,
    pending_channel_count: numericLike,
    peers_count: numericLike,
    udt_cfg_infos: z.unknown(),
  })
  .passthrough();

export type NodeInfo = z.infer<typeof nodeInfoSchema>;

export const peerInfoSchema = z
  .object({
    pubkey: z.string(),
    address: z.string(),
  })
  .passthrough();

export type PeerInfo = z.infer<typeof peerInfoSchema>;

export const listPeersResultSchema = z
  .object({
    peers: z.array(peerInfoSchema),
  })
  .passthrough();

export type ListPeersResult = z.infer<typeof listPeersResultSchema>;

export const channelSchema = z
  .object({
    channel_id: z.string(),
    is_public: z.boolean(),
    is_acceptor: z.boolean(),
    is_one_way: z.boolean().optional(),
    channel_outpoint: z.unknown().optional().nullable(),
    pubkey: z.string(),
    funding_udt_type_script: z.unknown().optional().nullable(),
    state: z.unknown(),
    local_balance: numericLike,
    offered_tlc_balance: numericLike,
    remote_balance: numericLike,
    received_tlc_balance: numericLike,
    pending_tlcs: z.array(z.unknown()).optional(),
    latest_commitment_transaction_hash: z.string().nullable().optional(),
    created_at: numericLike,
    enabled: z.boolean(),
    tlc_expiry_delta: numericLike,
    tlc_fee_proportional_millionths: numericLike,
    shutdown_transaction_hash: z.string().nullable().optional(),
    failure_detail: z.string().nullable().optional(),
  })
  .passthrough();

export type Channel = z.infer<typeof channelSchema>;

export const listChannelsParamsSchema = z
  .object({
    pubkey: z.string().optional(),
    include_closed: z.boolean().optional(),
    only_pending: z.boolean().optional(),
  })
  .partial();

export type ListChannelsParams = z.infer<typeof listChannelsParamsSchema>;

export const listChannelsResultSchema = z
  .object({
    channels: z.array(channelSchema),
  })
  .passthrough();

export type ListChannelsResult = z.infer<typeof listChannelsResultSchema>;

export const openChannelParamsSchema = z
  .object({
    pubkey: z.string(),
    funding_amount: fundingLike,
    public: z.boolean().optional(),
    one_way: z.boolean().optional(),
  })
  .passthrough();

export type OpenChannelParams = z.infer<typeof openChannelParamsSchema>;

export const openChannelResultSchema = z
  .object({
    temporary_channel_id: z.string().optional(),
    channel_id: z.string().optional(),
  })
  .passthrough();

export type OpenChannelResult = z.infer<typeof openChannelResultSchema>;

export const acceptChannelParamsSchema = z
  .object({
    temporary_channel_id: z.string(),
    funding_amount: fundingLike,
  })
  .passthrough();

export type AcceptChannelParams = z.infer<typeof acceptChannelParamsSchema>;

export const acceptChannelResultSchema = z
  .object({
    channel_id: z.string().optional(),
    temporary_channel_id: z.string().optional(),
  })
  .passthrough();

export type AcceptChannelResult = z.infer<typeof acceptChannelResultSchema>;

export const ckbInvoiceDataSchema = z
  .object({
    payment_hash: z.string(),
  })
  .passthrough();

export const ckbInvoiceSchema = z
  .object({
    data: ckbInvoiceDataSchema,
  })
  .passthrough();

export type CkbInvoice = z.infer<typeof ckbInvoiceSchema>;

export const newInvoiceParamsSchema = z
  .object({
    amount: fundingLike,
    description: z.string().optional(),
    currency: z.string(),
    payment_preimage: z.string().optional(),
    payment_hash: z.string().optional(),
    expiry: numericLike.optional(),
    fallback_address: z.string().optional(),
    final_expiry_delta: numericLike.optional(),
    udt_type_script: z.unknown().optional(),
    hash_algorithm: z.unknown().optional(),
    allow_mpp: z.boolean().optional(),
    allow_trampoline_routing: z.boolean().optional(),
  })
  .passthrough();

export type NewInvoiceParams = z.infer<typeof newInvoiceParamsSchema>;

export const newInvoiceResultSchema = z
  .object({
    invoice_address: z.string(),
    invoice: ckbInvoiceSchema,
  })
  .passthrough();

export type NewInvoiceResult = z.infer<typeof newInvoiceResultSchema>;

export const getInvoiceResultSchema = z
  .object({
    invoice_address: z.string(),
    invoice: ckbInvoiceSchema,
    status: z.string(),
  })
  .passthrough();

export type GetInvoiceResult = z.infer<typeof getInvoiceResultSchema>;

export const sendPaymentParamsSchema = z
  .object({
    target_pubkey: z.string().optional(),
    amount: fundingLike.optional(),
    payment_hash: z.string().optional(),
    final_tlc_expiry_delta: numericLike.optional(),
    tlc_expiry_limit: numericLike.optional(),
    invoice: z.string().optional(),
    timeout: numericLike.optional(),
    max_fee_amount: fundingLike.optional(),
    max_fee_rate: numericLike.optional(),
    max_parts: numericLike.optional(),
    trampoline_hops: z.array(z.string()).optional(),
    keysend: z.boolean().optional(),
    udt_type_script: z.unknown().optional(),
    allow_self_payment: z.boolean().optional(),
    custom_records: z.unknown().optional(),
    hop_hints: z.array(z.unknown()).optional(),
    dry_run: z.boolean().optional(),
  })
  .passthrough();

export type SendPaymentParams = z.infer<typeof sendPaymentParamsSchema>;

export const paymentResultSchema = z
  .object({
    payment_hash: z.string(),
    status: z.string(),
    created_at: numericLike,
    last_updated_at: numericLike,
    failed_error: z.string().nullable().optional(),
    fee: fundingLike,
    custom_records: z.unknown().optional().nullable(),
    routers: z.array(z.unknown()).optional(),
  })
  .passthrough();

export type PaymentResult = z.infer<typeof paymentResultSchema>;

export const sendPaymentResultSchema = paymentResultSchema;
export type SendPaymentResult = z.infer<typeof sendPaymentResultSchema>;

export const getPaymentResultSchema = paymentResultSchema;
export type GetPaymentResult = z.infer<typeof getPaymentResultSchema>;

export const listPaymentsParamsSchema = z
  .object({
    status: z.string().optional(),
    limit: numericLike.optional(),
    after: z.string().optional(),
  })
  .partial();

export type ListPaymentsParams = z.infer<typeof listPaymentsParamsSchema>;

export const listPaymentsResultSchema = z
  .object({
    payments: z.array(paymentResultSchema),
    last_cursor: z.string().nullable().optional(),
  })
  .passthrough();

export type ListPaymentsResult = z.infer<typeof listPaymentsResultSchema>;

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

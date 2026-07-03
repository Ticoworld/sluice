export interface NodeConfig {
  name: string;
  rpcUrl: string;
}

/**
 * Default RPC endpoints match the manually verified Phase 3B setup:
 * node3 is the receiver, node4 is the service/opener node. Either can be
 * overridden with SLUICE_<NAME>_RPC_URL so this never needs local secrets.
 */
const DEFAULT_NODES: Record<string, string> = {
  node3: "http://127.0.0.1:8247",
  node4: "http://127.0.0.1:8257",
};

export function loadNodeConfig(name: string): NodeConfig {
  const envKey = `SLUICE_${name.toUpperCase()}_RPC_URL`;
  const rpcUrl = process.env[envKey] ?? DEFAULT_NODES[name];

  if (!rpcUrl) {
    const known = Object.keys(DEFAULT_NODES).join(", ");
    throw new Error(`Unknown node "${name}". Known nodes: ${known}`);
  }

  return { name, rpcUrl };
}

export function listConfiguredNodes(): NodeConfig[] {
  return Object.keys(DEFAULT_NODES).map((name) => loadNodeConfig(name));
}

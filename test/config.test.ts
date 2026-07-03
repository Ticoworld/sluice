import { afterEach, describe, expect, it } from "vitest";
import { listConfiguredNodes, loadNodeConfig } from "../src/config.js";

const ENV_KEY = "SLUICE_NODE3_RPC_URL";
const NODE5_ENV_KEY = "SLUICE_NODE5_RPC_URL";

describe("config", () => {
  afterEach(() => {
    delete process.env[ENV_KEY];
    delete process.env[NODE5_ENV_KEY];
  });

  it("resolves default RPC urls for known nodes", () => {
    expect(loadNodeConfig("node3")).toEqual({ name: "node3", rpcUrl: "http://127.0.0.1:8247" });
    expect(loadNodeConfig("node4")).toEqual({ name: "node4", rpcUrl: "http://127.0.0.1:8257" });
  });

  it("allows overriding a node's RPC url via env var", () => {
    process.env[ENV_KEY] = "http://127.0.0.1:9999";
    expect(loadNodeConfig("node3")).toEqual({ name: "node3", rpcUrl: "http://127.0.0.1:9999" });
  });

  it("supports env-backed arbitrary node names such as node5", () => {
    process.env[NODE5_ENV_KEY] = "http://127.0.0.1:8267";
    expect(loadNodeConfig("node5")).toEqual({ name: "node5", rpcUrl: "http://127.0.0.1:8267" });
  });

  it("throws for an unknown node name", () => {
    expect(() => loadNodeConfig("node99")).toThrow(/Unknown node/);
  });

  it("lists all configured nodes", () => {
    const nodes = listConfiguredNodes();
    expect(nodes.map((n) => n.name)).toEqual(["node3", "node4"]);
  });
});

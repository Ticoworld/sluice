import { Sluice } from "../../src/sdk/index.js";

const sluice = new Sluice({
  serviceRpcUrl: "http://127.0.0.1:8257",
});

const quote = sluice.quote({
  amountCkb: "1",
});

console.log(JSON.stringify(quote, null, 2));

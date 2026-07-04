# Sluice HTTP API

Sluice exposes a small HTTP service so wallets, merchant backends, hosted demos, and other services can use the SDK without importing the package directly.

The HTTP API wraps the SDK. It does not duplicate coordinator, proof, or quote logic.

## Start

```powershell
npx tsx src/index.ts serve --port 8787
```

Default port: `8787`
Default host: `127.0.0.1`

Hosted or demo deployments should intentionally choose a non-default host and port rather than relying on the localhost bind.

## Endpoints

- `GET /health`
- `POST /v1/quote`
- `POST /v1/readiness`
- `POST /v1/prepare`
- `POST /v1/prove-payment`

## Safety Model

- Dry-run is the default for prepare and prove-payment.
- Live mutation requires `execute: true` and `yes: true`.
- The server rejects `execute=true` when `yes` is not also `true`.
- The HTTP layer only wraps the SDK and never opens channels or sends payments unless explicitly instructed.

## acceptMode

`acceptMode` controls how the channel coordinator behaves:

- `detect` is the default.
- `manual` follows the proven manual-accept path.
- `auto` is exposed for local-behavior-dependent setups, but it is not the recommended default.

## Examples

### Health

```bash
curl.exe http://127.0.0.1:8787/health
```

Response:

```json
{
  "ok": true,
  "service": "sluice",
  "mode": "http"
}
```

### Quote

```bash
curl.exe -X POST http://127.0.0.1:8787/v1/quote ^
  -H "Content-Type: application/json" ^
  -d "{\"amountCkb\":\"1\"}"
```

Response includes the reserve-aware quote:

- target payment
- receiver reserve
- receiver accept funding
- opener funding
- estimated usable liquidity

### Readiness

```bash
curl.exe -X POST http://127.0.0.1:8787/v1/readiness ^
  -H "Content-Type: application/json" ^
  -d "{\"serviceRpcUrl\":\"http://127.0.0.1:8257\",\"receiverRpcUrl\":\"http://127.0.0.1:8287\",\"amountCkb\":\"1\"}"
```

### Prepare

```bash
curl.exe -X POST http://127.0.0.1:8787/v1/prepare ^
  -H "Content-Type: application/json" ^
  -d "{\"serviceRpcUrl\":\"http://127.0.0.1:8257\",\"receiverRpcUrl\":\"http://127.0.0.1:8287\",\"amountCkb\":\"1\",\"acceptMode\":\"detect\"}"
```

To allow live mutation, set both flags:

```bash
curl.exe -X POST http://127.0.0.1:8787/v1/prepare ^
  -H "Content-Type: application/json" ^
  -d "{\"serviceRpcUrl\":\"http://127.0.0.1:8257\",\"receiverRpcUrl\":\"http://127.0.0.1:8287\",\"amountCkb\":\"1\",\"acceptMode\":\"manual\",\"execute\":true,\"yes\":true}"
```

### Prove Payment

```bash
curl.exe -X POST http://127.0.0.1:8787/v1/prove-payment ^
  -H "Content-Type: application/json" ^
  -d "{\"serviceRpcUrl\":\"http://127.0.0.1:8257\",\"receiverRpcUrl\":\"http://127.0.0.1:8287\",\"amountCkb\":\"1\"}"
```

## Error Shape

Readable errors use this envelope:

```json
{
  "ok": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "execute=true requires yes=true"
  }
}
```

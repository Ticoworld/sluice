# Sluice HTTP Curl Examples

Default local server:

```powershell
npx tsx src/index.ts serve --port 8787
```

Default bind is `127.0.0.1`.

## Health

```bash
curl.exe http://127.0.0.1:8787/health
```

## Quote

```bash
curl.exe -X POST http://127.0.0.1:8787/v1/quote ^
  -H "Content-Type: application/json" ^
  --data-raw "{\"amountCkb\":\"1\"}"
```

## Readiness

```bash
curl.exe -X POST http://127.0.0.1:8787/v1/readiness ^
  -H "Content-Type: application/json" ^
  --data-raw "{\"serviceRpcUrl\":\"http://127.0.0.1:8257\",\"receiverRpcUrl\":\"http://127.0.0.1:8287\",\"amountCkb\":\"1\"}"
```

## Prepare, dry-run only

```bash
curl.exe -X POST http://127.0.0.1:8787/v1/prepare ^
  -H "Content-Type: application/json" ^
  --data-raw "{\"serviceRpcUrl\":\"http://127.0.0.1:8257\",\"receiverRpcUrl\":\"http://127.0.0.1:8287\",\"amountCkb\":\"1\",\"acceptMode\":\"detect\"}"
```

## Prepare, live mutation requires explicit confirmation

This returns a 400 error unless both `execute` and `yes` are true.

```bash
curl.exe -X POST http://127.0.0.1:8787/v1/prepare ^
  -H "Content-Type: application/json" ^
  --data-raw "{\"serviceRpcUrl\":\"http://127.0.0.1:8257\",\"receiverRpcUrl\":\"http://127.0.0.1:8287\",\"amountCkb\":\"1\",\"acceptMode\":\"manual\",\"execute\":true}"
```

Expected error:

```json
{
  "ok": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "execute=true requires yes=true"
  }
}
```

## Prove payment, dry-run only

```bash
curl.exe -X POST http://127.0.0.1:8787/v1/prove-payment ^
  -H "Content-Type: application/json" ^
  --data-raw "{\"serviceRpcUrl\":\"http://127.0.0.1:8257\",\"receiverRpcUrl\":\"http://127.0.0.1:8287\",\"amountCkb\":\"1\"}"
```

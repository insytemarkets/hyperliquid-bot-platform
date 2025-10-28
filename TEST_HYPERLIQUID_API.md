# Test Hyperliquid API Response

Go to this URL in your browser or use Postman:

**POST** `https://api.hyperliquid.xyz/info`

**Body (JSON):**
```json
{
  "type": "allMids"
}
```

**Expected Response:**
```json
{
  "BTC": "43250.5",
  "ETH": "2280.3",
  "SOL": "98.5",
  ...
}
```

OR it might be:
```json
{
  "BTC-USD": 43250.5,
  "ETH-USD": 2280.3,
  ...
}
```

OR:
```json
[
  ["BTC", "43250.5"],
  ["ETH", "2280.3"],
  ...
]
```

We need to know the EXACT format to parse it correctly!

---

## Quick Test:

Run this in Supabase SQL Editor to see what the bot-runner is actually receiving:

```sql
-- Check the last error or market data log
SELECT 
    log_type,
    message,
    data,
    created_at
FROM bot_logs
WHERE bot_id = (SELECT id FROM bot_instances WHERE name = 'ob' ORDER BY deployed_at DESC LIMIT 1)
ORDER BY created_at DESC
LIMIT 20;
```

Look for any `market_data` or `error` logs that show what `allPrices` contains.


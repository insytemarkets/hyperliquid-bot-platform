# 🔍 Deploy Debug Version

## What I Changed:

Added a DEBUG log that will show us EXACTLY what Hyperliquid's API is returning.

## Steps:

1. **Copy** `supabase/functions/bot-runner/index-FIXED.ts` (the whole file)

2. **Go to Supabase**:
   https://supabase.com/dashboard/project/oqmaogkrkupqulcregpz/functions/bot-runner

3. **Click "Edit Function"**

4. **Paste** the new code

5. **Click "Deploy"**

6. **Wait 5-10 seconds**

7. **Go to My Bots** → Click "View Logs"

8. **Look for this log:**
   ```
   🔍 DEBUG: Fetched prices from Hyperliquid
   ```

9. **Expand it** and look at the `data` field

10. **Tell me what you see!**

It will show:
- `priceCount`: How many prices were fetched
- `samplePrices`: First 5 price entries
- `allKeys`: All the coin names Hyperliquid returned

This will tell us:
- ✅ If Hyperliquid API is working
- ✅ What format the data is in
- ✅ What the actual coin names are (BTC vs BTC-USD vs @BTC, etc.)

Then I can fix the code to match the actual format!


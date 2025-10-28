# 🚀 QUICK START - 20 Minutes to Live Trading Bot

## **TL;DR:**
1. Push to GitHub (2 min)
2. Deploy to Render (5 min)
3. Enable Supabase Realtime (1 min)
4. Watch it work! (2 min)

---

## **Step 1: Push to GitHub** (2 minutes)

```bash
cd C:\Users\avery\OneDrive\Desktop\Hyper
git init
git add .
git commit -m "Python bot engine + Supabase Realtime"

# Create repo on GitHub.com first, then:
git remote add origin https://github.com/YOUR_USERNAME/hyper-bot-platform.git
git push -u origin main
```

---

## **Step 2: Deploy to Render** (5 minutes)

1. Go to: https://render.com/ → Sign up with GitHub
2. Click: **"New +" → "Background Worker"**
3. Select your `hyper-bot-platform` repo
4. **Root Directory:** `python`
5. **Build Command:** `pip install -r requirements.txt`
6. **Start Command:** `python bot_engine.py`
7. **Plan:** Starter ($7/month)
8. **Environment Variables:**
   ```
   SUPABASE_URL=https://lwtfkkgbuycpmaxvvjgl.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<get from Supabase>
   ```
9. Click: **"Create Background Worker"**

**Get Service Role Key:**
- Supabase Dashboard → Settings → API → Copy "service_role" key

---

## **Step 3: Enable Supabase Realtime** (1 minute)

1. Supabase Dashboard → **Database** → **Replication**
2. Find `bot_logs` table
3. Toggle **"Enable Realtime"** → **ON**
4. Save

---

## **Step 4: Verify It Works!** (2 minutes)

### **Check Render:**
- Go to Render Dashboard → Your service → Logs
- Should see: `🚀 Bot Engine Starting...` and `✅ Loaded bot:`

### **Check Supabase:**
```sql
SELECT * FROM bot_logs ORDER BY created_at DESC LIMIT 10;
```
- Should see fresh logs from last few seconds

### **Check Frontend:**
1. Open your deployed app
2. Go to **"My Bots"**
3. Click **"View Logs"** on a running bot
4. See **"LIVE"** indicator (green pulsing dot)
5. Watch logs appear instantly!

---

## **🎉 SUCCESS!**

If you see:
- ✅ Render logs showing bot activity
- ✅ Supabase logs table updating
- ✅ Frontend "LIVE" indicator

**Your bot is now trading 24/7 on Render!** 🔥

---

## **Troubleshooting:**

**No trades?**
- Check bot status is "running" in Supabase
- Verify strategy pairs are correct (BTC, ETH, SOL)
- Look at Render logs for errors

**No "LIVE" indicator?**
- Enable Realtime in Supabase (Step 3)
- Refresh frontend page
- Check browser console for errors

**Bot not starting?**
- Verify environment variables in Render
- Check Render logs for Python errors
- Ensure `requirements.txt` installed correctly

---

## **Cost:**
- **Render:** $7/month (always-on, no timeout)
- **Supabase:** FREE
- **Vercel:** FREE
- **Total:** $7/month

---

## **Next Steps:**

1. ✅ Watch strategies in action
2. ✅ Monitor P&L in real-time
3. ✅ Tune strategy parameters
4. ✅ Add more strategies
5. ✅ Enable live trading (when ready)

**Full guide:** See `COMPLETE_DEPLOYMENT_GUIDE.md`

**You're done!** 🚀


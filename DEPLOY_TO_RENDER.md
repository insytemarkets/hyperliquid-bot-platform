# 🚀 Deploy Python Bot Engine to Render

## **Quick Start (5 Minutes)**

### **Step 1: Push to GitHub**

```bash
# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Add Python bot engine with Render deployment"

# Create GitHub repo and push
# (Do this through GitHub.com or GitHub Desktop)
git remote add origin https://github.com/YOUR_USERNAME/hyper-bot-engine.git
git push -u origin main
```

---

### **Step 2: Create Render Service**

1. **Go to Render:** https://render.com/
2. **Sign up/Login** with GitHub
3. **Click "New +" → "Background Worker"**
4. **Connect Repository:**
   - Select your GitHub repo
   - **Root Directory:** Leave empty (or set to `python` if repo has multiple projects)
5. **Configure Service:**
   - **Name:** `hyperliquid-bot-engine`
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python bot_engine.py`
   - **Plan:** Select **Starter ($7/month)**

---

### **Step 3: Set Environment Variables**

In the Render dashboard, add these environment variables:

```
SUPABASE_URL=https://lwtfkkgbuycpmaxvvjgl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
PYTHON_VERSION=3.11
```

**Where to find Supabase Service Role Key:**
1. Go to Supabase Dashboard
2. Settings → API
3. Copy "service_role" key (starts with `eyJ...`)

---

### **Step 4: Deploy!**

1. Click **"Create Background Worker"**
2. Render will:
   - Clone your repo
   - Install dependencies
   - Start `bot_engine.py`
3. **View logs** in real-time to see bot activity

---

## **Verify It's Working**

### **1. Check Render Logs**
Look for:
```
🚀 Bot Engine Starting...
🔥 Bot Engine: Initializing...
✅ Loaded bot: ob (bot_xyz123)
📊 Market Snapshot: 3 pairs tracked
```

### **2. Check Supabase Logs**
Run this in Supabase SQL Editor:
```sql
SELECT 
    log_type,
    message,
    created_at
FROM bot_logs
ORDER BY created_at DESC
LIMIT 10;
```

You should see fresh logs every second!

### **3. Check Frontend**
1. Go to your deployed frontend
2. Open "My Bots"
3. Click "View Logs" on a running bot
4. You should see **"LIVE"** indicator and logs streaming in real-time!

---

## **Troubleshooting**

### **Bot not starting?**
- Check Render logs for errors
- Verify environment variables are set correctly
- Make sure `requirements.txt` is in the correct directory

### **No logs appearing?**
- Verify bot status is "running" in Supabase
- Check Supabase RLS policies allow inserts
- Ensure Python bot has correct Supabase credentials

### **Connection errors?**
- Verify Supabase URL and Service Role Key
- Check Supabase project is not paused
- Ensure Realtime is enabled in Supabase

---

## **Cost Breakdown**

- **Render Starter:** $7/month (512MB RAM, 0.5 CPU, always-on)
- **Supabase Free Tier:** $0/month (500MB database, 2GB bandwidth)
- **Vercel Free Tier:** $0/month (frontend hosting)

**Total: $7/month** 🔥

---

## **Next Steps**

1. ✅ Deploy Python bot to Render
2. ✅ Verify logs are streaming in real-time
3. ✅ Test strategies with real data
4. ✅ Enable live trading (set `mode: 'live'` in strategy)
5. ✅ Monitor performance and P&L

---

## **Updating the Bot**

1. Make changes to `python/bot_engine.py`
2. Commit and push to GitHub
3. Render auto-deploys the new version
4. Check logs to verify update

**No downtime, no manual deployment!** 🚀


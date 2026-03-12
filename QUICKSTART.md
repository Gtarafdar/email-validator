# 🚀 Quick Start Guide

## Choose Your Deployment:

### 🌟 **Production (Recommended)** - Hetzner VPS

**ZeroBounce-level accuracy | €2.99/month | Clean IPs**

👉 **[Jump to Hetzner Deployment](#hetzner-deployment-399month)**

---

### 💻 **Local Testing** - Your Computer

**Free | For development only | Works with adjusted scoring**

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start

# 3. Open browser
# Go to: http://localhost:8787
```

**That's it!** 🎉

**Note:** Local testing has ~80-85% accuracy (SMTP may be blocked). For production use, deploy to Hetzner.

---

## Hetzner Deployment (€2.99/month)

### Why Hetzner?

- ✅ **Clean datacenter IPs** (NOT blacklisted like Render/Railway)
- ✅ **95% accuracy** (matches ZeroBounce/Clearout)
- ✅ **€2.99/month** (vs $16+/month for email API services)
- ✅ **10x cheaper** than commercial validators

### 3-Step Deployment (8 minutes total)

#### Step 1: Order Hetzner VPS (5 minutes)

1. Go to: https://www.hetzner.com/cloud
2. Click **"Sign Up"** (or login)
3. Click **"Add Project"** → Name: "Email Validator"
4. Click **"Add Server"**
5. Choose:
   - **Location:** Germany (Falkenstein or Nuremberg)
   - **Image:** Ubuntu 22.04
   - **Type:** CX23 (€2.99/month) ✅
   - **SSH Key:** Add your SSH key
   - **Name:** email-validator
6. Click **"Create & Buy Now"**
7. **Copy the IP address** (e.g., 157.90.123.45)

#### Step 2: Deploy with One Command (2 minutes)

SSH into your server:

```bash
ssh root@YOUR_SERVER_IP
```

Run the automated deployment:

```bash
curl -fsSL https://raw.githubusercontent.com/Gtarafdar/email-validator/main/deploy-hetzner.sh | bash
```

**The script automatically:**

- ✅ Installs Node.js 20.x
- ✅ Configures firewall + security
- ✅ Clones repository
- ✅ Generates API key
- ✅ Starts with PM2 (24/7 uptime)
- ✅ Configures Nginx

**Save the API key** shown at the end!

#### Step 3: Test It Works (1 minute)

Open browser:

```
http://YOUR_SERVER_IP
```

1. Go to **Settings** tab
2. Enter the **API key** (from deployment)
3. Test: `riyad@bonfiremedia.co.za`

**Expected:**

- ✅ Status: **Invalid** ❌ (not "likely_deliverable")
- ✅ SMTP: **Mailbox not found** (not "inconclusive")
- ✅ Score: ~55 (not 85)

**If you see this, you're done!** 🎉

### Management Commands

```bash
# View logs
ssh root@YOUR_SERVER_IP
pm2 logs email-validator

# Restart
pm2 restart email-validator

# Update code
cd /home/validator/email-validator
git pull origin main
pm2 restart email-validator
```

### Optional: Add Custom Domain + SSL

Want `https://validator.yourdomain.com`?

1. **Point domain to Hetzner IP:**
   - Go to your domain registrar
   - Add A record: `validator` → `YOUR_HETZNER_IP`

2. **Install SSL certificate (FREE):**
   ```bash
   ssh root@YOUR_SERVER_IP
   certbot --nginx -d validator.yourdomain.com
   ```

Done! Access: `https://validator.yourdomain.com` 🔒

### Cost: €2.99/month

| Service      | Monthly Cost   |
| ------------ | -------------- |
| Hetzner CX23 | €2.99 (~$3.25) |
| ZeroBounce   | $16-$80 ❌     |
| Clearout     | $15+ ❌        |

**You save 80-95%!** 💰

**Full deployment guide:** [HETZNER_DEPLOYMENT.md](HETZNER_DEPLOYMENT.md)

---

## What You Can Do Now

### ✅ Validate Single Email

1. Click "Single Email" tab
2. Enter: `test@gmail.com`
3. Click "Validate Email"
4. See full analysis

### ✅ Bulk Validation

1. Click "Bulk Validation" tab
2. Paste emails (one per line):
   ```
   user1@gmail.com
   user2@outlook.com
   bad@invalid-domain.xyz
   ```
3. Click "Validate All Emails"
4. View results table

### ✅ Parse Bounce Messages

1. Click "Bounce Parser" tab
2. Paste:
   ```
   5.1.1 The email account that you tried to reach does not exist
   ```
3. Click "Parse Bounce Message"
4. See categorization

### ✅ CSV Upload

1. Click "CSV Upload" tab
2. Create CSV file:
   ```csv
   email,name
   john@example.com,John Doe
   jane@company.com,Jane Smith
   ```
3. Upload file
4. Export results

---

## Privacy Features 🔒

- ✅ All emails stored **only in your browser**
- ✅ Server **never sees email addresses** (only domains)
- ✅ No tracking, no logging, no database
- ✅ Works offline after first load

---

## Test It Out

### Valid Email

```
test@gmail.com
```

**Expected:** High score (80-85), "Likely Deliverable" recommendation (DNS checks passed)

### Invalid Email

```
invalid@
```

**Expected:** Syntax error, score 0

### Disposable Email

```
test@mailinator.com
```

**Expected:** Flagged as disposable, low score

### Typo Email

```
user@gmial.com
```

**Expected:** Suggests `gmail.com`

---

## Export Results

After validation:

1. Click "Export All" for complete results
2. Click "Export Clean Only" for send-ready emails
3. CSV file downloads automatically

---

## Suppression List

Mark emails to never send to:

1. Click "Settings" tab
2. Click "View Suppression List"
3. Add/remove emails
4. Stored locally in your browser

---

## Need Help?

- 📖 Full docs: See [README.md](README.md)
- 🚀 Deploy guide: See [DEPLOY.md](DEPLOY.md)
- 🔧 Issues: Check error console in browser (F12)

---

## Server Not Starting?

**Port 8787 already in use?**

Create `.env` file:

```env
PORT=8888
```

Then restart:

```bash
npm start
```

**Permission error?**

```bash
sudo chown -R $(whoami) ~/.npm
```

---

## What's Next?

1. ✅ Test with your email list
2. ✅ Export clean emails
3. ✅ Deploy to cloud (see DEPLOY.md)
4. ✅ Share with your team

---

**Enjoy validating! 📧**

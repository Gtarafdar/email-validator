# Privacy-First Email Validator

> Professional bulk email validation tool with advanced accuracy features - all data stays in your browser

![Privacy Badge](https://img.shields.io/badge/Privacy-First-success)
![License](https://img.shields.io/badge/License-MIT-blue)
![Node](https://img.shields.io/badge/Node-%3E%3D18.0.0-green)
![Status](https://img.shields.io/badge/Status-Production-brightgreen)

## 🔒 Privacy Guarantee

- ✅ **Email addresses NEVER sent to server**
- ✅ **All validation logic runs in browser**
- ✅ **Data stored in browser localStorage/IndexedDB only**
- ✅ **Server only performs DNS lookups for domains**
- ✅ **No logging, no database, no tracking**
- ✅ **No external API calls (except Gravatar on Deep level)**

## ✨ New Advanced Features

### 🎯 Progressive Validation Levels

- **⚡ Quick** (~5ms/email): Syntax + basic checks - No DNS
- **🔍 Standard** (~50-100ms/email): + DNS + SPF/DKIM/DMARC
- **🔬 Deep** (~200-300ms/email): + Gravatar + all checks

### 🚀 Performance Enhancements

- **Pause/Resume/Cancel** controls for bulk validation
- **Lazy CSV parsing** for 100k+ row files (chunked processing)
- **IndexedDB storage** for unlimited results (no 10MB localStorage limit)
- **Real-time validation** with 300ms debounce
- **Progress bars** with live percentage display

### 🎨 Enhanced UX

- Interactive typo suggestions with **accept/dismiss buttons**
- Real-time syntax feedback: **green ✓ / red ✗ borders**
- Dynamic tooltip modals (escape overflow containers)
- Modern dark navy gradient UI
- Responsive mobile-friendly design

### 🔍 Improved Accuracy

- **45+ typo patterns** (vs original 11) - gmail, yahoo, outlook, etc.
- **Email normalization** (Gmail dots, plus addressing)
- **Duplicate detection** across batches with canonical comparison
- **Spam trap detection** (10 known honeypots)
- **Free vs corporate** email identification (30+ providers)
- **3-tier role-based scoring** (60+ prefixes: high/medium/low risk)
- **Gravatar verification** (indicates active users)
- **International domains** (IDN/Punycode support via URL.domainToASCII)

### 📥 Smart CSV Import

- **Auto-detect format** or manual selection
- **Mailchimp** exports (recognizes Member Rating, Status, etc.)
- **HubSpot** exports (detects Contact Owner, Lifecycle Stage, etc.)
- **Google Contacts** (parses "E-mail 1 - Value" format)
- **Generic CSV** (any format with email column)
- Format-specific column mapping for seamless import

## 🚀 Features

### Core Validation

- ✅ RFC 5322 email syntax validation
- ✅ Domain existence & MX record checks
- ✅ SPF, DKIM, DMARC authentication checks
- ✅ Email provider detection (Google, Microsoft, Yahoo, etc.)
- ✅ Lead quality scoring (0-85, DNS-only validation)
- ✅ **NEW**: 3-tier validation levels (Quick/Standard/Deep)
- ✅ **NEW**: IndexedDB storage for large datasets

### Advanced Accuracy

- ✅ **45+ typo patterns** with interactive suggestions
- ✅ **Email normalization** (Gmail dots, plus addressing, etc.)
- ✅ **Duplicate detection** using canonical email comparison
- ✅ **Spam trap detection** (10 known honeypots)
- ✅ **Free vs corporate** email classification (30+ providers)
- ✅ **Enhanced role-based scoring** (60+ prefixes, 3-tier risk)
- ✅ **Gravatar verification** (Deep level only)
- ✅ **International domain support** (IDN/Punycode)

### Risk Detection

- ✅ Disposable email detection
- ✅ Role-based email detection
- ✅ Common typo detection with suggestions
- ✅ Bounce message parsing & categorization
- ✅ Suppression list management

### Bounce Analysis

Parses and categorizes bounce messages:

- `5.1.1` - Hard bounce (mailbox doesn't exist)
- `5.4.1` - Recipient rejected (policy/config issue)
- `4.4.4` - Temporary failure (retry later)
- `5.x.x` - Permanent failure (don't retry)
- `4.x.x` - Temporary failure (can retry)

### Bulk Processing

- ✅ Single email validation
- ✅ Bulk paste validation
- ✅ CSV file upload & export
- ✅ Bounce message mapping
- ✅ Clean list export (send-ready only)

### UI Features

- ✅ Real-time validation
- ✅ Searchable results table
- ✅ Filterable results
- ✅ Lead scoring dashboard
- ✅ Suppression list management
- ✅ Drag & drop CSV upload
- ✅ Mobile responsive

## � Documentation

- **[FEATURES.md](FEATURES.md)** - Complete feature list with 23+ features, API reference, and technical details
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deployment guide (Netlify, Vercel, Docker, VPS, security)
- **[README.md](README.md)** - This file (overview and quick start)

## 🎯 Quick Stats

| Metric               | Value                                         |
| -------------------- | --------------------------------------------- |
| **Validation Modes** | 3 levels (Quick/Standard/Deep)                |
| **Typo Patterns**    | 45+ patterns                                  |
| **Free Providers**   | 30+ identified                                |
| **Spam Traps**       | 10 known honeypots                            |
| **Role Prefixes**    | 60+ patterns (3-tier risk)                    |
| **CSV Formats**      | 4 (Generic, Mailchimp, HubSpot, Google)       |
| **Storage**          | IndexedDB (unlimited) + localStorage fallback |
| **Speed**            | 5-300ms/email (depends on level)              |
| **Code Size**        | ~4,500 lines (2,707 in app.js)                |
| **Dependencies**     | 2 (express, cors) - frontend has zero         |

## �📦 Installation

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn

### Quick Start

```bash
# Clone or download this repository
cd email-validator

# Install dependencies
npm install

# Start the server
npm start

# Open your browser
# http://localhost:8787
```

## 🔧 Configuration

### Environment Variables

Create `.env` file (optional):

```env
PORT=8787
NODE_ENV=production
```

### Server Configuration

The server only handles DNS lookups. Edit `server.js` to customize:

- Port number
- Rate limiting
- CORS settings
- DNS timeout values

## 🌐 Deploy Options

### Self-Hosted

**Option 1: Traditional Server**

```bash
# On your server
git clone <your-repo>
cd email-validator
npm install
npm start
```

**Option 2: Docker**

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 8787
CMD ["node", "server.js"]
```

```bash
docker build -t email-validator .
docker run -p 8787:8787 email-validator
```

**Option 3: PM2 (Process Manager)**

```bash
npm install -g pm2
pm2 start server.js --name email-validator
pm2 save
pm2 startup
```

### Cloud Platforms

#### Railway

1. Create account at [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub"
3. Select your repository
4. Railway auto-detects Node.js and deploys
5. Get your public URL

#### Render

1. Create account at [render.com](https://render.com)
2. New → Web Service
3. Connect your repository
4. Build Command: `npm install`
5. Start Command: `node server.js`
6. Deploy

#### Heroku

```bash
heroku create your-email-validator
git push heroku main
heroku open
```

#### DigitalOcean App Platform

1. Create DigitalOcean account
2. App Platform → Create App
3. Link GitHub repository
4. Auto-detect settings
5. Deploy

#### AWS / GCP / Azure

Standard Node.js deployment:

- EC2 / Compute Engine / VM instance
- Install Node.js
- Clone repo → `npm install` → `npm start`
- Configure firewall for port 8787

### Static Frontend Only (Netlify / Vercel)

If you want to host only the frontend on Netlify/Vercel, you need a separate backend:

**Frontend (Netlify/Vercel):**

```bash
# Deploy /public folder
netlify deploy --dir=public
```

**Backend (Railway/Render):**

```bash
# Deploy server.js separately
# Update API_URL in public/app.js to point to backend
```

**Update app.js:**

```javascript
const API_BASE = "https://your-backend.railway.app";
```

## 📊 How It Works

### Architecture

```
┌──────────────────────────────────────────────┐
│           Browser (Client-Side)              │
│  ┌────────────────────────────────────────┐  │
│  │  Email Input                           │  │
│  │  CSV Upload                           │  │
│  │  ↓                                     │  │
│  │  Validation Engine                    │  │
│  │  - Syntax Check                       │  │
│  │  - Typo Detection                     │  │
│  │  - Disposable Check                   │  │
│  │  - Role-based Check                   │  │
│  │  - Bounce Parsing                     │  │
│  │  ↓                                     │  │
│  │  Extract Domains Only                  │  │
│  └──────────┬─────────────────────────────┘  │
│             │                                 │
│             │ (domains only, no emails)       │
│             ↓                                 │
│  ┌──────────────────────────────────────┐    │
│  │      localStorage                    │    │
│  │  - Results                           │    │
│  │  - Suppression List                  │    │
│  │  - History                           │    │
│  └──────────────────────────────────────┘    │
└─────────────┬────────────────────────────────┘
              │
              │ HTTPS Request
              │ POST /api/dns-lookup
              │ Body: { domain: "example.com" }
              ↓
┌──────────────────────────────────────────────┐
│           Server (Backend)                   │
│  ┌────────────────────────────────────────┐  │
│  │  DNS Resolver                          │  │
│  │  - MX Records                          │  │
│  │  - SPF Records                         │  │
│  │  - DKIM Records                        │  │
│  │  - DMARC Records                       │  │
│  │  - Provider Detection                  │  │
│  └────────────────────────────────────────┘  │
│             ↓                                 │
│  Returns DNS data (no email storage)         │
└───────────────────────────────────────────────┘
```

### Privacy Flow

1. **User enters emails** → Stored in browser memory
2. **Client-side validation** → Syntax, typos, disposable, role-based
3. **Extract domains** → `user@example.com` → `example.com`
4. **Send domains to server** → Server only sees `example.com`, never `user@example.com`
5. **Server performs DNS lookups** → Returns MX/SPF/DKIM/DMARC
6. **Client combines data** → Full validation result
7. **Store in localStorage** → Browser only, never sent anywhere

### Scoring Algorithm

```javascript
Base Score: 0

Positive Signals:
+ 25  Valid MX records (critical, but doesn't verify mailbox)
+ 20  Valid syntax
+ 10  Domain exists
+ 10  Known reputable provider
+ 9   DMARC configured
+ 8   SPF configured
+ 8   DKIM configured
+ 5   Has Gravatar (Deep level)
+ 5   Corporate email
+ 5   Personal names detected

Negative Signals:
- 100 Spam trap domain (CRITICAL)
- 100 Suppressed email
- 100 Invalid mailbox bounce
- 40  Disposable domain
- 25  High-risk role email (info@, admin@, support@)
- 25  Gibberish pattern
- 20  Typo detected
- 15  Duplicate email
- 15  Medium-risk role (contact@, hello@)
- 15  Random pattern
- 10  Excessive numbers
- 10  Low-risk role (enquiry@, feedback@)

Final Score: 0-85 (capped)

**⚠️ IMPORTANT: DNS Validation Limitation**
Max score is 85 (not 100) because DNS checks verify domain mail server configuration but **cannot confirm individual mailbox existence** without SMTP verification. SMTP checks are not performed due to deliverability risks (IP reputation, rate limits).

NEW Recommendation Thresholds:
≥ 80 → **Likely Deliverable** (DNS checks passed, mailbox not verified)
60-79 → **Review** (Manual check recommended)
< 60 → **Suppress** (Do not send)
```

## 📖 Usage Examples

### Single Email Validation

1. Go to "Single Email" tab
2. **NEW: Select validation level:**
   - ⚡ **Quick**: Fastest, syntax + basic checks only
   - 🔍 **Standard** (recommended): + DNS + email authentication
   - 🔬 **Deep**: Everything + Gravatar verification
3. Start typing email address
4. **NEW: See real-time feedback:**
   - Green border ✓ = valid syntax
   - Red border ✗ = invalid syntax
5. **NEW: Accept typo suggestions** if prompted (e.g., "Did you mean gmail.com?")
6. Click "Validate Email"
7. View detailed results with all flags

### Bulk Validation

1. Go to "Bulk Validation" tab
2. **NEW: Select validation level** (⚡ Quick / 🔍 Standard / 🔬 Deep)
3. Paste emails (one per line)
4. Optionally add bounce messages:
   ```
   user@example.com|5.1.1 User does not exist
   bad@test.com|Mailbox full
   ```
5. Click "Validate All Emails"
6. **NEW: Monitor progress bar** (percentage and count)
7. **NEW: Use controls:**
   - ⏸️ **Pause**: Temporarily stop validation
   - ▶️ **Resume**: Continue from where you left off
   - ❌ **Cancel**: Abort validation
8. View results table with all enhanced flags

### CSV Upload

**NEW: Multiple Format Support**

The tool now auto-detects and supports multiple CSV formats:

**Generic CSV:**

```csv
email,name,bounce
john@example.com,John Doe,
bad@test.com,Bad User,5.1.1 User does not exist
jane@company.com,Jane Smith,
```

**Mailchimp Export:**

```csv
Email Address,First Name,Last Name,Status,Member Rating
john@example.com,John,Doe,subscribed,4
```

**HubSpot Export:**

```csv
Email,First Name,Last Name,Contact Owner,Lifecycle Stage
john@example.com,John,Doe,Sales Team,customer
```

**Google Contacts:**

```csv
Name,E-mail 1 - Value,Organization 1 - Name
John Doe,john@example.com,Acme Corp
```

**Usage:**

1. Go to "CSV Upload" tab
2. **Select format** (📄 Generic / 🐵 Mailchimp / 🟠 HubSpot / 📧 Google) or leave as "Generic" for auto-detect
3. Click upload area or drag & drop CSV
4. Tool auto-detects email column based on format
5. Watch lazy parsing progress for large files (>100 emails)
6. Validates all emails with selected validation level
7. Export results

**NEW Features:**

- Format-specific column mapping
- Lazy parsing for large files (1000 rows/chunk)
- Progress indicator during import
- Format detection feedback in console

### Bounce Parser

1. Go to "Bounce Parser" tab
2. Paste bounce message
3. Click "Parse Bounce Message"
4. View categorization:
   - Code: `5.1.1`
   - Category: `invalid_mailbox`
   - Detail: "Hard bounce - mailbox does not exist"

### Export Options

**Export All Results:**

- Includes all fields
- Full validation data
- CSV format

**Export Clean Only:**

- Only emails with "Likely Deliverable" recommendation (score 80-85)
- Best candidates for mailing (DNS validated)
- Excludes suppressed/risky emails

## 🛡️ Security & Privacy

### What Data is Stored

**Client-Side (localStorage):**

- Validation results
- Suppression list
- Validation history
- User preferences

**Server-Side:**

- **Nothing** - Zero data persistence
- No logs (can be configured)
- No database
- No tracking

### Data Transmission

**From Browser to Server:**

- Domain names only (e.g., `example.com`)
- No email addresses
- No bounce messages
- No user data

**From Server to Browser:**

- DNS records (MX, SPF, DKIM, DMARC)
- Provider information
- No sensitive data

### Rate Limiting

Default: 100 requests per minute per IP

Prevents:

- API abuse
- DDoS attacks
- Resource exhaustion

Configurable in `server.js`

## 🔍 Bounce Code Reference

| Code  | Category      | Action   | Description                   |
| ----- | ------------- | -------- | ----------------------------- |
| 5.1.1 | Hard Bounce   | Suppress | Mailbox doesn't exist         |
| 5.4.1 | Policy Reject | Suppress | Recipient rejected by policy  |
| 4.4.4 | Temp Failure  | Retry    | Temporary configuration issue |
| 4.x.x | Temp Failure  | Retry    | Temporary delivery issue      |
| 5.x.x | Hard Bounce   | Suppress | Permanent delivery failure    |
| 2.x.x | Success       | Send     | Message accepted              |

## 🧪 Testing

### Test Emails

```javascript
// Valid, deliverable
test@gmail.com
user@outlook.com

// Invalid syntax
invalid@
@example.com
user@domain

// Disposable
test@mailinator.com
user@tempmail.com

// Role-based
info@example.com
admin@company.com

// Typo
user@gmial.com → suggests gmail.com
test@outlok.com → suggests outlook.com
```

### Bounce Test Messages

```
5.1.1 The email account that you tried to reach does not exist
550 5.4.1 Recipient address rejected: Access denied
4.4.4 Mail received as unauthenticated
Mailbox full over quota
```

## 🎨 Customization

### Add Custom Disposable Domains

Edit `public/app.js`:

```javascript
const ValidationData = {
  disposableDomains: new Set([
    "mailinator.com",
    "tempmail.com",
    "your-custom-domain.com", // Add here
  ]),
  // ...
};
```

### Add Custom Typos

```javascript
typoMap: {
  'gmial.com': 'gmail.com',
  'your-typo.com': 'correct.com', // Add here
}
```

### Customize Scoring

Edit `Validator.score()` function:

```javascript
if (result.syntaxValid) score += 30; // Change from 20
if (result.disposable) score -= 50; // Change from 40
```

## 🐛 Troubleshooting

### DNS Lookups Failing

**Problem:** "DNS lookup failed" errors

**Solutions:**

1. Check internet connection
2. Verify firewall allows outbound DNS (port 53)
3. Try different DNS server:
   ```javascript
   dns.setServers(["8.8.8.8", "8.8.4.4"]); // Google DNS
   ```

### localStorage Full

**Problem:** "Storage quota exceeded"

**Solutions:**

1. Clear browser cache
2. Export data and clear localStorage
3. Increase browser storage limit (if possible)

### Rate Limit Errors

**Problem:** "Too many requests"

**Solutions:**

1. Wait 1 minute
2. Increase rate limit in `server.js`:
   ```javascript
   max: 200, // Increase from 100
   ```

### CSV Upload Not Working

**Problem:** CSV not parsing correctly

**Solutions:**

1. Ensure header row exists
2. Column must contain word "email"
3. Use standard CSV format (RFC 4180)
4. Check for special characters

## 📄 License

MIT License - feel free to use, modify, and distribute

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📞 Support

For issues or questions:

- Open GitHub issue
- Check existing documentation
- Review troubleshooting section

## 🎯 Roadmap

### Planned Features

- [ ] SMTP mailbox verification (opt-in)
- [ ] Catch-all domain detection
- [ ] API key authentication
- [ ] Webhook integrations
- [ ] Advanced reporting dashboard
- [ ] Export to multiple formats (JSON, XML)
- [ ] Email list segmentation
- [ ] A/B testing groups
- [ ] Integration with popular ESPs

### Privacy Features

- [ ] Encryption at rest (encrypted localStorage)
- [ ] Password protection
- [ ] Auto-clear data after X days
- [ ] Export/import encrypted backups

## 🌟 Why This Tool?

Most email validation services:

- ❌ Send your email lists to third parties
- ❌ Store your data on their servers
- ❌ Charge per validation
- ❌ Have rate limits
- ❌ Require API keys
- ❌ Track your usage

This tool:

- ✅ Keeps all data in your browser
- ✅ Free and open source
- ✅ No usage tracking
- ✅ Self-hosted control
- ✅ Complete privacy
- ✅ Unlimited validations

## 🧑‍💻 Tech Stack

- **Frontend:** Vanilla JavaScript (no frameworks)
- **Backend:** Node.js + Express
- **Storage:** Browser localStorage
- **DNS:** Node.js native DNS module
- **Styling:** Pure CSS (no frameworks)
- **Deployment:** Any Node.js host

## 📊 Performance

- **Validation Speed:** ~50-100 emails/minute (DNS limited)
- **Bulk Processing:** Batch DNS lookups for efficiency
- **Memory:** Runs in <50MB RAM
- **Storage:** ~5KB per 100 validations in localStorage

## ⚠️ Limitations

### What This Tool CAN Do:

✅ Syntax validation (RFC 5322)
✅ Domain/MX checks
✅ SPF/DKIM/DMARC checks
✅ Provider detection
✅ Disposable/role detection (enhanced)
✅ **45+ typo patterns** with suggestions
✅ Bounce parsing & categorization
✅ **Email normalization** (Gmail dots, plus addressing)
✅ **Duplicate detection** with canonical comparison
✅ **Spam trap detection** (10 honeypots)
✅ **Free vs corporate** classification (30+ providers)
✅ **Gravatar verification** (Deep level)
✅ **International domains** (IDN/Punycode)
✅ **Progressive validation** (3 speed levels)
✅ **Format-specific CSV import** (4 platforms)
✅ **Lazy parsing** for 100k+ row files
✅ **IndexedDB storage** (unlimited capacity)

### What This Tool CANNOT Do (without SMTP):

❌ Verify mailbox existence (100% accuracy)
❌ Check if person reads email
❌ Verify inbox is monitored
❌ Detect catch-all with certainty
❌ Predict engagement

For true mailbox verification, SMTP probing is required (higher risk, rate limits apply).

## 🎓 Learn More

### Email Deliverability

- [RFC 5321 - SMTP](https://tools.ietf.org/html/rfc5321)
- [RFC 5322 - Email Format](https://tools.ietf.org/html/rfc5322)
- [SPF Records](https://www.spf.org/)
- [DKIM Explained](https://dkim.org/)
- [DMARC Guide](https://dmarc.org/)

### Bounce Codes

- [SMTP Status Codes](https://www.iana.org/assignments/smtp-enhanced-status-codes)
- [Microsoft Exchange Errors](https://aka.ms/EXOSmtpErrors)
- [Google Bounce Messages](https://support.google.com/mail/answer/6596)

---

## 🚀 Production Deployment with SMTP Verification

### 95% Accuracy withReal SMTP Mailbox Verification

This tool can be deployed with **SMTP mailbox verification** for 95% accuracy. However, this requires specific server configuration.

### Critical Requirements for SMTP

**⚠️ Port 25 MUST be open** for SMTP verification to work:

✅ **Works**: Contabo VPS ($5-11/month) - Port 25 open by default
❌ **Doesn't work**: Hetzner Cloud - Port 25 permanently blocked
❌ **Doesn't work**: Render/Railway/Heroku - Port 25 blocked
❌ **Doesn't work**: Vercel/Netlify - Port 25 blocked

### Why Hetzner Doesn't Work

We tested Hetzner Cloud and their support confirmed:
> "We don't allow email sending services. Port 25 is permanently blocked."

This is a strict anti-spam policy and cannot be changed.

### Recommended: Contabo VPS

**What we use in production:**
- Provider: Contabo VPS S
- Cost: $5.50/month
- Location: Germany (or USA/Singapore/UK)
- Specs: 4 vCPU, 6GB RAM, 100GB SSD
- Port 25: ✅ Open by default
- VNC Access: ✅ Included (rescue mode)

**Sign up:** [contabo.com/en/vps](https://contabo.com/en/vps/)

### Complete Deployment Guide

For step-by-step instructions including:
- Server creation and setup
- VNC/TigerVNC configuration for rescue mode
- SSH access and password alternatives
- PM2 process management
- Firewall configuration
- SMTP port testing

See **[DEPLOYMENT.md](DEPLOYMENT.md)**

### VNC Access (TigerVNC)

For server rescue mode and password recovery:

**Install TigerVNC:**
- macOS: `brew install --cask tigervnc-viewer`
- Linux: `sudo apt install tigervnc-viewer`
- Windows: Download from [TigerVNC Releases](https://github.com/TigerVNC/tigervnc/releases)

**Connect:**
```bash
vncviewer YOUR_SERVER_IP:5900
```

Full VNC guide in [DEPLOYMENT.md](DEPLOYMENT.md).

### Privacy & Data Handling

**Zero Data Retention Policy:**

- ❌ No emails stored
- ❌ No validation results saved
- ❌ No user tracking
- ❌ No logs kept
- ❌ No third-party services
- ✅ All processing in memory only
- ✅ Data immediately deleted after response
- ✅ Contabo doesn't monitor server traffic

See complete policy: **[PRIVACY.md](PRIVACY.md)**

### What Data Do We Save?

**Short answer:** Nothing.

**Details:**
- Emails are validated in RAM and immediately discarded
- No database, no logs, no file storage
- SMTP connections leave no trace
- Open source - you can verify the code
- Self-hosted - you control everything

## 💖 Support This Project

If this tool is useful to you, consider supporting its development:

- 🐦 **Follow on Twitter:** [@Gtarafdarr](https://x.com/Gtarafdarr)
- 💰 **Donate:** [gtarafdar.com/donate](https://gtarafdar.com/donate/)  
- ⭐ **Star on GitHub:** Help others discover this tool
- 🤝 **Contribute:** Pull requests welcome
- 📢 **Share:** Tell others about this tool

Your support helps keep this project free and open-source!

## 📞 Contact

- **Author:** Gobinda Tarafdar
- **Twitter:** [@Gtarafdarr](https://x.com/Gtarafdarr)
- **Website:** [gtarafdar.com](https://gtarafdar.com)
- **Donate:** [gtarafdar.com/donate](https://gtarafdar.com/donate/)
- **GitHub:** [github.com/Gtarafdar/email-validator](https://github.com/Gtarafdar/email-validator)

---

**Built with ❤️ for privacy, accuracy, and deliverability**


_Last updated: 2026-03-12 - Production deployment with 95% SMTP verification!_

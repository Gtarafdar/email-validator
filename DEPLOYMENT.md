# Deployment Guide - Email Validator

## 🚀 Quick Start

### Local Development

1. **Install Dependencies**

```bash
cd "/Users/gtarafdar/Downloads/Valid Email Checker"
npm install
```

2. **Start Server**

```bash
npm start
```

3. **Open Browser**

```
http://localhost:8787
```

## 📦 Self-Hosting Options

### Option 1: Netlify (Recommended)

#### Prerequisites

- GitHub/GitLab account
- Netlify account (free tier works)

#### Steps

1. **Create `netlify.toml` in project root**

```toml
[build]
  command = "npm install"
  publish = "public"
  functions = "netlify/functions"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[dev]
  command = "npm start"
  port = 8787
```

2. **Create Netlify Function for DNS API**

Create `netlify/functions/dns-check.js`:

```javascript
const dns = require("dns").promises;

exports.handler = async (event) => {
  const domain = event.queryStringParameters.domain;

  if (!domain) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Domain required" }),
    };
  }

  try {
    const mx = await dns.resolveMx(domain);
    const txt = await dns.resolveTxt(domain).catch(() => []);

    // Parse SPF, DKIM, DMARC from TXT records
    const spf = txt.some((record) => record.join("").includes("v=spf1"));

    const dmarc = await dns
      .resolveTxt(`_dmarc.${domain}`)
      .then((records) => records.some((r) => r.join("").includes("v=DMARC1")))
      .catch(() => false);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mx: mx.map((r) => ({ exchange: r.exchange, priority: r.priority })),
        spf,
        dmarc,
        dkim: false, // DKIM requires selector, can't auto-detect
        provider: identifyProvider(mx[0]?.exchange),
      }),
    };
  } catch (error) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message, mx: [] }),
    };
  }
};

function identifyProvider(exchange) {
  if (!exchange) return "Unknown";

  const lower = exchange.toLowerCase();
  const providers = {
    google: "Google Workspace",
    gmail: "Gmail",
    outlook: "Microsoft 365",
    office365: "Microsoft 365",
    yahoo: "Yahoo Mail",
    zoho: "Zoho Mail",
    "mail.protection.outlook.com": "Microsoft 365",
    mimecast: "Mimecast",
    proofpoint: "Proofpoint",
    messagelabs: "Symantec",
  };

  for (const [key, value] of Object.entries(providers)) {
    if (lower.includes(key)) return value;
  }

  return "Unknown";
}
```

3. **Update `public/app.js` to use Netlify Functions**

Find the `checkDNS` method and update to:

```javascript
async checkDNS(domain) {
  try {
    // Use Netlify function instead of direct /api/dns-check
    const response = await fetch(`/.netlify/functions/dns-check?domain=${domain}`);
    const data = await response.json();
    return data;
  } catch (error) {
    return { error: error.message };
  }
}
```

4. **Deploy to Netlify**

**Via CLI:**

```bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

**Via GitHub:**

1. Push code to GitHub
2. Log into Netlify
3. Click "New site from Git"
4. Select repository
5. Keep default settings
6. Click "Deploy site"

7. **Done!** Your site will be live at `https://your-site-name.netlify.app`

### Option 2: Vercel

1. **Create `vercel.json`**

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "server.js"
    },
    {
      "src": "/(.*)",
      "dest": "/public/$1"
    }
  ]
}
```

2. **Deploy**

```bash
npm install -g vercel
vercel login
vercel --prod
```

### Option 3: Docker (Any Platform)

1. **Create `Dockerfile`**

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 8787

CMD ["npm", "start"]
```

2. **Create `docker-compose.yml`**

```yaml
version: "3.8"
services:
  email-validator:
    build: .
    ports:
      - "8787:8787"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

3. **Build and Run**

```bash
docker-compose up -d
```

### Option 4: VPS (DigitalOcean, Linode, etc.)

1. **SSH into server**

```bash
ssh user@your-server-ip
```

2. **Install Node.js**

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

3. **Clone/Upload project**

```bash
git clone your-repo-url email-validator
cd email-validator
npm install
```

4. **Setup PM2 (Process Manager)**

```bash
sudo npm install -g pm2
pm2 start server.js --name email-validator
pm2 startup
pm2 save
```

5. **Setup Nginx Reverse Proxy**

Create `/etc/nginx/sites-available/email-validator`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8787;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/email-validator /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

6. **Setup SSL with Let's Encrypt**

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 🔒 Security Considerations

### Before Production Deployment

1. **Add Rate Limiting** (in `server.js`)

```javascript
const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use("/api/", limiter);
```

2. **Add CORS Protection**

```javascript
const cors = require("cors");

app.use(
  cors({
    origin: "https://your-domain.com", // Replace with your domain
    optionsSuccessStatus: 200,
  }),
);
```

3. **Add Helmet (Security Headers)**

```javascript
const helmet = require("helmet");
app.use(helmet());
```

4. **Environment Variables**

Create `.env`:

```
NODE_ENV=production
PORT=8787
ALLOWED_ORIGINS=https://your-domain.com
```

Load in `server.js`:

```javascript
require("dotenv").config();
const port = process.env.PORT || 8787;
```

5. **Don't commit `.env` to Git**

Add to `.gitignore`:

```
.env
node_modules/
*.log
```

## 📊 Performance Optimization

### Enable Compression

```javascript
const compression = require("compression");
app.use(compression());
```

### Cache Static Files

In nginx config:

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

### CDN Setup

Upload CSS/JS/images to CDN:

- Cloudflare
- AWS CloudFront
- BunnyCDN

Update references in `index.html`.

## 🧪 Testing Before Deployment

1. **Test all validation levels**

```bash
# Start local server
npm start

# Open browser
open http://localhost:8787
```

2. **Test with sample emails**

- Valid: john@example.com
- Invalid: invalid@@@example
- Disposable: test@tempmail.com
- Typo: john@gmial.com (should suggest gmail.com)
- Spam trap: test@spam.la

3. **Test CSV imports**

- Upload sample Generic CSV
- Upload Mailchimp export
- Test with large file (1000+ rows)

4. **Test validation levels**

- Quick: Should skip DNS checks
- Standard: Should check DNS
- Deep: Should check Gravatar

## 📝 Post-Deployment Checklist

- [ ] DNS checks working
- [ ] CSV import/export working
- [ ] All validation levels functional
- [ ] Format detection accurate
- [ ] IndexedDB initializing
- [ ] Real-time validation responsive
- [ ] Pause/resume controls working
- [ ] Typo suggestions appearing
- [ ] Progress bars updating
- [ ] No console errors
- [ ] Mobile responsive
- [ ] HTTPS enabled
- [ ] Rate limiting active
- [ ] Error logging setup

## 🐛 Troubleshooting

### Issue: DNS checks failing

**Solution:** Ensure server has DNS access. Some environments block DNS queries.

```bash
# Test DNS resolution
nslookup gmail.com
```

### Issue: IndexedDB not working

**Solution:** Check browser compatibility or use localStorage fallback.

```javascript
// Already handled in code:
if (!this.dbReady) {
  return this.get(this.KEYS.RESULTS) || [];
}
```

### Issue: CSV parsing slow

**Solution:** Lazy parsing is already implemented for files > 100 emails. Check console for:

```
Detected format: ...
```

### Issue: CORS errors on Netlify

**Solution:** Ensure `netlify.toml` has correct redirects:

```toml
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

## 📈 Monitoring

### Add Analytics

1. **Google Analytics** (add to `index.html` before `</head>`)

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    dataLayer.push(arguments);
  }
  gtag("js", new Date());
  gtag("config", "GA_ID");
</script>
```

2. **Error Tracking** (add to `app.js`)

```javascript
window.addEventListener("error", (e) => {
  console.error("Global error:", e.error);
  // Send to error tracking service (Sentry, LogRocket, etc.)
});
```

## 🎉 You're Live!

Your email validator is now deployed and ready to use. Share the URL with your team!

**Example URLs:**

- Netlify: `https://email-validator-pro.netlify.app`
- Vercel: `https://email-validator.vercel.app`
- Custom: `https://validator.yourdomain.com`

---

Need help? Check:

- [Netlify Documentation](https://docs.netlify.com)
- [Vercel Documentation](https://vercel.com/docs)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)

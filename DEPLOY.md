# Quick Start Guide

## Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Server

```bash
npm start
```

### 3. Open Browser

Navigate to: `http://localhost:8787`

---

## Quick Deploy to Cloud

### Railway (Easiest)

1. Push code to GitHub
2. Visit [railway.app](https://railway.app)
3. Click "Start a New Project"
4. Select "Deploy from GitHub repo"
5. Choose your repository
6. Railway auto-deploys
7. Get your public URL

**Estimated time: 2 minutes**

---

### Render

1. Push code to GitHub
2. Visit [render.com](https://render.com)
3. Click "New +" → "Web Service"
4. Connect your repo
5. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
6. Click "Create Web Service"

**Estimated time: 3 minutes**

---

### Heroku

```bash
# Install Heroku CLI
brew install heroku/brew/heroku  # macOS
# or download from heroku.com/install

# Login
heroku login

# Create app
heroku create your-email-validator

# Deploy
git push heroku main

# Open
heroku open
```

**Estimated time: 5 minutes**

---

### VPS / Self-Host

#### Ubuntu/Debian

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Clone your project
git clone <your-repo-url>
cd email-validator

# Install dependencies
npm install

# Install PM2 (process manager)
sudo npm install -g pm2

# Start application
pm2 start server.js --name email-validator

# Setup auto-start on boot
pm2 startup
pm2 save

# Setup nginx reverse proxy (optional)
sudo apt install nginx
sudo nano /etc/nginx/sites-available/email-validator

# Nginx config:
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

# Enable site
sudo ln -s /etc/nginx/sites-available/email-validator /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

### Docker

**Dockerfile** (create this file):

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 8787

CMD ["node", "server.js"]
```

**Deploy:**

```bash
# Build image
docker build -t email-validator .

# Run container
docker run -d -p 8787:8787 --name email-validator email-validator

# Check logs
docker logs email-validator

# Stop
docker stop email-validator

# Start again
docker start email-validator
```

**Docker Compose** (create docker-compose.yml):

```yaml
version: "3.8"
services:
  app:
    build: .
    ports:
      - "8787:8787"
    restart: unless-stopped
    environment:
      - NODE_ENV=production
```

```bash
docker-compose up -d
```

---

## Update API URL (If Hosting Separately)

If you host frontend and backend separately, update the API URL:

**Edit `public/app.js`**, find this section:

```javascript
async checkDNS(domain) {
  try {
    const response = await fetch('/api/dns-lookup', {
      // Change to: const response = await fetch('https://your-backend.com/api/dns-lookup', {
```

**Update both API calls:**

1. `/api/dns-lookup` → `https://your-backend.com/api/dns-lookup`
2. `/api/batch-dns-lookup` → `https://your-backend.com/api/batch-dns-lookup`

---

## Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=8787
NODE_ENV=production
```

---

## Verify Installation

### Health Check

Visit: `http://localhost:8787/health`

Expected response:

```json
{
  "status": "ok",
  "privacy": "no data stored",
  "timestamp": "2026-03-11T..."
}
```

### Test Single Email

1. Open `http://localhost:8787`
2. Enter `test@gmail.com`
3. Click "Validate Email"
4. Should show results with MX, SPF, DKIM, DMARC data

---

## Firewall Configuration

### Allow Port 8787

**UFW (Ubuntu):**

```bash
sudo ufw allow 8787
sudo ufw reload
```

**Firewalld (CentOS/RHEL):**

```bash
sudo firewall-cmd --permanent --add-port=8787/tcp
sudo firewall-cmd --reload
```

**Cloud Provider:**

- AWS: Security Groups → Allow port 8787
- DigitalOcean: Networking → Firewalls → Allow port 8787
- GCP: VPC Firewall Rules → Allow port 8787

---

## SSL/HTTPS Setup

### With Nginx + Let's Encrypt

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal test
sudo certbot renew --dry-run
```

### With Cloudflare (Easiest)

1. Add domain to Cloudflare
2. Update nameservers
3. SSL/TLS → Full
4. Done! Cloudflare provides SSL automatically

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 8787
lsof -i :8787

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=8888
```

### Permission Denied

```bash
# Don't use sudo with npm
# If needed, fix npm permissions:
sudo chown -R $(whoami) ~/.npm
```

### DNS Not Working

```bash
# Test DNS resolution
node -e "const dns = require('dns').promises; dns.resolveMx('gmail.com').then(console.log).catch(console.error)"

# Should output MX records
```

---

## Performance Optimization

### PM2 Cluster Mode

```bash
pm2 start server.js -i max --name email-validator
```

### Node.js Production Mode

```env
NODE_ENV=production
```

### Nginx Caching

```nginx
location ~* \.(css|js|png|jpg|jpeg|gif|ico)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

---

## Monitoring

### PM2 Monitoring

```bash
pm2 monit
pm2 logs email-validator
pm2 status
```

### Health Check Monitoring

Setup monitoring service to ping: `https://your-domain.com/health`

Recommended services:

- UptimeRobot (free)
- Pingdom
- Datadog

---

## Backup

### Backup User Data (localStorage)

Users can export their data from Settings tab → View Suppression List → Export

No server-side backup needed (privacy-first design)

### Backup Code

```bash
git push origin main
```

---

## Security Checklist

- [ ] Change default port if needed
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall
- [ ] Set NODE_ENV=production
- [ ] Keep Node.js updated
- [ ] Review rate limits
- [ ] Monitor logs
- [ ] Use strong passwords for server access

---

## Support

**Issues?**

- Check README.md
- Review server logs: `pm2 logs email-validator`
- Test health endpoint
- Verify DNS resolution
- Check firewall settings

**Still stuck?**

- Open GitHub issue
- Provide error logs
- Include Node.js version
- Include deployment method

---

**Deployment Time Estimates:**

- Railway: 2 min
- Render: 3 min
- Heroku: 5 min
- VPS: 15 min
- Docker: 10 min

Choose based on your expertise level and requirements!

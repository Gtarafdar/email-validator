#!/bin/bash

##############################################
# Hetzner VPS Email Validator Deployment Script
# Automates setup of email validator on fresh Ubuntu 22.04 server
##############################################

set -e  # Exit on error

echo "==========================================="
echo "  Email Validator - Hetzner Deployment"
echo "==========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}Please run as root (or use sudo)${NC}"
  echo "Usage: sudo bash deploy-hetzner.sh"
  exit 1
fi

echo -e "${GREEN}✓ Running as root${NC}"
echo ""

# Step 1: System Update
echo "Step 1/10: Updating system packages..."
apt update -qq && apt upgrade -y -qq
echo -e "${GREEN}✓ System updated${NC}"
echo ""

# Step 2: Install Essential Tools
echo "Step 2/10: Installing essential tools..."
apt install -y -qq curl git ufw fail2ban htop nginx certbot python3-certbot-nginx
echo -e "${GREEN}✓ Essential tools installed${NC}"
echo ""

# Step 3: Install Node.js
echo "Step 3/10: Installing Node.js 20.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
    apt install -y -qq nodejs
fi
NODE_VERSION=$(node --version)
echo -e "${GREEN}✓ Node.js installed: $NODE_VERSION${NC}"
echo ""

# Step 4: Create Non-Root User
echo "Step 4/10: Creating validator user..."
if ! id -u validator &> /dev/null; then
    adduser --disabled-password --gecos "" validator
    usermod -aG sudo validator
    echo -e "${GREEN}✓ User 'validator' created${NC}"
else
    echo -e "${YELLOW}ℹ User 'validator' already exists${NC}"
fi
echo ""

# Step 5: Setup Firewall
echo "Step 5/10: Configuring firewall..."
ufw --force disable > /dev/null 2>&1
ufw --force reset > /dev/null 2>&1
ufw default deny incoming > /dev/null 2>&1
ufw default allow outgoing > /dev/null 2>&1
ufw allow 22/tcp > /dev/null 2>&1   # SSH
ufw allow 80/tcp > /dev/null 2>&1   # HTTP
ufw allow 443/tcp > /dev/null 2>&1  # HTTPS
echo "y" | ufw enable > /dev/null 2>&1
echo -e "${GREEN}✓ Firewall configured${NC}"
echo ""

# Step 6: Enable Fail2Ban
echo "Step 6/10: Enabling Fail2Ban..."
systemctl enable fail2ban > /dev/null 2>&1
systemctl start fail2ban > /dev/null 2>&1
echo -e "${GREEN}✓ Fail2Ban enabled${NC}"
echo ""

# Step 7: Clone Repository
echo "Step 7/10: Cloning email-validator repository..."
sudo -u validator bash << 'EOF'
cd /home/validator
if [ -d "email-validator" ]; then
    echo "Repository exists, pulling latest..."
    cd email-validator
    git pull origin main
else
    git clone https://github.com/Gtarafdar/email-validator.git
    cd email-validator
fi
EOF
echo -e "${GREEN}✓ Repository cloned${NC}"
echo ""

# Step 8: Install Dependencies
echo "Step 8/10: Installing Node.js dependencies..."
sudo -u validator bash << 'EOF'
cd /home/validator/email-validator
npm install --silent
EOF
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 9: Configure Environment
echo "Step 9/10: Configuring environment..."

# Generate secure API key
API_KEY=$(openssl rand -hex 32)

# Create .env file
cat > /home/validator/email-validator/.env << EOF
# Production Environment Configuration
# Auto-generated on $(date)

# API Key (IMPORTANT: Save this securely!)
API_KEY=$API_KEY

# Server Configuration
PORT=8787
NODE_ENV=production

# Optional: Add SOCKS5 proxy later if needed
# SOCKS5_HOST=
# SOCKS5_PORT=1080
# SOCKS5_USER=
# SOCKS5_PASS=
EOF

chown validator:validator /home/validator/email-validator/.env
chmod 600 /home/validator/email-validator/.env

echo -e "${GREEN}✓ Environment configured${NC}"
echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  IMPORTANT: Save Your API Key${NC}"
echo -e "${YELLOW}========================================${NC}"
echo -e "${GREEN}API Key: $API_KEY${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo "Press Enter to continue..."
read

# Step 10: Install PM2 and Start App
echo "Step 10/10: Installing PM2 and starting application..."
npm install -g pm2 --silent > /dev/null 2>&1

sudo -u validator bash << 'EOF'
cd /home/validator/email-validator
pm2 delete email-validator 2>/dev/null || true
pm2 start server.js --name email-validator
pm2 save
EOF

# Setup PM2 startup
env PATH=$PATH:/usr/bin pm2 startup systemd -u validator --hp /home/validator > /dev/null 2>&1

echo -e "${GREEN}✓ Application started with PM2${NC}"
echo ""

# Configure Nginx
echo "Configuring Nginx reverse proxy..."

# Get server IP
SERVER_IP=$(curl -s https://api.ipify.org)

cat > /etc/nginx/sites-available/email-validator << EOF
server {
    listen 80;
    server_name $SERVER_IP;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Client max body size
    client_max_body_size 10M;

    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=validator_limit:10m rate=10r/s;
    
    location / {
        limit_req zone=validator_limit burst=20;
        
        proxy_pass http://localhost:8787;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts for SMTP checks
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/email-validator /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
nginx -t > /dev/null 2>&1
systemctl restart nginx

echo -e "${GREEN}✓ Nginx configured${NC}"
echo ""

# Test the deployment
echo "Testing deployment..."
sleep 2
HEALTH_CHECK=$(curl -s http://localhost:8787/health | grep "ok" || echo "failed")

if [ "$HEALTH_CHECK" != "failed" ]; then
    echo -e "${GREEN}✓ Deployment successful!${NC}"
else
    echo -e "${RED}✗ Health check failed. Check logs: pm2 logs email-validator${NC}"
fi

echo ""
echo "==========================================="
echo -e "${GREEN}  🎉 Deployment Complete!${NC}"
echo "==========================================="
echo ""
echo -e "${GREEN}✓ Email validator is running${NC}"
echo -e "${GREEN}✓ Accessible at: http://$SERVER_IP${NC}"
echo ""
echo "📋 Important Information:"
echo "-------------------------------------------"
echo -e "Server IP:     ${GREEN}$SERVER_IP${NC}"
echo -e "API Key:       ${GREEN}$API_KEY${NC}"
echo -e "Status:        ${GREEN}Running${NC}"
echo ""
echo "📊 Management Commands:"
echo "-------------------------------------------"
echo "View logs:     pm2 logs email-validator"
echo "Restart:       pm2 restart email-validator"
echo "Stop:          pm2 stop email-validator"
echo "Monitor:       pm2 monit"
echo ""
echo "🔧 Testing:"
echo "-------------------------------------------"
echo "1. Open: http://$SERVER_IP"
echo "2. Go to Settings tab"
echo "3. Enter API Key: $API_KEY"
echo "4. Test email: riyad@bonfiremedia.co.za"
echo "   Expected: Invalid ❌ (mailbox not found)"
echo ""
echo "📚 Next Steps:"
echo "-------------------------------------------"
echo "1. Test SMTP verification works (not blacklisted)"
echo "2. (Optional) Add custom domain + SSL certificate"
echo "3. Update frontend to use this server URL"
echo ""
echo "Need help? Check: HETZNER_DEPLOYMENT.md"
echo "==========================================="

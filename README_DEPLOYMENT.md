# Deploying to Render.com

## Quick Deploy

1. **Push your code to GitHub** (if not already done):

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. **Deploy to Render**:
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Render will auto-detect the `render.yaml` configuration
   - Click "Create Web Service"

3. **Configure API Key** (for private use):
   - In Render dashboard, go to your service
   - Navigate to "Environment" tab
   - Find the `API_KEY` variable (auto-generated)
   - Copy this key and give it to your users
   - Add to requests: `X-API-Key: your-api-key-here` header

4. **Your app will be live at**:
   ```
   https://email-validator-YOUR_NAME.onrender.com
   ```

## Environment Variables

The following variables are configured in `render.yaml`:

- `NODE_ENV=production` - Production mode
- `PORT=10000` - Render's default port
- `API_KEY` - Auto-generated secure API key (required for all requests)

## Features

- ✅ **Private Access**: All API requests require API key authentication
- ✅ **SMTP Verification**: Real mailbox checking without storing emails
- ✅ **Bulk Limit**: Maximum 100 emails per bulk validation
- ✅ **Rate Limiting**: 100 requests per minute per IP
- ✅ **No Data Storage**: All emails validated in-memory only
- ✅ **Professional Support**: Contact form for enterprise users

## API Usage

### With API Key (Required)

```bash
# Single email DNS lookup
curl -X POST https://your-app.onrender.com/api/dns-lookup \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"domain": "example.com"}'

# SMTP mailbox verification
curl -X POST https://your-app.onrender.com/api/smtp-verify \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"email": "test@example.com"}'
```

### Frontend Usage

In your HTML, set the API key:

```javascript
// Add to public/app.js
const API_KEY = "your-api-key-here"; // Or prompt user to enter

// Update fetch calls to include API key
fetch("/api/dns-lookup", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY,
  },
  body: JSON.stringify({ domain }),
});
```

## Free Tier Limitations

Render's free tier includes:

- 750 hours/month (enough for 24/7 operation)
- App sleeps after 15 minutes of inactivity
- ~30 second cold start when waking up
- 512 MB RAM

**Tip**: First request after sleep will be slow. Consider upgrading to paid plan ($7/month) for always-on service.

## Upgrade to Paid Plan

For production use, upgrade to remove cold starts:

1. Go to your service in Render dashboard
2. Click "Settings" → "Plan"
3. Select "Starter" plan ($7/month)
4. Benefits:
   - No sleep/cold starts
   - Faster performance
   - More RAM (1GB+)
   - Priority support

## Monitoring

- **Health Check**: `GET /health` - Returns service status
- **Logs**: Available in Render dashboard under "Logs" tab
- **Metrics**: CPU, Memory, Request counts in "Metrics" tab

## Security

- ✅ API key authentication required
- ✅ CORS enabled for your domains only (update in server.js)
- ✅ Rate limiting to prevent abuse
- ✅ No email storage or logging
- ✅ HTTPS enforced by Render

## Support

For enterprise support or custom deployment, contact through the support form in the app.
